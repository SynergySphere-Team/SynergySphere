-- Migration 015: Productivity Center Task Enhancements
-- Adds duration, break intervals, external link, portfolio boost flag, and time spent tracking

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "targetDurationMinutes" INTEGER DEFAULT 25;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "breakIntervalMinutes" INTEGER DEFAULT 25;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "link" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "pushedToPortfolio" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "timeSpentMinutes" INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Task_userId_pushedToPortfolio_idx" ON "Task"("userId", "pushedToPortfolio");
