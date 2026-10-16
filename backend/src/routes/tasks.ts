import { Router } from 'express';
import { z } from 'zod';
import { execute, newId, nullable, query, queryOne } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';
import { broadcastNotification } from '../services/realtime.js';

const router = Router();
router.use(authenticate);

const wellnessCheckInSchema = z.object({
  stressLevel: z.number().min(1).max(10),
  mood: z.number().min(1).max(10),
  energyLevel: z.number().min(1).max(10),
  notes: z.string().optional(),
});

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  learnedNote: z.string().max(2000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  targetDurationMinutes: z.number().int().min(1).max(480).optional().nullable(),
  breakIntervalMinutes: z.number().int().min(1).max(240).optional().nullable(),
  link: z.string().max(1000).optional().nullable(),
  pushedToPortfolio: z.boolean().optional(),
  timeSpentMinutes: z.number().int().min(0).optional(),
  wellnessCheckIn: wellnessCheckInSchema.optional(),
});

const focusSchema = z.object({
  durationMinutes: z.number().int().min(1).max(240),
  taskId: z.string().optional().nullable(),
});

router.get('/', async (req: AuthRequest, res) => {
  const take = Math.min(Number(req.query.take) || 100, 200);
  const tasks = await query(
    `SELECT *
     FROM "Task"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC
     LIMIT $2`,
    [req.user!.userId, take],
  );
  res.json(tasks);
});

