import { Router, Response, NextFunction } from 'express';
import { newId, query, queryOne } from '../lib/db.js';
import { AuthRequest, verifyToken, AUTH_COOKIE_NAME } from '../middleware/auth.js';
import { awardXp } from '../services/gamification.js';
import {
  technologiesCatalog,
  w3schoolsProgrammingDomain,
  W3SCHOOLS_BASE_SOURCE,
} from '../data/w3schoolsCurriculumData.js';
import type { LessonSpec, SubjectSpec } from '../data/lectureCurriculumTypes.js';
import { W3SchoolsSyncEngine } from '../services/w3schoolsSyncEngine.js';

const router = Router();

// In-memory fallback tracking for demo/guest users or when DB is offline
const memoryCompletions = new Set<string>();

// Optional auth middleware: extracts user if token exists, but doesn't block guests
function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    let token: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`));
      if (match) token = decodeURIComponent(match[1]);
    }
    if (token) {
      req.user = verifyToken(token);
    }
  } catch {
    // Continue as guest
  }
  next();
}

router.use(optionalAuth);

// Helper to retrieve set of completed lesson IDs for current user
async function getUserCompletions(userId?: string): Promise<Set<string>> {
  const completed = new Set<string>(memoryCompletions);
  if (!userId) return completed;

  try {
    const rows = await query<{ lessonId: string }>(
      `SELECT "lessonId" FROM "LectureLessonProgress" WHERE "userId" = $1`,
      [userId],
    );
    for (const r of rows) {
      completed.add(r.lessonId);
    }
  } catch {
    // DB offline or table empty, fallback to in-memory
  }
  return completed;
}

// Flat list of all lessons with technology and module metadata
interface FlatLessonEntry {
  lesson: LessonSpec;
  subjectId: string;
  subjectName: string;
  moduleId: string;
  moduleName: string;
}

function getAllFlatLessons(): FlatLessonEntry[] {
  const result: FlatLessonEntry[] = [];
  for (const subject of w3schoolsProgrammingDomain.subjects) {
    for (const mod of subject.modules) {
      for (const les of mod.lessons) {
        result.push({
          lesson: les,
          subjectId: subject.id,
          subjectName: subject.name,
          moduleId: mod.id,
          moduleName: mod.name,
        });
      }
    }
  }
  return result;
}

// 1. GET /api/curriculum/technologies - list all technologies with progress
router.get('/technologies', async (req: AuthRequest, res) => {
  const completedSet = await getUserCompletions(req.user?.userId);

  const list = technologiesCatalog.map((tech) => {
    const subject = w3schoolsProgrammingDomain.subjects.find((s) => s.id === tech.id);
    let totalLessons = tech.totalLessons;
    let completedCount = 0;

    if (subject) {
      const techLessons = subject.modules.flatMap((m) => m.lessons);
      totalLessons = techLessons.length;
      completedCount = techLessons.filter((l) => completedSet.has(l.id)).length;
    }

    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return {
      ...tech,
      totalLessons,
      completedLessons: completedCount,
      progressPercent,
    };
  });

  res.json({
    technologies: list,
    syncInfo: {
      source: W3SCHOOLS_BASE_SOURCE.name,
      retrievedAt: W3SCHOOLS_BASE_SOURCE.retrievedAt,
      status: 'synced',
    },
  });
});

// 2. GET /api/curriculum/technologies/:techId - details of a single technology with sections & lessons
router.get('/technologies/:techId', async (req: AuthRequest, res) => {
  const techId = String(req.params.techId || '').toLowerCase();
  const techMeta = technologiesCatalog.find((t) => t.id === techId);
  const subject = w3schoolsProgrammingDomain.subjects.find((s) => s.id === techId);

  if (!techMeta && !subject) {
    res.status(404).json({ error: `Technology '${techId}' not found.` });
    return;
  }

  const completedSet = await getUserCompletions(req.user?.userId);

  if (!subject) {
    // Return placeholder structure for future technologies in the catalog
    res.json({
      id: techMeta!.id,
      name: techMeta!.name,
      category: techMeta!.category,
      description: techMeta!.description,
      icon: techMeta!.icon,
      difficulty: techMeta!.difficulty,
      totalLessons: 0,
      completedLessons: 0,
      progressPercent: 0,
      sourceUrl: techMeta!.sourceUrl,
      modules: [],
      status: 'coming_soon',
    });
    return;
  }

  const allSubjectLessons = subject.modules.flatMap((m) => m.lessons);
  const completedCount = allSubjectLessons.filter((l) => completedSet.has(l.id)).length;
  const progressPercent = allSubjectLessons.length > 0
    ? Math.round((completedCount / allSubjectLessons.length) * 100)
    : 0;

  const modulesWithProgress = subject.modules.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    sortOrder: m.sortOrder,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      overview: l.overview,
      difficulty: l.difficulty,
      sortOrder: l.sortOrder,
      completed: completedSet.has(l.id),
    })),
  }));

  res.json({
    id: subject.id,
    name: subject.name,
    category: techMeta?.category || 'Programming',
    description: subject.description,
    icon: techMeta?.icon || 'code',
    difficulty: techMeta?.difficulty || 'Beginner',
    totalLessons: allSubjectLessons.length,
    completedLessons: completedCount,
    progressPercent,
    sourceUrl: techMeta?.sourceUrl || `https://www.w3schools.com/${subject.id}/`,
    modules: modulesWithProgress,
    status: 'active',
  });
});

