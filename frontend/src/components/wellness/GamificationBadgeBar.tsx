'use client';

import React from 'react';
import { Flame, Trophy, Award, Sparkles, CheckCircle2, Shield } from 'lucide-react';
import { StreakInfo } from './types';

interface GamificationBadgeBarProps {
  streak?: StreakInfo;
  isFirstToday?: boolean;
  userXp?: number;
  userLevel?: number;
}

export function GamificationBadgeBar({
  streak,
  isFirstToday = true,
  userXp = 0,
  userLevel = 1,
}: GamificationBadgeBarProps) {
  const currentStreak = streak?.current || 0;

  const milestones = [
    {
      days: 3,
      badge: 'Mindful Coder',
      xpBonus: 25,
      description: '3-Day Check-in Streak',
      achieved: currentStreak >= 3,
      icon: Shield,
    },
    {
      days: 7,
      badge: 'Balance Master',
      xpBonus: 50,
      description: '7-Day Check-in Streak & Pacing',
      achieved: currentStreak >= 7,
      icon: Award,
    },
    {
      days: 14,
      badge: 'Peak Resilience',
      xpBonus: 100,
      description: '14-Day Continuous Habit Mastery',
      achieved: currentStreak >= 14,
      icon: Trophy,
    },
  ];

  const nextMilestone = milestones.find((m) => !m.achieved) || milestones[milestones.length - 1];
  const progressToNext = nextMilestone
    ? Math.min(100, Math.round((currentStreak / nextMilestone.days) * 100))
    : 100;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0c141a]/85 backdrop-blur-xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        {/* Streak Counter */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/10">
            <Flame className="h-6 w-6 animate-pulse text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white font-mono">
                {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
              </span>
              <span className="rounded-md bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                ACTIVE STREAK
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentStreak > 0
                ? `${nextMilestone.days - currentStreak} days to unlock "${nextMilestone.badge}" (+${nextMilestone.xpBonus} XP)`
                : 'Log a check-in today to start your consistency streak!'}
            </p>
          </div>
        </div>

        {/* Daily XP status */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-center">
            <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Daily Check-in</span>
            </div>
            <div className="text-xs font-mono font-bold text-white">
              {isFirstToday ? '+15 XP Ready' : 'Claimed Today'}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar to Next Streak Milestone */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Streak Goal: {nextMilestone.badge} ({nextMilestone.days} Days)</span>
          <span className="text-primary font-bold">{currentStreak}/{nextMilestone.days} Days</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/60 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-lime-400 transition-all duration-500"
            style={{ width: `${progressToNext}%` }}
          />
        </div>
      </div>

      {/* Milestone Badges Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
        {milestones.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.badge}
              className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition ${
                m.achieved
                  ? 'border-emerald-500/40 bg-emerald-500/10 shadow-sm shadow-emerald-500/10'
                  : 'border-white/[0.06] bg-black/30 opacity-70'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                  m.achieved
                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                    : 'border-white/10 bg-black/40 text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs font-bold text-white">{m.badge}</span>
                  {m.achieved ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      +{m.xpBonus} XP
                    </span>
                  )}
                </div>
                <p className="truncate text-[10px] text-muted-foreground">{m.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
