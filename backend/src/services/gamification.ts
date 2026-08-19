import { newId, query, queryOne, transaction } from '../lib/db.js';

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

  await transaction(async (client) => {
    const user = await queryOne<{ xp: number; level: number }>(
      `UPDATE "User"
       SET "xp" = "xp" + $1, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $2
       RETURNING "xp", "level"`,
      [amount, userId],
      client,
    );

    if (!user) return;

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
      await client.query(
        `UPDATE "User"
         SET "level" = $1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $2`,
        [newLevel, userId],
      );
      notifications.push({
        userId,
        title: 'Level Up!',
        message: 'Congratulations! You reached Level ' + newLevel + ': ' + getLevelTitle(newLevel),
        type: 'achievement',
      });
    }

    const badges = await query<BadgeAward>(
      `SELECT "id", "name"
       FROM "Badge"
       WHERE "xpRequired" <= $1
       ORDER BY "xpRequired" ASC
       LIMIT 100`,
      [user.xp],
      client,
    );

    if (badges.length > 0) {
      const badgeIds = badges.map((badge) => badge.id);
      const existing = await query<{ badgeId: string }>(
        `SELECT "badgeId"
         FROM "UserBadge"
         WHERE "userId" = $1 AND "badgeId" = ANY($2::text[])`,
        [userId, badgeIds],
        client,
      );
      const existingIds = new Set(existing.map((badge) => badge.badgeId));
      const newBadges = badges.filter((badge) => !existingIds.has(badge.id));

      for (const badge of newBadges) {
        await client.query(
          `INSERT INTO "UserBadge" ("id", "userId", "badgeId")
           VALUES ($1, $2, $3)
           ON CONFLICT ("userId", "badgeId") DO NOTHING`,
          [newId(), userId, badge.id],
        );
      }

      notifications.push(...newBadges.map((badge) => ({
        userId,
        title: 'Badge Earned!',
        message: 'You earned the "' + badge.name + '" badge!',
        type: 'badge',
      })));
    }

    for (const notification of notifications) {
      await client.query(
        `INSERT INTO "Notification" ("id", "userId", "title", "message", "type")
         VALUES ($1, $2, $3, $4, $5)`,
        [newId(), notification.userId, notification.title, notification.message, notification.type],
      );
    }
  });
}
