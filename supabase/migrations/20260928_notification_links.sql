ALTER TABLE "Notification"
ADD COLUMN IF NOT EXISTS "link" TEXT;

CREATE INDEX IF NOT EXISTS "Notification_user_read_created_idx"
ON "Notification" (
  "userId",
  "read",
  "createdAt" DESC
);
