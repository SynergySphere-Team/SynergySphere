-- SynergySphere initial PostgreSQL schema.
-- This schema is used by the lightweight pg data layer and Supabase/local Postgres.

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'STUDENT',
  "profilePicture" TEXT,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Skill" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "skillName" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Skill_userId_skillName_key" UNIQUE ("userId", "skillName")
);

CREATE TABLE IF NOT EXISTS "Task" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'TODO',
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Wellness" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "stressLevel" INTEGER NOT NULL,
  "mood" INTEGER NOT NULL,
  "energyLevel" INTEGER NOT NULL,
  "notes" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Challenge" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL UNIQUE,
  "difficulty" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "language" TEXT,
  "starterCode" TEXT,
  "solution" TEXT,
  "xpReward" INTEGER NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ChallengeAttempt" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "challengeId" TEXT NOT NULL REFERENCES "Challenge"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL,
  "passed" BOOLEAN NOT NULL DEFAULT FALSE,
  "xpEarned" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "location" TEXT,
  "organization" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requirements" TEXT,
  "xpReward" INTEGER NOT NULL DEFAULT 200,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProjectApplication" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "deliverable" TEXT,
  "rating" INTEGER,
  "feedback" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectApplication_projectId_userId_key" UNIQUE ("projectId", "userId")
);

CREATE TABLE IF NOT EXISTS "Interview" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "topic" TEXT NOT NULL,
  "score" INTEGER,
  "feedback" TEXT,
  "weakAreas" JSONB,
  "questions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Badge" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL,
  "icon" TEXT,
  "xpRequired" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "UserBadge" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "badgeId" TEXT NOT NULL REFERENCES "Badge"("id") ON DELETE CASCADE,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBadge_userId_badgeId_key" UNIQUE ("userId", "badgeId")
);

CREATE TABLE IF NOT EXISTS "Portfolio" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "projectLink" TEXT,
  "githubLink" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "LectureUpload" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "content" TEXT,
  "summary" TEXT,
  "flashcards" JSONB,
  "quiz" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "type" TEXT NOT NULL DEFAULT 'info',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Skill_userId_idx" ON "Skill"("userId");
CREATE INDEX IF NOT EXISTS "Task_userId_status_idx" ON "Task"("userId", "status");
CREATE INDEX IF NOT EXISTS "Task_userId_createdAt_idx" ON "Task"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Wellness_userId_date_idx" ON "Wellness"("userId", "date");
CREATE INDEX IF NOT EXISTS "Challenge_difficulty_idx" ON "Challenge"("difficulty");
CREATE INDEX IF NOT EXISTS "ChallengeAttempt_userId_passed_idx" ON "ChallengeAttempt"("userId", "passed");
CREATE INDEX IF NOT EXISTS "ChallengeAttempt_userId_challengeId_passed_idx" ON "ChallengeAttempt"("userId", "challengeId", "passed");
CREATE INDEX IF NOT EXISTS "ChallengeAttempt_challengeId_idx" ON "ChallengeAttempt"("challengeId");
CREATE INDEX IF NOT EXISTS "Project_isActive_createdAt_idx" ON "Project"("isActive", "createdAt");
CREATE INDEX IF NOT EXISTS "ProjectApplication_userId_idx" ON "ProjectApplication"("userId");
CREATE INDEX IF NOT EXISTS "ProjectApplication_projectId_idx" ON "ProjectApplication"("projectId");
CREATE INDEX IF NOT EXISTS "Interview_userId_createdAt_idx" ON "Interview"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Badge_xpRequired_idx" ON "Badge"("xpRequired");
CREATE INDEX IF NOT EXISTS "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");
CREATE INDEX IF NOT EXISTS "Portfolio_userId_createdAt_idx" ON "Portfolio"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "LectureUpload_userId_createdAt_idx" ON "LectureUpload"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
