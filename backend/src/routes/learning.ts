import { Router } from 'express';
import { newId, query, queryOne } from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { awardXp } from '../services/gamification.js';

const router = Router();

const resources = [
  { id: 'javascript-foundations', title: 'JavaScript foundations', topic: 'JavaScript', level: 'Beginner', minutes: 20, xpReward: 20, source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/javascript/introduction-to-javascript/', outcome: 'Explain where JavaScript runs and write a first program.', question: 'Which statement writes a value to the JavaScript console?', options: ['console.log()', 'print()', 'echo()', 'write()'], answer: 0 },
  { id: 'algorithm-basics', title: 'Algorithm basics', topic: 'Algorithms', level: 'Beginner', minutes: 18, xpReward: 20, source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/dsa/introduction-to-algorithms/', outcome: 'Describe an algorithm as finite, ordered steps that solve a problem.', question: 'What is an algorithm?', options: ['A finite set of steps for solving a problem', 'A programming language', 'A database table', 'A user interface'], answer: 0 },
  { id: 'complexity-basics', title: 'Analyse algorithm efficiency', topic: 'Algorithms', level: 'Intermediate', minutes: 25, xpReward: 25, source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/dsa/analysis-of-algorithms/', outcome: 'Compare solutions using time and space complexity.', question: 'What does Big O commonly describe?', options: ['An upper-bound growth rate', 'A code style rule', 'A variable type', 'A database index'], answer: 0 },
  { id: 'dsa-roadmap', title: 'Data structures roadmap', topic: 'Data Structures', level: 'Beginner', minutes: 30, xpReward: 25, source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/dsa/dsa-tutorial-learn-data-structures-and-algorithms/', outcome: 'Identify a sensible order for learning core data structures and algorithms.', question: 'Which is a data structure?', options: ['Linked list', 'Binary search', 'Recursion', 'Big O'], answer: 0 },
  { id: 'python-foundations', title: 'Python foundations', topic: 'Python', level: 'Beginner', minutes: 20, xpReward: 20, source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/python/introduction-to-python/', outcome: 'Write a basic Python program and explain indentation.', question: 'What does indentation define in Python?', options: ['Blocks of code', 'File names', 'Variable types', 'Network requests'], answer: 0 },
] as const;

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const completions = await query<{ resourceId: string }>(`SELECT "resourceId" FROM "LearningResourceCompletion" WHERE "userId" = $1`, [req.user!.userId]);
  const completed = new Set(completions.map((item) => item.resourceId));
  res.json(resources.map((resource) => ({ ...resource, completed: completed.has(resource.id) })));
});

router.post('/:id/complete', authenticate, async (req: AuthRequest, res) => {
  const resource = resources.find((item) => item.id === req.params.id);
  if (!resource) { res.status(404).json({ error: 'Learning resource not found' }); return; }
  const existing = await queryOne<{ id: string }>(`SELECT "id" FROM "LearningResourceCompletion" WHERE "userId" = $1 AND "resourceId" = $2`, [req.user!.userId, resource.id]);
  if (existing) { res.json({ completed: true, xpEarned: 0 }); return; }
  await queryOne(`INSERT INTO "LearningResourceCompletion" ("id", "userId", "resourceId") VALUES ($1, $2, $3) RETURNING "id"`, [newId(), req.user!.userId, resource.id]);
  await awardXp(req.user!.userId, resource.xpReward, 'Completed learning resource: ' + resource.title);
  res.status(201).json({ completed: true, xpEarned: resource.xpReward });
});

export default router;
