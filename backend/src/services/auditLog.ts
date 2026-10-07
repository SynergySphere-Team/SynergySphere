import { newId, queryOne } from '../lib/db.js';

export interface AuditLogEntry {
  userId?: string | null;
  adminName: string;
  action: string;
  targetType?: string | null;
  targetId?: string | string[] | null;
  description: string;
  metadata?: Record<string, unknown> | null;
}

export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    const targetIdStr = Array.isArray(entry.targetId) ? entry.targetId[0] : (entry.targetId || null);
    await queryOne(
      `INSERT INTO "AdminAuditLog" (
         "id", "userId", "adminName", "action", "targetType", "targetId", "description", "metadata", "createdAt"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        newId(),
        entry.userId || null,
        entry.adminName,
        entry.action,
        entry.targetType || null,
        targetIdStr,
        entry.description,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ],
    );
  } catch (error) {
    console.error('Failed to write admin audit log:', error);
  }
}
