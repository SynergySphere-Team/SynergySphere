-- Migration 010: SynergySphere Developer Interview Simulator & Adaptive Practice System

-- 1. Extend Interview table with role, type, difficulty, duration, interviewerStyle, and multidimensional evaluation
ALTER TABLE "Interview"
  ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'Software Developer',
  ADD COLUMN IF NOT EXISTS "interviewType" TEXT DEFAULT 'Technical Interview',
  ADD COLUMN IF NOT EXISTS "difficulty" TEXT DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS "duration" INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS "programmingLanguage" TEXT DEFAULT 'C#',
  ADD COLUMN IF NOT EXISTS "interviewerStyle" TEXT DEFAULT 'Professional',
  ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS "hintsUsed" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "evaluation" JSONB,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Interview_userId_role_idx" ON "Interview"("userId", "role");

-- 2. UserTopicProgress: tracks granular mastery per topic for weak-area detection and adaptive recommendations
CREATE TABLE IF NOT EXISTS "UserTopicProgress" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "topic" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Programming',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "correctAnswers" INTEGER NOT NULL DEFAULT 0,
  "incorrectAnswers" INTEGER NOT NULL DEFAULT 0,
  "partialAnswers" INTEGER NOT NULL DEFAULT 0,
  "hintsUsed" INTEGER NOT NULL DEFAULT 0,
  "averagePerformance" INTEGER NOT NULL DEFAULT 0,
  "currentLevel" TEXT NOT NULL DEFAULT 'Needs Practice', -- 'Not Started' | 'Needs Practice' | 'Developing' | 'Improving' | 'Strong'
  "lastPractisedAt" TIMESTAMP(3),
  "lastAssessedAt" TIMESTAMP(3),
  "improvementTrend" TEXT NOT NULL DEFAULT 'flat', -- 'up' | 'flat' | 'down'
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserTopicProgress_userId_topic_key" UNIQUE ("userId", "topic")
);

CREATE INDEX IF NOT EXISTS "UserTopicProgress_userId_level_idx" ON "UserTopicProgress"("userId", "currentLevel");
CREATE INDEX IF NOT EXISTS "UserTopicProgress_userId_updatedAt_idx" ON "UserTopicProgress"("userId", "updatedAt");

-- 3. PracticeSession: tracks dedicated focused practice sessions
CREATE TABLE IF NOT EXISTS "PracticeSession" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "topic" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Programming',
  "difficulty" TEXT NOT NULL DEFAULT 'medium',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "questionsCompleted" INTEGER NOT NULL DEFAULT 0,
  "correctAnswers" INTEGER NOT NULL DEFAULT 0,
  "hintsUsed" INTEGER NOT NULL DEFAULT 0,
  "performance" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS', -- 'IN_PROGRESS' | 'COMPLETED'
  "previousLevel" TEXT,
  "newLevel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PracticeSession_userId_idx" ON "PracticeSession"("userId");
CREATE INDEX IF NOT EXISTS "PracticeSession_topic_idx" ON "PracticeSession"("topic");

-- 4. PracticeQuestionResult: granular answers in a focused practice session
CREATE TABLE IF NOT EXISTS "PracticeQuestionResult" (
  "id" TEXT PRIMARY KEY,
  "practiceSessionId" TEXT NOT NULL REFERENCES "PracticeSession"("id") ON DELETE CASCADE,
  "questionId" TEXT NOT NULL,
  "answer" TEXT,
  "correct" BOOLEAN NOT NULL DEFAULT false,
  "hintsUsed" INTEGER NOT NULL DEFAULT 0,
  "timeTaken" INTEGER NOT NULL DEFAULT 0,
  "feedback" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PracticeQuestionResult_sessionId_idx" ON "PracticeQuestionResult"("practiceSessionId");
