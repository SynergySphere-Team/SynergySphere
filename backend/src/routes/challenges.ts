import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';

const router = Router();

const challengeSelect = {
  id: true,
  title: true,
  difficulty: true,
  description: true,
  language: true,
  starterCode: true,
  xpReward: true,
  createdAt: true,
} as const;

router.get('/', authenticate, async (_req, res) => {
  const challenges = await prisma.challenge.findMany({
    select: challengeSelect,
    orderBy: [{ difficulty: 'asc' }, { title: 'asc' }],
    take: 100,
  });
  res.json(challenges);
});

router.get('/:id', authenticate, async (req, res) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: paramId(req) },
    select: challengeSelect,
  });
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
  const challenge = await prisma.challenge.findUnique({ where: { id: paramId(req) } });
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

  const alreadyPassed = await prisma.challengeAttempt.findFirst({
    where: { userId: req.user!.userId, challengeId: challenge.id, passed: true },
    select: { id: true },
  });
  const xpEarned = passed && !alreadyPassed ? challenge.xpReward : 0;

  const attempt = await prisma.challengeAttempt.create({
    data: {
      userId: req.user!.userId,
      challengeId: challenge.id,
      code: req.body.code,
      passed,
      xpEarned,
    },
  });

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
  await prisma.skill.upsert({
    where: { userId_skillName: { userId, skillName } },
    update: { level: { increment: 1 } },
    create: { userId, skillName, level: 1 },
  });
}

export default router;
