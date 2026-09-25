'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CodingChallengesSection } from '@/components/coding/CodingChallengesSection';
import { EngineeringTicketsSection } from '@/components/coding/EngineeringTicketsSection';
import { Code2, GitPullRequest } from 'lucide-react';

export default function CodingPage() {
  const [activeTab, setActiveTab] = useState<'challenges' | 'tickets'>('challenges');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Tab Bar */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <button
            onClick={() => setActiveTab('challenges')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'challenges'
                ? 'border border-primary/40 bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-secondary/40 hover:text-white'
            }`}
          >
            <Code2 className="h-4 w-4" />
            Algorithm Challenges
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'tickets'
                ? 'border border-primary/40 bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-secondary/40 hover:text-white'
            }`}
          >
            <GitPullRequest className="h-4 w-4" />
            Engineering Tickets &amp; PR Gym
          </button>
        </div>

        {activeTab === 'challenges' ? (
          <CodingChallengesSection />
        ) : (
          <EngineeringTicketsSection />
        )}
      </div>
    </DashboardLayout>
  );
}
