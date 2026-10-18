import { Router } from 'express';
import { z } from 'zod';
import { newId, query, queryOne } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';
import { judgeChallengeSubmission } from '../services/judgeService.js';
import { BUILTIN_CHALLENGES } from '../data/builtinChallenges.js';

const router = Router();

type ChallengeRow = {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  language: string | null;
  starterCode: string;
  solution: string | null;
  xpReward: number;
  createdAt?: string;
  hint?: string;
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
};

async function resolveChallengeById(id: string, ensurePersisted = false): Promise<ChallengeRow | null> {
  const dbRow = await queryOne<ChallengeRow>(
    `SELECT "id", "title", "difficulty", "description", "language", "starterCode", "solution", "xpReward", "createdAt"
     FROM "Challenge"
     WHERE "id" = $1`,
    [id],
  );
  if (dbRow) {
    const builtinMatch = BUILTIN_CHALLENGES.find(
      (b) => b.id === dbRow.id || (b.title.toLowerCase() === dbRow.title.toLowerCase() && b.language.toLowerCase() === (dbRow.language || '').toLowerCase()),
    );
    return builtinMatch
      ? {
          ...dbRow,
          starterCode: builtinMatch.starterCode || dbRow.starterCode,
          solution: builtinMatch.solution || dbRow.solution,
          hint: builtinMatch.hint,
          approach: builtinMatch.approach,
          timeComplexity: builtinMatch.timeComplexity,
          spaceComplexity: builtinMatch.spaceComplexity,
        }
      : dbRow;
  }

  const builtin = BUILTIN_CHALLENGES.find((b) => b.id === id);
  if (!builtin) return null;

  if (ensurePersisted) {
    const inserted = await queryOne<ChallengeRow>(
      `INSERT INTO "Challenge" ("id", "title", "difficulty", "description", "language", "starterCode", "solution", "xpReward")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ("id") DO UPDATE
         SET "title" = EXCLUDED."title"
       RETURNING "id", "title", "difficulty", "description", "language", "starterCode", "solution", "xpReward", "createdAt"`,
      [
        builtin.id,
        builtin.title,
        builtin.difficulty,
        builtin.description,
        builtin.language,
        builtin.starterCode,
        builtin.solution || builtin.approach || null,
        builtin.xpReward,
      ],
    );
    if (inserted) {
      return {
        ...inserted,
        hint: builtin.hint,
        approach: builtin.approach,
        timeComplexity: builtin.timeComplexity,
        spaceComplexity: builtin.spaceComplexity,
      };
    }
  }

  return {
    id: builtin.id,
    title: builtin.title,
    difficulty: builtin.difficulty,
    description: builtin.description,
    language: builtin.language,
    starterCode: builtin.starterCode,
    solution: builtin.solution || builtin.approach || null,
    xpReward: builtin.xpReward,
    hint: builtin.hint,
    approach: builtin.approach,
    timeComplexity: builtin.timeComplexity,
    spaceComplexity: builtin.spaceComplexity,
  };
}

router.get('/', authenticate, async (_req, res) => {
  const dbChallenges = await query<ChallengeRow>(
    `SELECT "id", "title", "difficulty", "description", "language", "starterCode", "solution", "xpReward", "createdAt"
     FROM "Challenge"
     ORDER BY "difficulty" ASC, "title" ASC
     LIMIT 150`,
  );

  const seenKeys = new Set<string>();
  const merged: ChallengeRow[] = [];

  for (const row of dbChallenges) {
    const key = `${row.title.toLowerCase()}::${(row.language || '').toLowerCase()}`;
    seenKeys.add(row.id);
    seenKeys.add(key);
    const builtinMatch = BUILTIN_CHALLENGES.find(
      (b) => b.id === row.id || `${b.title.toLowerCase()}::${b.language.toLowerCase()}` === key,
    );
    merged.push(
      builtinMatch
        ? {
            ...row,
            starterCode: builtinMatch.starterCode || row.starterCode,
            solution: builtinMatch.solution || row.solution,
            hint: builtinMatch.hint,
            approach: builtinMatch.approach,
            timeComplexity: builtinMatch.timeComplexity,
            spaceComplexity: builtinMatch.spaceComplexity,
          }
        : row,
    );
  }

  for (const b of BUILTIN_CHALLENGES) {
    const key = `${b.title.toLowerCase()}::${b.language.toLowerCase()}`;
    if (!seenKeys.has(b.id) && !seenKeys.has(key)) {
      seenKeys.add(b.id);
      seenKeys.add(key);
      merged.push({
        id: b.id,
        title: b.title,
        difficulty: b.difficulty,
        description: b.description,
        language: b.language,
        starterCode: b.starterCode,
        solution: b.solution || b.approach || null,
        xpReward: b.xpReward,
        hint: b.hint,
        approach: b.approach,
        timeComplexity: b.timeComplexity,
        spaceComplexity: b.spaceComplexity,
      });
    }
  }

  const sanitized = merged.map(({ solution: _solution, ...rest }) => rest);
  res.json(sanitized);
});

router.get('/:id', authenticate, async (req, res) => {
  const challenge = await resolveChallengeById(paramId(req), false);
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }
  const { solution: _solution, ...publicChallenge } = challenge;
  res.json(publicChallenge);
});

router.get('/:id/solution', authenticate, async (req: AuthRequest, res) => {
  const challenge = await resolveChallengeById(paramId(req), false);
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }
  res.json({ solution: challenge.solution || challenge.approach || challenge.hint });
});

const attemptSchema = z.object({
  code: z.string().min(1).max(50000),
  language: z.string().max(40).optional(),
  customInputs: z.array(z.string().max(2000)).max(10).optional(),
  testResults: z.any().optional(),
});

router.post('/:id/test', authenticate, validateBody(attemptSchema), async (req: AuthRequest, res) => {
  const challenge = await resolveChallengeById(paramId(req), false);
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }

  const effectiveChallenge = req.body.language
    ? { ...challenge, language: req.body.language }
    : challenge;

  const customInputs: string[] = Array.isArray(req.body.customInputs)
    ? req.body.customInputs.map((s: string) => String(s).trim()).filter(Boolean)
    : [];

  const judgeResult = await judgeChallengeSubmission(effectiveChallenge, req.body.code);

  if (customInputs.length > 0) {
    const customResults = customInputs.map((rawInput, idx) => ({
      label: `Custom Case #${idx + 1} (${rawInput.slice(0, 40)})`,
      passed: judgeResult.passed,
      expected: 'Custom Input Run',
      got: judgeResult.output || (judgeResult.passed ? 'Executed cleanly' : judgeResult.error || 'Error'),
    }));
    res.json({
      passed: judgeResult.passed,
      customMode: true,
      testResults: [...customResults, ...judgeResult.testResults],
      output: judgeResult.output,
      error: judgeResult.error,
      runtimeMs: judgeResult.runtimeMs ?? 1,
      memoryKb: judgeResult.memoryKb,
      language: judgeResult.language || effectiveChallenge.language || 'General',
    });
    return;
  }

  res.json({
    passed: judgeResult.passed,
    customMode: false,
    testResults: judgeResult.testResults,
    output: judgeResult.output,
    error: judgeResult.error,
    runtimeMs: judgeResult.runtimeMs ?? 1,
    memoryKb: judgeResult.memoryKb,
    language: judgeResult.language || effectiveChallenge.language || 'General',
    solution: challenge.solution,
  });
});

router.post('/:id/submit', authenticate, validateBody(attemptSchema), async (req: AuthRequest, res) => {
  const challenge = await resolveChallengeById(paramId(req), true);
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }

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
    solution: challenge.solution,
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
