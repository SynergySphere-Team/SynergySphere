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
  moduleId: z.string().optional(),
  taskId: z.string().optional().nullable(),
  taskTitle: z.string().optional().nullable(),
  taskStatus: z.string().optional().nullable(),
});

router.get('/', async (req: AuthRequest, res) => {
  const entries = await query(
    `SELECT w.*,
            COALESCE(w."taskTitle", t."title") AS "linkedTaskTitle",
            COALESCE(w."taskStatus", t."status") AS "linkedTaskStatus"
     FROM "Wellness" w
     LEFT JOIN "Task" t ON w."taskId" = t."id"
     WHERE w."userId" = $1
     ORDER BY w."date" DESC
     LIMIT 50`,
    [req.user!.userId],
  );
  res.json(entries);
});

router.post('/', validateBody(wellnessSchema), async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  let taskTitle = req.body.taskTitle || null;
  let taskStatus = req.body.taskStatus || null;

  if (req.body.taskId) {
    const existingTask = await queryOne<{ title: string; status: string }>(
      `SELECT "title", "status" FROM "Task" WHERE "id" = $1 AND "userId" = $2`,
      [req.body.taskId, userId],
    );
    if (existingTask) {
      if (!taskTitle) taskTitle = existingTask.title;
      if (taskStatus === 'DONE' && existingTask.status !== 'DONE') {
        await queryOne(
          `UPDATE "Task" SET "status" = 'DONE', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
          [req.body.taskId],
        );
        await awardXp(userId, 10, 'Completed task via check-in: ' + existingTask.title);
      }
    }
  }

  const entry = await queryOne(
    `INSERT INTO "Wellness" ("id", "userId", "stressLevel", "mood", "energyLevel", "notes", "moduleId", "taskId", "taskTitle", "taskStatus")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      newId(),
      userId,
      req.body.stressLevel,
      req.body.mood,
      req.body.energyLevel,
      nullable(req.body.notes),
      req.body.moduleId || 'GENERAL',
      nullable(req.body.taskId),
      nullable(taskTitle),
      nullable(taskStatus),
    ],
  );
  await awardXp(userId, 10, 'Wellness check-in logged');
  res.status(201).json(entry);
});

router.get('/insights', async (req: AuthRequest, res) => {
  type WellnessPoint = {
    stressLevel: number;
    mood: number;
    energyLevel: number;
    moduleId: string | null;
    taskTitle: string | null;
    taskStatus: string | null;
  };
  const entries = await query<WellnessPoint>(
    `SELECT "stressLevel", "mood", "energyLevel", "moduleId", "taskTitle", "taskStatus"
     FROM "Wellness"
     WHERE "userId" = $1
     ORDER BY "date" DESC
     LIMIT 30`,
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
      moduleBreakdown: {},
    });
    return;
  }

  const avgStress = entries.reduce((sum, entry) => sum + entry.stressLevel, 0) / entries.length;
  const avgMood = entries.reduce((sum, entry) => sum + entry.mood, 0) / entries.length;
  const avgEnergy = entries.reduce((sum, entry) => sum + entry.energyLevel, 0) / entries.length;

  const moduleMap: Record<string, { count: number; totalStress: number; totalMood: number; totalEnergy: number }> = {};
  for (const entry of entries) {
    const mod = entry.moduleId || 'GENERAL';
    if (!moduleMap[mod]) moduleMap[mod] = { count: 0, totalStress: 0, totalMood: 0, totalEnergy: 0 };
    moduleMap[mod].count += 1;
    moduleMap[mod].totalStress += entry.stressLevel;
    moduleMap[mod].totalMood += entry.mood;
    moduleMap[mod].totalEnergy += entry.energyLevel;
  }

  const moduleBreakdown: Record<string, { count: number; avgStress: number; avgMood: number; avgEnergy: number }> = {};
  for (const [mod, data] of Object.entries(moduleMap)) {
    moduleBreakdown[mod] = {
      count: data.count,
      avgStress: Number((data.totalStress / data.count).toFixed(1)),
      avgMood: Number((data.totalMood / data.count).toFixed(1)),
      avgEnergy: Number((data.totalEnergy / data.count).toFixed(1)),
    };
  }

  const recommendations: string[] = [];
  if (moduleBreakdown['PRODUCTIVITY'] && moduleBreakdown['PRODUCTIVITY'].avgStress >= 6.5) {
    recommendations.push('High stress observed during Productivity tasks. Break work into 25-minute Pomodoro sessions.');
  }
  if (moduleBreakdown['LEARNING_HUB'] && moduleBreakdown['LEARNING_HUB'].avgMood >= 7) {
    recommendations.push('You report great mood during Learning Hub challenges! Keep that learning momentum.');
  }
  if (avgStress > 6) {
    recommendations.push('Your stress levels are elevated. Consider a 15-minute mindfulness break.');
  }
  if (avgMood < 5) {
    recommendations.push('Low mood detected. Take a walk or connect with a study buddy.');
  }
  if (avgEnergy < 5) {
    recommendations.push('Energy is low. Review your sleep schedule and nutrition.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Great wellness balance across your modules! Keep up your healthy habits.');
  }

  res.json({
    recommendations,
    averages: { stress: avgStress, mood: avgMood, energy: avgEnergy },
    moduleBreakdown,
  });
});

export default router;