// GET /api/tasks/calendar/export.ics - RFC 5545 iCalendar feed
router.get('/calendar/export.ics', async (req: AuthRequest, res) => {
  try {
    const tasks = await query<{
      id: string;
      title: string;
      description: string | null;
      status: string;
      dueDate: Date | string | null;
      createdAt: Date | string;
    }>(
      `SELECT "id", "title", "description", "status", "dueDate", "createdAt"
       FROM "Task"
       WHERE "userId" = $1 AND "dueDate" IS NOT NULL
       ORDER BY "dueDate" ASC`,
      [req.user!.userId],
    );

    const now = new Date();
    const formatIcsDate = (d: Date | string) => {
      const date = new Date(d);
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SynergySphere//Task Productivity Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:SynergySphere Tasks',
    ];

    for (const task of tasks) {
      if (!task.dueDate) continue;
      const start = formatIcsDate(task.dueDate);
      const end = formatIcsDate(new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000));
      const cleanTitle = (task.title || 'Task').replace(/[\r\n]+/g, ' ');
      const cleanDesc = (task.description || `Status: ${task.status}`).replace(/[\r\n]+/g, '\\n');

      ics.push(
        'BEGIN:VEVENT',
        `UID:task-${task.id}@synergysphere.com`,
        `DTSTAMP:${formatIcsDate(now)}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:[SynergySphere] ${cleanTitle}`,
        `DESCRIPTION:${cleanDesc}`,
        `STATUS:${task.status === 'DONE' ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT',
      );
    }

    ics.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="synergysphere-tasks.ics"');
    res.send(ics.join('\r\n'));
  } catch (error) {
    console.error('Error generating calendar .ics export:', error);
    res.status(500).json({ error: 'Failed to generate calendar export' });
  }
});

router.get('/productivity-stats', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    tasksCompletedToday,
    totalTasksCompleted,
    focusSessionsToday,
    focusMinutesToday,
    learnedTasks,
    latestWellness,
    tasksByStatus,
    recentFocusSessions,
  ] = await Promise.all([
    countTasks('WHERE "userId" = $1 AND "status" = $2 AND "updatedAt" >= $3', [userId, 'DONE', startOfDay]),
    countTasks('WHERE "userId" = $1 AND "status" = $2', [userId, 'DONE']),
    countTable('"FocusSession"', 'WHERE "userId" = $1 AND "completedAt" >= $2', [userId, startOfDay]),
    queryOne<{ durationMinutes: number }>(
      `SELECT COALESCE(SUM("durationMinutes"), 0)::int AS "durationMinutes"
       FROM "FocusSession"
       WHERE "userId" = $1 AND "completedAt" >= $2`,
      [userId, startOfDay],
    ),
    query(
      `SELECT "id", "title", "learnedNote", "updatedAt"
       FROM "Task"
       WHERE "userId" = $1 AND "status" = $2
       ORDER BY "updatedAt" DESC
       LIMIT 10`,
      [userId, 'DONE'],
    ),
    queryOne<{ stressLevel: number; mood: number; energyLevel: number }>(
      `SELECT *
       FROM "Wellness"
       WHERE "userId" = $1
       ORDER BY "date" DESC
       LIMIT 1`,
      [userId],
    ),
    query<{ status: string; count: number }>(
      `SELECT "status", COUNT(*)::int AS "count"
       FROM "Task"
       WHERE "userId" = $1
       GROUP BY "status"`,
      [userId],
    ),
    query<{ durationMinutes: number; completedAt: Date | string }>(
      `SELECT "durationMinutes", "completedAt"
       FROM "FocusSession"
       WHERE "userId" = $1 AND "completedAt" >= $2
       ORDER BY "completedAt" DESC`,
      [userId, daysAgo(startOfDay, STREAK_LOOKBACK_DAYS)],
    ),
  ]);

  const statusCounts = Object.fromEntries(
    tasksByStatus.map((row: { status: string; count: number }) => [row.status, row.count]),
  );

  const wellnessScore = latestWellness
    ? Math.round(((10 - latestWellness.stressLevel) + latestWellness.mood + latestWellness.energyLevel) / 3 * 10)
    : null;

  // Minutes per local day for the recent focus window
  const minutesByDay = new Map<string, number>();
  for (const session of recentFocusSessions) {
    const key = dayKey(new Date(session.completedAt));
    minutesByDay.set(key, (minutesByDay.get(key) || 0) + (session.durationMinutes || 0));
  }

  const weeklyFocus = Array.from({ length: 7 }, (_, index) => {
    const date = daysAgo(startOfDay, 6 - index);
    const key = dayKey(date);
    return {
      date: key,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: minutesByDay.get(key) || 0,
    };
  });

  // Consecutive days with at least one focus session. Today does not break
  // the streak if the user simply hasn't focused yet.
  let focusStreak = 0;
  for (let offset = minutesByDay.has(dayKey(startOfDay)) ? 0 : 1; offset <= STREAK_LOOKBACK_DAYS; offset += 1) {
    if (!minutesByDay.has(dayKey(daysAgo(startOfDay, offset)))) break;
    focusStreak += 1;
  }

  res.json({
    tasksCompletedToday,
    totalTasksCompleted,
    focusSessionsToday,
    focusMinutesToday: focusMinutesToday?.durationMinutes || 0,
    focusHoursToday: ((focusMinutesToday?.durationMinutes || 0) / 60).toFixed(1),
    learnedTasks,
    wellnessScore,
    statusCounts,
    weeklyFocus,
    focusStreak,
  });
});

router.post('/focus-session', validateBody(focusSchema), async (req: AuthRequest, res) => {
  const duration = req.body.durationMinutes;
  const taskId = req.body.taskId;

  const session = await queryOne(
    `INSERT INTO "FocusSession" ("id", "userId", "durationMinutes")
     VALUES ($1, $2, $3)
     RETURNING *`,
    [newId(), req.user!.userId, duration],
  );

  let taskTitle: string | null = null;
  if (taskId) {
    const taskRow = await queryOne<{ title: string }>(
      `UPDATE "Task"
       SET "timeSpentMinutes" = COALESCE("timeSpentMinutes", 0) + $1,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $2 AND "userId" = $3
       RETURNING "title"`,
      [duration, taskId, req.user!.userId],
    );
    if (taskRow) {
      taskTitle = taskRow.title;
    }
  }

  if (duration >= 25) {
    await awardXp(req.user!.userId, 15, 'Completed a focus session');
  }

  // Notify user that their focus session has ended
  const taskDetail = taskTitle ? ` on "${taskTitle}"` : '';
  const focusNotif = await queryOne(
    `INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "link")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      newId(),
      req.user!.userId,
      'Focus Session Completed',
      `Your ${duration}-minute deep focus session${taskDetail} has ended! Time to take a break and recharge.`,
      'info',
      '/tasks',
    ],
  );
  if (focusNotif) {
    broadcastNotification(req.user!.userId, focusNotif);
  }

  res.status(201).json(session);
});

