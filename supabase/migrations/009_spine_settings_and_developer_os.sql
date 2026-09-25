-- Migration 009: Spine, Settings, Password Reset, AI Memory, and Star Bullets
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT,
  ADD COLUMN IF NOT EXISTS "resetPasswordExpires" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bio" TEXT,
  ADD COLUMN IF NOT EXISTS "theme" TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS "emailNotifications" BOOLEAN DEFAULT true;

-- Allow LectureLessonProgress to reference curriculum lesson IDs (e.g. w3s-*) without FK violation
ALTER TABLE "LectureLessonProgress" DROP CONSTRAINT IF EXISTS "LectureLessonProgress_lessonId_fkey";

CREATE TABLE IF NOT EXISTS "AiChatMessage" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AiChatMessage_userId_createdAt_idx" ON "AiChatMessage"("userId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "PortfolioBullet" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "projectId" TEXT REFERENCES "Project"("id") ON DELETE SET NULL,
  "title" TEXT NOT NULL,
  "bullet" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'COMMUNITY_PR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PortfolioBullet_userId_idx" ON "PortfolioBullet"("userId");
