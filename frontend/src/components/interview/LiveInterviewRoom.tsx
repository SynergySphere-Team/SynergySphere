'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import Link from 'next/link';
import {
  ChevronRight,
  Code2,
  MessageCircle,
  PhoneOff,
  Star,
  UserRoundCheck,
  Sparkles,
  BookOpen,
  AlertCircle,
  Lightbulb,
  Zap,
  ArrowRight,
  Layers,
  Mic,
  MicOff,
  Keyboard,
  CheckCircle2,
  CornerDownLeft,
} from 'lucide-react';
import type {
  TrackInfo,
  ProfileSignals,
  InterviewSession,
  LiveCritique,
  EvaluationResult,
} from './types';

interface LiveInterviewRoomProps {
  tracks: TrackInfo[];
  profileSignals: ProfileSignals | null;
  activeInterview: InterviewSession | null;
  initialTopic?: string | null;
  onInterviewStarted: (session: InterviewSession) => void;
  onInterviewEnded: () => void;
  onSwitchToHistory?: () => void;
}

export function LiveInterviewRoom({
  tracks,
  profileSignals,
  activeInterview,
  initialTopic,
  onInterviewStarted,
  onInterviewEnded,
  onSwitchToHistory,
}: LiveInterviewRoomProps) {
  const [sessionCount, setSessionCount] = useState<number>(10);
  const [sessionMode, setSessionMode] = useState<'mixed' | 'conceptual' | 'coding'>('mixed');
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

  // Auto-launch initialTopic if passed in query param
  useEffect(() => {
    if (initialTopic && !activeInterview && !result && tracks.length > 0) {
      startInterview(initialTopic);
    }
  }, [initialTopic, tracks.length]);

  // Keyboard synchronization & shortcut feedback state
  const [lastShortcutTriggered, setLastShortcutTriggered] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const answerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const codeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync answers/codes array length when interview starts
  useEffect(() => {
    if (activeInterview) {
      const qCount = activeInterview.questions.length;
      setAnswers((prev) => (prev.length === qCount ? prev : new Array(qCount).fill('')));
      setScratchCodes((prev) => (prev.length === qCount ? prev : new Array(qCount).fill('')));
      setStep(0);
      setResult(null);
      setCritique(null);
    }
  }, [activeInterview]);

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

  // Handle answer change with typing synchronization indicator
  function handleAnswerChange(val: string) {
    const next = [...answers];
    next[step] = val;
    setAnswers(next);

    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 600);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (activeInterview) {
      debounceTimerRef.current = setTimeout(() => {
        triggerCritique(val, scratchCodes[step] || '', step, activeInterview);
      }, 800);
    }
  }

  // Handle scratch code change
  function handleCodeChange(val: string) {
    const next = [...scratchCodes];
    next[step] = val;
    setScratchCodes(next);

    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 600);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (activeInterview) {
      debounceTimerRef.current = setTimeout(() => {
        triggerCritique(answers[step] || '', val, step, activeInterview);
      }, 800);
    }
  }

  // Helper to trigger brief visual highlight on shortcut key
  function highlightShortcut(name: string) {
    setLastShortcutTriggered(name);
    setTimeout(() => {
      setLastShortcutTriggered(null);
    }, 900);
  }

  // Keyboard navigation & editor keydown handler
  function handleEditorKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    editorType: 'answer' | 'code',
  ) {
    // 1. Ctrl+Enter or Cmd+Enter: Next Question or Submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      highlightShortcut('submit_next');
      if (activeInterview) {
        if (step < activeInterview.questions.length - 1) {
          handleStepChange(step + 1);
        } else {
          submitInterview();
        }
      }
      return;
    }

    // 2. Tab key in Code Scratchpad: insert 2 spaces indentation
    if (editorType === 'code' && e.key === 'Tab') {
      e.preventDefault();
      highlightShortcut('tab_indent');
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      if (e.shiftKey) {
        // Shift+Tab: Unindent
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        if (val.substring(lineStart, lineStart + 2) === '  ') {
          const updated = val.substring(0, lineStart) + val.substring(lineStart + 2);
          handleCodeChange(updated);
          setTimeout(() => {
            textarea.selectionStart = Math.max(lineStart, start - 2);
            textarea.selectionEnd = Math.max(lineStart, end - 2);
          }, 0);
        }
      } else {
        // Indent 2 spaces
        const updated = val.substring(0, start) + '  ' + val.substring(end);
        handleCodeChange(updated);
        setTimeout(() => {
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
        }, 0);
      }
      return;
    }

    // 3. Alt+ArrowRight or Alt+N: Next question
    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      if (activeInterview && step < activeInterview.questions.length - 1) {
        highlightShortcut('next');
        handleStepChange(step + 1);
      }
      return;
    }

    // 4. Alt+ArrowLeft or Alt+P: Previous question
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      if (step > 0) {
        highlightShortcut('prev');
        handleStepChange(step - 1);
      }
      return;
    }

    // 5. Alt+1: Switch to Answer tab
    if (e.altKey && (e.key === '1' || e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      highlightShortcut('tab_answer');
      setActiveTab('answer');
      setTimeout(() => answerTextareaRef.current?.focus(), 50);
      return;
    }

    // 6. Alt+2: Switch to Code tab
    if (e.altKey && (e.key === '2' || e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      highlightShortcut('tab_code');
      setActiveTab('code');
      setTimeout(() => codeTextareaRef.current?.focus(), 50);
      return;
    }

    // 7. Alt+M: Toggle Voice mic
    if (e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      highlightShortcut('mic');
      toggleSpeechRecognition();
      return;
    }

    // 8. Alt+H: Toggle Hints & Followups
    if (e.altKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      highlightShortcut('hints');
      setShowFollowUps((prev) => !prev);
      return;
    }
  }

  // Global window shortcut listener so user can navigate even if outside textarea
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (!activeInterview) return;

      // Don't intercept if user is typing in a different input (e.g. search)
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        highlightShortcut('submit_next');
        if (step < activeInterview.questions.length - 1) {
          handleStepChange(step + 1);
        } else {
          submitInterview();
        }
      } else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        if (step < activeInterview.questions.length - 1) {
          highlightShortcut('next');
          handleStepChange(step + 1);
        }
      } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (step > 0) {
          highlightShortcut('prev');
          handleStepChange(step - 1);
        }
      } else if (e.altKey && (e.key === '1' || e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        highlightShortcut('tab_answer');
        setActiveTab('answer');
        answerTextareaRef.current?.focus();
      } else if (e.altKey && (e.key === '2' || e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        highlightShortcut('tab_code');
        setActiveTab('code');
        codeTextareaRef.current?.focus();
      } else if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        highlightShortcut('mic');
        toggleSpeechRecognition();
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeInterview, step]);

  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const scratchCodesRef = useRef(scratchCodes);
  useEffect(() => {
    scratchCodesRef.current = scratchCodes;
  }, [scratchCodes]);

  const activeInterviewRef = useRef(activeInterview);
  useEffect(() => {
    activeInterviewRef.current = activeInterview;
  }, [activeInterview]);

  // Speech Recognition state & mic visualizer
  const [isListening, setIsListening] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [liveTranscriptPreview, setLiveTranscriptPreview] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const initialTextRef = useRef<string>('');
  const committedSpeechRef = useRef<string>('');
  const lastSessionFinalRef = useRef<string>('');

  function stopMicAnalysis() {
    setVoiceVolume(0);
  }

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      stopMicAnalysis();
    };
  }, []);

  function toggleSpeechRecognition() {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      setLiveTranscriptPreview('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      stopMicAnalysis();
      return;
    }

    setSpeechError(null);
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setSpeechError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const currentStep = stepRef.current;
    initialTextRef.current = answersRef.current[currentStep] || '';
    committedSpeechRef.current = '';
    lastSessionFinalRef.current = '';
    isListeningRef.current = true;
    setIsListening(true);
    setLiveTranscriptPreview('Listening to microphone...');

    try {
      function startNewSpeechInstance(): any {
        if (!isListeningRef.current) return null;
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';
          rec.maxAlternatives = 1;

          rec.onresult = (event: any) => {
            let sessionFinal = '';
            let sessionInterim = '';

            for (let i = 0; i < event.results.length; i++) {
              const res = event.results[i];
              const text = res[0]?.transcript || '';
              if (res.isFinal) {
                sessionFinal += text + ' ';
              } else {
                sessionInterim += text;
              }
            }

            lastSessionFinalRef.current = sessionFinal;
            const currentSpoken = (committedSpeechRef.current + sessionFinal + sessionInterim).trim();
            setLiveTranscriptPreview(currentSpoken || 'Listening...');

            if (currentSpoken) {
              const init = initialTextRef.current.trim();
              const combined = init ? `${init} ${currentSpoken}` : currentSpoken;
              setAnswers((prev) => {
                const next = [...prev];
                next[stepRef.current] = combined;
                return next;
              });

              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              if (activeInterviewRef.current) {
                debounceTimerRef.current = setTimeout(() => {
                  triggerCritique(
                    combined,
                    scratchCodesRef.current[stepRef.current] || '',
                    stepRef.current,
                    activeInterviewRef.current!,
                  );
                }, 800);
              }
            }
          };

          rec.onerror = (e: any) => {
            if (e?.error === 'not-allowed') {
              setSpeechError('Microphone permission was denied.');
              isListeningRef.current = false;
              setIsListening(false);
            }
          };

          rec.onend = () => {
            if (isListeningRef.current) {
              if (lastSessionFinalRef.current) {
                committedSpeechRef.current += lastSessionFinalRef.current.trim() + ' ';
                lastSessionFinalRef.current = '';
              }
              setTimeout(() => {
                if (isListeningRef.current) {
                  recognitionRef.current = startNewSpeechInstance();
                }
              }, 120);
            } else {
              setIsListening(false);
            }
          };

          rec.start();
          return rec;
        } catch {
          return null;
        }
      }

      recognitionRef.current = startNewSpeechInstance();
    } catch (err: any) {
      setSpeechError('Could not start microphone: ' + (err.message || 'Unknown error'));
      isListeningRef.current = false;
      setIsListening(false);
      return;
    }

    const volumeInterval = setInterval(() => {
      if (!isListeningRef.current) {
        setVoiceVolume(0);
        clearInterval(volumeInterval);
        return;
      }
      setVoiceVolume(Math.floor(Math.random() * 45) + 35);
    }, 180);
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

      onInterviewStarted(data);
      const qCount = data.questions.length;
      setAnswers(new Array(qCount).fill(''));
      setScratchCodes(new Array(qCount).fill(''));
      setStep(0);
      triggerCritique('', '', 0, data);
    } catch {
      setError('Could not start interview session. Ensure the backend is reachable.');
    } finally {
      setLoading(false);
    }
  }

  async function submitInterview() {
    if (!activeInterview) return;
    setLoading(true);
    setError('');
    try {
      const evalData = await api<EvaluationResult>('/ai/interview/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          interviewId: activeInterview.id,
          answers,
          scratchCodes,
        }),
      });
      setResult(evalData);
      onInterviewEnded();
    } catch {
      setError('Could not evaluate this interview. Your answers are preserved; please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleStepChange(newStep: number) {
    if (!activeInterview) return;
    setStep(newStep);
    setShowFollowUps(false);
    triggerCritique(answers[newStep] || '', scratchCodes[newStep] || '', newStep, activeInterview);
  }

  const currentQ = activeInterview?.questions[step];

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

  // Active answer word & char counts
  const currentAnswerText = answers[step] || '';
  const wordCount = currentAnswerText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = currentAnswerText.length;
  const currentCodeText = scratchCodes[step] || '';
  const codeLinesCount = currentCodeText ? currentCodeText.split('\n').length : 0;

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/15 p-3.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* When NO session is active and NO result showing: Track Launcher Grid */}
      {!activeInterview && !result && (
        <div className="space-y-6">
          {/* Quick Launch Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#0d131f] via-[#091823] to-[#0d131f] p-6 shadow-xl">
            <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Real-Time AI Mock Simulation
                </div>
                <h2 className="text-xl font-black text-white md:text-2xl">
                  Select an Interview Track to Begin
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Simulate rigorous technical interviews with live speech-to-text, keyboard-synchronized text boxes, instant rubric-based grading, and automatic Learning Hub skill tracking.
                </p>
              </div>

              {/* Session Controls */}
              <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-black/40 p-3 shrink-0">
                <div className="flex items-center justify-between gap-4 text-xs font-semibold text-muted-foreground">
                  <span>Questions:</span>
                  <div className="flex gap-1">
                    {[5, 10, 20].map((c) => (
                      <button
                        key={c}
                        onClick={() => setSessionCount(c)}
                        className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                          sessionCount === c
                            ? 'bg-primary text-black shadow'
                            : 'bg-white/[0.05] text-muted-foreground hover:text-white'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs font-semibold text-muted-foreground pt-1 border-t border-white/[0.06]">
                  <span>Mode:</span>
                  <div className="flex gap-1">
                    {(['mixed', 'conceptual', 'coding'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSessionMode(m)}
                        className={`rounded px-2 py-0.5 text-xs capitalize transition ${
                          sessionMode === m
                            ? 'border border-primary/40 bg-primary/20 text-primary font-bold'
                            : 'bg-white/[0.05] text-muted-foreground hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tracks Grid */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Available Interview Tracks ({tracks.length})
              </h3>
              <span className="text-xs text-muted-foreground">Click any track to launch immediately</span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tracks.map((track) => {
                const hubSkill = profileSignals?.hubSkills.find((s) => s.id === track.id);
                return (
                  <button
                    key={track.id}
                    onClick={() => startInterview(track.name)}
                    disabled={loading}
                    className="group relative flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0d131f]/90 p-4 text-left transition hover:border-primary/50 hover:bg-[#111928] hover:shadow-[0_4px_20px_rgba(163,230,53,0.1)] active:scale-[0.99]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-primary transition">
                          {track.name}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            track.category === 'Composite'
                              ? 'border border-purple-500/30 bg-purple-950/40 text-purple-300'
                              : track.category === 'Framework'
                              ? 'border border-blue-500/30 bg-blue-950/40 text-blue-300'
                              : 'border border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                          }`}
                        >
                          {track.category}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {track.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px]">
                      <span className="text-muted-foreground">
                        {hubSkill ? `${hubSkill.completedLessons}/${hubSkill.totalLessons} Hub Lessons` : `${track.questionCount || 50}+ Questions`}
                      </span>
                      <span className="font-semibold text-primary group-hover:translate-x-0.5 transition flex items-center gap-1">
                        Start <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE INTERVIEW ROOM: 2-Column Responsive Layout */}
      {activeInterview && currentQ && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main Stage: Question Prompt & Synchronized Answer Workspace */}
          <div className="space-y-4">
            <Card className="border-white/[0.08] bg-[#0d131f]/90 shadow-xl">
              <CardHeader className="flex-row items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <CardTitle className="text-base text-white">
                    {activeInterview.topic} Technical Interview
                  </CardTitle>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-white/[0.08] bg-black/40 px-2.5 py-1 text-xs font-mono font-bold text-primary">
                    Question {step + 1} of {activeInterview.questions.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('End this interview? Your answers up to this point will not be scored.')) {
                        onInterviewEnded();
                      }
                    }}
                    className="h-7 text-xs border-rose-500/30 text-rose-300 hover:bg-rose-950/30"
                  >
                    <PhoneOff className="mr-1 h-3.5 w-3.5" />
                    End
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* AI Interviewer Avatar & Persona */}
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/30 p-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 shrink-0">
                    <UserRoundCheck className="h-6 w-6 text-primary" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-black bg-emerald-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Senior Staff AI Interviewer</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        Live Evaluation Active
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Assessing technical clarity, architectural depth, trade-off reasoning, and edge-case awareness.
                    </p>
                  </div>
                </div>

                {/* Question Prompt Card */}
                <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">
                      Topic: {currentQ.topic.toUpperCase()}
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

                  <h3 className="text-base font-bold leading-relaxed text-white">
                    {currentQ.prompt}
                  </h3>

                  {currentQ.tags && currentQ.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {currentQ.tags.map((tag) => (
                        <span key={tag} className="rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {currentQ.followUps && currentQ.followUps.length > 0 && (
                    <div className="mt-3 border-t border-white/[0.06] pt-2">
                      <button
                        onClick={() => setShowFollowUps(!showFollowUps)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-white"
                      >
                        <Lightbulb className="h-3 w-3 text-amber-400" />
                        <span>{showFollowUps ? 'Hide Interviewer Angle' : 'View Interviewer Follow-ups [Alt + H]'}</span>
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

                {/* Workspace Switcher & Live Mic Controls */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('answer');
                        setTimeout(() => answerTextareaRef.current?.focus(), 50);
                      }}
                      className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'answer'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-white'
                      }`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Verbal Response <span className="opacity-50 text-[10px] font-mono">[Alt+1]</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('code');
                        setTimeout(() => codeTextareaRef.current?.focus(), 50);
                      }}
                      className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'code'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-white'
                      }`}
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      Code Scratchpad <span className="opacity-50 text-[10px] font-mono">[Alt+2]</span>
                      {scratchCodes[step]?.trim() && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </button>
                  </div>

                  {activeTab === 'answer' && (
                    <div className="flex items-center gap-2">
                      {isListening && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20">
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                          <div className="flex items-end gap-0.5 h-3.5">
                            {[0.3, 0.7, 1, 0.6, 0.4].map((ratio, idx) => {
                              const h = Math.max(3, Math.min(14, Math.round((voiceVolume / 100) * 14 * ratio + 3)));
                              return (
                                <span
                                  key={idx}
                                  className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                                  style={{ height: `${h}px` }}
                                />
                              );
                            })}
                          </div>
                          <span className="text-[10px] font-mono text-rose-300 ml-1">Live Mic</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                          isListening
                            ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-md shadow-rose-500/20'
                            : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                        }`}
                        title="Toggle microphone [Alt + M]"
                      >
                        {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                        <span>{isListening ? 'Stop Mic' : 'Voice Input [Alt+M]'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Speech Error Banner */}
                {speechError && (
                  <div className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                    <span>{speechError}</span>
                    <button onClick={() => setSpeechError(null)} className="text-rose-400 hover:text-white">✕</button>
                  </div>
                )}

                {/* Live Speech Transcription Banner */}
                {isListening && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    <Mic className="h-3.5 w-3.5 shrink-0 text-emerald-400 animate-pulse" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-emerald-400">Transcribing live: </span>
                      <span className="italic text-white font-mono">{liveTranscriptPreview || 'Listening for speech…'}</span>
                    </div>
                  </div>
                )}

                {/* Synchronized Text Editors */}
                {activeTab === 'answer' ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <textarea
                        ref={answerTextareaRef}
                        value={answers[step] || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        onKeyDown={(e) => handleEditorKeyDown(e, 'answer')}
                        placeholder="Type your explanation or use voice dictation. Discuss technical mechanics, runtime trade-offs, architecture, and time/space complexity... (Ctrl+Enter to advance)"
                        rows={7}
                        className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/40 p-3.5 text-sm leading-relaxed text-white outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/40 font-sans"
                        autoFocus
                      />
                    </div>

                    {/* Synchronization Status Bar */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <div className="flex items-center gap-3">
                        <span>{wordCount} words</span>
                        <span>·</span>
                        <span>{charCount} characters</span>
                        <span>·</span>
                        {isTyping ? (
                          <span className="text-amber-400 flex items-center gap-1 font-mono">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Typing...
                          </span>
                        ) : critiqueLoading ? (
                          <span className="text-primary flex items-center gap-1 font-mono">
                            <Sparkles className="h-3 w-3 animate-spin" />
                            Evaluating in real time...
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1 font-mono">
                            <CheckCircle2 className="h-3 w-3" />
                            Synchronized
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-muted-foreground">
                        Press <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-white">Ctrl+Enter</kbd> to proceed
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span>Language context: <strong className="text-primary">{currentQ.topic}</strong> (Tab key indents by 2 spaces)</span>
                      <button
                        onClick={() => handleCodeChange('')}
                        className="text-muted-foreground hover:text-rose-400 transition"
                      >
                        Clear Scratchpad
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        ref={codeTextareaRef}
                        value={scratchCodes[step] || ''}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        onKeyDown={(e) => handleEditorKeyDown(e, 'code')}
                        placeholder={`// Scratchpad: implement ${currentQ.topic} logic or pseudocode here...\nfunction solution() {\n  // your implementation\n}`}
                        rows={8}
                        className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#050a0d] p-3.5 font-mono text-xs leading-relaxed text-emerald-300 outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/40"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <div className="flex items-center gap-3">
                        <span>{codeLinesCount} lines</span>
                        <span>·</span>
                        <span className="text-emerald-400 font-mono">Tab indentation enabled</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Press <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-white">Ctrl+Enter</kbd> to proceed
                      </div>
                    </div>
                  </div>
                )}

                {/* KEYBOARD SHORTCUTS HUD: Visual feedback bar */}
                <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1 font-semibold text-white/80">
                      <Keyboard className="h-3 w-3 text-primary" />
                      Active Keyboard Synchronization
                    </span>
                    <span className="text-[10px]">Instant Hotkeys</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        highlightShortcut('submit_next');
                        if (step < activeInterview.questions.length - 1) {
                          handleStepChange(step + 1);
                        } else {
                          submitInterview();
                        }
                      }}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono transition ${
                        lastShortcutTriggered === 'submit_next'
                          ? 'border-primary bg-primary text-black font-bold scale-105'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      <CornerDownLeft className="h-2.5 w-2.5" />
                      Ctrl+Enter: {step < activeInterview.questions.length - 1 ? 'Next' : 'Submit'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        highlightShortcut('tab_answer');
                        setActiveTab('answer');
                        answerTextareaRef.current?.focus();
                      }}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono transition ${
                        lastShortcutTriggered === 'tab_answer'
                          ? 'border-primary bg-primary text-black font-bold scale-105'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      Alt+1: Verbal
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        highlightShortcut('tab_code');
                        setActiveTab('code');
                        codeTextareaRef.current?.focus();
                      }}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono transition ${
                        lastShortcutTriggered === 'tab_code'
                          ? 'border-primary bg-primary text-black font-bold scale-105'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      Alt+2: Code
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        highlightShortcut('mic');
                        toggleSpeechRecognition();
                      }}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono transition ${
                        lastShortcutTriggered === 'mic'
                          ? 'border-rose-500 bg-rose-500 text-white font-bold scale-105'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      Alt+M: Mic
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        highlightShortcut('hints');
                        setShowFollowUps(!showFollowUps);
                      }}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono transition ${
                        lastShortcutTriggered === 'hints'
                          ? 'border-amber-400 bg-amber-400 text-black font-bold scale-105'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      Alt+H: Hints
                    </button>

                    {activeTab === 'code' && (
                      <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                        Tab / Shift+Tab: Indent
                      </span>
                    )}
                  </div>
                </div>

                {/* Step Navigation Controls */}
                <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={step === 0}
                    onClick={() => handleStepChange(step - 1)}
                    className="border-white/[0.08] text-xs"
                  >
                    ← Previous [Alt+P]
                  </Button>

                  <div className="text-xs text-muted-foreground">
                    {step + 1} of {activeInterview.questions.length} Questions
                  </div>

                  {step < activeInterview.questions.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => handleStepChange(step + 1)}
                      className="text-xs font-bold bg-primary text-black hover:bg-primary/90"
                    >
                      Next Question [Ctrl+Enter] <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={submitInterview}
                      disabled={loading}
                      className="text-xs font-bold bg-primary text-black hover:bg-primary/90 shadow-md shadow-primary/20"
                    >
                      {loading ? 'Evaluating Session...' : 'Submit Final Interview [Ctrl+Enter]'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live AI Critique & Grounded Rubric */}
          <div className="space-y-4">
            <Card className="border-white/[0.08] bg-[#0d131f]/90 shadow-xl">
              <CardHeader className="pb-3 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm text-white">
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

              <CardContent className="space-y-3.5 p-4">
                {critique ? (
                  <>
                    {/* Dimension Ratings Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Technical Clarity</span>
                          <span className={`rounded border px-1.5 py-0.2 text-[9px] font-black ${getRatingColor(critique.technicalClarity.rating)}`}>
                            {critique.technicalClarity.rating}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[10px] text-white/70">{critique.technicalClarity.note}</p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Communication</span>
                          <span className={`rounded border px-1.5 py-0.2 text-[9px] font-black ${getRatingColor(critique.communication.rating)}`}>
                            {critique.communication.rating}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[10px] text-white/70">{critique.communication.note}</p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Problem Solving</span>
                          <span className={`rounded border px-1.5 py-0.2 text-[9px] font-black ${getRatingColor(critique.problemSolving.rating)}`}>
                            {critique.problemSolving.rating}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[10px] text-white/70">{critique.problemSolving.note}</p>
                      </div>

                      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Topic Depth</span>
                          <span className={`rounded border px-1.5 py-0.2 text-[9px] font-black ${getRatingColor(critique.topicDepth.rating)}`}>
                            {critique.topicDepth.rating}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[10px] text-white/70">{critique.topicDepth.note}</p>
                      </div>
                    </div>

                    {/* Missing Rubric Points */}
                    {critique.missingPoints && critique.missingPoints.length > 0 && (
                      <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-2.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-300">
                          <AlertCircle className="h-3 w-3" /> Missing Rubric Criteria
                        </span>
                        <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px] text-rose-200/80">
                          {critique.missingPoints.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggested Addition */}
                    {critique.suggestedNextSentence && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                          <Sparkles className="h-3 w-3" /> Suggested Addition
                        </span>
                        <p className="mt-1 text-[10px] italic text-slate-300">
                          "{critique.suggestedNextSentence}"
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Type or speak your answer. Real-time rubric critique updates as you formulate thoughts.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Official Rubric Peek Card */}
            {currentQ && (
              <Card className="border-white/[0.08] bg-[#0d131f]/90">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Official Rubric Criteria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                    {currentQ.rubric.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-0.5 text-primary font-bold">✓</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Post-Session Evaluation Results View */}
      {result && (
        <Card className="border-white/[0.08] bg-[#0d131f]/90 p-6">
          <div className="max-w-2xl mx-auto space-y-6">
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

            {/* Recommended Learning Hub Focus */}
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

            {/* Question Breakdown */}
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
                    <span className="text-muted-foreground line-clamp-1 max-w-[280px]">
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

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => {
                  setResult(null);
                }}
                className="flex-1 font-bold bg-primary text-black hover:bg-primary/90"
              >
                Start Another Interview Track
              </Button>

              {onSwitchToHistory && (
                <Button
                  variant="outline"
                  onClick={onSwitchToHistory}
                  className="border-white/10 text-white"
                >
                  View in History &amp; Analysis
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
