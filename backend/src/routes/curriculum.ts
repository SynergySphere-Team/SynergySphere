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
import { materializeLesson } from '../data/curriculumLessonMaterial.js';
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
      for (const [lessonIndex, sourceLesson] of mod.lessons.entries()) {
        const les = materializeLesson(
          sourceLesson,
          subject,
          mod,
          mod.lessons[lessonIndex - 1]?.title,
        );
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
    lessons: m.lessons.map((sourceLesson, lessonIndex) => {
      const l = materializeLesson(
        sourceLesson,
        subject,
        m,
        m.lessons[lessonIndex - 1]?.title,
      );
      return {
        id: l.id,
        title: l.title,
        overview: l.overview,
        difficulty: l.difficulty,
        sortOrder: l.sortOrder,
        completed: completedSet.has(l.id),
      };
    }),
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

// ── 10. Role Paths (Curated Tracks with Lessons, Challenges & Interview Tags) ──
router.get('/role-paths', async (req: AuthRequest, res) => {
  const completions = await getUserCompletions(req.user?.userId);

  // Fetch passed challenges if user is logged in
  const passedChallengeIds = new Set<string>();
  if (req.user?.userId) {
    const passedRows = await query<{ challengeId: string }>(
      `SELECT "challengeId" FROM "ChallengeAttempt" WHERE "userId" = $1 AND "passed" = true`,
      [req.user.userId],
    ).catch(() => []);
    for (const r of passedRows) passedChallengeIds.add(r.challengeId);
  }

  const rolePaths = [
    {
      id: 'backend-intern',
      title: 'Backend Intern (Java & SQL)',
      tagline: 'From syntax to database persistence, query optimization, and REST API microservices.',
      targetRole: 'Junior Backend Developer',
      icon: 'database',
      color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30',
      subjectIds: ['java', 'sql'],
      curatedLessonIds: [
        'w3s-java-java-intro',
        'w3s-java-java-get-started',
        'w3s-java-java-syntax',
        'w3s-java-java-variables',
        'w3s-java-java-data-types',
        'w3s-java-java-type-casting',
        'w3s-java-java-operators',
        'w3s-java-java-strings',
        'w3s-java-java-math',
        'w3s-java-java-booleans',
        'w3s-java-java-if...else',
        'w3s-java-java-switch',
        'w3s-java-java-while-loop',
        'w3s-java-java-for-loop',
        'w3s-java-java-break/continue',
        'w3s-java-java-arrays',
        'w3s-java-java-methods',
        'w3s-java-java-classes/objects',
        'w3s-java-java-oop',
        'w3s-java-java-class-attributes',
        'w3s-java-java-class-methods',
        'w3s-java-java-constructors',
        'w3s-java-java-modifiers',
        'w3s-java-java-encapsulation',
        'w3s-java-java-packages-/-api',
        'w3s-java-java-inheritance',
        'w3s-java-java-polymorphism',
        'w3s-java-java-inner-classes',
        'w3s-java-java-abstraction',
        'w3s-java-java-interface',
        'w3s-java-java-enums',
        'w3s-java-java-user-input',
        'w3s-java-java-date',
        'w3s-java-java-arraylist',
        'w3s-java-java-linkedlist',
        'w3s-java-java-hashmap',
        'w3s-java-java-hashset',
        'w3s-java-java-iterator',
        'w3s-java-java-wrapper-classes',
        'w3s-java-java-exceptions',
        'w3s-java-java-regex',
        'w3s-java-java-threads',
        'w3s-java-java-lambda',
        'w3s-sql-sql-intro',
        'w3s-sql-sql-syntax',
        'w3s-sql-sql-select',
        'w3s-sql-sql-where',
        'w3s-sql-sql-order-by',
        'w3s-sql-sql-insert-into',
        'w3s-sql-sql-null-values',
        'w3s-sql-sql-update',
        'w3s-sql-sql-delete',
        'w3s-sql-sql-min-and-max',
        'w3s-sql-sql-count',
        'w3s-sql-sql-like',
        'w3s-sql-sql-wildcards',
        'w3s-sql-sql-in',
        'w3s-sql-sql-between',
        'w3s-sql-sql-joins',
        'w3s-sql-sql-inner-join',
        'w3s-sql-sql-left-join',
        'w3s-sql-sql-right-join',
        'w3s-sql-sql-group-by',
      ],
      recommendedChallenges: [
        { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50 },
        { id: 'js-sum-array', title: 'Sum Array', difficulty: 'EASY', xpReward: 50 },
        { id: 'js-fizzbuzz', title: 'FizzBuzz', difficulty: 'MEDIUM', xpReward: 75 },
        { id: 'sql-top-students', title: 'SQL: Top Students', difficulty: 'MEDIUM', xpReward: 75 },
        { id: 'js-binary-search', title: 'Binary Search', difficulty: 'HARD', xpReward: 100 },
      ],
      interviewTags: ['java', 'sql', 'spring-jpa-n1', 'concurrency', 'transactions'],
    },
    {
      id: 'frontend-intern',
      title: 'Frontend Intern (HTML, CSS, JS & React)',
      tagline: 'Modern accessible UI components, reactive state, DOM events, and client performance.',
      targetRole: 'Junior Frontend Developer',
      icon: 'layout',
      color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
      subjectIds: ['html', 'css', 'javascript', 'react'],
      curatedLessonIds: [
        'w3s-html-html-intro',
        'w3s-html-html-editors',
        'w3s-html-html-basic',
        'w3s-html-html-elements',
        'w3s-html-html-attributes',
        'w3s-html-html-headings',
        'w3s-html-html-paragraphs',
        'w3s-html-html-styles',
        'w3s-html-html-formatting',
        'w3s-html-html-links',
        'w3s-html-html-images',
        'w3s-html-html-tables',
        'w3s-html-html-lists',
        'w3s-html-html-block-and-inline',
        'w3s-html-html-classes',
        'w3s-html-html-id',
        'w3s-html-html-forms',
        'w3s-css-css-intro',
        'w3s-css-css-syntax',
        'w3s-css-css-selectors',
        'w3s-css-css-box-model',
        'w3s-css-css-flexbox',
        'w3s-css-css-grid',
        'w3s-javascript-js-intro',
        'w3s-javascript-js-variables',
        'w3s-javascript-js-functions',
        'w3s-javascript-js-objects',
        'w3s-javascript-js-arrays',
        'w3s-javascript-js-arrow-function',
        'w3s-javascript-js-async',
        'w3s-react-react-intro',
        'w3s-react-react-get-started',
        'w3s-react-react-jsx',
        'w3s-react-react-components',
        'w3s-react-react-props',
        'w3s-react-react-state',
        'w3s-react-react-hooks',
        'w3s-react-react-usestate',
        'w3s-react-react-useeffect',
      ],
      recommendedChallenges: [
        { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50 },
        { id: 'js-sum-array', title: 'Sum Array', difficulty: 'EASY', xpReward: 50 },
        { id: 'js-fizzbuzz', title: 'FizzBuzz', difficulty: 'MEDIUM', xpReward: 75 },
        { id: 'js-valid-parentheses', title: 'Valid Parentheses', difficulty: 'MEDIUM', xpReward: 80 },
      ],
      interviewTags: ['javascript', 'react', 'css', 'html', 'accessibility'],
    },
    {
      id: 'fullstack-engineer',
      title: 'Full-Stack Developer (Node, React & SQL)',
      tagline: 'End-to-end applications: REST/WebSocket APIs, relational data models, and reactive frontend.',
      targetRole: 'Junior Full-Stack Engineer',
      icon: 'layers',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
      subjectIds: ['nodejs', 'react', 'sql', 'typescript'],
      curatedLessonIds: [
        'w3s-nodejs-node.js-intro',
        'w3s-nodejs-node.js-get-started',
        'w3s-nodejs-node.js-modules',
        'w3s-nodejs-node.js-http-module',
        'w3s-nodejs-node.js-file-system',
        'w3s-nodejs-node.js-url-module',
        'w3s-nodejs-node.js-events',
        'w3s-typescript-ts-intro',
        'w3s-typescript-ts-simple-types',
        'w3s-typescript-ts-arrays',
        'w3s-typescript-ts-tuples',
        'w3s-typescript-ts-object-types',
        'w3s-typescript-ts-enums',
        'w3s-typescript-ts-aliases-and-interfaces',
        'w3s-typescript-ts-union-types',
        'w3s-typescript-ts-functions',
        'w3s-react-react-intro',
        'w3s-react-react-hooks',
        'w3s-react-react-useeffect',
        'w3s-sql-sql-intro',
        'w3s-sql-sql-select',
        'w3s-sql-sql-where',
        'w3s-sql-sql-joins',
      ],
      recommendedChallenges: [
        { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50 },
        { id: 'js-sum-array', title: 'Sum Array', difficulty: 'EASY', xpReward: 50 },
        { id: 'sql-top-students', title: 'SQL: Top Students', difficulty: 'MEDIUM', xpReward: 75 },
        { id: 'js-binary-search', title: 'Binary Search', difficulty: 'HARD', xpReward: 100 },
      ],
      interviewTags: ['nodejs', 'react', 'sql', 'typescript', 'system-design'],
    },
  ];

  const enrichedPaths = rolePaths.map((rp) => {
    const total = rp.curatedLessonIds.length;
    const completedCount = rp.curatedLessonIds.filter((id) => completions.has(id)).length;
    const percent = Math.min(100, Math.round((completedCount / Math.max(total, 1)) * 100));

    const challengesWithStatus = rp.recommendedChallenges.map((c) => ({
      ...c,
      passed: passedChallengeIds.has(c.id),
    }));

    return {
      ...rp,
      totalLessons: total,
      completedLessons: completedCount,
      percent,
      recommendedChallenges: challengesWithStatus,
    };
  });

  res.json({ paths: enrichedPaths });
});

// ── 11. Spaced Repetition (SM-2) Flashcard Daily Review ──
router.get('/flashcards/daily-review', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    // Sample review cards for daily practice
    const cards = [
      {
        id: 'fc-1',
        topic: 'Java Collections',
        question: 'What is the time complexity of searching by key in a HashMap vs a TreeMap?',
        answer: 'HashMap provides O(1) average time via hash buckets. TreeMap provides O(log n) time using a Red-Black balanced binary search tree.',
        lessonId: 'w3s-java-java-hashmap',
        subjectId: 'java',
      },
      {
        id: 'fc-2',
        topic: 'SQL Joins',
        question: 'What is the difference between LEFT JOIN and INNER JOIN?',
        answer: 'INNER JOIN returns only rows that have matching values in both tables. LEFT JOIN returns all rows from the left table and matched rows from the right table (filling NULLs when no match exists).',
        lessonId: 'w3s-sql-sql-joins',
        subjectId: 'sql',
      },
      {
        id: 'fc-3',
        topic: 'JavaScript Concurrency',
        question: 'How does the Event Loop handle the Microtask Queue vs the Macrotask (Callback) Queue?',
        answer: 'The event loop executes ALL pending microtasks (Promises, queueMicrotask, MutationObserver) immediately after the current synchronous stack empties, BEFORE picking up the next macrotask (setTimeout, setInterval).',
        lessonId: 'w3s-javascript-js-async',
        subjectId: 'javascript',
      },
      {
        id: 'fc-4',
        topic: 'React Performance',
        question: 'When should you use useCallback vs useMemo?',
        answer: 'useCallback caches a function instance between renders to prevent unnecessary re-renders of memoized child components. useMemo caches the calculated return value of an expensive computational operation.',
        lessonId: 'w3s-react-react-hooks',
        subjectId: 'react',
      },
      {
        id: 'fc-5',
        topic: 'HTTP & APIs',
        question: 'What makes an HTTP method "idempotent"? Which standard methods are idempotent?',
        answer: 'An operation is idempotent if executing it multiple times produces the identical side-effect on the server as executing it once. GET, PUT, and DELETE are idempotent; POST is typically not.',
        lessonId: 'w3s-nodejs-node.js-http-module',
        subjectId: 'nodejs',
      },
    ];

    res.json({
      cards,
      dueCount: cards.length,
      estimatedMinutes: 5,
    });
  } catch (error) {
    console.error('Error fetching daily flashcards:', error);
    res.status(500).json({ error: 'Could not fetch flashcard review' });
  }
});

router.post('/flashcards/review', async (req: AuthRequest, res) => {
  try {
    const { cardId, rating } = req.body; // rating: 1 (again) to 5 (easy)
    if (req.user?.userId) {
      await awardXp(req.user.userId, 10, 'Completed daily flashcard review');
    }
    res.json({ success: true, cardId, rating, nextReviewDays: rating >= 4 ? 4 : 1 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record flashcard review' });
  }
});

export default router;
