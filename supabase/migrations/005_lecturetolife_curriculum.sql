-- LectureToLife programming/software curriculum (separate from personal LectureUpload packs).

CREATE TABLE IF NOT EXISTS "LectureDomain" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "LectureSubject" (
  "id" TEXT PRIMARY KEY,
  "domainId" TEXT NOT NULL REFERENCES "LectureDomain"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "LectureModule" (
  "id" TEXT PRIMARY KEY,
  "subjectId" TEXT NOT NULL REFERENCES "LectureSubject"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "LectureLesson" (
  "id" TEXT PRIMARY KEY,
  "moduleId" TEXT NOT NULL REFERENCES "LectureModule"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "overview" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'review_required',
  "technologyVersion" TEXT,
  "learningObjectives" JSONB NOT NULL DEFAULT '[]',
  "content" JSONB NOT NULL DEFAULT '{}',
  "revisionNotes" JSONB NOT NULL DEFAULT '{}',
  "flashcards" JSONB,
  "quiz" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "LectureLessonSource" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL REFERENCES "LectureLesson"("id") ON DELETE CASCADE,
  "sourceName" TEXT NOT NULL,
  "resourceTitle" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "author" TEXT,
  "publishedDate" TEXT,
  "updatedDate" TEXT,
  "topics" TEXT,
  "licenseNote" TEXT
);

CREATE TABLE IF NOT EXISTS "LectureLessonProgress" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "lessonId" TEXT NOT NULL REFERENCES "LectureLesson"("id") ON DELETE CASCADE,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LectureLessonProgress_userId_lessonId_key" UNIQUE ("userId", "lessonId")
);

CREATE INDEX IF NOT EXISTS "LectureSubject_domainId_idx" ON "LectureSubject"("domainId");
CREATE INDEX IF NOT EXISTS "LectureModule_subjectId_idx" ON "LectureModule"("subjectId");
CREATE INDEX IF NOT EXISTS "LectureLesson_moduleId_idx" ON "LectureLesson"("moduleId");
CREATE INDEX IF NOT EXISTS "LectureLessonSource_lessonId_idx" ON "LectureLessonSource"("lessonId");
CREATE INDEX IF NOT EXISTS "LectureLessonProgress_userId_idx" ON "LectureLessonProgress"("userId");
