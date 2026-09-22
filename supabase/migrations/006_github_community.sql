-- GitHub-backed Community projects. Existing projects remain valid while new
-- projects are linked one-to-one to a GitHub repository.

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "githubOwner" TEXT,
  ADD COLUMN IF NOT EXISTS "githubRepo" TEXT,
  ADD COLUMN IF NOT EXISTS "githubFullName" TEXT,
  ADD COLUMN IF NOT EXISTS "githubNodeId" TEXT,
  ADD COLUMN IF NOT EXISTS "githubUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "githubVisibility" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryLanguage" TEXT,
  ADD COLUMN IF NOT EXISTS "license" TEXT,
  ADD COLUMN IF NOT EXISTS "starterTemplate" TEXT,
  ADD COLUMN IF NOT EXISTS "githubStars" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "githubForks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "contributorAvatars" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "isGithubBacked" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastActivityMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "lastActivityActor" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Project_githubFullName_key"
  ON "Project" ("githubFullName") WHERE "githubFullName" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Project_isGithubBacked_lastActivityAt_idx"
  ON "Project" ("isGithubBacked", "lastActivityAt" DESC);

ALTER TABLE "ProjectApplication"
  ADD COLUMN IF NOT EXISTS "githubUsername" TEXT,
  ADD COLUMN IF NOT EXISTS "message" TEXT,
  ADD COLUMN IF NOT EXISTS "invitationId" INTEGER,
  ADD COLUMN IF NOT EXISTS "invitationSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "xpAwarded" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS "GithubToken" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "githubUserId" BIGINT NOT NULL,
  "githubUsername" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "encryptedAccessToken" TEXT NOT NULL,
  "tokenUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "GithubToken_githubUserId_key" ON "GithubToken" ("githubUserId");
CREATE INDEX IF NOT EXISTS "GithubToken_githubUsername_idx" ON "GithubToken" ("githubUsername");

CREATE TABLE IF NOT EXISTS "GithubDeviceAuthorization" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "encryptedDeviceCode" TEXT NOT NULL,
  "userCode" TEXT NOT NULL,
  "verificationUri" TEXT NOT NULL,
  "verificationUriComplete" TEXT,
  "intervalSeconds" INTEGER NOT NULL DEFAULT 5,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "GithubDeviceAuthorization_userId_idx" ON "GithubDeviceAuthorization" ("userId", "expiresAt" DESC);

CREATE TABLE IF NOT EXISTS "ActivityEvent" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "githubEventId" TEXT,
  "type" TEXT NOT NULL,
  "actorLogin" TEXT,
  "actorAvatarUrl" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "url" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ActivityEvent_githubEventId_key"
  ON "ActivityEvent" ("githubEventId") WHERE "githubEventId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "ActivityEvent_projectId_occurredAt_idx" ON "ActivityEvent" ("projectId", "occurredAt" DESC);

CREATE TABLE IF NOT EXISTS "PushToken" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "platform" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PushToken_userId_idx" ON "PushToken" ("userId");
