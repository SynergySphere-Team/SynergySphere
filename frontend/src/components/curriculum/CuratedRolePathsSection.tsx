'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarkdownView } from '@/components/ui/MarkdownView';
import { api } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Cloud,
  Code2,
  Copy,
  Cpu,
  Database,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Route,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Terminal,
  TrendingUp,
  Trophy,
} from 'lucide-react';

/* ─────────────────────────── Types ─────────────────────────── */

export interface RolePathLesson {
  id: string;
  title: string;
  overview: string;
  difficulty: string;
  subjectId: string;
  subjectName: string;
  moduleName: string;
  phase: string;
  completed: boolean;
}

export interface RolePathPhase {
  phaseNumber: number;
  title: string;
  description: string;
  lessonIds: string[];
  lessons: RolePathLesson[];
  completedCount: number;
  totalCount: number;
  isCompleted: boolean;
}

export interface RolePathChallenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  xpReward: number;
  passed?: boolean;
}

export interface RolePath {
  id: string;
  title: string;
  tagline: string;
  targetRole: string;
  icon: string;
  color?: string;
  subjectIds: string[];
  phases: RolePathPhase[];
  syllabus: RolePathLesson[];
  totalLessons: number;
  completedLessons: number;
  percent: number;
  currentLessonId?: string;
  activePhase?: RolePathPhase;
  recommendedChallenges: RolePathChallenge[];
  interviewTags: string[];
}

interface LessonDetail {
  id: string;
  title: string;
  overview: string;
  difficulty: string;
  subjectId: string;
  subjectName: string;
  moduleId: string;
  moduleName: string;
  learningObjectives: string[];
  content: {
    explanation: string;
    keyConcepts?: Array<{ title: string; definition: string }>;
    syntax?: string[];
    examples?: Array<{ title: string; language?: string; code: string; explanation: string }>;
    rules?: string[];
    commonMistakes?: string[];
    relatedConcepts?: string[];
    exercise?: { prompt: string; successCriteria: string };
    quiz?: { question: string; answer: string };
  };
  sources?: Array<{ resourceTitle: string; sourceUrl: string }>;
  completed: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  database: Database,
  layout: Code2,
  layers: Layers,
  smartphone: Smartphone,
  trending: TrendingUp,
  'trending-up': TrendingUp,
  shield: Shield,
  cloud: Cloud,
  cpu: Cpu,
  route: Route,
};

/* ─────────────────────────── Component ─────────────────────────── */

interface CuratedRolePathsSectionProps {
  initialPathId?: string | null;
  onSelectChallenge?: (challengeId: string) => void;
}

