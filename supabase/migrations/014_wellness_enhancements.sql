-- Migration 014: Wellness Enhancements for Micro-Tracking, Tags, and Gamification Badges

ALTER TABLE "Wellness" ADD COLUMN IF NOT EXISTS "sleepHours" NUMERIC(3, 1);
ALTER TABLE "Wellness" ADD COLUMN IF NOT EXISTS "waterIntake" INTEGER;
ALTER TABLE "Wellness" ADD COLUMN IF NOT EXISTS "tags" TEXT[];
ALTER TABLE "Wellness" ADD COLUMN IF NOT EXISTS "gratitude" TEXT;

-- Seed Milestone Badges if not exist
INSERT INTO "Badge" ("id", "name", "description", "xpRequired", "icon")
VALUES 
  ('badge-mindful-coder', 'Mindful Coder', 'Maintain a 3-day consecutive wellness check-in streak', 50, 'wellness'),
  ('badge-balance-master', 'Balance Master', 'Maintain a 7-day consecutive wellness check-in streak and mindful work-life pacing', 150, 'award')
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "xpRequired" = EXCLUDED."xpRequired",
  "icon" = EXCLUDED."icon";
