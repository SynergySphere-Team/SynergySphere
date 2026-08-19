import { Router } from 'express';
import { query } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res) => {
  const leaders = await query(
    `SELECT
       u."id",
       u."firstName",
       u."lastName",
       u."xp",
       u."level",
       u."profilePicture",
       json_build_object(
         'challengeAttempts', (
           SELECT COUNT(*)::int
           FROM "ChallengeAttempt" ca
           WHERE ca."userId" = u."id" AND ca."passed" = true
         ),
         'userBadges', (
           SELECT COUNT(*)::int
           FROM "UserBadge" ub
           WHERE ub."userId" = u."id"
         )
       ) AS "_count"
     FROM "User" u
     ORDER BY u."xp" DESC
     LIMIT 20`,
  );
  res.json(leaders);
});

export default router;
