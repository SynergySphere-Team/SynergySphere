'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import Link from 'next/link';
import {
  ChevronRight,
  Code2,
  MessageCircle,
  PhoneOff,
  Radio,
  Star,
  UserRoundCheck,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  RotateCcw,
  Zap,
  ArrowRight,
  HelpCircle,
  Layers,
} from 'lucide-react';

interface Question {
  id: string;
  topic: string;
  type: 'conceptual' | 'coding' | 'system-design' | 'sql' | 'behavioral-tech';
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  rubric: string[];
  tags: string[];
  followUps?: string[];
}

interface InterviewSession {
  id: string;
  topic: string;
  questions: Question[];
  totalQuestions: number;
}

interface LiveCritique {
  technicalClarity: { rating: 'Weak' | 'Fair' | 'Good' | 'Strong'; note: string };
  communication: { rating: 'Weak' | 'Fair' | 'Good' | 'Strong'; note: string };
  problemSolving: { rating: 'Weak' | 'Fair' | 'Good' | 'Strong'; note: string };
  topicDepth: { rating: 'Weak' | 'Fair' | 'Good' | 'Strong'; note: string };
  missingPoints: string[];
  suggestedNextSentence: string;
  heuristicMode?: boolean;
}

interface QuestionEvaluation {
  questionId: string;
  questionIndex: number;
  score: number;
  feedback: string;
  rubricMatches: string[];
  missedPoints: string[];
}

interface EvaluationResult {
  score: number;
  feedback: string;
  weakAreas: string[];
  questionScores: QuestionEvaluation[];
  xpEarned: number;
}

interface TrackInfo {
  id: string;
  name: string;
  category: 'Language' | 'Framework' | 'Composite';
  componentTopics: string[];
  description: string;
  questionCount: number;
}

interface ProfileSignals {
  hubSkills: Array<{
    id: string;
    name: string;
    completedLessons: number;
    totalLessons: number;
    percent: number;
    unlocked: boolean;
  }>;
}

