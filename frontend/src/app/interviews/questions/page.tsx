'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowLeft, MessageSquare, History, BarChart3 } from 'lucide-react';
import { QuestionBankView } from '@/components/interview/QuestionBankView';

export default function QuestionBankPage() {
  const router = useRouter();

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/interviews"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition"
            >
              <ArrowLeft className="h-3 w-3" /> Interview Coach
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              Question Bank
            </span>
          </div>
          <h1 className="text-2xl font-black text-white md:text-3xl">
            Interview Question Bank Explorer
          </h1>
          <p className="text-sm text-muted-foreground">
            Search, filter, and study 550+ first-party questions complete with official rubrics and hints.
          </p>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="mb-6 flex overflow-x-auto border-b border-white/[0.08] pb-1 gap-1">
        <Link
          href="/interviews"
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-white/5 hover:text-white transition shrink-0"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Live Interview Room</span>
        </Link>

        <Link
          href="/interviews/history"
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-white/5 hover:text-white transition shrink-0"
        >
          <History className="h-4 w-4" />
          <span>History &amp; Past Sessions</span>
        </Link>

        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold border-b-2 border-primary bg-primary/10 text-primary shadow-sm shrink-0">
          <BookOpen className="h-4 w-4" />
          <span>Question Bank (550+ Qs)</span>
        </div>

        <Link
          href="/interviews/analytics"
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-white/5 hover:text-white transition shrink-0"
        >
          <BarChart3 className="h-4 w-4" />
          <span>Skill Gap Analytics</span>
        </Link>
      </div>

      {/* Question Bank View */}
      <QuestionBankView
        onLaunchTrack={(topic) => router.push(`/interviews?topic=${encodeURIComponent(topic)}`)}
      />
    </DashboardLayout>
  );
}
