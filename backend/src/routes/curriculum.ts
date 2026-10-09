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
import { searchLearningHub } from '../services/learningHubSearch.js';

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

// 5. GET /api/curriculum/learning-hub-search - unified high-accuracy search across lessons & challenges
router.get('/learning-hub-search', async (req: AuthRequest, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    res.json({ query: '', total: 0, results: [] });
    return;
  }

  const completedSet = await getUserCompletions(req.user?.userId);
  const matches = searchLearningHub(q, 20);

  const results = matches.map((m) => ({
    type: m.type,
    id: m.id,
    title: m.title,
    subjectName: m.subjectName,
    moduleName: m.moduleName,
    difficulty: m.difficulty,
    overview: m.overview,
    starterCode: m.starterCode,
    starterLanguage: m.starterLanguage,
    completed: m.type === 'lesson' ? completedSet.has(m.id) : false,
    score: m.score,
    matchReasons: m.matchReasons,
  }));

  res.json({ query: q, total: results.length, results });
});

// 6. GET /api/curriculum/search - search lessons across technologies
router.get('/search', async (req: AuthRequest, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    res.json({ query: '', total: 0, results: [] });
    return;
  }

  const completedSet = await getUserCompletions(req.user?.userId);
  const matches = searchLearningHub(q, 20);
  const lessonMatches = matches.filter((m) => m.type === 'lesson');

  if (lessonMatches.length > 0) {
    res.json({
      query: q,
      total: lessonMatches.length,
      results: lessonMatches.map((m) => ({
        id: m.id,
        title: m.title,
        overview: m.overview,
        difficulty: m.difficulty,
        subjectId: m.rawLesson?.subjectId || m.subjectName.toLowerCase(),
        subjectName: m.subjectName,
        moduleId: m.rawLesson?.moduleId || '',
        moduleName: m.moduleName || '',
        completed: completedSet.has(m.id),
        snippet: m.overview,
      })),
    });
    return;
  }

  const allEntries = getAllFlatLessons();
  const lowerQ = q.toLowerCase();
  const fallbackResults = allEntries
    .filter((entry) => {
      const matchTitle = entry.lesson.title.toLowerCase().includes(lowerQ);
      const matchOverview = entry.lesson.overview.toLowerCase().includes(lowerQ);
      const matchSubject = entry.subjectName.toLowerCase().includes(lowerQ);
      return matchTitle || matchOverview || matchSubject;
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

  res.json({ query: q, total: fallbackResults.length, results: fallbackResults });
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
      tagline: 'From syntax to database persistence, relational modeling, query optimization, and REST API microservices.',
      targetRole: 'Junior Backend Developer',
      icon: 'database',
      color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30',
      subjectIds: ['java', 'sql'],
      phases: [
        {
          phaseNumber: 1,
          title: 'Phase 1: Java Syntax & Control Flow',
          description: 'Core execution semantics, primitive types, operators, conditionals, and loops.',
          lessonIds: [
            'java-java-tutorial-java-introduction',
            'java-java-tutorial-java-syntax',
            'java-java-tutorial-java-variables',
            'java-java-tutorial-java-data-types',
            'java-java-tutorial-java-operators',
            'java-java-tutorial-java-if-else',
            'java-java-tutorial-java-while-loop',
            'java-java-tutorial-java-for-loop',
            'java-java-tutorial-java-arrays',
          ],
        },
        {
          phaseNumber: 2,
          title: 'Phase 2: Object-Oriented Design & Collections',
          description: 'Encapsulation, inheritance, polymorphism, interfaces, exceptions, and Java Collections (HashMap/ArrayList).',
          lessonIds: [
            'java-java-methods-java-methods',
            'java-java-classes-java-classes-objects',
            'java-java-classes-java-oop',
            'java-java-classes-java-constructors',
            'java-java-classes-java-encapsulation',
            'java-java-classes-java-inheritance',
            'java-java-classes-java-polymorphism',
            'java-java-classes-java-interface',
            'java-java-collections-and-built-in-classes-java-hashmap',
            'java-java-errors-java-exceptions',
          ],
        },
        {
          phaseNumber: 3,
          title: 'Phase 3: Relational SQL, Joins & Aggregations',
          description: 'Schema modeling, multi-table joins, subqueries, group aggregations, and data mutation.',
          lessonIds: [
            'sql-sql-fundamentals-sql-introduction',
            'sql-sql-fundamentals-sql-syntax',
            'sql-sql-fundamentals-sql-select',
            'sql-sql-fundamentals-sql-where',
            'sql-sql-fundamentals-sql-order-by',
            'sql-sql-joins-sql-joins',
            'sql-sql-joins-sql-inner-join',
            'sql-sql-joins-sql-left-join',
            'sql-sql-grouping-and-conditions-sql-group-by',
            'sql-sql-grouping-and-conditions-sql-having',
          ],
        },
        {
          phaseNumber: 4,
          title: 'Phase 4: Persistence, Transactions & Database Constraints',
          description: 'Indexes, primary/foreign key constraints, ACID transaction isolation, and stored procedures.',
          lessonIds: [
            'sql-sql-databases-sql-create-table',
            'sql-sql-constraints-sql-primary-key',
            'sql-sql-constraints-sql-unique',
            'sql-sql-data-management-sql-update',
            'sql-sql-data-management-sql-insert-into-select',
            'sql-sql-views-and-procedures-sql-stored-procedures',
          ],
        },
      ],
      curatedLessonIds: [
        'java-java-tutorial-java-introduction',
        'java-java-tutorial-java-syntax',
        'java-java-tutorial-java-variables',
        'java-java-tutorial-java-data-types',
        'java-java-tutorial-java-operators',
        'java-java-tutorial-java-if-else',
        'java-java-tutorial-java-while-loop',
        'java-java-tutorial-java-for-loop',
        'java-java-tutorial-java-arrays',
        'java-java-methods-java-methods',
        'java-java-classes-java-classes-objects',
        'java-java-classes-java-oop',
        'java-java-classes-java-constructors',
        'java-java-classes-java-encapsulation',
        'java-java-classes-java-inheritance',
        'java-java-classes-java-polymorphism',
        'java-java-classes-java-interface',
        'java-java-collections-and-built-in-classes-java-hashmap',
        'java-java-errors-java-exceptions',
        'sql-sql-fundamentals-sql-introduction',
        'sql-sql-fundamentals-sql-syntax',
        'sql-sql-fundamentals-sql-select',
        'sql-sql-fundamentals-sql-where',
        'sql-sql-fundamentals-sql-order-by',
        'sql-sql-joins-sql-joins',
        'sql-sql-joins-sql-inner-join',
        'sql-sql-joins-sql-left-join',
        'sql-sql-grouping-and-conditions-sql-group-by',
        'sql-sql-grouping-and-conditions-sql-having',
        'sql-sql-databases-sql-create-table',
        'sql-sql-constraints-sql-primary-key',
        'sql-sql-constraints-sql-unique',
        'sql-sql-data-management-sql-update',
        'sql-sql-data-management-sql-insert-into-select',
        'sql-sql-views-and-procedures-sql-stored-procedures',
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
      phases: [
        {
          phaseNumber: 1,
          title: 'Phase 1: Semantic HTML5 & Modern Layouts',
          description: 'Document structure, accessibility, box model, Flexbox, and CSS Grid.',
          lessonIds: [
            'html-html-tutorial-html-introduction',
            'html-html-tutorial-html-elements',
            'html-html-tutorial-html-forms',
            'css-css-fundamentals-css-introduction',
            'css-css-fundamentals-css-selectors',
            'css-css-fundamentals-css-box-model',
            'css-css-responsive-design-css-flexbox',
            'css-css-responsive-design-css-grid',
          ],
        },
        {
          phaseNumber: 2,
          title: 'Phase 2: JavaScript ES6+ & Asynchronous DOM',
          description: 'Scope, closures, array methods, Promises, async/await, and event loops.',
          lessonIds: [
            'javascript-javascript-fundamentals-javascript-introduction',
            'javascript-javascript-fundamentals-javascript-variables',
            'javascript-javascript-functions-function-introduction',
            'javascript-javascript-functions-arrow-functions',
            'javascript-javascript-objects-object-introduction',
            'javascript-javascript-arrays-javascript-arrays',
            'javascript-javascript-asynchronous-programming-async-await',
          ],
        },
        {
          phaseNumber: 3,
          title: 'Phase 3: React Foundations & Component Architecture',
          description: 'JSX, component composition, props, conditional rendering, and key reconciliation.',
          lessonIds: [
            'react-react-fundamentals-react-introduction',
            'react-react-fundamentals-react-get-started',
            'react-react-jsx-jsx-introduction',
            'react-react-components-react-components',
            'react-react-components-react-props',
          ],
        },
        {
          phaseNumber: 4,
          title: 'Phase 4: Hooks, State Management & Lifecycle',
          description: 'useState, useEffect, custom hooks, memoization, and client-side routing.',
          lessonIds: [
            'react-react-hooks-what-is-hooks',
            'react-react-hooks-usestate',
            'react-react-hooks-useeffect',
            'react-react-hooks-usememo',
            'react-react-hooks-custom-hooks',
          ],
        },
      ],
      curatedLessonIds: [
        'html-html-tutorial-html-introduction',
        'html-html-tutorial-html-elements',
        'html-html-tutorial-html-forms',
        'css-css-fundamentals-css-introduction',
        'css-css-fundamentals-css-selectors',
        'css-css-fundamentals-css-box-model',
        'css-css-responsive-design-css-flexbox',
        'css-css-responsive-design-css-grid',
        'javascript-javascript-fundamentals-javascript-introduction',
        'javascript-javascript-fundamentals-javascript-variables',
        'javascript-javascript-functions-function-introduction',
        'javascript-javascript-functions-arrow-functions',
        'javascript-javascript-objects-object-introduction',
        'javascript-javascript-arrays-javascript-arrays',
        'javascript-javascript-asynchronous-programming-async-await',
        'react-react-fundamentals-react-introduction',
        'react-react-fundamentals-react-get-started',
        'react-react-jsx-jsx-introduction',
        'react-react-components-react-components',
        'react-react-components-react-props',
        'react-react-hooks-what-is-hooks',
        'react-react-hooks-usestate',
        'react-react-hooks-useeffect',
        'react-react-hooks-usememo',
        'react-react-hooks-custom-hooks',
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
      title: 'Full-Stack Developer (Node, React, TS & SQL)',
      tagline: 'End-to-end applications: REST/WebSocket APIs, relational data models, TypeScript type safety, and reactive frontend.',
      targetRole: 'Junior Full-Stack Engineer',
      icon: 'layers',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
      subjectIds: ['nodejs', 'react', 'sql', 'typescript'],
      phases: [
        {
          phaseNumber: 1,
          title: 'Phase 1: Node.js Runtime & REST Services',
          description: 'Event loop, HTTP core module, Express middleware, routing, and JSON serialization.',
          lessonIds: [
            'nodejs-node-js-fundamentals-node-introduction',
            'nodejs-node-js-fundamentals-node-get-started',
            'nodejs-node-js-modules-node-modules',
            'nodejs-node-js-core-modules-http-module',
            'nodejs-node-js-core-modules-file-system',
            'nodejs-node-js-application-development-express-js',
            'nodejs-node-js-application-development-middleware',
          ],
        },
        {
          phaseNumber: 2,
          title: 'Phase 2: TypeScript Type Safety & Contracts',
          description: 'Type annotations, interfaces, generics, type aliases, and strict API contracts.',
          lessonIds: [
            'typescript-typescript-fundamentals-typescript-introduction',
            'typescript-typescript-fundamentals-typescript-simple-types',
            'typescript-typescript-fundamentals-typescript-interfaces',
            'typescript-typescript-fundamentals-typescript-union-types',
            'typescript-typescript-generics-basic-generics',
            'typescript-typescript-with-other-technologies-typescript-with-node-js',
          ],
        },
        {
          phaseNumber: 3,
          title: 'Phase 3: React Single Page Applications',
          description: 'Interactive UI views, reactive client state, API calls, and component lifecycle.',
          lessonIds: [
            'react-react-fundamentals-react-introduction',
            'react-react-components-react-components',
            'react-react-hooks-usestate',
            'react-react-hooks-useeffect',
          ],
        },
        {
          phaseNumber: 4,
          title: 'Phase 4: Database Modeling & Full Integration',
          description: 'Relational tables, foreign keys, inner/outer joins, and full CRUD pipelines.',
          lessonIds: [
            'sql-sql-fundamentals-sql-introduction',
            'sql-sql-fundamentals-sql-select',
            'sql-sql-fundamentals-sql-where',
            'sql-sql-joins-sql-joins',
            'sql-sql-joins-sql-inner-join',
            'sql-sql-databases-sql-create-table',
          ],
        },
      ],
      curatedLessonIds: [
        'nodejs-node-js-fundamentals-node-introduction',
        'nodejs-node-js-fundamentals-node-get-started',
        'nodejs-node-js-modules-node-modules',
        'nodejs-node-js-core-modules-http-module',
        'nodejs-node-js-core-modules-file-system',
        'nodejs-node-js-application-development-express-js',
        'nodejs-node-js-application-development-middleware',
        'typescript-typescript-fundamentals-typescript-introduction',
        'typescript-typescript-fundamentals-typescript-simple-types',
        'typescript-typescript-fundamentals-typescript-interfaces',
        'typescript-typescript-fundamentals-typescript-union-types',
        'typescript-typescript-generics-basic-generics',
        'typescript-typescript-with-other-technologies-typescript-with-node-js',
        'react-react-fundamentals-react-introduction',
        'react-react-components-react-components',
        'react-react-hooks-usestate',
        'react-react-hooks-useeffect',
        'sql-sql-fundamentals-sql-introduction',
        'sql-sql-fundamentals-sql-select',
        'sql-sql-fundamentals-sql-where',
        'sql-sql-joins-sql-joins',
        'sql-sql-joins-sql-inner-join',
        'sql-sql-databases-sql-create-table',
      ],
      recommendedChallenges: [
        { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50 },
        { id: 'js-sum-array', title: 'Sum Array', difficulty: 'EASY', xpReward: 50 },
        { id: 'sql-top-students', title: 'SQL: Top Students', difficulty: 'MEDIUM', xpReward: 75 },
        { id: 'js-binary-search', title: 'Binary Search', difficulty: 'HARD', xpReward: 100 },
      ],
      interviewTags: ['nodejs', 'react', 'sql', 'typescript', 'system-design'],
    },
    {
      id: 'ai-ml-engineer',
      title: 'AI & Machine Learning Engineer (Python & Data Systems)',
      tagline: 'Python data structures, numerical computing, algorithmic transformation, and model integration pipelines.',
      targetRole: 'Junior AI/ML Engineer',
      icon: 'sparkles',
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30',
      subjectIds: ['python', 'sql'],
      phases: [
        {
          phaseNumber: 1,
          title: 'Phase 1: Python Foundations & Data Structures',
          description: 'Python syntax, lists, tuples, dictionaries, sets, functions, and list comprehensions.',
          lessonIds: [
            'python-python-tutorial-python-home',
            'python-python-tutorial-python-syntax',
            'python-python-tutorial-python-variables',
            'python-python-tutorial-python-data-types',
            'python-python-tutorial-python-numbers',
            'python-python-tutorial-python-casting',
            'python-python-tutorial-python-strings',
            'python-python-tutorial-python-booleans',
            'python-python-tutorial-python-operators',
          ],
        },
        {
          phaseNumber: 2,
          title: 'Phase 2: Functional Processing & Object Modeling',
          description: 'Lambda functions, iterators, generators, OOP classes, inheritance, and module packages.',
          lessonIds: [
            'python-python-tutorial-python-lists',
            'python-python-tutorial-python-tuples',
            'python-python-tutorial-python-sets',
            'python-python-tutorial-python-dictionaries',
            'python-python-tutorial-python-if-else',
            'python-python-tutorial-python-while-loops',
            'python-python-tutorial-python-for-loops',
            'python-python-tutorial-python-functions',
            'python-python-tutorial-python-lambda',
            'python-python-tutorial-python-classes-objects',
          ],
        },
        {
          phaseNumber: 3,
          title: 'Phase 3: File I/O, Exception Handling & RegEx',
          description: 'JSON parsing, dataset streaming, regular expressions, and robust error handling.',
          lessonIds: [
            'python-python-file-handling-python-file-handling',
            'python-python-file-handling-python-read-files',
            'python-python-file-handling-python-write-create-files',
            'python-python-modules-python-json',
            'python-python-modules-python-regex',
            'python-python-modules-python-pip',
          ],
        },
        {
          phaseNumber: 4,
          title: 'Phase 4: Relational Data Warehousing & SQL Feature Stores',
          description: 'Feature extraction, aggregations, data grouping, and database query preparation for ML models.',
          lessonIds: [
            'sql-sql-fundamentals-sql-introduction',
            'sql-sql-fundamentals-sql-select',
            'sql-sql-functions-sql-aggregate-functions',
            'sql-sql-functions-sql-min',
            'sql-sql-functions-sql-max',
            'sql-sql-grouping-and-conditions-sql-group-by',
            'sql-sql-joins-sql-joins',
          ],
        },
      ],
      curatedLessonIds: [
        'python-python-tutorial-python-home',
        'python-python-tutorial-python-syntax',
        'python-python-tutorial-python-variables',
        'python-python-tutorial-python-data-types',
        'python-python-tutorial-python-numbers',
        'python-python-tutorial-python-casting',
        'python-python-tutorial-python-strings',
        'python-python-tutorial-python-booleans',
        'python-python-tutorial-python-operators',
        'python-python-tutorial-python-lists',
        'python-python-tutorial-python-tuples',
        'python-python-tutorial-python-sets',
        'python-python-tutorial-python-dictionaries',
        'python-python-tutorial-python-if-else',
        'python-python-tutorial-python-while-loops',
        'python-python-tutorial-python-for-loops',
        'python-python-tutorial-python-functions',
        'python-python-tutorial-python-lambda',
        'python-python-tutorial-python-classes-objects',
        'python-python-file-handling-python-file-handling',
        'python-python-file-handling-python-read-files',
        'python-python-file-handling-python-write-create-files',
        'python-python-modules-python-json',
        'python-python-modules-python-regex',
        'python-python-modules-python-pip',
        'sql-sql-fundamentals-sql-introduction',
        'sql-sql-fundamentals-sql-select',
        'sql-sql-functions-sql-aggregate-functions',
        'sql-sql-functions-sql-min',
        'sql-sql-functions-sql-max',
        'sql-sql-grouping-and-conditions-sql-group-by',
        'sql-sql-joins-sql-joins',
      ],
      recommendedChallenges: [
        { id: 'py-list-comprehension', title: 'List Transformations', difficulty: 'EASY', xpReward: 50 },
        { id: 'js-sum-array', title: 'Vector Aggregation', difficulty: 'EASY', xpReward: 50 },
        { id: 'js-binary-search', title: 'Binary Search Algorithm', difficulty: 'HARD', xpReward: 100 },
      ],
      interviewTags: ['python', 'algorithms', 'ml-data-structures', 'vectorization', 'sql'],
    },
    {
      id: 'devops-cloud-engineer',
      title: 'DevOps & Cloud Systems Engineer (Node, TS & DB Infrastructure)',
      tagline: 'Environment configuration, microservice orchestration, automated testing, connection pools, and reliable deployments.',
      targetRole: 'Junior DevOps / Cloud Engineer',
      icon: 'server',
      color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30',
      subjectIds: ['nodejs', 'typescript', 'sql'],
      phases: [
        {
          phaseNumber: 1,
          title: 'Phase 1: Server Runtime, Processes & Signals',
          description: 'Process management, environment variables, filesystem operations, and streams.',
          lessonIds: [
            'nodejs-node-js-fundamentals-node-introduction',
            'nodejs-node-js-core-modules-file-system',
            'nodejs-node-js-javascript-and-typescript-node-process',
            'nodejs-node-js-deployment-environment-variables',
          ],
        },
        {
          phaseNumber: 2,
          title: 'Phase 2: HTTPS Security, Networking & WebSockets',
          description: 'TLS certificates, reverse proxy integration, HTTP/HTTPS protocols, and real-time sockets.',
          lessonIds: [
            'nodejs-node-js-core-modules-http-module',
            'nodejs-node-js-core-modules-https-module',
            'nodejs-node-js-core-modules-url-module',
            'nodejs-node-js-communication-websockets',
          ],
        },
        {
          phaseNumber: 3,
          title: 'Phase 3: Database Administration & Connection Pools',
          description: 'Relational schema migrations, connection pooling, indexing, and backup strategies.',
          lessonIds: [
            'sql-sql-fundamentals-sql-introduction',
            'sql-sql-databases-sql-create-database',
            'sql-sql-databases-sql-create-table',
            'sql-sql-constraints-sql-primary-key',
            'sql-sql-constraints-sql-unique',
          ],
        },
        {
          phaseNumber: 4,
          title: 'Phase 4: CI/CD Pipelines, Logging & Health Monitoring',
          description: 'Continuous integration workflows, production logging, performance monitoring, and zero-downtime scaling.',
          lessonIds: [
            'nodejs-node-js-testing-and-debugging-testing-applications',
            'nodejs-node-js-deployment-ci-cd',
            'nodejs-node-js-deployment-development-vs-production',
            'nodejs-node-js-performance-and-scaling-node-logging',
            'nodejs-node-js-performance-and-scaling-node-monitoring',
            'nodejs-node-js-performance-and-scaling-node-performance',
          ],
        },
      ],
      curatedLessonIds: [
        'nodejs-node-js-fundamentals-node-introduction',
        'nodejs-node-js-core-modules-file-system',
        'nodejs-node-js-javascript-and-typescript-node-process',
        'nodejs-node-js-deployment-environment-variables',
        'nodejs-node-js-core-modules-http-module',
        'nodejs-node-js-core-modules-https-module',
        'nodejs-node-js-core-modules-url-module',
        'nodejs-node-js-communication-websockets',
        'sql-sql-fundamentals-sql-introduction',
        'sql-sql-databases-sql-create-database',
        'sql-sql-databases-sql-create-table',
        'sql-sql-constraints-sql-primary-key',
        'sql-sql-constraints-sql-unique',
        'nodejs-node-js-testing-and-debugging-testing-applications',
        'nodejs-node-js-deployment-ci-cd',
        'nodejs-node-js-deployment-development-vs-production',
        'nodejs-node-js-performance-and-scaling-node-logging',
        'nodejs-node-js-performance-and-scaling-node-monitoring',
        'nodejs-node-js-performance-and-scaling-node-performance',
      ],
      recommendedChallenges: [
        { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50 },
        { id: 'sql-customers', title: 'Database Query Optimization', difficulty: 'MEDIUM', xpReward: 80 },
      ],
      interviewTags: ['ci-cd', 'docker', 'networking', 'linux', 'logging', 'sql-indexes'],
    },
    {
      id: 'mobile-app-developer',
      title: 'Mobile Application Engineer (React Native & Mobile Systems)',
      tagline: 'Native application architecture, reactive component trees, mobile state storage, and device performance.',
      targetRole: 'Junior Mobile Developer',
      icon: 'smartphone',
      color: 'from-rose-500/20 to-red-500/10 border-rose-500/30',
      subjectIds: ['javascript', 'typescript', 'react'],
      phases: [
        {
          phaseNumber: 1,
          title: 'Phase 1: Modern JavaScript & TypeScript Strictness',
          description: 'Type contracts, async handling, immutability, and state transformations.',
          lessonIds: [
            'javascript-javascript-fundamentals-javascript-introduction',
            'javascript-javascript-functions-arrow-functions',
            'javascript-javascript-arrays-javascript-arrays',
            'javascript-javascript-asynchronous-programming-async-await',
            'typescript-typescript-fundamentals-typescript-interfaces',
            'typescript-typescript-fundamentals-typescript-simple-types',
          ],
        },
        {
          phaseNumber: 2,
          title: 'Phase 2: React Native Component Paradigms',
          description: 'Functional components, props, hooks, layout trees, and responsive device sizing.',
          lessonIds: [
            'react-react-fundamentals-react-introduction',
            'react-react-components-react-components',
            'react-react-components-react-props',
            'react-react-hooks-usestate',
            'react-react-hooks-useeffect',
          ],
        },
        {
          phaseNumber: 3,
          title: 'Phase 3: Client State, Cache & Offline Persistence',
          description: 'Local device key-value storage, client state caching, and network reconciliation.',
          lessonIds: [
            'react-react-hooks-usememo',
            'react-react-hooks-custom-hooks',
            'typescript-typescript-with-other-technologies-typescript-with-react',
          ],
        },
        {
          phaseNumber: 4,
          title: 'Phase 4: Device API Integration & Performance Tuning',
          description: 'Secure store authentication, device permissions, and rendering optimizations.',
          lessonIds: [
            'javascript-javascript-objects-object-introduction',
            'typescript-typescript-advanced-types-type-guards',
          ],
        },
      ],
      curatedLessonIds: [
        'javascript-javascript-fundamentals-javascript-introduction',
        'javascript-javascript-functions-arrow-functions',
        'javascript-javascript-arrays-javascript-arrays',
        'javascript-javascript-asynchronous-programming-async-await',
        'typescript-typescript-fundamentals-typescript-interfaces',
        'typescript-typescript-fundamentals-typescript-simple-types',
        'react-react-fundamentals-react-introduction',
        'react-react-components-react-components',
        'react-react-components-react-props',
        'react-react-hooks-usestate',
        'react-react-hooks-useeffect',
        'react-react-hooks-usememo',
        'react-react-hooks-custom-hooks',
        'typescript-typescript-with-other-technologies-typescript-with-react',
        'javascript-javascript-objects-object-introduction',
        'typescript-typescript-advanced-types-type-guards',
      ],
      recommendedChallenges: [
        { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50 },
        { id: 'js-sum-array', title: 'Sum Array', difficulty: 'EASY', xpReward: 50 },
        { id: 'js-valid-parentheses', title: 'Valid Parentheses', difficulty: 'MEDIUM', xpReward: 80 },
      ],
      interviewTags: ['react-native', 'mobile-lifecycle', 'typescript', 'state-management', 'performance'],
    },
    {
      id: 'cybersecurity-specialist',
      title: 'Cybersecurity & AppSec Specialist (Python, SQL & C++)',
      tagline: 'Defensive engineering, OWASP Top 10 vulnerabilities, SQL injection mitigation, and cryptography basics.',
      targetRole: 'Junior Application Security Specialist',
      icon: 'shield',
      color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30',
      subjectIds: ['python', 'sql', 'cpp'],
      phases: [
        {
          phaseNumber: 1,
          title: 'Phase 1: Memory Safety & Low-Level Mechanics',
          description: 'Pointers, memory allocation, buffer overruns, and input verification in C++.',
          lessonIds: [
            'cpp-c-fundamentals-c-home',
            'cpp-c-fundamentals-c-syntax',
            'cpp-c-fundamentals-c-variables',
            'cpp-c-fundamentals-c-data-types',
            'cpp-c-fundamentals-c-pointers',
            'cpp-c-functions-c-functions',
          ],
        },
        {
          phaseNumber: 2,
          title: 'Phase 2: SQL Injection Defense & Relational Hardening',
          description: 'Parameterized queries, stored procedures, principle of least privilege, and sanitization.',
          lessonIds: [
            'sql-sql-fundamentals-sql-introduction',
            'sql-sql-fundamentals-sql-select',
            'sql-sql-fundamentals-sql-where',
            'sql-sql-constraints-sql-not-null',
            'sql-sql-constraints-sql-primary-key',
            'sql-sql-views-and-procedures-sql-stored-procedures',
          ],
        },
        {
          phaseNumber: 3,
          title: 'Phase 3: Python Security Scripting & Token Cryptography',
          description: 'Cryptographic hashing, regex pattern validation, and secure authentication pipelines.',
          lessonIds: [
            'python-python-tutorial-python-home',
            'python-python-tutorial-python-strings',
            'python-python-modules-python-regex',
            'python-python-modules-python-json',
            'python-python-file-handling-python-file-handling',
          ],
        },
        {
          phaseNumber: 4,
          title: 'Phase 4: Threat Modeling, Access Control & Secure Architecture',
          description: 'RBAC policies, defense in depth, API rate limiting, and vulnerability patching.',
          lessonIds: [
            'python-python-tutorial-python-classes-objects',
            'sql-sql-databases-sql-create-database',
          ],
        },
      ],
      curatedLessonIds: [
        'cpp-c-fundamentals-c-home',
        'cpp-c-fundamentals-c-syntax',
        'cpp-c-fundamentals-c-variables',
        'cpp-c-fundamentals-c-data-types',
        'cpp-c-fundamentals-c-pointers',
        'cpp-c-functions-c-functions',
        'sql-sql-fundamentals-sql-introduction',
        'sql-sql-fundamentals-sql-select',
        'sql-sql-fundamentals-sql-where',
        'sql-sql-constraints-sql-not-null',
        'sql-sql-constraints-sql-primary-key',
        'sql-sql-views-and-procedures-sql-stored-procedures',
        'python-python-tutorial-python-home',
        'python-python-tutorial-python-strings',
        'python-python-modules-python-regex',
        'python-python-modules-python-json',
        'python-python-file-handling-python-file-handling',
        'python-python-tutorial-python-classes-objects',
        'sql-sql-databases-sql-create-database',
      ],
      recommendedChallenges: [
        { id: 'js-valid-parentheses', title: 'Input Parser Sanitization', difficulty: 'MEDIUM', xpReward: 80 },
        { id: 'sql-customers', title: 'SQL Query Hardening', difficulty: 'MEDIUM', xpReward: 80 },
      ],
      interviewTags: ['owasp', 'sql-injection', 'cryptography', 'auth', 'memory-safety'],
    },
    {
      id: 'data-engineer',
      title: 'Data & Analytics Engineer (Python, SQL & Data Warehousing)',
      tagline: 'High-throughput data extraction, ETL pipelines, normalization, analytical window queries, and schema optimization.',
      targetRole: 'Junior Data Engineer',
      icon: 'trending-up',
      color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
      subjectIds: ['python', 'sql'],
      phases: [
        {
          phaseNumber: 1,
          title: 'Phase 1: Relational Modeling & Complex SQL Queries',
          description: 'Multi-table queries, joins, filtering, sorting, and analytical grouping.',
          lessonIds: [
            'sql-sql-fundamentals-sql-introduction',
            'sql-sql-fundamentals-sql-syntax',
            'sql-sql-fundamentals-sql-select',
            'sql-sql-fundamentals-sql-where',
            'sql-sql-fundamentals-sql-order-by',
            'sql-sql-joins-sql-joins',
            'sql-sql-joins-sql-inner-join',
            'sql-sql-joins-sql-left-join',
          ],
        },
        {
          phaseNumber: 2,
          title: 'Phase 2: Aggregations, Grouping & Analytical Views',
          description: 'SUM, COUNT, AVG, MIN, MAX, HAVING conditions, and database views.',
          lessonIds: [
            'sql-sql-functions-sql-aggregate-functions',
            'sql-sql-functions-sql-min',
            'sql-sql-functions-sql-max',
            'sql-sql-grouping-and-conditions-sql-group-by',
            'sql-sql-grouping-and-conditions-sql-having',
            'sql-sql-views-and-procedures-sql-views',
          ],
        },
        {
          phaseNumber: 3,
          title: 'Phase 3: Python Data Transformation & ETL Scripts',
          description: 'Data ingestion, dictionary mapping, file streaming, and JSON transformation.',
          lessonIds: [
            'python-python-tutorial-python-home',
            'python-python-tutorial-python-lists',
            'python-python-tutorial-python-dictionaries',
            'python-python-file-handling-python-file-handling',
            'python-python-file-handling-python-read-files',
            'python-python-modules-python-json',
          ],
        },
        {
          phaseNumber: 4,
          title: 'Phase 4: Performance Indexing & Data Integrity',
          description: 'Primary/Foreign keys, constraints, table partitioning, and high-performance querying.',
          lessonIds: [
            'sql-sql-databases-sql-create-table',
            'sql-sql-constraints-sql-primary-key',
            'sql-sql-constraints-sql-unique',
            'sql-sql-constraints-sql-not-null',
            'sql-sql-data-management-sql-insert-into-select',
          ],
        },
      ],
      curatedLessonIds: [
        'sql-sql-fundamentals-sql-introduction',
        'sql-sql-fundamentals-sql-syntax',
        'sql-sql-fundamentals-sql-select',
        'sql-sql-fundamentals-sql-where',
        'sql-sql-fundamentals-sql-order-by',
        'sql-sql-joins-sql-joins',
        'sql-sql-joins-sql-inner-join',
        'sql-sql-joins-sql-left-join',
        'sql-sql-functions-sql-aggregate-functions',
        'sql-sql-functions-sql-min',
        'sql-sql-functions-sql-max',
        'sql-sql-grouping-and-conditions-sql-group-by',
        'sql-sql-grouping-and-conditions-sql-having',
        'sql-sql-views-and-procedures-sql-views',
        'python-python-tutorial-python-home',
        'python-python-tutorial-python-lists',
        'python-python-tutorial-python-dictionaries',
        'python-python-file-handling-python-file-handling',
        'python-python-file-handling-python-read-files',
        'python-python-modules-python-json',
        'sql-sql-databases-sql-create-table',
        'sql-sql-constraints-sql-primary-key',
        'sql-sql-constraints-sql-unique',
        'sql-sql-constraints-sql-not-null',
        'sql-sql-data-management-sql-insert-into-select',
      ],
      recommendedChallenges: [
        { id: 'sql-top-students', title: 'Top Students Analytics', difficulty: 'MEDIUM', xpReward: 75 },
        { id: 'sql-customers', title: 'Active Customer Segments', difficulty: 'MEDIUM', xpReward: 80 },
        { id: 'js-sum-array', title: 'Data Stream Reduction', difficulty: 'EASY', xpReward: 50 },
      ],
      interviewTags: ['sql', 'etl', 'data-modeling', 'python', 'aggregations', 'indexing'],
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

    // Enrich phases with full lesson metadata and completion status
    const enrichedPhases = rp.phases.map((ph) => {
      const phaseLessons = ph.lessonIds.map((lid) => {
        const found = findLessonEntry(lid);
        return {
          id: lid,
          title: found?.entry.lesson.title || lid,
          overview: found?.entry.lesson.overview || '',
          difficulty: found?.entry.lesson.difficulty || 'Intermediate',
          subjectId: found?.entry.subjectId || 'java',
          subjectName: found?.entry.subjectName || 'Programming',
          moduleName: found?.entry.moduleName || ph.title,
          phase: ph.title,
          completed: completions.has(lid),
        };
      });

      const phaseCompletedCount = phaseLessons.filter((l) => l.completed).length;
      const isPhaseComplete = phaseLessons.length > 0 && phaseCompletedCount === phaseLessons.length;

      return {
        ...ph,
        lessons: phaseLessons,
        completedCount: phaseCompletedCount,
        totalCount: phaseLessons.length,
        isCompleted: isPhaseComplete,
      };
    });

    // Build flattened syllabus
    const syllabus = enrichedPhases.flatMap((ph) => ph.lessons);

    // Identify current active lesson (first uncompleted lesson)
    const nextUncompleted = syllabus.find((l) => !l.completed);
    const currentLessonId = nextUncompleted?.id || syllabus[0]?.id;

    // Identify current active phase
    const activePhase = enrichedPhases.find((ph) => !ph.isCompleted) || enrichedPhases[0];

    return {
      ...rp,
      totalLessons: total,
      completedLessons: completedCount,
      percent,
      phases: enrichedPhases,
      syllabus,
      currentLessonId,
      currentPhaseNumber: activePhase?.phaseNumber || 1,
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
