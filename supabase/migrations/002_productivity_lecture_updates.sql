-- Productivity and LectureToLife schema updates

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "learnedNote" TEXT;

ALTER TABLE "LectureUpload" ADD COLUMN IF NOT EXISTS "miniProjects" JSONB;
ALTER TABLE "LectureUpload" ADD COLUMN IF NOT EXISTS "codingExercises" JSONB;

CREATE TABLE IF NOT EXISTS "FocusSession" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "durationMinutes" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FocusSession_userId_completedAt_idx" ON "FocusSession"("userId", "completedAt");
