-- Community Chat: Discord-like channels, messages, Q&A posts, and replies

-- Chat channels (like Discord channels)
CREATE TABLE IF NOT EXISTS "CommunityChannel" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "type"        TEXT NOT NULL DEFAULT 'chat', -- 'chat' | 'qa'
  "emoji"       TEXT DEFAULT '💬',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default channels
INSERT INTO "CommunityChannel" ("id", "name", "description", "type", "emoji") VALUES
  ('channel-general', 'general', 'General community discussions', 'chat', '💬'),
  ('channel-random',  'random',  'Off-topic and fun stuff',       'chat', '🎲'),
  ('channel-help',    'help',    'Ask for help from the community','qa',  '❓'),
  ('channel-showcase','showcase','Show off your projects',         'chat', '🚀'),
  ('channel-jobs',    'jobs',    'Job opportunities and resources','chat', '💼')
ON CONFLICT ("id") DO NOTHING;

-- Chat messages (for 'chat' type channels)
CREATE TABLE IF NOT EXISTS "CommunityMessage" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "channelId"   TEXT NOT NULL REFERENCES "CommunityChannel"("id") ON DELETE CASCADE,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body"        TEXT NOT NULL CHECK (char_length("body") BETWEEN 1 AND 4000),
  "replyToId"   TEXT REFERENCES "CommunityMessage"("id") ON DELETE SET NULL,
  "editedAt"    TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_message_channel ON "CommunityMessage"("channelId", "createdAt" DESC);

-- Q&A Posts (for 'qa' type channels)
CREATE TABLE IF NOT EXISTS "CommunityPost" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "channelId"   TEXT NOT NULL REFERENCES "CommunityChannel"("id") ON DELETE CASCADE,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title"       TEXT NOT NULL CHECK (char_length("title") BETWEEN 3 AND 300),
  "body"        TEXT NOT NULL CHECK (char_length("body") BETWEEN 1 AND 8000),
  "tags"        TEXT,
  "isSolved"    BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_post_channel ON "CommunityPost"("channelId", "createdAt" DESC);

-- Post replies / answers
CREATE TABLE IF NOT EXISTS "CommunityReply" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "postId"      TEXT NOT NULL REFERENCES "CommunityPost"("id") ON DELETE CASCADE,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body"        TEXT NOT NULL CHECK (char_length("body") BETWEEN 1 AND 4000),
  "isAccepted"  BOOLEAN NOT NULL DEFAULT FALSE,
  "replyToId"   TEXT REFERENCES "CommunityReply"("id") ON DELETE SET NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_reply_post ON "CommunityReply"("postId", "createdAt" ASC);
