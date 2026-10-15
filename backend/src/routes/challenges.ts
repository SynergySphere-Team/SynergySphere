import { Router } from 'express';
import { z } from 'zod';
import { newId, query, queryOne } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';
import { judgeChallengeSubmission } from '../services/judgeService.js';

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
  // Any client-supplied testResults are ignored; server judgment is authoritative
  testResults: z.any().optional(),
});

router.post('/:id/test', authenticate, validateBody(attemptSchema), async (req: AuthRequest, res) => {
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

  const judgeResult = await judgeChallengeSubmission(challenge, req.body.code);
  res.json({
    passed: judgeResult.passed,
    testResults: judgeResult.testResults,
    output: judgeResult.output,
    error: judgeResult.error,
    runtimeMs: judgeResult.runtimeMs ?? 1,
    memoryKb: judgeResult.memoryKb,
    language: judgeResult.language || challenge.language || 'General',
  });
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

  // 1. Authoritative Server-Side Evaluation (Never trust client body)
  const judgeResult = await judgeChallengeSubmission(challenge, req.body.code);
  const passed = judgeResult.passed;

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

  res.json({
    attempt,
    passed,
    xpEarned,
    alreadyPassed: Boolean(alreadyPassed),
    testResults: judgeResult.testResults,
    output: judgeResult.output,
    error: judgeResult.error,
    runtimeMs: judgeResult.runtimeMs ?? 1,
    memoryKb: judgeResult.memoryKb,
    language: judgeResult.language || challenge.language || 'General',
  });
});

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
