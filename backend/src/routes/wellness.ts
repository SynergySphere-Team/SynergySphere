import { Router } from 'express';
import { z } from 'zod';
import { newId, nullable, query, queryOne } from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardBadgeDirectly, awardXp } from '../services/gamification.js';

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
  sleepHours: z.number().min(0).max(24).optional().nullable(),
  waterIntake: z.number().min(0).max(30).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  gratitude: z.string().optional().nullable(),
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
     LIMIT 100`,
    [req.user!.userId],
  );
  res.json(entries);
});

router.post('/', validateBody(wellnessSchema), async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  let taskTitle = req.body.taskTitle || null;
  let taskStatus = req.body.taskStatus || null;
  let taskXpAwarded = 0;

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
        taskXpAwarded = 10;
      }
    }
  }

  // 1. Check if user already logged a check-in today
  const todayEntry = await queryOne<{ count: string }>(
    `SELECT count(*)::text as count FROM "Wellness" WHERE "userId" = $1 AND "date"::date = CURRENT_DATE`,
    [userId],
  );
  const isFirstToday = parseInt(todayEntry?.count || '0', 10) === 0;

  // 2. Calculate consecutive streak
  const pastDates = await query<{ checkin_date: string }>(
    `SELECT DISTINCT "date"::date as checkin_date
     FROM "Wellness"
     WHERE "userId" = $1 AND "date"::date < CURRENT_DATE
     ORDER BY checkin_date DESC
     LIMIT 45`,
    [userId],
  );

  let streak = 1;
  if (pastDates.length > 0) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const firstPastDate = new Date(pastDates[0].checkin_date).toISOString().split('T')[0];
    if (firstPastDate === yesterdayStr) {
      let expectedDate = new Date(yesterday);
      for (const row of pastDates) {
        const rowDateStr = new Date(row.checkin_date).toISOString().split('T')[0];
        const expStr = expectedDate.toISOString().split('T')[0];
        if (rowDateStr === expStr) {
          streak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }

  let baseCheckinXp = 0;
  let streakBonusXp = 0;
  const badgesEarned: string[] = [];

  if (isFirstToday) {
    // Award +15 XP for logging daily check-in (capped once per day)
    baseCheckinXp = 15;
    await awardXp(userId, 15, 'Daily wellness check-in logged (+15 XP)');

    // Streak bonuses
    if (streak === 3) {
      streakBonusXp = 25;
      await awardXp(userId, 25, '3-Day Wellness Streak Bonus (+25 XP)!');
      const awarded = await awardBadgeDirectly(userId, 'Mindful Coder');
      if (awarded) badgesEarned.push('Mindful Coder');
    } else if (streak === 7) {
      streakBonusXp = 50;
      await awardXp(userId, 50, '7-Day Wellness Streak Bonus (+50 XP)!');
      const awarded = await awardBadgeDirectly(userId, 'Balance Master');
      if (awarded) badgesEarned.push('Balance Master');
    } else if (streak === 14) {
      streakBonusXp = 100;
      await awardXp(userId, 100, '14-Day Wellness Streak Bonus (+100 XP)!');
    }
  }

  const tags = req.body.tags && Array.isArray(req.body.tags) ? req.body.tags : null;

  const entry = await queryOne(
    `INSERT INTO "Wellness" (
       "id", "userId", "stressLevel", "mood", "energyLevel", "notes",
       "moduleId", "taskId", "taskTitle", "taskStatus",
       "sleepHours", "waterIntake", "tags", "gratitude"
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
      req.body.sleepHours !== undefined && req.body.sleepHours !== null ? req.body.sleepHours : null,
      req.body.waterIntake !== undefined && req.body.waterIntake !== null ? req.body.waterIntake : null,
      tags,
      nullable(req.body.gratitude),
    ],
  );
    // Notify the user about their first daily wellness check-in.
  if (entry && isFirstToday) {
    const isMilestone = [3, 7, 14].includes(streak);

    const notificationTitle = isMilestone
      ? `${streak}-Day Wellness Streak! `
      : 'Wellness Check-In Completed';

    const notificationMessage = isMilestone
      ? `You've maintained your wellness check-in streak for ${streak} days. Keep it going!`
      : 'Your daily wellness check-in is complete. Thank you for taking time for yourself!';

    await queryOne(
      `INSERT INTO "Notification"
       ("id", "userId", "title", "message", "type", "link")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING "id"`,
      [
        newId(),
        userId,
        notificationTitle,
        notificationMessage,
        'wellness',
        '/wellness',
      ],
    );
  }
  res.status(201).json({
    ...entry,
    xpAwarded: baseCheckinXp + streakBonusXp + taskXpAwarded,
    isFirstToday,
    streak,
    streakBonusXp,
    badgesEarned,
  });
});

