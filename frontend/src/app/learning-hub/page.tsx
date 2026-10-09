'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WebCurriculumSection } from '@/components/curriculum/WebCurriculumSection';
import { CodingChallengesSection } from '@/components/coding/CodingChallengesSection';
import { CuratedRolePathsSection } from '@/components/curriculum/CuratedRolePathsSection';
import { Code2, Route, Trophy } from 'lucide-react';

function LearningHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathParam = searchParams.get('path');
  const modeParam = searchParams.get('mode');

  const initialMode =
    modeParam === 'rolepaths' || pathParam
      ? 'rolepaths'
      : modeParam === 'challenges'
      ? 'challenges'
      : 'rolepaths'; // Default to role paths for curated guidance

  const [mode, setMode] = useState<'rolepaths' | 'curriculum' | 'challenges'>(initialMode);

  useEffect(() => {
    if (modeParam === 'rolepaths' || pathParam) {
      setMode('rolepaths');
    } else if (modeParam === 'challenges') {
      setMode('challenges');
    } else if (modeParam === 'curriculum') {
      setMode('curriculum');
    }
  }, [modeParam, pathParam]);

  const handleModeChange = (newMode: 'rolepaths' | 'curriculum' | 'challenges') => {
    setMode(newMode);
    if (newMode === 'rolepaths') {
      router.push('/learning-hub?mode=rolepaths');
    } else if (newMode === 'challenges') {
      router.push('/learning-hub?mode=challenges');
    } else {
      router.push('/learning-hub?mode=curriculum');
    }
  };

  return (
    <DashboardLayout>
      {/* Top Header OUTSIDE containers */}
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Learning Hub
        </p>
        <h1 className="text-2xl font-bold text-white md:text-3xl">
          Programming Academy &amp; Career Roadmaps
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Master job-ready software engineering tracks from syntax to full-stack persistence, solve
          automated code challenges, and follow phase-by-phase role roadmaps.
        </p>

        {/* Mode Switcher Tabs */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleModeChange('rolepaths')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
              mode === 'rolepaths'
                ? 'bg-primary text-black shadow-md shadow-primary/20'
                : 'bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            <Route className="h-4 w-4" />
            <span>Curated Role Paths &amp; Roadmaps</span>
          </button>

          <button
            onClick={() => handleModeChange('curriculum')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
              mode === 'curriculum'
                ? 'bg-primary text-black shadow-md shadow-primary/20'
                : 'bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Programming Academy (W3Schools)</span>
          </button>

          <button
            onClick={() => handleModeChange('challenges')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
              mode === 'challenges'
                ? 'bg-primary text-black shadow-md shadow-primary/20'
                : 'bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Coding Challenges</span>
          </button>
        </div>
      </div>

      {mode === 'rolepaths' ? (
        <CuratedRolePathsSection
          initialPathId={pathParam}
          onSelectChallenge={() => handleModeChange('challenges')}
        />
      ) : mode === 'curriculum' ? (
        <WebCurriculumSection />
      ) : (
        <CodingChallengesSection showHeading={false} />
      )}
    </DashboardLayout>
  );
}

export default function LearningHubPage() {
  return (
    <Suspense fallback={null}>
      <LearningHubContent />
    </Suspense>
  );
}
