import { Router, Response, NextFunction } from 'express';
import { newId, query, queryOne } from '../lib/db.js';
import { AuthRequest, verifyToken, AUTH_COOKIE_NAME } from '../middleware/auth.js';
import { awardXp } from '../services/gamification.js';
import {
  technologiesCatalog,
  w3schoolsProgrammingDomain,
  W3SCHOOLS_BASE_SOURCE,
} from '../data/w3schoolsCurriculumData.js';
import { W3SchoolsSyncEngine } from '../services/w3schoolsSyncEngine.js';
import { getCanonicalLessonId, getAliasesForLesson } from '../data/curriculumAliases.js';
import { findLessonEntry, getAllFlatLessons, invalidateLessonCatalog } from '../data/curriculumCatalog.js';

const router = Router();

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

// Completed lesson IDs (canonical + legacy aliases) for the signed-in user.
async function getUserCompletions(userId?: string): Promise<Set<string>> {
  const completed = new Set<string>();
  if (!userId) return completed;

  try {
    const rows = await query<{ lessonId: string }>(
      `SELECT "lessonId" FROM "LectureLessonProgress" WHERE "userId" = $1`,
      [userId],
    );
    for (const r of rows) {
      completed.add(r.lessonId);
      const canon = getCanonicalLessonId(r.lessonId);
      if (canon) completed.add(canon);
      for (const alias of getAliasesForLesson(r.lessonId)) {
        completed.add(alias);
      }
    }
  } catch {
    // DB offline: report no completions rather than failing the request
  }
  return completed;
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
    lessons: m.lessons.map((sourceLesson) => {
      const l = findLessonEntry(sourceLesson.id)?.entry.lesson ?? sourceLesson;
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
  const match = findLessonEntry(lessonId);

  if (!match) {
    res.status(404).json({ error: `Lesson '${lessonId}' not found.` });
    return;
  }

  const { entry, index } = match;
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
    completed: completedSet.has(entry.lesson.id) || completedSet.has(lessonId),
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
  const match = findLessonEntry(lessonId);

  if (!match) {
    res.status(404).json({ error: `Lesson '${lessonId}' not found.` });
    return;
  }

  const entry = match.entry;
  const canonicalId = entry.lesson.id;
  const userId = req.user?.userId;
  const desiredCompleted = req.body?.completed !== undefined ? Boolean(req.body.completed) : true;
  let xpEarned = 0;

  if (userId) {
    try {
      if (desiredCompleted) {
        // Single round trip: insert only if neither the canonical nor the requested alias is recorded.
        const inserted = await queryOne<{ id: string }>(
          `INSERT INTO "LectureLessonProgress" ("id", "userId", "lessonId")
           SELECT $1, $2, $3
           WHERE NOT EXISTS (
             SELECT 1 FROM "LectureLessonProgress"
             WHERE "userId" = $2 AND ("lessonId" = $3 OR "lessonId" = $4)
           )
           RETURNING "id"`,
          [newId(), userId, canonicalId, lessonId],
        );
        if (inserted) {
          // Award 20 XP for completing a curriculum lesson
          xpEarned = 20;
          await awardXp(userId, xpEarned, `Completed W3Schools lesson: ${entry.lesson.title}`);
        }
      } else {
        await query(
          `DELETE FROM "LectureLessonProgress" WHERE "userId" = $1 AND ("lessonId" = $2 OR "lessonId" = $3)`,
          [userId, canonicalId, lessonId],
        );
      }
    } catch {
      // Non-fatal if DB is temporarily offline
    }
  }

  res.json({
    lessonId: canonicalId,
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
  invalidateLessonCatalog();
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
  invalidateLessonCatalog();
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
        'java-java-tutorial-java-introduction',
        'java-java-tutorial-java-get-started',
        'java-java-tutorial-java-syntax',
        'java-java-tutorial-java-variables',
        'java-java-tutorial-java-data-types',
        'java-java-tutorial-java-type-casting',
        'java-java-tutorial-java-operators',
        'java-java-tutorial-java-strings',
        'java-java-tutorial-java-math',
        'java-java-tutorial-java-booleans',
        'java-java-tutorial-java-if-else',
        'java-java-tutorial-java-switch',
        'java-java-tutorial-java-while-loop',
        'java-java-tutorial-java-for-loop',
        'java-java-tutorial-java-break-continue',
        'java-java-tutorial-java-arrays',
        'java-java-methods-java-methods',
        'java-java-classes-java-classes-objects',
        'java-java-classes-java-oop',
        'java-java-classes-java-class-attributes',
        'java-java-classes-java-class-methods',
        'java-java-classes-java-constructors',
        'java-java-classes-java-modifiers',
        'java-java-classes-java-encapsulation',
        'java-java-classes-java-packages-api',
        'java-java-classes-java-inheritance',
        'java-java-classes-java-polymorphism',
        'java-java-classes-java-inner-classes',
        'java-java-classes-java-abstraction',
        'java-java-classes-java-interface',
        'java-java-classes-java-enum',
        'java-java-input-and-date-java-user-input',
        'java-java-input-and-date-java-date',
        'java-java-reference-java-arraylist-methods',
        'java-java-reference-java-linkedlist-methods',
        'java-java-collections-and-built-in-classes-java-hashmap',
        'java-java-collections-and-built-in-classes-java-collections',
        'java-java-i-o-streams-java-iterator',
        'java-java-errors-java-exceptions',
        'sql-sql-fundamentals-sql-introduction',
        'sql-sql-fundamentals-sql-syntax',
        'sql-sql-fundamentals-sql-select',
        'sql-sql-fundamentals-sql-where',
        'sql-sql-fundamentals-sql-order-by',
        'sql-sql-fundamentals-sql-insert-into',
        'sql-sql-fundamentals-sql-null-values',
        'sql-sql-fundamentals-sql-update',
        'sql-sql-fundamentals-sql-delete',
        'sql-sql-functions-sql-min',
        'sql-sql-functions-sql-count',
        'sql-sql-functions-sql-like',
        'sql-sql-functions-sql-wildcards',
        'sql-sql-functions-sql-in',
        'sql-sql-functions-sql-between',
        'sql-sql-joins-sql-joins',
        'sql-sql-joins-sql-inner-join',
        'sql-sql-joins-sql-left-join',
        'sql-sql-joins-sql-right-join',
        'sql-sql-grouping-and-conditions-sql-group-by',
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
        'html-html-tutorial-html-introduction',
        'html-html-tutorial-html-editors',
        'html-html-tutorial-html-basic',
        'html-html-tutorial-html-elements',
        'html-html-tutorial-html-attributes',
        'html-html-tutorial-html-headings',
        'html-html-tutorial-html-paragraphs',
        'html-html-tutorial-html-styles',
        'html-html-tutorial-html-formatting',
        'html-html-tutorial-html-links',
        'html-html-tutorial-html-images',
        'html-html-tutorial-html-tables',
        'html-html-tutorial-html-lists',
        'html-html-tutorial-html-block-and-inline',
        'html-html-tutorial-html-classes',
        'html-html-tutorial-html-id',
        'html-html-forms-html-forms',
        'css-css-fundamentals-css-introduction',
        'css-css-fundamentals-css-syntax',
        'css-css-fundamentals-css-selectors',
        'css-css-fundamentals-css-box-model',
        'css-css-responsive-design-css-flexbox',
        'css-css-responsive-design-css-grid',
        'javascript-javascript-fundamentals-javascript-introduction',
        'javascript-javascript-fundamentals-javascript-variables',
        'javascript-javascript-functions-function-introduction',
        'javascript-javascript-objects-object-introduction',
        'javascript-javascript-arrays-javascript-arrays',
        'javascript-javascript-functions-arrow-functions',
        'javascript-javascript-asynchronous-programming-async-await',
        'react-react-fundamentals-react-introduction',
        'react-react-fundamentals-react-get-started',
        'react-react-jsx-jsx-introduction',
        'react-react-components-react-components',
        'react-react-components-react-props',
        'react-react-hooks-what-is-hooks',
        'react-react-hooks-usestate',
        'react-react-hooks-useeffect',
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
        'nodejs-node-js-fundamentals-node-introduction',
        'nodejs-node-js-fundamentals-node-get-started',
        'nodejs-node-js-modules-node-modules',
        'nodejs-node-js-core-modules-http-module',
        'nodejs-node-js-core-modules-file-system',
        'nodejs-node-js-core-modules-url-module',
        'nodejs-node-js-core-modules-events-module',
        'typescript-typescript-fundamentals-typescript-introduction',
        'typescript-typescript-fundamentals-typescript-simple-types',
        'typescript-typescript-fundamentals-typescript-arrays',
        'typescript-typescript-fundamentals-typescript-tuples',
        'typescript-typescript-fundamentals-typescript-object-types',
        'typescript-typescript-fundamentals-typescript-enums',
        'typescript-typescript-fundamentals-typescript-type-aliases',
        'typescript-typescript-fundamentals-typescript-interfaces',
        'typescript-typescript-fundamentals-typescript-union-types',
        'typescript-typescript-fundamentals-typescript-functions',
        'react-react-fundamentals-react-introduction',
        'react-react-hooks-what-is-hooks',
        'react-react-hooks-useeffect',
        'sql-sql-fundamentals-sql-introduction',
        'sql-sql-fundamentals-sql-select',
        'sql-sql-fundamentals-sql-where',
        'sql-sql-joins-sql-joins',
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
router.get('/flashcards/daily-review', async (_req: AuthRequest, res) => {
  try {
    // Sample review cards for daily practice
    const cards = [
      {
        id: 'fc-1',
        topic: 'Java Collections',
        question: 'What is the time complexity of searching by key in a HashMap vs a TreeMap?',
        answer: 'HashMap provides O(1) average time via hash buckets. TreeMap provides O(log n) time using a Red-Black balanced binary search tree.',
        lessonId: 'java-java-collections-and-built-in-classes-java-hashmap',
        subjectId: 'java',
      },
      {
        id: 'fc-2',
        topic: 'SQL Joins',
        question: 'What is the difference between LEFT JOIN and INNER JOIN?',
        answer: 'INNER JOIN returns only rows that have matching values in both tables. LEFT JOIN returns all rows from the left table and matched rows from the right table (filling NULLs when no match exists).',
        lessonId: 'sql-sql-joins-sql-joins',
        subjectId: 'sql',
      },
      {
        id: 'fc-3',
        topic: 'JavaScript Concurrency',
        question: 'How does the Event Loop handle the Microtask Queue vs the Macrotask (Callback) Queue?',
        answer: 'The event loop executes ALL pending microtasks (Promises, queueMicrotask, MutationObserver) immediately after the current synchronous stack empties, BEFORE picking up the next macrotask (setTimeout, setInterval).',
        lessonId: 'javascript-javascript-asynchronous-programming-async-await',
        subjectId: 'javascript',
      },
      {
        id: 'fc-4',
        topic: 'React Performance',
        question: 'When should you use useCallback vs useMemo?',
        answer: 'useCallback caches a function instance between renders to prevent unnecessary re-renders of memoized child components. useMemo caches the calculated return value of an expensive computational operation.',
        lessonId: 'react-react-hooks-what-is-hooks',
        subjectId: 'react',
      },
      {
        id: 'fc-5',
        topic: 'HTTP & APIs',
        question: 'What makes an HTTP method "idempotent"? Which standard methods are idempotent?',
        answer: 'An operation is idempotent if executing it multiple times produces the identical side-effect on the server as executing it once. GET, PUT, and DELETE are idempotent; POST is typically not.',
        lessonId: 'nodejs-node-js-core-modules-http-module',
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
