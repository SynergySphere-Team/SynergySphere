CREATE TABLE IF NOT EXISTS "CommunityFeedPost" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body" TEXT NOT NULL,
  "linkUrl" TEXT,
  "projectId" TEXT REFERENCES "Project"("id") ON DELETE SET NULL,
  "postType" TEXT NOT NULL DEFAULT 'POST',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityFeedPost_postType_check"
    CHECK ("postType" IN ('POST', 'QUESTION', 'PROJECT'))
);

CREATE TABLE IF NOT EXISTS "CommunityFeedLike" (
  "postId" TEXT NOT NULL REFERENCES "CommunityFeedPost"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("postId", "userId")
);

CREATE TABLE IF NOT EXISTS "CommunityFeedComment" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "CommunityFeedPost"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "CommunityFeedPost_createdAt_idx"
ON "CommunityFeedPost" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "CommunityFeedPost_projectId_idx"
ON "CommunityFeedPost" ("projectId");

CREATE INDEX IF NOT EXISTS "CommunityFeedLike_postId_idx"
ON "CommunityFeedLike" ("postId");

CREATE INDEX IF NOT EXISTS "CommunityFeedComment_postId_createdAt_idx"
ON "CommunityFeedComment" ("postId", "createdAt");