// 3. GET /api/curriculum/lessons/:lessonId - full lesson view with code examples, output, prev/next
router.get('/lessons/:lessonId', async (req: AuthRequest, res) => {
  const lessonId = String(req.params.lessonId || '');
  const allEntries = getAllFlatLessons();
  const index = allEntries.findIndex((e) => e.lesson.id === lessonId);

  if (index === -1) {
    res.status(404).json({ error: `Lesson '${lessonId}' not found.` });
    return;
  }

  const entry = allEntries[index];
  const completedSet = await getUserCompletions(req.user?.userId);

  // Sequential previous & next lesson links
  const prevEntry = index > 0 && allEntries[index - 1].subjectId === entry.subjectId ? allEntries[index - 1] : null;
  const nextEntry = index < allEntries.length - 1 && allEntries[index + 1].subjectId === entry.subjectId ? allEntries[index + 1] : null;

  res.json({
    ...entry.lesson,
    subjectId: entry.subjectId,
    subjectName: entry.subjectName,
    moduleId: entry.moduleId,
    moduleName: entry.moduleName,
    completed: completedSet.has(entry.lesson.id),
    previousLesson: prevEntry ? { id: prevEntry.lesson.id, title: prevEntry.lesson.title } : null,
    nextLesson: nextEntry ? { id: nextEntry.lesson.id, title: nextEntry.lesson.title } : null,
    attribution: {
      source: W3SCHOOLS_BASE_SOURCE.name,
      licenseNote: W3SCHOOLS_BASE_SOURCE.licenseNote,
      retrievedAt: W3SCHOOLS_BASE_SOURCE.retrievedAt,
      primaryUrl: entry.lesson.sources[0]?.sourceUrl || `https://www.w3schools.com/${entry.subjectId}/`,
    },
  });
});

