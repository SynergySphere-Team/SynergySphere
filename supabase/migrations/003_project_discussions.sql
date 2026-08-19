ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "creatorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "ProjectMessage" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Project_creatorId_idx" ON "Project"("creatorId");
CREATE INDEX IF NOT EXISTS "ProjectMessage_projectId_createdAt_idx" ON "ProjectMessage"("projectId", "createdAt");
