-- 018_indexes_and_certificates.sql
-- High performance query indexes and verifiable track certificates.

-- Composite and lookup indexes
CREATE INDEX IF NOT EXISTS "idx_community_message_channel_created"
  ON "CommunityMessage" ("channelId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_challenge_attempt_user_passed"
  ON "ChallengeAttempt" ("userId", "passed");

CREATE INDEX IF NOT EXISTS "idx_task_user_status"
  ON "Task" ("userId", "status");

CREATE INDEX IF NOT EXISTS "idx_support_ticket_user_status"
  ON "SupportTicket" ("userId", "status");

CREATE INDEX IF NOT EXISTS "idx_activity_event_project_date"
  ON "ActivityEvent" ("projectId", "occurredAt" DESC);

-- Verifiable Track Certificates table
CREATE TABLE IF NOT EXISTS "TrackCertificate" (
  "id" TEXT PRIMARY KEY,
  "certificateNumber" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "trackId" TEXT NOT NULL,
  "trackTitle" TEXT NOT NULL,
  "studentName" TEXT NOT NULL,
  "completedLessons" INTEGER NOT NULL,
  "totalLessons" INTEGER NOT NULL,
  "verificationHash" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrackCertificate_userId_trackId_key" UNIQUE ("userId", "trackId")
);

CREATE INDEX IF NOT EXISTS "idx_track_certificate_hash"
  ON "TrackCertificate" ("verificationHash");
