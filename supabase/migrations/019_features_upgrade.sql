-- Migration 019: Multi-thread AI chat, Spaced Repetition (SRS) Flashcards, and Collaboration upgrades

CREATE TABLE IF NOT EXISTS "AiChatThread" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL DEFAULT 'New Conversation',
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "contextType" TEXT,
  "contextId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ai_chat_thread_user_updated"
  ON "AiChatThread" ("userId", "pinned" DESC, "updatedAt" DESC);

ALTER TABLE "AiChatMessage"
  ADD COLUMN IF NOT EXISTS "threadId" TEXT REFERENCES "AiChatThread"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_ai_chat_message_thread_created"
  ON "AiChatMessage" ("threadId", "createdAt" ASC);

CREATE TABLE IF NOT EXISTS "FlashcardReview" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "uploadId" TEXT,
  "cardKey" TEXT NOT NULL,
  "front" TEXT NOT NULL,
  "back" TEXT NOT NULL,
  "deckTitle" TEXT NOT NULL DEFAULT 'General Study Deck',
  "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  "intervalDays" INTEGER NOT NULL DEFAULT 0,
  "repetitions" INTEGER NOT NULL DEFAULT 0,
  "nextReviewAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastReviewedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "uq_flashcard_review_user_card" UNIQUE ("userId", "cardKey")
);

CREATE INDEX IF NOT EXISTS "idx_flashcard_review_user_due"
  ON "FlashcardReview" ("userId", "nextReviewAt" ASC);
