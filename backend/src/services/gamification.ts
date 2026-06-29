import { prisma } from '../lib/prisma.js';

const XP_PER_LEVEL = 500;

const LEVEL_TITLES = [
  'Junior Developer',
  'Developer',
  'Advanced Developer',
  'Software Engineer',
  'Tech Leader',
];

export function getLevelFromXp(xp: number): number {
  return Math.min(Math.floor(xp / XP_PER_LEVEL) + 1, 5);
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, 4)];
}

export async function awardXp(userId: string, amount: number, reason: string): Promise<void> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
  });

  const newLevel = getLevelFromXp(user.xp);
  if (newLevel > user.level) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    });
    await prisma.notification.create({
      data: {
        userId,
        title: 'Level Up!',
        message: `Congratulations! You reached Level ${newLevel}: ${getLevelTitle(newLevel)}`,
        type: 'achievement',
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId,
      title: `+${amount} XP`,
      message: reason,
      type: 'xp',
    },
  });

  const badges = await prisma.badge.findMany({ where: { xpRequired: { lte: user.xp } } });
  for (const badge of badges) {
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });
    if (!existing) {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      await prisma.notification.create({
        data: {
          userId,
          title: 'Badge Earned!',
          message: `You earned the "${badge.name}" badge!`,
          type: 'badge',
        },
      });
    }
  }
}
