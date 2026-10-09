'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/utils';
import {
  MessageSquare,
  History,
  BookOpen,
  BarChart3,
  Sparkles,
} from 'lucide-react';

import type { TrackInfo, ProfileSignals, InterviewSession } from '@/components/interview/types';
import { LiveInterviewRoom } from '@/components/interview/LiveInterviewRoom';
import { InterviewHistoryView } from '@/components/interview/InterviewHistoryView';
import { QuestionBankView } from '@/components/interview/QuestionBankView';
import { SkillGapAnalyticsView } from '@/components/interview/SkillGapAnalyticsView';

export default function InterviewsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Interview Coach...</div>}>
      <InterviewsContent />
    </Suspense>
  );
}

function InterviewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'questions' | 'analytics'>(
    urlTab === 'history' || urlTab === 'questions' || urlTab === 'analytics' ? urlTab : 'live',
  );

  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [profileSignals, setProfileSignals] = useState<ProfileSignals | null>(null);
  const [activeInterview, setActiveInterview] = useState<InterviewSession | null>(null);

  // Sync state if query param changes
  useEffect(() => {
    if (urlTab === 'history' || urlTab === 'questions' || urlTab === 'analytics' || urlTab === 'live') {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Load tracks and hub signals once
  useEffect(() => {
    async function loadInitial() {
      try {
        const [tracksRes, signalsRes] = await Promise.all([
          api<{ tracks: TrackInfo[] }>('/ai/interview/tracks').catch(() => null),
          api<ProfileSignals>('/portfolio/profile-signals').catch(() => null),
        ]);
        if (tracksRes?.tracks) setTracks(tracksRes.tracks);
        if (signalsRes) setProfileSignals(signalsRes);
      } catch (err) {
        console.error('Failed to load initial interview data:', err);
      }
    }
    loadInitial();
  }, []);

  function switchTab(newTab: 'live' | 'history' | 'questions' | 'analytics') {
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', newTab);
    router.replace(`/interviews?${params.toString()}`, { scroll: false });
  }

  function handleStartTrackFromAnywhere(topic: string) {
    // Switch to live tab
    switchTab('live');
  }

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              AI Interview Coach &amp; Readiness
            </span>
            <span className="text-xs text-muted-foreground">· 550+ First-Party Questions · Live Keyboard Sync</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">
            Technical Mock Interview Coach
          </h1>
          <p className="text-sm text-muted-foreground">
            Realistic technical interviews with synchronized keyboard controls, speech dictation, live rubric critiques, and skill-gap readiness analytics.
          </p>
        </div>

        {/* Floating Active Interview Indicator if browsing another tab */}
        {activeInterview && activeTab !== 'live' && (
          <button
            onClick={() => switchTab('live')}
            className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-3.5 py-2 text-xs font-bold text-primary transition hover:bg-primary/25 shadow-lg shadow-primary/10 animate-pulse"
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>Active Session: {activeInterview.topic}</span>
            <span className="underline ml-1">Return to Room →</span>
          </button>
        )}
      </div>

      {/* Segregated Mode Navigation Tabs */}
      <div className="mb-6 flex overflow-x-auto border-b border-white/[0.08] pb-1 gap-1">
        <button
          onClick={() => switchTab('live')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition shrink-0 ${
            activeTab === 'live'
              ? 'border-b-2 border-primary bg-primary/10 text-primary shadow-sm'
              : 'text-muted-foreground hover:bg-white/5 hover:text-white'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Live Interview Room</span>
          {activeInterview && (
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => switchTab('history')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition shrink-0 ${
            activeTab === 'history'
              ? 'border-b-2 border-primary bg-primary/10 text-primary shadow-sm'
              : 'text-muted-foreground hover:bg-white/5 hover:text-white'
          }`}
        >
          <History className="h-4 w-4" />
          <span>History &amp; Past Sessions</span>
        </button>

        <button
          onClick={() => switchTab('questions')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition shrink-0 ${
            activeTab === 'questions'
              ? 'border-b-2 border-primary bg-primary/10 text-primary shadow-sm'
              : 'text-muted-foreground hover:bg-white/5 hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Question Bank (550+ Qs)</span>
        </button>

        <button
          onClick={() => switchTab('analytics')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition shrink-0 ${
            activeTab === 'analytics'
              ? 'border-b-2 border-primary bg-primary/10 text-primary shadow-sm'
              : 'text-muted-foreground hover:bg-white/5 hover:text-white'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Skill Gap Analytics</span>
        </button>
      </div>

      {/* Segregated Content Views */}
      {activeTab === 'live' && (
        <LiveInterviewRoom
          tracks={tracks}
          profileSignals={profileSignals}
          activeInterview={activeInterview}
          initialTopic={searchParams.get('topic')}
          onInterviewStarted={(session) => setActiveInterview(session)}
          onInterviewEnded={() => setActiveInterview(null)}
          onSwitchToHistory={() => switchTab('history')}
        />
      )}

      {activeTab === 'history' && (
        <InterviewHistoryView
          onStartNewInterview={() => switchTab('live')}
        />
      )}

      {activeTab === 'questions' && (
        <QuestionBankView
          onLaunchTrack={(topic) => handleStartTrackFromAnywhere(topic)}
        />
      )}

      {activeTab === 'analytics' && (
        <SkillGapAnalyticsView
          onStartTrack={(topic) => handleStartTrackFromAnywhere(topic)}
        />
      )}
    </DashboardLayout>
  );
}