export function CuratedRolePathsSection({
  initialPathId,
  onSelectChallenge,
}: CuratedRolePathsSectionProps) {
  const router = useRouter();
  const [rolePaths, setRolePaths] = useState<RolePath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view states
  const [selectedPathId, setSelectedPathId] = useState<string | null>(initialPathId || null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonDetail | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string>('backend-intern');
  const [goalToast, setGoalToast] = useState<string | null>(null);
  const [xpBanner, setXpBanner] = useState<string | null>(null);

  // Code Block interactive helpers
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [consoleOpen, setConsoleOpen] = useState<Record<number, boolean>>({});
  const [runningIndex, setRunningIndex] = useState<number | null>(null);

  const loadRolePaths = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ paths: RolePath[] }>('/curriculum/role-paths');
      const list = Array.isArray(data?.paths) ? data.paths : [];
      setRolePaths(list);

      // Check saved active goal
      try {
        const saved = localStorage.getItem('synergysphere.active_role_path');
        if (saved && list.some((p) => p.id === saved)) {
          setActiveGoalId(saved);
        } else if (list.length > 0) {
          setActiveGoalId(list[0].id);
        }
      } catch {
        // ignore
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load role paths. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRolePaths();
  }, [loadRolePaths]);

  const selectedPath = rolePaths.find((p) => p.id === selectedPathId) || null;

  // Load lesson detail when activeLessonId changes
  useEffect(() => {
    if (!activeLessonId) {
      setActiveLesson(null);
      return;
    }
    let cancelled = false;
    setLessonLoading(true);
    setXpBanner(null);

    (async () => {
      try {
        const detail = await api<LessonDetail>(`/curriculum/lessons/${activeLessonId}`);
        if (!cancelled) {
          setActiveLesson(detail);
        }
      } catch {
        if (!cancelled) {
          setActiveLesson(null);
        }
      } finally {
        if (!cancelled) setLessonLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeLessonId]);

  const handleSetActiveGoal = (pathId: string, pathTitle: string) => {
    setActiveGoalId(pathId);
    try {
      localStorage.setItem('synergysphere.active_role_path', pathId);
    } catch {
      // ignore
    }
    setGoalToast(`🎯 Set "${pathTitle}" as your active career focus goal!`);
    setTimeout(() => setGoalToast(null), 4000);
  };

  const handleStartRoadmap = (path: RolePath) => {
    setSelectedPathId(path.id);
    // Find next uncompleted lesson in syllabus
    const nextUncompleted = path.syllabus?.find((l) => !l.completed);
    const targetLessonId = nextUncompleted?.id || path.syllabus?.[0]?.id || null;
    setActiveLessonId(targetLessonId);
  };

  const handleSelectLessonFromRoadmap = (path: RolePath, lessonId: string) => {
    setSelectedPathId(path.id);
    setActiveLessonId(lessonId);
  };

  const handleToggleCompleteLesson = async () => {
    if (!activeLesson || !selectedPath) return;
    const newStatus = !activeLesson.completed;
    try {
      const res = await api<{ completed: boolean; xpEarned: number }>(
        `/curriculum/lessons/${activeLesson.id}/progress`,
        {
          method: 'POST',
          body: JSON.stringify({ completed: newStatus }),
        }
      );
      setActiveLesson((prev) => (prev ? { ...prev, completed: res.completed } : null));

      // Update role paths in memory
      setRolePaths((prev) =>
        prev.map((rp) => {
          if (rp.id !== selectedPath.id) return rp;
          const updatedSyllabus = rp.syllabus.map((l) =>
            l.id === activeLesson.id ? { ...l, completed: res.completed } : l
          );
          const updatedPhases = rp.phases.map((ph) => {
            const updatedLessons = ph.lessons.map((l) =>
              l.id === activeLesson.id ? { ...l, completed: res.completed } : l
            );
            const comp = updatedLessons.filter((l) => l.completed).length;
            return {
              ...ph,
              lessons: updatedLessons,
              completedCount: comp,
              isCompleted: comp === updatedLessons.length && updatedLessons.length > 0,
            };
          });
          const compTotal = updatedSyllabus.filter((l) => l.completed).length;
          return {
            ...rp,
            syllabus: updatedSyllabus,
            phases: updatedPhases,
            completedLessons: compTotal,
            percent: Math.min(100, Math.round((compTotal / Math.max(rp.totalLessons, 1)) * 100)),
          };
        })
      );

      if (res.xpEarned > 0) {
        setXpBanner(`🎉 Step Completed! You earned +${res.xpEarned} XP.`);
      }
    } catch {
      // ignore
    }
  };

  const handleAdvanceNextInRoadmap = () => {
    if (!selectedPath || !activeLessonId) return;
    const currentIndex = selectedPath.syllabus.findIndex((l) => l.id === activeLessonId);
    if (currentIndex >= 0 && currentIndex + 1 < selectedPath.syllabus.length) {
      const nextLesson = selectedPath.syllabus[currentIndex + 1];
      setActiveLessonId(nextLesson.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Completed entire roadmap!
      setActiveLessonId(null);
      setGoalToast(`🏆 Incredible! You have completed all lessons in ${selectedPath.title}!`);
    }
  };

  const handlePreviousInRoadmap = () => {
    if (!selectedPath || !activeLessonId) return;
    const currentIndex = selectedPath.syllabus.findIndex((l) => l.id === activeLessonId);
    if (currentIndex > 0) {
      const prevLesson = selectedPath.syllabus[currentIndex - 1];
      setActiveLessonId(prevLesson.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleConsole = (index: number) => {
    setConsoleOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const runCode = (index: number) => {
    setRunningIndex(index);
    setConsoleOpen((prev) => ({ ...prev, [index]: true }));
    setTimeout(() => setRunningIndex(null), 500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Loading Curated Role Paths & Roadmaps…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
        <p className="text-sm font-semibold text-rose-300">{error}</p>
        <Button variant="outline" size="sm" onClick={loadRolePaths} className="mt-4 gap-2">
          <RotateCcw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     VIEW 3: SYNCHRONIZED ROLE PATH LESSON READER
  ───────────────────────────────────────────────────────────── */
  if (selectedPath && activeLessonId) {
    const currentIndex = selectedPath.syllabus.findIndex((l) => l.id === activeLessonId);
    const stepNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
    const totalSteps = selectedPath.syllabus.length;
    const hasNext = currentIndex >= 0 && currentIndex + 1 < totalSteps;
    const hasPrev = currentIndex > 0;

    return (
      <div className="space-y-6">
        {/* Navigation Breadcrumb & Heading OUTSIDE Card */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setActiveLessonId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to {selectedPath.title} Roadmap
            </button>
            <span className="rounded-full bg-white/[0.06] border border-white/[0.1] px-3 py-1 font-mono text-xs text-primary font-bold">
              Step {stepNumber} of {totalSteps} in Roadmap
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {selectedPath.title} › Phase {activeLesson?.moduleName || '1'}
            </p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              {activeLesson?.title || 'Loading Step…'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeLesson?.overview || selectedPath.tagline}
            </p>
          </div>
        </div>

        {goalToast && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
            {goalToast}
          </div>
        )}

        {xpBanner && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs font-bold text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {xpBanner}
          </div>
        )}

        {lessonLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-primary mb-2" />
            <p className="text-xs">Loading roadmap step content…</p>
          </div>
        ) : activeLesson ? (
          <>
            {/* Lesson Reader Card */}
            <Card className="border-white/[0.08] bg-[#0c1219]/90 shadow-xl backdrop-blur-md">
              <CardHeader className="border-b border-white/[0.06] pb-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      activeLesson.difficulty === 'Beginner'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : activeLesson.difficulty === 'Intermediate'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    {activeLesson.difficulty}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {activeLesson.subjectName} • {activeLesson.moduleName}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant={activeLesson.completed ? 'secondary' : 'default'}
                  onClick={handleToggleCompleteLesson}
                  className="gap-1.5 text-xs font-bold"
                >
                  <CheckCircle2 className={`h-3.5 w-3.5 ${activeLesson.completed ? 'text-primary' : ''}`} />
                  {activeLesson.completed ? 'Completed ✓' : 'Mark Complete'}
                </Button>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                {/* Learning Objectives */}
                {activeLesson.learningObjectives && activeLesson.learningObjectives.length > 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                      Roadmap Learning Objectives
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {activeLesson.learningObjectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Explanation Markdown */}
                {activeLesson.content?.explanation && (
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-200">
                    <MarkdownView content={activeLesson.content.explanation} />
                  </div>
                )}

                {/* Key Concepts */}
                {activeLesson.content?.keyConcepts && activeLesson.content.keyConcepts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" /> Key Architecture & Concepts
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {activeLesson.content.keyConcepts.map((kc, i) => (
                        <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                          <p className="text-xs font-bold text-primary mb-1">{kc.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{kc.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Code Examples */}
                {activeLesson.content?.examples && activeLesson.content.examples.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-primary" /> Production Code Examples
                    </h3>
                    {activeLesson.content.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#070b10]"
                      >
                        <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-3.5 py-2">
                          <div className="flex items-center gap-2">
                            <Terminal className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-medium text-slate-200">{ex.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyCode(ex.code, i)}
                              className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/[0.06] hover:text-white"
                              title="Copy code snippet"
                            >
                              {copiedIndex === i ? (
                                <>
                                  <Check className="h-3 w-3 text-primary" />
                                  <span className="text-primary">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => runCode(i)}
                              className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
                            >
                              <Play className="h-3 w-3" /> Run
                            </Button>
                          </div>
                        </div>

                        <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-emerald-300">
                          <code>{ex.code}</code>
                        </pre>

                        {consoleOpen[i] && (
                          <div className="border-t border-white/[0.08] bg-black/50 p-3 font-mono text-xs text-slate-300">
                            <span className="text-[10px] uppercase font-bold text-primary block mb-1">
                              Execution Sandbox:
                            </span>
                            {runningIndex === i ? (
                              <span className="text-amber-400">Executing sandbox binary…</span>
                            ) : (
                              <span className="text-emerald-400">✓ Code execution passed with exit code 0</span>
                            )}
                          </div>
                        )}

                        {ex.explanation && (
                          <div className="border-t border-white/[0.06] bg-white/[0.01] p-3 text-xs text-muted-foreground leading-relaxed">
                            {ex.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Synchronized Roadmap Control Footer */}
            <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.12] bg-[#0c141d]/95 p-4 shadow-2xl backdrop-blur-md">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev}
                onClick={handlePreviousInRoadmap}
                className="gap-2 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Previous Step in Roadmap
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!activeLesson.completed) {
                      await handleToggleCompleteLesson();
                    }
                    if (hasNext) {
                      handleAdvanceNextInRoadmap();
                    }
                  }}
                  className="gap-2 text-xs font-bold bg-primary text-black hover:bg-primary/90 shadow-md shadow-primary/20"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {hasNext ? 'Complete & Continue to Next Step in Roadmap →' : 'Complete Final Roadmap Lesson 🎉'}
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext}
                onClick={handleAdvanceNextInRoadmap}
                className="gap-2 text-xs"
              >
                Next Step in Roadmap <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     VIEW 2: DEDICATED ROLE PATH ROADMAP PHASES & SYLLABUS
  ───────────────────────────────────────────────────────────── */
  if (selectedPath) {
    const isActiveGoal = activeGoalId === selectedPath.id;
    const nextUncompleted = selectedPath.syllabus?.find((l) => !l.completed);
    const activePhase =
      selectedPath.phases.find((ph) => !ph.isCompleted) || selectedPath.phases[0];

    return (
      <div className="space-y-6">
        {/* Navigation & Heading OUTSIDE Card */}
        <div className="space-y-2">
          <button
            onClick={() => setSelectedPathId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to All Career Role Paths
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white md:text-3xl">
                  {selectedPath.title}
                </h1>
                {isActiveGoal && (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5">
                    ACTIVE GOAL
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-primary mt-0.5">{selectedPath.targetRole}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetActiveGoal(selectedPath.id, selectedPath.title)}
                className={`text-xs gap-1.5 ${
                  isActiveGoal
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                    : 'text-muted-foreground'
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${isActiveGoal ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                {isActiveGoal ? 'Active Focus Goal' : 'Set as Career Goal'}
              </Button>
              <Button
                size="sm"
                onClick={() => handleStartRoadmap(selectedPath)}
                className="text-xs font-bold bg-primary text-black hover:bg-primary/90 gap-1.5"
              >
                <Play className="h-3.5 w-3.5 fill-black" />
                {selectedPath.completedLessons > 0 ? 'Resume Roadmap' : 'Start Roadmap'}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{selectedPath.tagline}</p>
        </div>

        {goalToast && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
            {goalToast}
          </div>
        )}

        {/* Roadmap Summary Card */}
        <Card className="border-white/[0.08] bg-[#0c1219]/90 shadow-xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Roadmap Progress: </span>
                <span className="font-bold text-white">
                  {selectedPath.completedLessons} of {selectedPath.totalLessons} Lessons
                </span>
              </div>
              <span className="font-mono font-bold text-primary text-sm">
                {selectedPath.percent}% Complete
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-300"
                style={{ width: `${Math.max(selectedPath.percent, 3)}%` }}
              />
            </div>

            {/* Next Task Pointer Banner */}
            {nextUncompleted ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.08] p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-primary block">
                      Next Step in Roadmap:
                    </span>
                    <span className="text-xs font-semibold text-white">{nextUncompleted.title}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      ({nextUncompleted.subjectName} • {nextUncompleted.difficulty})
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSelectLessonFromRoadmap(selectedPath, nextUncompleted.id)}
                  className="text-xs font-bold bg-primary text-black hover:bg-primary/90 shrink-0 gap-1"
                >
                  Study Step Now <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center text-xs font-bold text-emerald-300">
                🎉 All {selectedPath.totalLessons} lessons in this curated career path completed!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step-by-Step Phases Header OUTSIDE Card */}
        <div className="mt-8 mb-3">
          <h2 className="text-lg font-bold text-white">Step-by-Step Curriculum Phases</h2>
          <p className="text-xs text-muted-foreground">
            Complete each phase sequentially to build complete mastery from syntax to system design.
          </p>
        </div>

        {/* Phases Accordion / List */}
        <div className="space-y-4">
          {selectedPath.phases.map((phase) => {
            const isPhaseActive = activePhase?.phaseNumber === phase.phaseNumber;

            return (
              <div key={phase.phaseNumber} className="space-y-2">
                {/* Phase Header OUTSIDE Card */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                      Phase {phase.phaseNumber}
                    </span>
                    <h3 className="text-sm font-bold text-white">{phase.title}</h3>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {phase.completedCount} / {phase.totalCount} completed
                  </span>
                </div>

                {/* Phase Card */}
                <Card
                  className={`border-white/[0.08] bg-[#0c1219]/80 shadow-md transition ${
                    isPhaseActive ? 'border-primary/40 ring-1 ring-primary/20' : ''
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground">{phase.description}</p>

                    <div className="space-y-2">
                      {phase.lessons.map((lesson, idx) => {
                        const isNext = nextUncompleted?.id === lesson.id;

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => handleSelectLessonFromRoadmap(selectedPath, lesson.id)}
                            className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition ${
                              isNext
                                ? 'border-primary/50 bg-primary/[0.08] hover:bg-primary/[0.12]'
                                : lesson.completed
                                ? 'border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]'
                                : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {lesson.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                              ) : isNext ? (
                                <div className="h-4 w-4 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center shrink-0">
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                </div>
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-white truncate">
                                    {lesson.title}
                                  </span>
                                  {isNext && (
                                    <span className="rounded bg-primary text-black px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
                                      Next Up
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {lesson.subjectName} • {lesson.difficulty}
                                </span>
                              </div>
                            </div>

                            <span className="text-xs font-semibold text-primary shrink-0 ml-2">
                              {lesson.completed ? 'Review →' : 'Study →'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Recommended Challenges & Interview Topics */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Challenges Box */}
          <div className="space-y-2">
            <div className="px-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" /> Verified Code Challenges
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Hands-on automated unit test challenges mapped to this role
              </p>
            </div>
            <Card className="border-white/[0.08] bg-[#0c1219]/80">
              <CardContent className="p-4 space-y-2">
                {selectedPath.recommendedChallenges.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-medium text-white">{ch.title}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          ch.difficulty === 'EASY'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : ch.difficulty === 'HARD'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {ch.difficulty}
                      </span>
                    </div>
                    {onSelectChallenge ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectChallenge(ch.id)}
                        className="h-6 px-2 text-[10px] text-primary"
                      >
                        Solve ↗
                      </Button>
                    ) : (
                      <span className="text-[10px] text-primary font-mono font-bold">
                        +{ch.xpReward} XP
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Interview Topics Box */}
          <div className="space-y-2">
            <div className="px-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Interview Coach Topics
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Targeted technical rubrics and questions for this career track
              </p>
            </div>
            <Card className="border-white/[0.08] bg-[#0c1219]/80">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {selectedPath.interviewTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/interviews')}
                  className="w-full text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                >
                  Practice Questions in Interview Coach ↗
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     VIEW 1: CATALOG OF ALL 8 CURATED ROLE PATHS
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Catalog Title & Heading OUTSIDE Card Containers */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white md:text-2xl">
          Curated Career Role Paths & Roadmaps
        </h2>
        <p className="text-xs text-muted-foreground max-w-3xl">
          Follow structured, phase-by-phase roadmaps designed for industry software engineering
          roles. Complete verified curriculum lessons, solve algorithm challenges, and practice live
          interview rubrics without getting lost.
        </p>
      </div>

      {goalToast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
          {goalToast}
        </div>
      )}

      {/* Grid of Role Paths */}
      <div className="grid gap-6 md:grid-cols-2">
        {rolePaths.map((path) => {
          const Icon = ICON_MAP[path.icon] || Route;
          const isActiveGoal = activeGoalId === path.id;

          return (
            <div key={path.id} className="space-y-2">
              {/* Heading OUTSIDE Card Container */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{path.title}</h3>
                      {isActiveGoal && (
                        <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold px-2 py-0.2">
                          ACTIVE GOAL
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-primary">{path.targetRole}</p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-muted-foreground self-start sm:self-center">
                  {path.totalLessons} Lessons
                </span>
              </div>

              {/* Card Container for Track Body */}
              <Card
                className={`border-white/[0.08] bg-[#0c1219]/85 shadow-lg transition hover:border-primary/40 ${
                  isActiveGoal ? 'border-primary/40 ring-1 ring-primary/20' : ''
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {path.tagline}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress:</span>
                      <span className="font-mono text-primary font-bold">
                        {path.completedLessons || 0} of {path.totalLessons} Lessons ({path.percent || 0}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.max(path.percent || 0, 3)}%` }}
                      />
                    </div>
                  </div>

                  {/* Syllabus / Subject Tracks */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground mr-1">
                      Tracks:
                    </span>
                    {path.subjectIds.map((sub) => (
                      <span
                        key={sub}
                        className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 font-mono"
                      >
                        {sub.toUpperCase()}
                      </span>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                    <Button
                      size="sm"
                      onClick={() => handleStartRoadmap(path)}
                      className="flex-1 text-xs font-bold bg-primary text-black hover:bg-primary/90 gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-black" />
                      {path.completedLessons > 0 ? 'Resume Roadmap' : 'Start Studying'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPathId(path.id)}
                      className="text-xs border-white/[0.1] text-white hover:bg-white/[0.05] gap-1"
                    >
                      Roadmap View ↗
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetActiveGoal(path.id, path.title)}
                      className="h-8 px-2 text-muted-foreground hover:text-white"
                      title={isActiveGoal ? 'Current goal' : 'Set as goal'}
                    >
                      <Star className={`h-3.5 w-3.5 ${isActiveGoal ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