// 4. POST /api/curriculum/lessons/:lessonId/progress - mark complete or toggle
router.post('/lessons/:lessonId/progress', async (req: AuthRequest, res) => {
  const lessonId = String(req.params.lessonId || '');
  const allEntries = getAllFlatLessons();
  const entry = allEntries.find((e) => e.lesson.id === lessonId);

  if (!entry) {
    res.status(404).json({ error: `Lesson '${lessonId}' not found.` });
    return;
  }

  const userId = req.user?.userId;
  const desiredCompleted = req.body?.completed !== undefined ? Boolean(req.body.completed) : true;
  let xpEarned = 0;

  if (desiredCompleted) {
    memoryCompletions.add(lessonId);
  } else {
    memoryCompletions.delete(lessonId);
  }

  if (userId) {
    try {
      if (desiredCompleted) {
        const existing = await queryOne<{ id: string }>(
          `SELECT "id" FROM "LectureLessonProgress" WHERE "userId" = $1 AND "lessonId" = $2`,
          [userId, lessonId],
        );
        if (!existing) {
          await queryOne(
            `INSERT INTO "LectureLessonProgress" ("id", "userId", "lessonId") VALUES ($1, $2, $3) RETURNING "id"`,
            [newId(), userId, lessonId],
          );
          // Award 20 XP for completing a curriculum lesson
          xpEarned = 20;
          await awardXp(userId, xpEarned, `Completed W3Schools lesson: ${entry.lesson.title}`);
        }
      } else {
        await query(
          `DELETE FROM "LectureLessonProgress" WHERE "userId" = $1 AND "lessonId" = $2`,
          [userId, lessonId],
        );
      }
    } catch {
      // Non-fatal if DB is temporarily offline
    }
  }

  res.json({
    lessonId,
    completed: desiredCompleted,
    xpEarned,
    message: desiredCompleted ? `Completed '${entry.lesson.title}'!` : `Marked '${entry.lesson.title}' as incomplete.`,
  });
});

// 5. GET /api/curriculum/search - search lessons across technologies
router.get('/search', async (req: AuthRequest, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    res.json({ results: [] });
    return;
  }

  const completedSet = await getUserCompletions(req.user?.userId);
  const allEntries = getAllFlatLessons();

  const results = allEntries
    .filter((entry) => {
      const matchTitle = entry.lesson.title.toLowerCase().includes(q);
      const matchOverview = entry.lesson.overview.toLowerCase().includes(q);
      const matchSubject = entry.subjectName.toLowerCase().includes(q);
      const matchConcepts = entry.lesson.content.keyConcepts?.some((c) =>
        c.title.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q),
      );
      const matchSyntax = entry.lesson.content.syntax?.some((s) => s.toLowerCase().includes(q));
      return matchTitle || matchOverview || matchSubject || matchConcepts || matchSyntax;
    })
    .map((entry) => ({
      id: entry.lesson.id,
      title: entry.lesson.title,
      overview: entry.lesson.overview,
      difficulty: entry.lesson.difficulty,
      subjectId: entry.subjectId,
      subjectName: entry.subjectName,
      moduleId: entry.moduleId,
      moduleName: entry.moduleName,
      completed: completedSet.has(entry.lesson.id),
      snippet: entry.lesson.overview,
    }))
    .slice(0, 20);

  res.json({ query: q, total: results.length, results });
});

// 6. POST /api/curriculum/sync - run dynamic scan, update lessons, flag changes
router.post('/sync', async (req, res) => {
  const targetTech = req.body?.technologyId ? String(req.body.technologyId) : undefined;
  const syncResult = await W3SchoolsSyncEngine.runSync(targetTech);
  res.json({
    source: W3SCHOOLS_BASE_SOURCE.name,
    licenseNote: W3SCHOOLS_BASE_SOURCE.licenseNote,
    ...syncResult,
    message: 'W3Schools educational curriculum synchronization completed successfully.',
  });
});

// 7. GET /api/curriculum/sync/status - status of W3Schools synchronization
router.get('/sync/status', (_req, res) => {
  res.json(W3SchoolsSyncEngine.getStatus());
});

// 8. GET /api/curriculum/sync/review-queue - items flagged for admin review
router.get('/sync/review-queue', (_req, res) => {
  res.json({
    reviewQueue: W3SchoolsSyncEngine.getReviewQueue(),
  });
});

// 9. POST /api/curriculum/sync/review-queue/:lessonId/resolve - resolve admin review
router.post('/sync/review-queue/:lessonId/resolve', (req, res) => {
  const lessonId = String(req.params.lessonId);
  const action = (req.body?.action || 'keep') as 'keep' | 'deprecate' | 'update';
  const result = W3SchoolsSyncEngine.resolveReviewItem(lessonId, action);
  res.json(result);
});

export default router;
