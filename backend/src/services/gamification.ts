import { prisma } from '../lib/prisma.js';

const XP_PER_LEVEL = 500;

type BadgeAward = { id: string; name: string };

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
  if (amount <= 0) return;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
  });

  const notifications = [
    {
      userId,
      title: '+' + amount + ' XP',
      message: reason,
      type: 'xp',
    },
  ];

  const newLevel = getLevelFromXp(user.xp);
  if (newLevel > user.level) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    });
    notifications.push({
      userId,
      title: 'Level Up!',
      message: 'Congratulations! You reached Level ' + newLevel + ': ' + getLevelTitle(newLevel),
      type: 'achievement',
    });
  }

  const badges = await prisma.badge.findMany({
    where: { xpRequired: { lte: user.xp } },
    select: { id: true, name: true },
    take: 100,
  });

  if (badges.length > 0) {
    const existing = await prisma.userBadge.findMany({
      where: { userId, badgeId: { in: (badges as BadgeAward[]).map((badge: BadgeAward) => badge.id) } },
      select: { badgeId: true },
    });
    const existingIds = new Set(existing.map((badge: { badgeId: string }) => badge.badgeId));
    const newBadges = (badges as BadgeAward[]).filter((badge: BadgeAward) => !existingIds.has(badge.id));

    if (newBadges.length > 0) {
      await prisma.userBadge.createMany({
        data: newBadges.map((badge: BadgeAward) => ({ userId, badgeId: badge.id })),
        skipDuplicates: true,
      });
      notifications.push(...newBadges.map((badge: BadgeAward) => ({
        userId,
        title: 'Badge Earned!',
        message: 'You earned the "' + badge.name + '" badge!',
        type: 'badge',
      })));
    }
  }

  await prisma.notification.createMany({ data: notifications });
}