router.post('/', validateBody(taskSchema), async (req: AuthRequest, res) => {
  const {
    title,
    description,
    learnedNote,
    status,
    dueDate,
    targetDurationMinutes,
    breakIntervalMinutes,
    link,
    timeSpentMinutes,
  } = req.body;

  const taskStatus = status || 'TODO';

  const task = await queryOne<{ id: string; title: string; status: string }>(
    `INSERT INTO "Task" (
       "id", "userId", "title", "description", "learnedNote", "status", "dueDate",
       "targetDurationMinutes", "breakIntervalMinutes", "link", "pushedToPortfolio", "timeSpentMinutes"
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      newId(),
      req.user!.userId,
      title,
      nullable(description),
      nullable(learnedNote),
      taskStatus,
      dueDate ? new Date(dueDate) : null,
      targetDurationMinutes ?? 25,
      breakIntervalMinutes ?? 25,
      nullable(link),
      false,
      timeSpentMinutes ?? 0,
    ],
  );

  if (taskStatus === 'DONE' && task) {
    await awardXp(req.user!.userId, 10, 'Completed task: ' + title);
    const doneNotif = await queryOne(
      `INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "link")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        newId(),
        req.user!.userId,
        `Task Completed: ${title}`,
        `Awesome job! You marked "${title}" as completed.`,
        'achievement',
        '/tasks',
      ],
    );
    if (doneNotif) {
      broadcastNotification(req.user!.userId, doneNotif);
    }
  }

  res.status(201).json(task);
});

