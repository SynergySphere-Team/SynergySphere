CREATE TABLE IF NOT EXISTS "LearningResourceCompletion" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "resourceId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningResourceCompletion_userId_resourceId_key" UNIQUE ("userId", "resourceId")
);

CREATE INDEX IF NOT EXISTS "LearningResourceCompletion_userId_idx" ON "LearningResourceCompletion"("userId");
