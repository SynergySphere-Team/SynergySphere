import { Router } from 'express';
import { z } from 'zod';
import { newId, nullable, query, queryOne } from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';

const router = Router();
router.use(authenticate);

const wellnessSchema = z.object({
  stressLevel: z.number().min(1).max(10),
  mood: z.number().min(1).max(10),
  energyLevel: z.number().min(1).max(10),
  notes: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const entries = await query(
    `SELECT *
     FROM "Wellness"
     WHERE "userId" = $1
     ORDER BY "date" DESC
     LIMIT 30`,
    [req.user!.userId],
  );
  res.json(entries);
});

router.post('/', validateBody(wellnessSchema), async (req: AuthRequest, res) => {
  const entry = await queryOne(
    `INSERT INTO "Wellness" ("id", "userId", "stressLevel", "mood", "energyLevel", "notes")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      newId(),
      req.user!.userId,
      req.body.stressLevel,
      req.body.mood,
      req.body.energyLevel,
      nullable(req.body.notes),
    ],
  );
  await awardXp(req.user!.userId, 10, 'Wellness check-in logged');
  res.status(201).json(entry);
});

router.get('/insights', async (req: AuthRequest, res) => {
  type WellnessPoint = { stressLevel: number; mood: number; energyLevel: number };
  const entries = await query<WellnessPoint>(
    `SELECT *
     FROM "Wellness"
     WHERE "userId" = $1
     ORDER BY "date" DESC
     LIMIT 14`,
    [req.user!.userId],
  );

  if (entries.length === 0) {
    res.json({
      recommendations: [
        'Start logging your daily wellness to get personalized recommendations.',
        'Take a 5-minute break every hour during study sessions.',
        'Stay hydrated and maintain a consistent sleep schedule.',
      ],
      averages: null,
    });
    return;
  }

  const avgStress = entries.reduce((sum, entry) => sum + entry.stressLevel, 0) / entries.length;
  const avgMood = entries.reduce((sum, entry) => sum + entry.mood, 0) / entries.length;
  const avgEnergy = entries.reduce((sum, entry) => sum + entry.energyLevel, 0) / entries.length;

  const recommendations: string[] = [];
  if (avgStress > 6) {
    recommendations.push('Your stress levels are elevated. Consider a 15-minute mindfulness break.');
    recommendations.push('Try the Pomodoro technique: 25 min study, 5 min rest.');
  }
  if (avgMood < 5) {
    recommendations.push('Low mood detected. Take a walk or connect with a study buddy.');
  }
  if (avgEnergy < 5) {
    recommendations.push('Energy is low. Review your sleep schedule and nutrition.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Great wellness balance! Keep up your healthy habits.');
  }

  res.json({
    recommendations,
    averages: { stress: avgStress, mood: avgMood, energy: avgEnergy },
  });
});

export default router;