router.get('/insights', async (req: AuthRequest, res) => {
  type WellnessRow = {
    id: string;
    stressLevel: number;
    mood: number;
    energyLevel: number;
    moduleId: string | null;
    taskTitle: string | null;
    taskStatus: string | null;
    sleepHours: number | null;
    waterIntake: number | null;
    tags: string[] | null;
    gratitude: string | null;
    date: string;
  };

  const entries = await query<WellnessRow>(
    `SELECT "id", "stressLevel", "mood", "energyLevel", "moduleId", "taskTitle", "taskStatus",
            "sleepHours", "waterIntake", "tags", "gratitude", "date"
     FROM "Wellness"
     WHERE "userId" = $1
     ORDER BY "date" DESC
     LIMIT 60`,
    [req.user!.userId],
  );

  // Calculate Streak
  const pastDates = await query<{ checkin_date: string }>(
    `SELECT DISTINCT "date"::date as checkin_date
     FROM "Wellness"
     WHERE "userId" = $1
     ORDER BY checkin_date DESC
     LIMIT 45`,
    [req.user!.userId],
  );

  let currentStreak = 0;
  if (pastDates.length > 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const mostRecentDateStr = new Date(pastDates[0].checkin_date).toISOString().split('T')[0];
    if (mostRecentDateStr === todayStr || mostRecentDateStr === yesterdayStr) {
      currentStreak = 1;
      let expectedDate = new Date(mostRecentDateStr === todayStr ? yesterday : new Date(yesterday.getTime() - 86400000));
      for (let i = 1; i < pastDates.length; i++) {
        const rowDateStr = new Date(pastDates[i].checkin_date).toISOString().split('T')[0];
        const expStr = expectedDate.toISOString().split('T')[0];
        if (rowDateStr === expStr) {
          currentStreak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }

  if (entries.length === 0) {
    res.json({
      recommendations: [
        'Start logging your daily wellness to activate the AI Task Optimizer and Burnout Risk Meter.',
        'Take a 5-minute break every hour during heavy coding and debugging sprints.',
        'Stay hydrated with at least 6-8 glasses of water and protect 7+ hours of sleep.',
      ],
      averages: null,
      moduleBreakdown: {},
      burnoutRisk: {
        score: 15,
        level: 'LOW',
        label: 'Low Risk',
        color: '#22c55e',
        description: 'No fatigue data logged yet. Check in to initiate continuous burnout tracking.',
        triggers: ['Keep a steady pace and take regular micro-breaks.'],
      },
      streak: {
        current: 0,
        milestones: [
          { days: 3, label: '3-Day Streak', xp: 25, badge: 'Mindful Coder', achieved: false },
          { days: 7, label: '7-Day Streak', xp: 50, badge: 'Balance Master', achieved: false },
          { days: 14, label: '14-Day Streak', xp: 100, badge: 'Peak Resilience', achieved: false },
        ],
      },
      correlationHeatmap: [],
    });
    return;
  }

  const avgStress = entries.reduce((sum, e) => sum + e.stressLevel, 0) / entries.length;
  const avgMood = entries.reduce((sum, e) => sum + e.mood, 0) / entries.length;
  const avgEnergy = entries.reduce((sum, e) => sum + e.energyLevel, 0) / entries.length;

  const validSleep = entries.filter((e) => e.sleepHours != null);
  const avgSleep = validSleep.length > 0
    ? validSleep.reduce((sum, e) => sum + Number(e.sleepHours), 0) / validSleep.length
    : null;

  const validWater = entries.filter((e) => e.waterIntake != null);
  const avgWater = validWater.length > 0
    ? validWater.reduce((sum, e) => sum + Number(e.waterIntake), 0) / validWater.length
    : null;

  // Module Aggregation
  const moduleMap: Record<
    string,
    { count: number; totalStress: number; totalMood: number; totalEnergy: number; highStressCount: number; highEnergyCount: number }
  > = {};

  for (const entry of entries) {
    const mod = entry.moduleId || 'GENERAL';
    if (!moduleMap[mod]) {
      moduleMap[mod] = { count: 0, totalStress: 0, totalMood: 0, totalEnergy: 0, highStressCount: 0, highEnergyCount: 0 };
    }
    moduleMap[mod].count += 1;
    moduleMap[mod].totalStress += entry.stressLevel;
    moduleMap[mod].totalMood += entry.mood;
    moduleMap[mod].totalEnergy += entry.energyLevel;
    if (entry.stressLevel > 6) moduleMap[mod].highStressCount += 1;
    if (entry.energyLevel >= 7) moduleMap[mod].highEnergyCount += 1;
  }

  const moduleBreakdown: Record<
    string,
    { count: number; avgStress: number; avgMood: number; avgEnergy: number; highStressCount: number; highEnergyCount: number }
  > = {};

  for (const [mod, data] of Object.entries(moduleMap)) {
    moduleBreakdown[mod] = {
      count: data.count,
      avgStress: Number((data.totalStress / data.count).toFixed(1)),
      avgMood: Number((data.totalMood / data.count).toFixed(1)),
      avgEnergy: Number((data.totalEnergy / data.count).toFixed(1)),
      highStressCount: data.highStressCount,
      highEnergyCount: data.highEnergyCount,
    };
  }

  // Burnout Risk Calculation
  // Derived from rolling averages: high stress + low energy + sleep deficit
  let burnoutScore = Math.round(
    (avgStress / 10) * 55 + ((10 - avgEnergy) / 10) * 35 + (avgSleep && avgSleep < 6 ? 10 : 0),
  );
  burnoutScore = Math.min(100, Math.max(5, burnoutScore));

  let riskLevel: 'LOW' | 'MODERATE' | 'CRITICAL' = 'LOW';
  let riskLabel = 'Low Risk';
  let riskColor = '#22c55e';
  let riskDescription = 'Your cognitive load is balanced and energy reserve is strong.';
  const triggers: string[] = [];

  if (avgStress >= 7.2 || (avgStress >= 6.3 && avgEnergy <= 4.2) || burnoutScore >= 70) {
    riskLevel = 'CRITICAL';
    riskLabel = 'Critical Risk';
    riskColor = '#ef4444';
    riskDescription = 'High cognitive strain detected across recent sessions. Immediate proactive pacing is advised.';
    triggers.push('Schedule a 15-minute screen-free rest immediately.');
    triggers.push('Move non-urgent deadlines to tomorrow and avoid late-night refactors.');
    triggers.push('Use the 4-7-8 Breathing Guide in Quick Resets to lower elevated cortisol.');
  } else if (avgStress >= 5.5 || avgEnergy < 5.2 || burnoutScore >= 45) {
    riskLevel = 'MODERATE';
    riskLabel = 'Moderate Risk';
    riskColor = '#f59e0b';
    riskDescription = 'Slight cognitive fatigue accumulating. Watch out for extended debugging blocks.';
    triggers.push('Break bloated tasks into 25-minute Pomodoro intervals.');
    triggers.push('Ensure 7+ hours of sleep tonight and replenish water intake.');
  } else {
    triggers.push('Optimal flow state maintained. Great pacing between coding challenges and rest.');
    triggers.push('Keep up your streak and daily quick resets!');
  }

  // Recommendations
  const recommendations: string[] = [];
  if (moduleBreakdown['PRODUCTIVITY'] && moduleBreakdown['PRODUCTIVITY'].avgStress >= 6.5) {
    recommendations.push('High stress observed in Productivity tasks. Use the Task Optimizer to slice multi-hour blockers into 25-minute sprints.');
  }
  if (moduleBreakdown['LEARNING_HUB'] && moduleBreakdown['LEARNING_HUB'].avgMood >= 7) {
    recommendations.push('High mood reported during Learning Hub sessions! Consider tackling a new elective topic while momentum is peak.');
  }
  if (avgStress > 6) {
    recommendations.push('Elevated stress trend detected. Step away for a 10-minute walk or micro-reset before pushing the next commit.');
  }
  if (avgEnergy < 5) {
    recommendations.push('Low energy detected. Check hydration and prioritize an early night over late-night debugging.');
  }
  if (validSleep.length > 0 && avgSleep! < 6.5) {
    recommendations.push(`Average sleep is ${avgSleep!.toFixed(1)} hrs. Target 7.5+ hours to maintain cognitive sharp assertions and memory consolidation.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Outstanding wellness balance across your modules! Keep up your healthy developer routine.');
  }

  res.json({
    recommendations,
    averages: {
      stress: Number(avgStress.toFixed(1)),
      mood: Number(avgMood.toFixed(1)),
      energy: Number(avgEnergy.toFixed(1)),
      sleep: avgSleep != null ? Number(avgSleep.toFixed(1)) : null,
      water: avgWater != null ? Number(avgWater.toFixed(1)) : null,
    },
    burnoutRisk: {
      score: burnoutScore,
      level: riskLevel,
      label: riskLabel,
      color: riskColor,
      description: riskDescription,
      triggers,
    },
    streak: {
      current: currentStreak,
      milestones: [
        { days: 3, label: '3-Day Streak', xp: 25, badge: 'Mindful Coder', achieved: currentStreak >= 3 },
        { days: 7, label: '7-Day Streak', xp: 50, badge: 'Balance Master', achieved: currentStreak >= 7 },
        { days: 14, label: '14-Day Streak', xp: 100, badge: 'Peak Resilience', achieved: currentStreak >= 14 },
      ],
    },
    moduleBreakdown,
  });
});

export default router;
