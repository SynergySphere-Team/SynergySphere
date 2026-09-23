-- Migration 007: Link Wellness check-ins to Tasks and Modules

ALTER TABLE "Wellness" ADD COLUMN IF NOT EXISTS "moduleId" TEXT DEFAULT 'GENERAL';
ALTER TABLE "Wellness" ADD COLUMN IF NOT EXISTS "taskId" TEXT REFERENCES "Task"("id") ON DELETE SET NULL;
ALTER TABLE "Wellness" ADD COLUMN IF NOT EXISTS "taskTitle" TEXT;
ALTER TABLE "Wellness" ADD COLUMN IF NOT EXISTS "taskStatus" TEXT;

CREATE INDEX IF NOT EXISTS "Wellness_userId_moduleId_idx" ON "Wellness"("userId", "moduleId");
CREATE INDEX IF NOT EXISTS "Wellness_userId_taskId_idx" ON "Wellness"("userId", "taskId");
