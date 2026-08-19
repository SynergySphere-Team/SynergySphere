'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { api, getLevelTitle } from '@/lib/utils';
import { Trophy, Medal } from 'lucide-react';

interface Leader {
  id: string;
  firstName: string;
  lastName: string;
  xp: number;
  level: number;
  _count: { challengeAttempts: number; userBadges: number };
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);

  useEffect(() => {
    api<Leader[]>('/leaderboard').then(setLeaders).catch(console.error);
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <DashboardLayout>
      <h1 className="mb-2 text-3xl font-bold">Leaderboard</h1>
      <p className="mb-8 text-muted-foreground">Top learners on SynergySphere</p>

      <div className="space-y-3">
        {leaders.map((leader, i) => (
          <Card key={leader.id} className={i < 3 ? 'ring-1 ring-primary/30' : ''}>
            <CardContent className="flex items-center gap-4 pt-6">
              <span className="w-8 text-center text-lg font-bold">
                {i < 3 ? medals[i] : `#${i + 1}`}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary">
                {leader.firstName[0]}{leader.lastName[0]}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{leader.firstName} {leader.lastName}</p>
                <p className="text-xs text-muted-foreground">
                  Level {leader.level} — {getLevelTitle(leader.level)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{leader.xp} XP</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Trophy className="h-3 w-3" />{leader._count.challengeAttempts} challenges
                  <Medal className="h-3 w-3" />{leader._count.userBadges} badges
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
