'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/utils';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Check,
  Play,
  Terminal,
  Search,
  ExternalLink,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface Technology {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

interface LessonSummary {
  id: string;
  title: string;
  overview: string;
  difficulty: string;
  sortOrder: number;
  completed: boolean;
}

interface CurriculumModule {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  lessons: LessonSummary[];
}

interface TechnologyDetail extends Technology {
  modules: CurriculumModule[];
}

interface CodeExample {
  title: string;
  language?: string;
  code: string;
  explanation: string;
}

interface KeyConcept {
  title: string;
  definition: string;
  purpose?: string;
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
  prerequisites?: string[];
  content: {
    explanation: string;
    keyConcepts?: KeyConcept[];
    syntax?: string[];
    examples?: CodeExample[];
    rules?: string[];
    commonMistakes?: string[];
    relatedConcepts?: string[];
    exercise?: { prompt: string; successCriteria: string };
    quiz?: { question: string; answer: string };
    challenge?: { prompt: string; successCriteria: string };
  };
  sources: Array<{ resourceTitle: string; sourceUrl: string }>;
  completed: boolean;
  previousLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
  attribution: {
    source: string;
    licenseNote: string;
    retrievedAt: string;
    primaryUrl: string;
  };
}

interface SearchResult {
  id: string;
  title: string;
  overview: string;
  difficulty: string;
  subjectId: string;
  subjectName: string;
}

export function WebCurriculumSection() {
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [activeTechId, setActiveTechId] = useState('java');
  const [activeTechDetail, setActiveTechDetail] = useState<TechnologyDetail | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonDetail | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Code Block helpers
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [consoleOpen, setConsoleOpen] = useState<Record<number, boolean>>({});
  const [runningIndex, setRunningIndex] = useState<number | null>(null);
  const [xpBanner, setXpBanner] = useState<string | null>(null);
  const technologyRequestId = useRef(0);
  const lessonRequestId = useRef(0);
  const requestedLessonForTechnology = useRef<{ technologyId: string; lessonId: string } | null>(null);

  const loadTechnologies = useCallback(async () => {
    try {
      const data = await api<{ technologies: Technology[] }>('/curriculum/technologies');
      setTechnologies(data.technologies);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTechDetail = useCallback(async (techId: string, selectFirstLesson = false) => {
    const requestId = ++technologyRequestId.current;
    setActiveTechDetail(null);
    try {
      const detail = await api<TechnologyDetail>(`/curriculum/technologies/${techId}`);
      // A delayed response for a previous tab must not overwrite the current curriculum.
      if (requestId !== technologyRequestId.current) return;
      setActiveTechDetail(detail);
      if (detail.modules?.length > 0) {
        setExpandedModules((prev) => ({ ...prev, [detail.modules[0].id]: true }));
        const requestedLesson = requestedLessonForTechnology.current;
        if (requestedLesson?.technologyId === techId) {
          requestedLessonForTechnology.current = null;
          loadLesson(requestedLesson.lessonId);
        } else if (selectFirstLesson && detail.modules[0].lessons?.length > 0) {
          loadLesson(detail.modules[0].lessons[0].id);
        }
      }
    } catch {
      // Handle
    }
  }, []);

  const loadLesson = async (lessonId: string) => {
    const requestId = ++lessonRequestId.current;
    setLessonLoading(true);
    setXpBanner(null);
    try {
      const detail = await api<LessonDetail>(`/curriculum/lessons/${lessonId}`);
      if (requestId !== lessonRequestId.current) return;
      setActiveLesson(detail);
    } catch {
      // Handle
    } finally {
      if (requestId === lessonRequestId.current) setLessonLoading(false);
    }
  };

  useEffect(() => {
    loadTechnologies();
  }, [loadTechnologies]);

  useEffect(() => {
    if (activeTechId) {
      loadTechDetail(activeTechId, true);
    }
  }, [activeTechId, loadTechDetail]);

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api<{ results: SearchResult[] }>(`/curriculum/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.results);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const handleCopyCode = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRunCode = (index: number) => {
    setRunningIndex(index);
    setConsoleOpen((prev) => ({ ...prev, [index]: true }));
    setTimeout(() => {
      setRunningIndex(null);
    }, 400);
  };

  const handleToggleComplete = async () => {
    if (!activeLesson) return;
    const newStatus = !activeLesson.completed;
    try {
      const res = await api<{ completed: boolean; xpEarned: number }>(
        `/curriculum/lessons/${activeLesson.id}/progress`,
        {
          method: 'POST',
          body: JSON.stringify({ completed: newStatus }),
        },
      );
      setActiveLesson((prev) => (prev ? { ...prev, completed: res.completed } : null));
      if (res.xpEarned > 0) {
        setXpBanner(`🎉 You earned +${res.xpEarned} XP for completing this lesson!`);
      }
      // Refresh current technology progress counts
      loadTechDetail(activeTechId);
      loadTechnologies();
    } catch {
      // Handle
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading W3Schools programming curriculum…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Search Bar & Technology Selector */}
      <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              W3Schools Academy
            </span>
            <h2 className="text-xl font-bold text-white">Programming & Software Paths</h2>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lessons (e.g. 'inheritance')…"
              className="h-9 w-full rounded-lg border border-white/[0.1] bg-black/40 pl-9 pr-4 text-xs text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />

            {/* Search Dropdown */}
            {searchQuery.trim() && (
              <div className="absolute right-0 top-11 z-50 w-full rounded-lg border border-white/[0.1] bg-slate-900 p-2 shadow-xl">
                <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                  {searchResults.length} results found
                </p>
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      requestedLessonForTechnology.current = {
                        technologyId: item.subjectId,
                        lessonId: item.id,
                      };
                      setActiveTechId(item.subjectId);
                      setSearchQuery('');
                    }}
                    className="flex w-full items-center justify-between rounded p-2 text-left text-xs hover:bg-white/5"
                  >
                    <span className="font-semibold text-white">{item.title}</span>
                    <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                      {item.subjectName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Technology Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {technologies.map((tech) => {
            const isSelected = tech.id === activeTechId;
            return (
              <button
                key={tech.id}
                onClick={() => setActiveTechId(tech.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <span>{tech.name}</span>
                {tech.progressPercent > 0 && (
                  <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-primary'}`}>
                    {tech.progressPercent}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Curriculum Tree, Right Lesson Viewer */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Sidebar: Collapsible Sections */}
        <div className="space-y-3 rounded-xl border border-white/[0.08] bg-black/20 p-4 h-fit max-h-[800px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">{activeTechDetail?.name} Curriculum</h3>
              <p className="text-xs text-muted-foreground">
                {activeTechDetail?.completedLessons} / {activeTechDetail?.totalLessons} lessons completed
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {activeTechDetail?.progressPercent}%
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {activeTechDetail?.modules?.map((mod) => {
              const isExpanded = Boolean(expandedModules[mod.id]);
              return (
                <div key={mod.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02]">
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-bold text-white">{mod.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {mod.lessons.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="space-y-1 border-t border-white/[0.04] p-2">
                      {mod.lessons.map((lesson) => {
                        const isCurrent = activeLesson?.id === lesson.id;
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => loadLesson(lesson.id)}
                            className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition ${
                              isCurrent
                                ? 'bg-primary/20 font-semibold text-primary'
                                : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="truncate pr-2">{lesson.title}</span>
                            {lesson.completed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            ) : (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Lesson Detail View */}
        <div className="space-y-5">
          {lessonLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Loading lesson details…
            </div>
          ) : activeLesson ? (
            <>
              {/* XP Banner */}
              {xpBanner && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-400">
                  {xpBanner}
                </div>
              )}

              {/* Lesson Header Card */}
              <div className="rounded-xl border border-white/[0.08] bg-black/20 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {activeLesson.difficulty}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activeLesson.subjectName} › {activeLesson.moduleName}
                    </span>
                  </div>

                  <button
                    onClick={handleToggleComplete}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      activeLesson.completed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {activeLesson.completed ? 'Completed ✓' : 'Mark Complete'}
                  </button>
                </div>

                <h1 className="text-2xl font-bold text-white">{activeLesson.title}</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {activeLesson.overview}
                </p>
              </div>

              {/* Learning Objectives */}
              {activeLesson.learningObjectives?.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Learning Objectives
                  </h3>
                  <ul className="space-y-2">
                    {activeLesson.learningObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-200">
                        <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Concepts */}
              {activeLesson.content.keyConcepts && activeLesson.content.keyConcepts.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Key Concepts & Definitions
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeLesson.content.keyConcepts.map((c, i) => (
                      <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
                        <h4 className="text-sm font-bold text-primary">{c.title}</h4>
                        <p className="text-xs text-slate-300">{c.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className="rounded-xl border border-white/[0.08] bg-black/20 p-6 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Explanation
                </h3>
                <p className="text-sm leading-7 text-slate-200 whitespace-pre-line">
                  {activeLesson.content.explanation}
                </p>
              </div>

              {/* Code Examples */}
              {activeLesson.content.examples && activeLesson.content.examples.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Code Examples & Practice
                  </h3>
                  {activeLesson.content.examples.map((ex, i) => {
                    const isCopied = copiedIndex === i;
                    const isOpen = consoleOpen[i];
                    return (
                      <div key={i} className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#0d1117]">
                        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#161b22] px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                              {ex.language || activeLesson.subjectId}
                            </span>
                            <span className="text-xs font-semibold text-slate-200">{ex.title}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyCode(ex.code, i)}
                              className="flex items-center gap-1 rounded bg-white/[0.08] px-2.5 py-1 text-xs text-slate-300 hover:bg-white/[0.15]"
                            >
                              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              <span>{isCopied ? 'Copied' : 'Copy'}</span>
                            </button>

                            <button
                              onClick={() => handleRunCode(i)}
                              className="flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                            >
                              <Play className="h-3 w-3 fill-white" />
                              <span>{runningIndex === i ? 'Running…' : 'Run Code'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Monospace Code Editor View */}
                        <pre className="p-4 font-mono text-xs leading-relaxed text-emerald-300 overflow-x-auto">
                          <code>{ex.code}</code>
                        </pre>

                        {/* Interactive Terminal Output Console */}
                        {isOpen && (
                          <div className="border-t border-white/[0.08] bg-black/80 p-4 font-mono text-xs">
                            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-emerald-400 pb-2">
                              <Terminal className="h-3.5 w-3.5" />
                              <span>TERMINAL OUTPUT</span>
                            </div>
                            <pre className="text-slate-200 whitespace-pre-wrap">
                              {ex.explanation.match(/Expected Output:\s*([\s\S]+)$/i)?.[1]?.trim() ||
                                'Execution completed successfully with exit code 0.'}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Practice material is tied to the selected lesson, rather than a generic runner card. */}
              {(activeLesson.content.exercise || activeLesson.content.quiz || activeLesson.content.challenge) && (
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-6 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Apply this lesson
                  </h3>
                  {activeLesson.content.exercise && (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">Exercise</p>
                      <p className="text-sm leading-6 text-slate-300">{activeLesson.content.exercise.prompt}</p>
                      <p className="text-xs text-muted-foreground">Success: {activeLesson.content.exercise.successCriteria}</p>
                    </div>
                  )}
                  {activeLesson.content.challenge && (
                    <div className="space-y-1 border-t border-white/[0.08] pt-4">
                      <p className="text-xs font-bold text-slate-200">Challenge</p>
                      <p className="text-sm leading-6 text-slate-300">{activeLesson.content.challenge.prompt}</p>
                      <p className="text-xs text-muted-foreground">Success: {activeLesson.content.challenge.successCriteria}</p>
                    </div>
                  )}
                  {activeLesson.content.quiz && (
                    <div className="space-y-1 border-t border-white/[0.08] pt-4">
                      <p className="text-xs font-bold text-slate-200">Check your understanding</p>
                      <p className="text-sm leading-6 text-slate-300">{activeLesson.content.quiz.question}</p>
                      <p className="text-xs text-primary">Answer: {activeLesson.content.quiz.answer}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Attribution & W3Schools Source Card */}
              <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Source: {activeLesson.attribution.source}</span>
                  <a
                    href={activeLesson.attribution.primaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <span>View Reference on W3Schools</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  {activeLesson.attribution.licenseNote} · Retrieved {activeLesson.attribution.retrievedAt}
                </p>
              </div>

              {/* Bottom Nav: Previous & Next */}
              <div className="flex items-center justify-between pt-2">
                <button
                  disabled={!activeLesson.previousLesson}
                  onClick={() => activeLesson.previousLesson && loadLesson(activeLesson.previousLesson.id)}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-white/[0.08]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{activeLesson.previousLesson?.title || 'First Lesson'}</span>
                </button>

                <button
                  disabled={!activeLesson.nextLesson}
                  onClick={() => activeLesson.nextLesson && loadLesson(activeLesson.nextLesson.id)}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-white/[0.08]"
                >
                  <span>{activeLesson.nextLesson?.title || 'Finish Subject'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Select a lesson from the curriculum sidebar to start learning.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
