import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';

const router = Router();

router.get('/', authenticate, async (_req, res) => {
  const challenges = await prisma.challenge.findMany({
    orderBy: { difficulty: 'asc' },
  });
  res.json(challenges);
});

router.get('/:id', authenticate, async (req, res) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: paramId(req) } });
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }
  const { solution, ...safe } = challenge;
  res.json(safe);
});

const attemptSchema = z.object({
  code: z.string().min(1),
});

router.post('/:id/submit', authenticate, validateBody(attemptSchema), async (req: AuthRequest, res) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: paramId(req) } });
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }

  const passed = evaluateCode(req.body.code, challenge.solution || '');
  const xpEarned = passed ? challenge.xpReward : 0;

  const attempt = await prisma.challengeAttempt.create({
    data: {
      userId: req.user!.userId,
      challengeId: challenge.id,
      code: req.body.code,
      passed,
      xpEarned,
    },
  });

  if (passed) {
    await awardXp(req.user!.userId, xpEarned, `Completed challenge: ${challenge.title}`);
    await updateSkill(req.user!.userId, challenge.language || 'General');
  }

  res.json({ attempt, passed, xpEarned });
});

function evaluateCode(submitted: string, solution: string): boolean {
  const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  return normalize(submitted).includes(normalize(solution).slice(0, 20)) || normalize(submitted) === normalize(solution);
}

async function updateSkill(userId: string, skillName: string) {
  await prisma.skill.upsert({
    where: { userId_skillName: { userId, skillName } },
    update: { level: { increment: 1 } },
    create: { userId, skillName, level: 1 },
  });
}

export default router;
