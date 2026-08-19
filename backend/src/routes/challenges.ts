import { Router } from 'express';
import { z } from 'zod';
import { newId, query, queryOne } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';

const router = Router();

router.get('/', authenticate, async (_req, res) => {
  const challenges = await query(
    `SELECT "id", "title", "difficulty", "description", "language", "starterCode", "xpReward", "createdAt"
     FROM "Challenge"
     ORDER BY "difficulty" ASC, "title" ASC
     LIMIT 100`,
  );
  res.json(challenges);
});

router.get('/:id', authenticate, async (req, res) => {
  const challenge = await queryOne(
    `SELECT "id", "title", "difficulty", "description", "language", "starterCode", "xpReward", "createdAt"
     FROM "Challenge"
     WHERE "id" = $1`,
    [paramId(req)],
  );
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }
  res.json(challenge);
});

const attemptSchema = z.object({
  code: z.string().min(1).max(50000),
  testResults: z
    .array(
      z.object({
        label: z.string(),
        passed: z.boolean(),
      })
    )
    .optional(),
});

router.post('/:id/submit', authenticate, validateBody(attemptSchema), async (req: AuthRequest, res) => {
  const challenge = await queryOne<{
    id: string;
    title: string;
    language: string | null;
    solution: string | null;
    xpReward: number;
  }>(
    `SELECT "id", "title", "language", "solution", "xpReward"
     FROM "Challenge"
     WHERE "id" = $1`,
    [paramId(req)],
  );
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }

  // If the frontend sends test results (from client-side execution), trust them.
  // Otherwise fall back to the legacy string-match approach.
  let passed: boolean;
  if (req.body.testResults && req.body.testResults.length > 0) {
    passed = req.body.testResults.every((r: { passed: boolean }) => r.passed);
  } else {
    passed = evaluateCodeFallback(req.body.code, challenge.solution || '');
  }

  const alreadyPassed = await queryOne<{ id: string }>(
    `SELECT "id"
     FROM "ChallengeAttempt"
     WHERE "userId" = $1 AND "challengeId" = $2 AND "passed" = true
     LIMIT 1`,
    [req.user!.userId, challenge.id],
  );
  const xpEarned = passed && !alreadyPassed ? challenge.xpReward : 0;

  const attempt = await queryOne(
    `INSERT INTO "ChallengeAttempt" ("id", "userId", "challengeId", "code", "passed", "xpEarned")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [newId(), req.user!.userId, challenge.id, req.body.code, passed, xpEarned],
  );

  if (xpEarned > 0) {
    await awardXp(req.user!.userId, xpEarned, 'Completed challenge: ' + challenge.title);
    await updateSkill(req.user!.userId, challenge.language || 'General');
  }

  res.json({ attempt, passed, xpEarned, alreadyPassed: Boolean(alreadyPassed) });
});

/**
 * Legacy fallback: normalised string comparison.
 * Only used when no test results are provided by the client.
 */
function evaluateCodeFallback(submitted: string, solution: string): boolean {
  if (!solution.trim()) return false;
  const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  const normalizedSubmitted = normalize(submitted);
  const normalizedSolution = normalize(solution);
  return normalizedSubmitted.includes(normalizedSolution) || normalizedSubmitted === normalizedSolution;
}

async function updateSkill(userId: string, skillName: string) {
  await queryOne(
    `INSERT INTO "Skill" ("id", "userId", "skillName", "level")
     VALUES ($1, $2, $3, 1)
     ON CONFLICT ("userId", "skillName")
     DO UPDATE SET "level" = "Skill"."level" + 1, "updatedAt" = CURRENT_TIMESTAMP
     RETURNING *`,
    [newId(), userId, skillName],
  );
}

export default router;
