-- Migration 008: SynergySphere Interviews, Portfolio, and Community Production Upgrade

-- 1. InterviewAttempt: tracks granular attempts per question to prevent duplicates and evaluate weak areas
CREATE TABLE IF NOT EXISTS "InterviewAttempt" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "interviewId" TEXT NOT NULL REFERENCES "Interview"("id") ON DELETE CASCADE,
  "questionId" TEXT NOT NULL,
  "questionIndex" INTEGER NOT NULL,
  "answer" TEXT,
  "scratchCode" TEXT,
  "score" INTEGER,
  "feedback" TEXT,
  "rubricCoverage" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "InterviewAttempt_userId_questionId_score_idx" ON "InterviewAttempt"("userId", "questionId", "score");
CREATE INDEX IF NOT EXISTS "InterviewAttempt_interviewId_idx" ON "InterviewAttempt"("interviewId");

-- 2. PortfolioProfile: persists GitHub/LinkedIn links and career profile metadata across web & mobile
CREATE TABLE IF NOT EXISTS "PortfolioProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "githubUrl" TEXT,
  "linkedinUrl" TEXT,
  "headline" TEXT,
  "about" TEXT,
  "location" TEXT,
  "targetRole" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. PortfolioSkill: manual or custom skills stored in DB with category and source
CREATE TABLE IF NOT EXISTS "PortfolioSkill" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 50,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "category" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioSkill_userId_name_key" UNIQUE ("userId", "name")
);

CREATE INDEX IF NOT EXISTS "PortfolioSkill_userId_idx" ON "PortfolioSkill"("userId");

-- 4. Project enhancements: techStack, teamCapacity, deliverableType, creatorId
ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "techStack" TEXT,
  ADD COLUMN IF NOT EXISTS "teamCapacity" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "deliverableType" TEXT DEFAULT 'Software Solution',
  ADD COLUMN IF NOT EXISTS "creatorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Project_creatorId_idx" ON "Project"("creatorId");
