'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WebCurriculumSection } from '@/components/curriculum/WebCurriculumSection';
import { CodingChallengesSection } from '@/components/coding/CodingChallengesSection';
import { Code2, Trophy } from 'lucide-react';

function LearningHubContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'challenges' ? 'challenges' : 'curriculum';
  const [mode, setMode] = useState<'curriculum' | 'challenges'>(initialMode);

  return (
    <DashboardLayout>
      <div className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Learning Hub</p>
        <h1 className="text-2xl font-bold text-white md:text-3xl">Programming Academy & Curriculum</h1>
        <p className="text-sm text-muted-foreground">
          Explore structured programming tracks in Java, Python, JavaScript, SQL, and more from W3Schools.
        </p>

        {/* Mode Switcher */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setMode('curriculum')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              mode === 'curriculum'
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Programming Academy (W3Schools)</span>
          </button>
          <button
            onClick={() => setMode('challenges')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              mode === 'challenges'
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Coding Challenges</span>
          </button>
        </div>
      </div>

      {mode === 'curriculum' ? (
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
