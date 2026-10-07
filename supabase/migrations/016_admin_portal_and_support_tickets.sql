-- Migration 016: SynergySphere Admin Portal, RBAC, Tickets, Complaints, Events & Moderation

-- 1. Extend "User" table for administrative approvals, statuses, and student identifiers
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "studentId" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- 2. Support Ticket Sequence for human-readable IDs like SS-1048
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START WITH 1048;

-- 3. Support Tickets Table
CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT PRIMARY KEY,
  "ticketNumber" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "adminNotes" TEXT,
  "resolvedBy" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "assignedTo" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "attachmentName" TEXT,
  "attachmentUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt" DESC);

-- 4. Complaints Table
CREATE TABLE IF NOT EXISTS "Complaint" (
  "id" TEXT PRIMARY KEY,
  "complaintNumber" TEXT NOT NULL UNIQUE,
  "reporterId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "targetType" TEXT NOT NULL, -- 'post', 'comment', 'user', 'event'
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'action_taken'
  "moderatorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "actionTaken" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Complaint_status_idx" ON "Complaint"("status");
CREATE INDEX IF NOT EXISTS "Complaint_targetType_idx" ON "Complaint"("targetType");
CREATE INDEX IF NOT EXISTS "Complaint_createdAt_idx" ON "Complaint"("createdAt" DESC);

-- 5. Moderation enhancements for Community Posts
ALTER TABLE "CommunityPost"
  ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "deleteReason" TEXT,
  ADD COLUMN IF NOT EXISTS "flagCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "CommunityPost_isHidden_isDeleted_idx" ON "CommunityPost"("isHidden", "isDeleted");

-- 6. Events Management Table
CREATE TABLE IF NOT EXISTS "CommunityEvent" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "organizerId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "organizerName" TEXT NOT NULL DEFAULT 'SynergySphere Community',
  "eventDate" TIMESTAMPTZ NOT NULL,
  "location" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 50,
  "status" TEXT NOT NULL DEFAULT 'APPROVED', -- 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ARCHIVED'
  "isFeatured" BOOLEAN NOT NULL DEFAULT FALSE,
  "category" TEXT NOT NULL DEFAULT 'Workshop',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "CommunityEvent_status_eventDate_idx" ON "CommunityEvent"("status", "eventDate");

-- 7. Administrative Audit Log Table
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "adminName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