export default function InterviewsPage() {
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [profileSignals, setProfileSignals] = useState<ProfileSignals | null>(null);
  const [sessionCount, setSessionCount] = useState<number>(10);
  const [sessionMode, setSessionMode] = useState<'mixed' | 'conceptual' | 'coding'>('mixed');

  const [interview, setInterview] = useState<InterviewSession | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [scratchCodes, setScratchCodes] = useState<string[]>([]);

  const [critique, setCritique] = useState<LiveCritique | null>(null);
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [activeTab, setActiveTab] = useState<'answer' | 'code'>('answer');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load tracks and hub profile signals on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [tracksRes, signalsRes] = await Promise.all([
          api<{ tracks: TrackInfo[] }>('/ai/interview/tracks').catch(() => null),
          api<ProfileSignals>('/portfolio/profile-signals').catch(() => null),
        ]);
        if (tracksRes?.tracks) setTracks(tracksRes.tracks);
        if (signalsRes) setProfileSignals(signalsRes);
      } catch (err) {
        console.error('Failed to load interview tracks:', err);
      }
    }
    loadInitialData();
  }, []);

  // Live Critique caller
  const triggerCritique = useCallback(
    async (ans: string, code: string, currentStep: number, session: InterviewSession) => {
      if (!session || !session.id) return;
      setCritiqueLoading(true);
      try {
        const critiqueData = await api<LiveCritique>('/ai/interview/critique', {
          method: 'POST',
          body: JSON.stringify({
            interviewId: session.id,
            questionIndex: currentStep,
            answer: ans || '',
            scratchCode: code || '',
          }),
        });
        setCritique(critiqueData);
      } catch (err) {
        console.warn('Critique call error:', err);
      } finally {
        setCritiqueLoading(false);
      }
    },
    [],
  );

  // Handle answer change with 800ms debounce
  function handleAnswerChange(val: string) {
    const next = [...answers];
    next[step] = val;
    setAnswers(next);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (interview) {
      debounceTimerRef.current = setTimeout(() => {
        triggerCritique(val, scratchCodes[step] || '', step, interview);
      }, 800);
    }
  }

  // Handle scratch code change
  function handleCodeChange(val: string) {
    const next = [...scratchCodes];
    next[step] = val;
    setScratchCodes(next);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (interview) {
      debounceTimerRef.current = setTimeout(() => {
        triggerCritique(answers[step] || '', val, step, interview);
      }, 800);
    }
  }

  async function startInterview(topic: string) {
    setLoading(true);
    setResult(null);
    setError('');
    setCritique(null);
    setShowFollowUps(false);

    try {
      const data = await api<InterviewSession>('/ai/interview/start', {
        method: 'POST',
        body: JSON.stringify({
          topic,
          count: sessionCount,
          mode: sessionMode,
        }),
      });

      setInterview(data);
      const qCount = data.questions.length;
      setAnswers(new Array(qCount).fill(''));
      setScratchCodes(new Array(qCount).fill(''));
      setStep(0);

      // Trigger initial prompt critique
      triggerCritique('', '', 0, data);
    } catch {
      setError('Could not start interview session. Ensure the backend is reachable and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitInterview() {
    if (!interview) return;
    setLoading(true);
    setError('');
    try {
      const evalData = await api<EvaluationResult>('/ai/interview/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          interviewId: interview.id,
          answers,
          scratchCodes,
        }),
      });
      setResult(evalData);
      setInterview(null);
    } catch {
      setError('Could not evaluate this interview. Your answers are preserved; please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleStepChange(newStep: number) {
    if (!interview) return;
    setStep(newStep);
    setShowFollowUps(false);
    triggerCritique(answers[newStep] || '', scratchCodes[newStep] || '', newStep, interview);
  }

  const currentQ = interview?.questions[step];

  function getRatingColor(rating?: string) {
    switch (rating) {
      case 'Strong':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
      case 'Good':
        return 'text-lime-400 bg-lime-950/40 border-lime-500/30';
      case 'Fair':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
      default:
        return 'text-rose-400 bg-rose-950/40 border-rose-500/30';
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              Mock Interview Center
            </span>
            <span className="text-xs text-muted-foreground">· 550+ First-Party Questions</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">Technical Interview Practice</h1>
          <p className="text-sm text-muted-foreground">
            Realistic technical interviews with live AI feedback, real rubrics, and automated Learning Hub skill tracking.
          </p>
        </div>

        {interview && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('End current interview? Progress for this session will not be scored.')) {
                  setInterview(null);
                  setCritique(null);
                }
              }}
              className="border-rose-500/30 text-rose-300 hover:bg-rose-950/30"
            >
              <PhoneOff className="mr-1.5 h-4 w-4" />
              End Session
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/15 p-3.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        {/* Left Column: Topics & Session Settings */}
        <div className="space-y-4">
          <Card className="border-white/[0.08] bg-[#0d131f]/90 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <MessageCircle className="h-4 w-4 text-primary" />
                Interview Tracks
              </CardTitle>
              <p className="text-xs text-muted-foreground">11 Learning Hub tracks + composite tracks</p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Session Options */}
              <div className="space-y-2 rounded-lg border border-white/[0.06] bg-black/25 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Questions</span>
                  <div className="flex gap-1">
                    {[10, 20, 30].map((c) => (
                      <button
                        key={c}
                        onClick={() => setSessionCount(c)}
                        disabled={Boolean(interview)}
                        className={`rounded px-2 py-0.5 text-xs font-bold transition ${
                          sessionCount === c
                            ? 'bg-primary text-black'
                            : 'bg-white/[0.05] text-muted-foreground hover:text-white'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-1">
                  <span>Mode</span>
                  <div className="flex gap-1">
                    {(['mixed', 'conceptual', 'coding'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSessionMode(m)}
                        disabled={Boolean(interview)}
                        className={`rounded px-1.5 py-0.5 text-[11px] capitalize transition ${
                          sessionMode === m
                            ? 'bg-primary/20 text-primary border border-primary/40'
                            : 'bg-white/[0.05] text-muted-foreground hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Track List */}
              <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
                {(tracks.length > 0 ? tracks : fallbackTracks).map((track) => {
                  const hubSkill = profileSignals?.hubSkills.find((s) => s.id === track.id);
                  const isCurrent = interview?.topic.toLowerCase() === track.name.toLowerCase();

                  return (
                    <button
                      key={track.id}
                      onClick={() => startInterview(track.name)}
                      disabled={loading}
                      className={`group relative flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition ${
                        isCurrent
                          ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(163,230,53,0.15)]'
                          : 'border-white/[0.08] bg-secondary/30 hover:border-primary/40 hover:bg-secondary/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white group-hover:text-primary transition">
                          {track.name}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            track.category === 'Composite'
                              ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40'
                              : track.category === 'Framework'
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                          }`}
                        >
                          {track.category}
                        </span>
                      </div>

                      <p className="line-clamp-1 text-[11px] text-muted-foreground">{track.description}</p>

                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {hubSkill ? `${hubSkill.completedLessons}/${hubSkill.totalLessons} lessons` : '50+ Bank Qs'}
                        </span>
                        <span className="font-semibold text-primary">
                          {hubSkill && hubSkill.percent > 0 ? `${hubSkill.percent}% Hub Mastery` : '+XP on Finish'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column: Active Interview / Results */}
        <div className="space-y-4">
          <Card className="min-h-[580px] border-white/[0.08] bg-[#0d131f]/90 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-white">
                  {interview ? `${interview.topic} Technical Interview` : result ? 'Assessment Results' : 'Ready to Interview'}
                </CardTitle>
              </div>

              {interview && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    Live Session
                  </span>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-5">
              {interview && currentQ && (
                <div className="space-y-5">
                  {/* Interviewer Avatar Ring */}
                  <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 shadow-[0_0_30px_rgba(163,230,53,0.15)]">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/40">
                      <UserRoundCheck className="h-10 w-10 text-primary" />
                    </div>
                    <span className="absolute -bottom-1 rounded-full border border-primary/40 bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Senior Staff AI
                    </span>
                  </div>

                  {/* Question Box */}
                  <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">
                        Question {step + 1} of {interview.questions.length}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            currentQ.difficulty === 'hard'
                              ? 'border border-rose-500/30 bg-rose-950/40 text-rose-300'
                              : currentQ.difficulty === 'medium'
                              ? 'border border-amber-500/30 bg-amber-950/40 text-amber-300'
                              : 'border border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                          }`}
                        >
                          {currentQ.difficulty}
                        </span>
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase">
                          {currentQ.type}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold leading-relaxed text-white">{currentQ.prompt}</h3>

                    {/* Tags */}
                    {currentQ.tags && currentQ.tags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {currentQ.tags.map((tag) => (
                          <span key={tag} className="rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Follow Up Hint Toggle */}
                    {currentQ.followUps && currentQ.followUps.length > 0 && (
                      <div className="mt-3 border-t border-white/[0.06] pt-2">
                        <button
                          onClick={() => setShowFollowUps(!showFollowUps)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-white"
                        >
                          <Lightbulb className="h-3 w-3 text-amber-400" />
                          <span>{showFollowUps ? 'Hide Interviewer Angle' : 'View Interviewer Follow-ups'}</span>
                        </button>
                        {showFollowUps && (
                          <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs text-amber-200/80">
                            {currentQ.followUps.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tabs: Verbal Answer vs Scratch Code */}
                  <div className="flex border-b border-white/[0.08]">
                    <button
                      onClick={() => setActiveTab('answer')}
                      className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition ${
                        activeTab === 'answer'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-white'
                      }`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Verbal Response / Reasoning
                    </button>
                    <button
                      onClick={() => setActiveTab('code')}
                      className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition ${
                        activeTab === 'code'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-white'
                      }`}
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      Interactive Code Scratchpad
                      {scratchCodes[step]?.trim() && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </button>
                  </div>

                  {/* Input Fields */}
                  {activeTab === 'answer' ? (
                    <div className="relative">
                      <textarea
                        value={answers[step] || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        placeholder="State your approach, trade-offs, internal mechanics, and time/space complexity..."
                        className="h-36 w-full resize-none rounded-xl border border-white/[0.08] bg-black/35 p-3.5 text-sm leading-relaxed text-white outline-none transition focus:border-primary/40 focus:ring-1 focus:ring-primary/40"
                      />
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {answers[step]?.trim().split(/\s+/).filter(Boolean).length || 0} words
                        </span>
                        {critiqueLoading && (
                          <span className="flex items-center gap-1 text-primary">
                            <Sparkles className="h-3 w-3 animate-spin" />
                            Evaluating answer in real time...
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Language: {currentQ.topic}</span>
                        <button
                          onClick={() => handleCodeChange('')}
                          className="hover:text-rose-400 transition"
                        >
                          Clear Code
                        </button>
                      </div>
                      <textarea
                        value={scratchCodes[step] || ''}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        placeholder={`// Write ${currentQ.topic} implementation here...\nfunction solution() {\n  // your code\n}`}
                        className="h-36 w-full resize-none rounded-xl border border-white/[0.08] bg-[#050a0d] p-3.5 font-mono text-xs leading-relaxed text-emerald-300 outline-none transition focus:border-primary/40 focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                  )}

                  {/* Bottom Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={step === 0}
                      onClick={() => handleStepChange(step - 1)}
                      className="border-white/[0.08]"
                    >
                      Previous
                    </Button>

                    <div className="text-xs text-muted-foreground">
                      {step + 1} of {interview.questions.length}
                    </div>

                    {step < interview.questions.length - 1 ? (
                      <Button size="sm" onClick={() => handleStepChange(step + 1)} className="font-bold">
                        Next Question <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={submitInterview}
                        disabled={loading}
                        className="bg-primary font-bold text-black hover:bg-primary/90"
                      >
                        {loading ? 'Evaluating Session...' : 'Submit Final Interview'}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Results View */}
              {result && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary/40 bg-black/40">
                      <span className="text-4xl font-black text-primary">{result.score}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-white">Overall Interview Score</h3>
                    <p className="max-w-md text-xs text-muted-foreground mt-1">{result.feedback}</p>

                    {result.xpEarned > 0 && (
                      <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-xs font-black text-primary">
                        <Zap className="h-3.5 w-3.5 fill-primary" /> +{result.xpEarned} XP Earned
                      </span>
                    )}
                  </div>

                  {/* Weak Areas mapped to Hub */}
                  {result.weakAreas && result.weakAreas.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                      <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                        <BookOpen className="h-4 w-4" /> Recommended Learning Hub Focus
                      </h4>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {result.weakAreas.map((area, i) => (
                          <Link
                            key={i}
                            href={`/learning-hub?search=${encodeURIComponent(area)}`}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-950/40 px-2.5 py-1 text-xs text-amber-200 transition hover:bg-amber-900/60"
                          >
                            <span>{area}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-question breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Question Score Breakdown
                    </h4>
                    <div className="space-y-2">
                      {result.questionScores.map((qs, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/25 p-3 text-xs"
                        >
                          <span className="font-semibold text-white">Question {i + 1}</span>
                          <span className="text-muted-foreground line-clamp-1 max-w-[260px]">
                            {qs.feedback}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 font-bold ${
                              qs.score >= 80 ? 'text-emerald-400' : qs.score >= 60 ? 'text-amber-400' : 'text-rose-400'
                            }`}
                          >
                            {qs.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setResult(null);
                      setInterview(null);
                    }}
                    className="w-full font-bold"
                  >
                    Start Another Interview Track
                  </Button>
                </div>
              )}

              {/* Empty / Intro state */}
              {!interview && !result && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02]">
                    <Layers className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white">Select a Track to Begin</h3>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                    Choose from 11 core languages, frameworks, or composite backend and full-stack role tracks on the left.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Feedback Grounded in Rubric */}
        <div className="space-y-4">
          <Card className="border-white/[0.08] bg-[#0d131f]/90 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <Star className="h-4 w-4 text-primary" />
                  Live AI Critique
                </CardTitle>
                {critique?.heuristicMode !== undefined && (
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {critique.heuristicMode ? 'Heuristic' : 'Gemini AI'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Grounded in question scoring rubric & industry benchmarks
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {critique ? (
                <>
                  {/* Rating Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Technical Clarity</span>
                        <span className={`rounded border px-1.5 py-0.2 text-[10px] font-black ${getRatingColor(critique.technicalClarity.rating)}`}>
                          {critique.technicalClarity.rating}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] text-white/70">{critique.technicalClarity.note}</p>
                    </div>

                    <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Communication</span>
                        <span className={`rounded border px-1.5 py-0.2 text-[10px] font-black ${getRatingColor(critique.communication.rating)}`}>
                          {critique.communication.rating}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] text-white/70">{critique.communication.note}</p>
                    </div>

                    <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Problem Solving</span>
                        <span className={`rounded border px-1.5 py-0.2 text-[10px] font-black ${getRatingColor(critique.problemSolving.rating)}`}>
                          {critique.problemSolving.rating}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] text-white/70">{critique.problemSolving.note}</p>
                    </div>

                    <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Topic Depth</span>
                        <span className={`rounded border px-1.5 py-0.2 text-[10px] font-black ${getRatingColor(critique.topicDepth.rating)}`}>
                          {critique.topicDepth.rating}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] text-white/70">{critique.topicDepth.note}</p>
                    </div>
                  </div>

                  {/* Missing Rubric Points */}
                  {critique.missingPoints && critique.missingPoints.length > 0 && (
                    <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-3">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-300">
                        <AlertCircle className="h-3.5 w-3.5" /> Missing Rubric Criteria
                      </span>
                      <ul className="mt-1.5 list-inside list-disc space-y-1 text-[11px] text-rose-200/80">
                        {critique.missingPoints.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Next Sentence */}
                  {critique.suggestedNextSentence && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
                        <Sparkles className="h-3.5 w-3.5" /> Suggested Addition
                      </span>
                      <p className="mt-1 text-[11px] italic text-slate-300">
                        "{critique.suggestedNextSentence}"
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Start an interview session to see real-time rubric feedback as you formulate answers.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Question Rubric Peek */}
          {currentQ && (
            <Card className="border-white/[0.08] bg-[#0d131f]/90 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Official Rubric Focus Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                  {currentQ.rubric.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-primary">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

const fallbackTracks: TrackInfo[] = [
  { id: 'java', name: 'Java', category: 'Language', componentTopics: ['java'], description: 'Core Java, OOP, Collections, Concurrency & Spring Boot', questionCount: 50 },
  { id: 'python', name: 'Python', category: 'Language', componentTopics: ['python'], description: 'Python 3, OOP, AsyncIO, Generators & Decorators', questionCount: 50 },
  { id: 'javascript', name: 'JavaScript', category: 'Language', componentTopics: ['javascript'], description: 'Event Loop, Promises, Closures, DOM & Prototypal Inheritance', questionCount: 50 },
  { id: 'typescript', name: 'TypeScript', category: 'Language', componentTopics: ['typescript'], description: 'Generics, Utility Types, Discriminated Unions & Type System', questionCount: 50 },
  { id: 'sql', name: 'SQL', category: 'Language', componentTopics: ['sql'], description: 'Relational DBs, Joins, Indexing, Window Functions & EXPLAIN', questionCount: 50 },
  { id: 'react', name: 'React', category: 'Framework', componentTopics: ['react'], description: 'Hooks, Fiber, Reconciliation, State Management & React 18', questionCount: 50 },
  { id: 'nodejs', name: 'Node.js', category: 'Framework', componentTopics: ['nodejs'], description: 'Event Loop, Libuv, Streams, Worker Threads & Buffers', questionCount: 50 },
  { id: 'backend', name: 'Backend', category: 'Composite', componentTopics: ['java', 'python', 'nodejs', 'sql'], description: 'Server architectures, APIs, SQL databases & distributed systems', questionCount: 200 },
  { id: 'web-dev', name: 'Web Development', category: 'Composite', componentTopics: ['html', 'css', 'javascript', 'react'], description: 'Modern front-end engineering: HTML5, CSS Grid, JS & React', questionCount: 200 },
];
