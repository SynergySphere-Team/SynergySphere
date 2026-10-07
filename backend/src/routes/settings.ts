import { Router } from 'express';
import { z } from 'zod';
import { newId, query, queryOne } from '../lib/db.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const createTicketSchema = z.object({
  category: z.enum([
    'Bug / Technical Issue',
    'Account & Login',
    'Feature Request',
    'Community Issue',
    'Event Issue',
    'Other',
  ]),
  title: z.string().trim().min(3, 'Subject must be at least 3 characters').max(100, 'Subject cannot exceed 100 characters').optional(),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(100, 'Subject cannot exceed 100 characters').optional(),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(4000, 'Description cannot exceed 4000 characters'),
  attachmentName: z.string().max(255).optional(),
  attachmentUrl: z.string().max(7_000_000).optional(), // Supports base64 data URIs up to ~5MB
}).refine((data) => Boolean((data.title && data.title.length >= 3) || (data.subject && data.subject.length >= 3)), {
  message: 'Subject or title must be at least 3 characters',
  path: ['title'],
});

// POST /api/settings/tickets
router.post('/tickets', validateBody(createTicketSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { category, title, subject, description, attachmentName, attachmentUrl } = req.body;
    const finalTitle = (title || subject || '').trim();

    // Generate unique sequential ticket number like SS-1051
    const seqRow = await queryOne<{ nextval: string }>(`SELECT nextval('support_ticket_seq') AS nextval`);
    let seq = Number(seqRow?.nextval) || 1048;
    let ticketNumber = `SS-${seq}`;

    // Protect against pre-seeded manual IDs by advancing sequence
    let existing = await queryOne(`SELECT "id" FROM "SupportTicket" WHERE "ticketNumber" = $1`, [ticketNumber]);
    while (existing) {
      const adv = await queryOne<{ nextval: string }>(`SELECT nextval('support_ticket_seq') AS nextval`);
      seq = Number(adv?.nextval) || (seq + 1);
      ticketNumber = `SS-${seq}`;
      existing = await queryOne(`SELECT "id" FROM "SupportTicket" WHERE "ticketNumber" = $1`, [ticketNumber]);
    }

    const ticketId = newId();

    const created = await queryOne(
      `INSERT INTO "SupportTicket" (
         "id", "ticketNumber", "userId", "category", "title", "description",
         "status", "priority", "attachmentName", "attachmentUrl", "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'open', 'medium', $7, $8, NOW(), NOW())
       RETURNING "id", "ticketNumber", "userId", "category", "title", "description", "status", "priority", "attachmentName", "attachmentUrl", "createdAt", "updatedAt"`,
      [ticketId, ticketNumber, userId, category, finalTitle, description, attachmentName || null, attachmentUrl || null],
    );

    // Fetch user name for audit log
    const userRow = await queryOne<{ firstName: string; lastName: string }>(
      `SELECT "firstName", "lastName" FROM "User" WHERE "id" = $1`,
      [userId],
    );
    const userName = userRow ? `${userRow.firstName} ${userRow.lastName}`.trim() : 'User';

    // Record audit log
    await queryOne(
      `INSERT INTO "AdminAuditLog" (
         "id", "userId", "adminName", "action", "targetType", "targetId", "description", "createdAt"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        newId(),
        userId,
        userName,
        'TICKET_CREATED',
        'SupportTicket',
        ticketId,
        `Created support ticket #${ticketNumber}: "${finalTitle.slice(0, 40)}"`,
      ],
    );

    res.status(201).json(created);
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ error: 'Failed to submit support ticket.' });
  }
});

// GET /api/settings/tickets and /api/settings/tickets/me
router.get(['/tickets', '/tickets/me'], async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const tickets = await query(
      `SELECT
         t."id",
         t."ticketNumber",
         t."category",
         t."title",
         t."description",
         t."status",
         t."priority",
         t."attachmentName",
         t."createdAt",
         t."updatedAt"
       FROM "SupportTicket" t
       WHERE t."userId" = $1
       ORDER BY t."createdAt" DESC`,
      [userId],
    );

    res.json(tickets);
  } catch (error) {
    console.error('Fetch user tickets error:', error);
    res.status(500).json({ error: 'Failed to retrieve support tickets.' });
  }
});

// GET /api/settings/tickets/:id
router.get('/tickets/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const ticket = await queryOne(
      `SELECT
         t."id",
         t."ticketNumber",
         t."category",
         t."title",
         t."description",
         t."status",
         t."priority",
         t."attachmentName",
         t."attachmentUrl",
         t."createdAt",
         t."updatedAt"
       FROM "SupportTicket" t
       WHERE t."id" = $1 AND t."userId" = $2`,
      [id, userId],
    );

    if (!ticket) {
      // Check if ticket exists at all to prevent leaking ownership info
      const exists = await queryOne<{ id: string }>(`SELECT "id" FROM "SupportTicket" WHERE "id" = $1`, [id]);
      if (exists) {
        res.status(403).json({ error: 'You are not authorized to view this ticket.' });
        return;
      }
      res.status(404).json({ error: 'Support ticket not found.' });
      return;
    }

    res.json(ticket);
  } catch (error) {
    console.error('Fetch ticket details error:', error);
    res.status(500).json({ error: 'Failed to retrieve ticket details.' });
  }
});

export default router;