router.patch('/:id', validateBody(taskSchema.partial()), async (req: AuthRequest, res) => {
  const existing = await queryOne<{ id: string; status: string; title: string }>(
    `SELECT "id", "status", "title"
     FROM "Task"
     WHERE "id" = $1 AND "userId" = $2`,
    [paramId(req), req.user!.userId],
  );
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`"${column}" = $${values.length}`);
  };

  if (req.body.title !== undefined) add('title', req.body.title);
  if (req.body.description !== undefined) add('description', req.body.description);
  if (req.body.learnedNote !== undefined) add('learnedNote', req.body.learnedNote);
  if (req.body.status !== undefined) add('status', req.body.status);
  if (req.body.targetDurationMinutes !== undefined) add('targetDurationMinutes', req.body.targetDurationMinutes);
  if (req.body.breakIntervalMinutes !== undefined) add('breakIntervalMinutes', req.body.breakIntervalMinutes);
  if (req.body.link !== undefined) add('link', req.body.link);
  if (req.body.pushedToPortfolio !== undefined) add('pushedToPortfolio', req.body.pushedToPortfolio);
  if (req.body.timeSpentMinutes !== undefined) add('timeSpentMinutes', req.body.timeSpentMinutes);
  if (req.body.dueDate !== undefined) {
    add('dueDate', req.body.dueDate ? new Date(req.body.dueDate) : null);
  }

  values.push(existing.id);
  const task = await queryOne<{ status: string; title: string }>(
    `UPDATE "Task"
     SET ${updates.length > 0 ? updates.join(', ') + ', ' : ''}"updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $${values.length}
     RETURNING *`,
    values,
  );

  if (task && existing.status !== 'DONE' && task.status === 'DONE') {
    await awardXp(req.user!.userId, 10, 'Completed task: ' + task.title);
    const doneNotif = await queryOne(
      `INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "link")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        newId(),
        req.user!.userId,
        `Task Completed: ${task.title}`,
        `Great job! You completed "${task.title}". Keep up the great momentum!`,
        'achievement',
        '/tasks',
      ],
    );
    if (doneNotif) {
      broadcastNotification(req.user!.userId, doneNotif);
    }
  }

  if (req.body.wellnessCheckIn) {
    const wc = req.body.wellnessCheckIn;
    await queryOne(
      `INSERT INTO "Wellness" ("id", "userId", "stressLevel", "mood", "energyLevel", "notes", "moduleId", "taskId", "taskTitle", "taskStatus")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING "id"`,
      [
        newId(),
        req.user!.userId,
        wc.stressLevel,
        wc.mood,
        wc.energyLevel,
        nullable(wc.notes),
        'PRODUCTIVITY',
        existing.id,
        task?.title || existing.title,
        task?.status || req.body.status || 'DONE',
      ],
    );
    await awardXp(req.user!.userId, 10, 'Wellness check-in for completed task');
  }

  res.json(task);
});

router.post('/:id/push-to-portfolio', async (req: AuthRequest, res) => {
  const taskId = paramId(req);
  const task = await queryOne<{
    id: string;
    title: string;
    description: string | null;
    learnedNote: string | null;
    link: string | null;
    pushedToPortfolio: boolean;
  }>(
    `SELECT "id", "title", "description", "learnedNote", "link", "pushedToPortfolio"
     FROM "Task"
     WHERE "id" = $1 AND "userId" = $2`,
    [taskId, req.user!.userId],
  );

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  // Construct descriptive portfolio text
  let portfolioDesc = task.description || '';
  if (task.learnedNote) {
    portfolioDesc = portfolioDesc
      ? `${portfolioDesc}\n\nKey Takeaway: ${task.learnedNote}`
      : `Key Takeaway: ${task.learnedNote}`;
  }
  if (!portfolioDesc.trim()) {
    portfolioDesc = `Completed project task: ${task.title}`;
  }

  const projectLink = task.link || null;
  const githubLink = task.link && task.link.includes('github.com') ? task.link : null;

  // Insert into Portfolio table
  const portfolioItem = await queryOne(
    `INSERT INTO "Portfolio" ("id", "userId", "title", "description", "projectLink", "githubLink")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      newId(),
      req.user!.userId,
      task.title,
      portfolioDesc,
      projectLink,
      githubLink,
    ],
  );

  try {
    await queryOne(
      `INSERT INTO "PortfolioBullet" ("id", "userId", "title", "bullet", "source")
       VALUES ($1, $2, $3, $4, $5)`,
      [
        newId(),
        req.user!.userId,
        task.title,
        `Delivered ${task.title}: ${portfolioDesc.slice(0, 200)}`,
        'TASK_ACHIEVEMENT',
      ],
    );
  } catch {
    // PortfolioBullet is optional
  }

  await execute(
    `UPDATE "Task"
     SET "pushedToPortfolio" = TRUE, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1 AND "userId" = $2`,
    [taskId, req.user!.userId],
  );

  await awardXp(req.user!.userId, 25, 'Pushed task achievement to Career Portfolio');

  await queryOne(
    `INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "link")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      newId(),
      req.user!.userId,
      '🚀 Portfolio Boosted!',
      `"${task.title}" has been boosted and added to your Career Portfolio.`,
      'achievement',
      '/portfolio',
    ],
  );

  res.status(201).json({ success: true, portfolioItem });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const deleted = await execute(
    `DELETE FROM "Task"
     WHERE "id" = $1 AND "userId" = $2`,
    [paramId(req), req.user!.userId],
  );
  if (deleted === 0) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.status(204).send();
});

export default router;

async function countTasks(whereSql: string, params: readonly unknown[]): Promise<number> {
  return countTable('"Task"', whereSql, params);
}

async function countTable(tableSql: string, whereSql: string, params: readonly unknown[]): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS "count" FROM ${tableSql} ${whereSql}`,
    params,
  );
  return row?.count || 0;
}

const STREAK_LOOKBACK_DAYS = 60;

function daysAgo(from: Date, days: number): Date {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return date;
}

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
