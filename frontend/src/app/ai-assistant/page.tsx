'use client';

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownView } from '@/components/ui/MarkdownView';
import { api } from '@/lib/utils';
import {
  ArrowRight,
  Bot,
  Bug,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  FileCode2,
  Loader2,
  Search,
  Send,
  Sparkles,
  TestTube,
  Trash2,
  Trophy,
  User,
  Wand2,
  X,
  Zap,
} from 'lucide-react';

/* ─────────────────────────── types ─────────────────────────── */

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  lessonTitle?: string;
  subjectName?: string;
  moduleName?: string;
  challengeTitle?: string;
}

interface ChatResponse {
  response: string;
  grounding?: {
    source: 'lesson' | 'challenge' | 'upload' | 'search' | 'none';
    lessonId: string | null;
    lessonTitle: string | null;
    subjectName: string | null;
    moduleName: string | null;
    challengeId?: string | null;
    challengeTitle?: string | null;
  };
}

interface LessonPreview {
  id: string;
  title: string;
  subjectName?: string;
  moduleName?: string;
  difficulty?: string;
  firstExampleCode?: string;
  firstExampleLanguage?: string;
}

interface ChallengePreview {
  id: string;
  title: string;
  language: string;
  difficulty: string;
  overview: string;
  starterCode?: string;
}

export interface LearningHubSearchResultItem {
  type: 'lesson' | 'challenge';
  id: string;
  title: string;
  subjectName: string;
  moduleName?: string;
  difficulty: string;
  overview: string;
  starterCode?: string;
  starterLanguage?: string;
  matchReasons?: string[];
  score: number;
}

/* ─────────────────────────── quick action definitions ─────────────────────────── */

const quickActions = [
  {
    label: 'Explain',
    icon: Sparkles,
    prompt: (code: string) =>
      `Explain this code clearly and concisely, step by step:\n\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    label: 'Debug',
    icon: Bug,
    prompt: (code: string) =>
      `Find and fix any bugs or issues in this code. List each problem and show the corrected version:\n\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    label: 'Optimize',
    icon: Zap,
    prompt: (code: string) =>
      `Optimize this code for better performance and readability. Show the improved version with an explanation of changes:\n\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    label: 'Generate Tests',
    icon: TestTube,
    prompt: (code: string) =>
      `Generate comprehensive unit tests for this code. Include edge cases:\n\n\`\`\`\n${code}\n\`\`\``,
  },
];

const quickPills = [
  'Python Loops',
  'SQL JOIN',
  'FizzBuzz',
  'Binary Search',
  'React Hooks',
  'Two Sum',
];

/* ─────────────────────────── AI analysis (local) ─────────────────────────── */

type AnalysisResult = { title: string; items: string[] };

function analyzeCodeLocally(code: string): AnalysisResult[] | null {
  const trimmed = code.trim();
  if (!trimmed) return null; // No code → show waiting state, not fake defaults

  const lines = trimmed.split('\n');
  const lineCount = lines.length;
  const hasLoop = /\bfor\b|\bwhile\b/.test(trimmed);
  const hasNested = /\bfor\b[\s\S]{0,80}\bfor\b|\bwhile\b[\s\S]{0,80}\bwhile\b/.test(trimmed);
  const hasRecursion = /function\s+(\w+)[\s\S]{0,300}\b\1\s*\(/.test(trimmed);
  const hasSorting = /\.sort\s*\(|bubbleSort|mergeSort|quickSort/i.test(trimmed);
  const usesHashMap = /new\s+(Map|Set)\b|{[^}]{0,200}}/.test(trimmed);
  const usesArray = /new\s+Array\b|\[\s*\]/.test(trimmed);

  // ── Complexity ──
  let timeComplexity: string;
  if (hasSorting && !hasNested) timeComplexity = 'O(n log n) – sorting operation detected';
  else if (hasNested) timeComplexity = 'O(n²) – nested loops detected';
  else if (hasLoop) timeComplexity = 'O(n) – single loop over data';
  else if (hasRecursion) timeComplexity = 'O(n) or worse – recursive calls detected';
  else timeComplexity = 'O(1) – no loops or recursion found';

  let spaceComplexity: string;
  if (usesHashMap) spaceComplexity = 'O(n) – hash map/set allocates extra memory';
  else if (usesArray) spaceComplexity = 'O(n) – dynamic array allocation';
  else if (hasRecursion) spaceComplexity = 'O(n) – recursion uses call stack space';
  else spaceComplexity = 'O(1) – no significant extra memory used';

  // ── Issues ──
  const issues: string[] = [];
  if (lineCount > 60) issues.push(`Function is ${lineCount} lines — consider splitting into smaller helpers`);
  if (/console\.log\s*\(/.test(trimmed)) issues.push('console.log() detected — remove debug logs before shipping');
  if (/catch\s*\(\w*\)\s*\{\s*\}/.test(trimmed)) issues.push('Empty catch block — silent error swallowing detected');
  if (/==\s/.test(trimmed) && !/===\s/.test(trimmed)) issues.push('Use === (strict equality) instead of ==');
  if (/var\s+\w+/.test(trimmed)) issues.push('var used — prefer const or let for block scoping');
  if (/\beval\s*\(/.test(trimmed)) issues.push('eval() detected — dangerous, avoid in production');
  if (hasNested && !usesHashMap) issues.push('Nested loops can often be replaced with a hash map for O(n)');
  if (issues.length === 0) issues.push('✓ No obvious issues found in a quick scan');

  // ── Suggestions ──
  const suggestions: string[] = [];
  if (hasNested && !usesHashMap) suggestions.push('Replace inner loop with a Map/Set for O(n) lookup');
  if (/var\s/.test(trimmed)) suggestions.push('Replace var with const (or let if re-assigned)');
  if (!/\/\/|\/\*/.test(trimmed) && lineCount > 8) suggestions.push('Add inline comments for non-obvious logic');
  if (hasRecursion && !trimmed.includes('memo') && !trimmed.includes('cache')) suggestions.push('Add memoization to avoid repeated recursive computations');
  if (trimmed.includes('return true') && trimmed.includes('return false')) suggestions.push('Simplify if/return true/return false to a single boolean expression');
  if (suggestions.length === 0) suggestions.push('✓ Code structure looks solid — good job!');

  // ── Detected language ──
  const lang = detectLanguage(trimmed);
  const langNote = lang !== 'Unknown' ? `Detected language: ${lang}` : '';

  return [
    { title: 'Complexity', items: [`⏱ Time:  ${timeComplexity}`, `💾 Space: ${spaceComplexity}`] },
    { title: 'Issues', items: issues },
    { title: 'Suggestions', items: suggestions },
    ...(langNote ? [{ title: 'Language', items: [langNote, `${lineCount} line${lineCount !== 1 ? 's' : ''} analysed`] }] : [{ title: 'Stats', items: [`${lineCount} line${lineCount !== 1 ? 's' : ''} analysed`] }]),
  ];
}

/* ─────────────────────────── component ─────────────────────────── */

export default function AIAssistantPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="p-8 text-sm text-muted-foreground">Loading AI Workspace…</div></DashboardLayout>}>
      <AIAssistantInner />
    </Suspense>
  );
}

function AIAssistantInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonParam = searchParams.get('lesson') || '';
  const challengeParam = searchParams.get('challenge') || '';

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "👋 Hi! I'm your SynergySphere AI Workspace assistant, grounded in the Learning Hub (1,000+ programming lessons & 60 interactive coding challenges). Search for any topic or challenge above, ask questions, or paste code for instant analysis!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [codeContext, setCodeContext] = useState('');
  const [codeEditedByUser, setCodeEditedByUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult[] | null>(null);
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);
  const [lesson, setLesson] = useState<LessonPreview | null>(null);
  const [challenge, setChallenge] = useState<ChallengePreview | null>(null);

  // Tab State: 'conversation' vs 'codeContext' vs 'split'
  const [activeTab, setActiveTab] = useState<'conversation' | 'codeContext' | 'split'>('conversation');
  // Expandable & Collapsible Chat History state
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Derived user questions for the expandable chat history
  const userQuestions = useMemo(() => {
    return messages
      .filter((m) => m.role === 'user')
      .map((m, index) => ({
        index,
        content: m.content,
        timestamp: m.timestamp,
      }));
  }, [messages]);

  // Search & Grounding states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LearningHubSearchResultItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Close search popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for Learning Hub content (lessons & challenges)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api<{ results: LearningHubSearchResultItem[] }>(
          `/curriculum/learning-hub-search?q=${encodeURIComponent(trimmed)}`
        );
        setSearchResults(res?.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch lesson details when ?lesson=<id> is present
  useEffect(() => {
    if (!lessonParam) {
      setLesson(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await api<{
          id: string;
          title: string;
          difficulty: string;
          subjectName: string;
          moduleName: string;
          content: { examples?: Array<{ code: string; language?: string }> };
        }>(`/curriculum/lessons/${lessonParam}`);
        if (cancelled) return;
        setLesson({
          id: detail.id,
          title: detail.title,
          subjectName: detail.subjectName,
          moduleName: detail.moduleName,
          difficulty: detail.difficulty,
          firstExampleCode: detail.content?.examples?.[0]?.code,
          firstExampleLanguage: detail.content?.examples?.[0]?.language,
        });
        const exampleCode = detail.content?.examples?.[0]?.code;
        if (exampleCode) {
          setCodeContext((prev) => prev || exampleCode);
          setCodeEditedByUser(false);
        }
      } catch {
        if (!cancelled) setLesson(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonParam]);

  // Fetch challenge details when ?challenge=<id> is present
  useEffect(() => {
    if (!challengeParam) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ results: LearningHubSearchResultItem[] }>(
          `/curriculum/learning-hub-search?q=${encodeURIComponent(challengeParam)}`
        );
        if (cancelled) return;
        const found =
          res.results?.find(
            (r) =>
              r.type === 'challenge' &&
              (r.id.toLowerCase() === challengeParam.toLowerCase() ||
                r.title.toLowerCase() === challengeParam.toLowerCase())
          ) || res.results?.find((r) => r.type === 'challenge');

        if (found) {
          selectLearningHubItem(found);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [challengeParam]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Re-analyze whenever code changes
  useEffect(() => {
    setAnalysis(analyzeCodeLocally(codeContext));
  }, [codeContext]);

  const selectLearningHubItem = (item: LearningHubSearchResultItem) => {
    setSearchOpen(false);
    setSearchQuery('');
    if (item.type === 'challenge') {
      setLesson(null);
      setChallenge({
        id: item.id,
        title: item.title,
        language: item.starterLanguage || item.subjectName,
        difficulty: item.difficulty,
        overview: item.overview,
        starterCode: item.starterCode,
      });
      if (item.starterCode) {
        setCodeContext(item.starterCode);
        setCodeEditedByUser(false);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `🎯 **Coding Challenge Pinned: ${item.title}** (${item.starterLanguage || item.subjectName} • ${item.difficulty})\n\n> ${item.overview}\n\nI've loaded the challenge starter code into the editor. How would you like to proceed? You can ask for algorithmic intuition, edge case breakdowns, or write code and click **Explain**, **Debug**, or **Generate Tests**!`,
          timestamp: new Date(),
          challengeTitle: item.title,
        },
      ]);
    } else {
      setChallenge(null);
      setLesson({
        id: item.id,
        title: item.title,
        subjectName: item.subjectName,
        moduleName: item.moduleName,
        difficulty: item.difficulty,
        firstExampleCode: item.starterCode,
        firstExampleLanguage: item.starterLanguage,
      });
      if (item.starterCode) {
        setCodeContext(item.starterCode);
        setCodeEditedByUser(false);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `📖 **Lesson Pinned: ${item.title}** (${item.subjectName}${item.moduleName ? ` › ${item.moduleName}` : ''})\n\n> ${item.overview}\n\nI'm ready to answer any questions grounded in this lesson!`,
          timestamp: new Date(),
          lessonTitle: item.title,
          subjectName: item.subjectName,
          moduleName: item.moduleName,
        },
      ]);
    }
  };

  const handlePillClick = async (pill: string) => {
    setSearchQuery(pill);
    setSearchOpen(true);
    setSearchLoading(true);
    try {
      const res = await api<{ results: LearningHubSearchResultItem[] }>(
        `/curriculum/learning-hub-search?q=${encodeURIComponent(pill)}`
      );
      setSearchResults(res?.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const unpinGrounding = () => {
    setLesson(null);
    setChallenge(null);
    router.replace('/ai-assistant');
  };

  const historyFromMessages = useCallback(
    (msgs: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> => {
      const firstUser = msgs.findIndex((m) => m.role === 'user');
      if (firstUser < 0) return [];
      return msgs
        .slice(firstUser)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));
    },
    [],
  );

  async function sendMessage(text: string, currentMessages?: Message[], forcedContext?: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date() };
    const baseMessages = currentMessages ?? messages;
    setInput('');
    const nextMessages = [...baseMessages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    // Track recent prompts
    setRecentPrompts((prev) => [text.trim().slice(0, 60), ...prev.filter((p) => p !== text.trim().slice(0, 60))].slice(0, 6));

    const contextToSend =
      forcedContext?.trim() || (codeEditedByUser && codeContext.trim() ? codeContext : undefined);

    const payload = {
      message: text.trim(),
      context: contextToSend,
      ...(lesson ? { lessonId: lesson.id } : {}),
      ...(challenge ? { challengeId: challenge.id } : {}),
      history: historyFromMessages(baseMessages).slice(-20),
    };

    let streamSuccess = false;
    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let groundingMeta: ChatResponse['grounding'] | undefined;

        // Add blank assistant placeholder
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '', timestamp: new Date() },
        ]);

        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.type === 'meta') {
                  groundingMeta = parsed.grounding;
                } else if (parsed.type === 'token') {
                  accumulated += parsed.token;
                  setMessages((prev) => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    if (last && last.role === 'assistant') {
                      copy[copy.length - 1] = {
                        ...last,
                        content: accumulated,
                        lessonTitle: groundingMeta?.lessonTitle || last.lessonTitle,
                        subjectName: groundingMeta?.subjectName || last.subjectName,
                        moduleName: groundingMeta?.moduleName || last.moduleName,
                        challengeTitle: groundingMeta?.challengeTitle || last.challengeTitle,
                      };
                    }
                    return copy;
                  });
                } else if (parsed.type === 'done') {
                  done = true;
                  streamSuccess = true;
                }
              } catch {
                // Ignore partial JSON
              }
            }
          }
        }
        if (accumulated.trim()) {
          streamSuccess = true;
        }
      }
    } catch {
      streamSuccess = false;
    }

    if (!streamSuccess) {
      try {
        const res = await api<ChatResponse>('/ai/chat', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.response,
            timestamp: new Date(),
            lessonTitle: res.grounding?.lessonTitle || undefined,
            subjectName: res.grounding?.subjectName || undefined,
            moduleName: res.grounding?.moduleName || undefined,
            challengeTitle: res.grounding?.challengeTitle || undefined,
          },
        ]);
      } catch {
        const fallback = generateLocalResponse(text, codeContext);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: fallback, timestamp: new Date() },
        ]);
      }
    }
    setLoading(false);
  }

  // Fetch persistent chat history on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history = await api<
          Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: string }>
        >('/ai/chat/history');
        if (!cancelled && Array.isArray(history) && history.length > 0) {
          setMessages(
            history.map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: new Date(m.createdAt),
            }))
          );
        }
      } catch {
        // Fall back to the default welcome message if offline or not logged in
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleQuickAction(action: (typeof quickActions)[number]) {
    if (!codeContext.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Please paste some code in the Code Context editor first, then I can help!',
          timestamp: new Date(),
        },
      ]);
      setActiveTab('codeContext');
      return;
    }
    if (activeTab === 'codeContext') {
      setActiveTab('conversation');
    }
    sendMessage(action.prompt(codeContext), undefined, codeContext);
  }

  function handleClearCodeAndOutput() {
    setCodeContext('');
    setCodeEditedByUser(false);
    setAnalysis(null);
    setMessages((prev) => {
      if (prev.length <= 1) return prev;
      const copy = [...prev];
      if (copy.length > 1 && copy[copy.length - 1].role === 'assistant') {
        copy.pop();
        if (copy.length > 1 && copy[copy.length - 1].role === 'user') {
          copy.pop();
        }
      }
      return copy;
    });
  }

  async function clearChat() {
    try {
      await api('/ai/chat/history', { method: 'DELETE' });
    } catch {
      // ignore
    }
    const fresh: Message[] = [
      {
        role: 'assistant',
        content: lesson
          ? `Chat cleared! Ask me anything about "${lesson.title}" — I'll stay grounded in that lesson.`
          : challenge
            ? `Chat cleared! Ready to work on the "${challenge.title}" challenge. Ask for hints, algorithmic intuition, or code review!`
            : 'Chat cleared! Ask about any Learning Hub lesson or challenge, paste code, or use search above to ground the workspace.',
        timestamp: new Date(),
      },
    ];
    setMessages(fresh);
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            AI Workspace
          </p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            {lesson ? 'Lesson Assistant' : challenge ? 'Challenge Assistant' : 'Coding Assistant'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {lesson
              ? `Grounded in LectureToLife Programming Academy — ${lesson.subjectName ?? ''}${lesson.moduleName ? ` › ${lesson.moduleName}` : ''}`
              : challenge
                ? `Grounded in Coding Challenge — ${challenge.title} (${challenge.language} • ${challenge.difficulty})`
                : 'Grounded in Learning Hub (1,000+ programming lessons & 60 interactive challenges).'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={clearChat} className="gap-2">
          <Wand2 className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Search & Grounding Bar */}
      <div ref={searchContainerRef} className="relative mb-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              if (searchResults.length > 0 || searchQuery.trim().length >= 2) setSearchOpen(true);
            }}
            placeholder="Search 1,000+ lessons & 60 challenges (e.g., Python loops, SQL JOIN, FizzBuzz, Binary Search)..."
            className="pl-10 pr-9 bg-secondary/30 border-white/[0.09] focus:bg-secondary/50 text-sm h-10"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setSearchOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Topic / Challenge Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-medium text-muted-foreground shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" /> Quick Ground:
          </span>
          {quickPills.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => handlePillClick(pill)}
              className="inline-flex items-center rounded-full border border-white/[0.08] bg-secondary/35 px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.08] hover:text-white transition shrink-0"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Search Results Dropdown */}
        {searchOpen && (searchLoading || searchResults.length > 0) && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-xl border border-white/[0.12] bg-[#0c141a]/95 p-2 shadow-2xl backdrop-blur-md space-y-1">
            {searchLoading && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Searching Learning Hub curriculum & challenges…
              </div>
            )}
            {!searchLoading && searchResults.length === 0 && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No matching lessons or challenges found for &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
            {!searchLoading &&
              searchResults.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => selectLearningHubItem(item)}
                  className="flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] group"
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      item.type === 'challenge'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-primary/15 text-primary border border-primary/30'
                    }`}
                  >
                    {item.type === 'challenge' ? (
                      <Trophy className="h-3.5 w-3.5" />
                    ) : (
                      <BookOpen className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-white group-hover:text-primary transition line-clamp-1">
                        {item.title}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider ${
                          item.type === 'challenge'
                            ? 'bg-amber-400/10 text-amber-300'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {item.type === 'challenge' ? 'Challenge' : 'Lesson'}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
                        {item.subjectName}
                        {item.moduleName ? ` › ${item.moduleName}` : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                      {item.overview}
                    </p>
                    {item.matchReasons && item.matchReasons.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.matchReasons.slice(0, 3).map((r, ri) => (
                          <span
                            key={ri}
                            className="text-[9px] text-primary/80 bg-primary/[0.08] px-1.5 py-0.2 rounded"
                          >
                            ✓ {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-white shrink-0 self-center">
                    Select →
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Grounded context chip */}
      {(lesson || challenge) && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/[0.07] px-4 py-3">
          {lesson ? (
            <>
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-primary">Grounded Lesson:</span>
              <span className="text-xs text-white">
                {lesson.subjectName ? `${lesson.subjectName} › ` : ''}
                {lesson.moduleName ? `${lesson.moduleName} › ` : ''}
                {lesson.title}
              </span>
              {lesson.difficulty && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/[0.08] text-muted-foreground">
                  {lesson.difficulty}
                </span>
              )}
              <div className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => router.push('/learning-hub')}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:text-white hover:underline"
                >
                  Open in Learning Hub
                </button>
                <button
                  onClick={unpinGrounding}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-400 hover:text-red-300 transition"
                  title="Unpin lesson"
                >
                  <X className="h-3 w-3" /> Unpin
                </button>
              </div>
            </>
          ) : challenge ? (
            <>
              <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-amber-400">Grounded Challenge:</span>
              <span className="text-xs text-white">
                {challenge.title} ({challenge.language})
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300">
                {challenge.difficulty}
              </span>
              <div className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => router.push('/learning-hub')}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:text-white hover:underline"
                >
                  Challenges Hub
                </button>
                <button
                  onClick={unpinGrounding}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-400 hover:text-red-300 transition"
                  title="Unpin challenge"
                >
                  <X className="h-3 w-3" /> Unpin
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Tabs Navigation ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('conversation')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'conversation'
                ? 'bg-primary text-black font-bold shadow-sm'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-white'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            Conversation
            {userQuestions.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'conversation'
                    ? 'bg-black/20 text-black'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                {userQuestions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('codeContext')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'codeContext'
                ? 'bg-primary text-black font-bold shadow-sm'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-white'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Code Context
            {codeContext.trim() && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('split')}
            className={`hidden xl:flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'split'
                ? 'bg-white/10 text-white border border-white/15'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Split View
          </button>
        </div>

        {codeContext.trim() && activeTab === 'conversation' && (
          <button
            type="button"
            onClick={() => setActiveTab('codeContext')}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            <Code2 className="h-3.5 w-3.5" />
            View Active Code Context ({codeContext.split('\n').filter(Boolean).length} lines) →
          </button>
        )}
      </div>

      <div
        className={
          activeTab === 'split'
            ? 'grid gap-4 xl:grid-cols-[0.85fr_1.3fr_0.75fr]'
            : 'grid gap-4 xl:grid-cols-[1.5fr_0.8fr]'
        }
      >
        {/* ── AI Chat Card (Visible in 'conversation' and 'split' tabs) ── */}
        {(activeTab === 'conversation' || activeTab === 'split') && (
          <Card className="min-h-[650px]">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                AI Assistant
              </CardTitle>
              <button
                onClick={clearChat}
                className="rounded-md p-1 text-muted-foreground transition hover:text-white"
                title="Clear chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </CardHeader>
            <CardContent className="flex h-[560px] flex-col">
              {/* ── Collapsible Chat History ── */}
              <div className="mb-3 rounded-lg border border-white/[0.08] bg-secondary/30 transition">
                <button
                  type="button"
                  onClick={() => setHistoryExpanded((prev) => !prev)}
                  className="flex w-full items-center justify-between p-2.5 text-left text-xs font-medium text-white transition hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-semibold text-white">Chat History</span>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {userQuestions.length} {userQuestions.length === 1 ? 'query' : 'queries'}
                    </span>
                    {!historyExpanded && userQuestions.length > 0 && (
                      <span className="hidden sm:inline-block truncate text-[11px] text-muted-foreground/70 max-w-[200px]">
                        Recent: &ldquo;{userQuestions[userQuestions.length - 1].content}&rdquo;
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                    <span className="text-[11px]">{historyExpanded ? 'Collapse' : 'Expand'}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        historyExpanded ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </div>
                </button>

                {historyExpanded && (
                  <div className="border-t border-white/[0.08] p-3 space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {userQuestions.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">
                        No previous questions recorded yet. Ask anything below!
                      </p>
                    ) : (
                      <>
                        <p className="text-[11px] text-muted-foreground">
                          Click any previous question to load it into the input:
                        </p>
                        <div className="space-y-1.5">
                          {userQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setInput(q.content);
                                setHistoryExpanded(false);
                              }}
                              className="flex w-full items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-secondary/50 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition hover:border-primary/30 hover:text-white group"
                            >
                              <span className="truncate flex-1">
                                <span className="text-[10px] text-primary/70 font-semibold mr-1.5">#{idx + 1}</span>
                                {q.content}
                              </span>
                              <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition shrink-0">
                                Load ↵
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                          <button
                            type="button"
                            onClick={clearChat}
                            className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="h-3 w-3" /> Clear History
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryExpanded(false)}
                            className="text-[11px] text-muted-foreground hover:text-white"
                          >
                            Collapse
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto pr-1">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[84%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}
                    >
                      <div
                        className={`rounded-lg border px-4 py-3 text-sm leading-6 ${
                          msg.role === 'user'
                            ? 'border-primary/30 bg-primary/[0.15] text-primary'
                            : 'border-white/[0.08] bg-secondary/45 text-muted-foreground'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <MarkdownView content={msg.content} />
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      {msg.role === 'assistant' && (msg.lessonTitle || msg.challengeTitle) && (
                        <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {msg.lessonTitle ? `Based on: ${msg.lessonTitle}` : `Challenge: ${msg.challengeTitle}`}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/50">{formatTime(msg.timestamp)}</span>
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-secondary/45 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="mt-4 flex gap-2 border-t border-white/[0.08] pt-4">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                  placeholder={
                    lesson
                      ? `Ask about ${lesson.title}…`
                      : challenge
                        ? `Ask for hints on ${challenge.title}…`
                        : 'Ask about code, concepts, errors, or search above…'
                  }
                  disabled={loading}
                />
                <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Code Context Editor Card (Visible in 'codeContext' and 'split' tabs) ── */}
        {(activeTab === 'codeContext' || activeTab === 'split') && (
          <Card className="min-h-[650px]">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Code Context
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCodeAndOutput}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 gap-1.5 transition"
                  title="Clear code editor and remove previous AI response"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
                <span className="rounded-lg border border-white/[0.08] bg-secondary/50 px-2 py-1 text-xs text-muted-foreground">
                  {lesson?.firstExampleLanguage
                    ? `${lesson.firstExampleLanguage} example from lesson`
                    : challenge?.language
                      ? `${challenge.language} challenge starter`
                      : 'Java / JS / Python'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={codeContext}
                onChange={(e) => {
                  setCodeContext(e.target.value);
                  setCodeEditedByUser(true);
                }}
                className="h-[430px] w-full resize-none rounded-lg border border-white/[0.08] bg-[#050a0d] p-4 font-mono text-sm leading-6 text-green-100 outline-none focus:ring-2 focus:ring-primary/30 overflow-y-auto"
                spellCheck={false}
                placeholder="Paste your code here, then use the action buttons below…"
              />
              {/* Quick action buttons – all wired up */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      variant="secondary"
                      size="sm"
                      disabled={loading}
                      onClick={() => handleQuickAction(action)}
                      className="gap-1.5"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCodeAndOutput}
                  className="ml-auto gap-1.5 border-rose-500/20 text-xs text-muted-foreground hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
                  title="Clear code editor and remove previous AI output"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Code & Output
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                {lesson?.firstExampleCode
                  ? 'Pre-filled with the first example from this lesson — edit it or paste your own code.'
                  : challenge?.starterCode
                    ? 'Pre-filled with challenge starter code — edit it or ask for algorithmic hints!'
                    : 'Paste code above and click a button, or type a question in the chat.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Right Panel (Live Analysis & Recent Prompts) ── */}
        <div className="space-y-4">
          {/* Live analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Live Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!analysis ? (
                <div className="rounded-lg border border-white/[0.07] bg-secondary/30 p-4 text-center">
                  <Code2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    Paste code in the editor to see a live complexity and quality analysis.
                  </p>
                </div>
              ) : (
                analysis.map(({ title, items }) => (
                  <div key={title} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                    <p className="mb-2 text-xs font-semibold text-white">{title}</p>
                    {items.map((item) => (
                      <p key={item} className="text-xs leading-5 text-muted-foreground">{item}</p>
                    ))}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-primary" />
                Recent Prompts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentPrompts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Your recent questions will appear here.
                </p>
              ) : (
                recentPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      sendMessage(prompt);
                      if (activeTab === 'codeContext') setActiveTab('conversation');
                    }}
                    disabled={loading}
                    className="flex w-full items-start gap-2 rounded-lg border border-white/[0.07] bg-secondary/40 p-3 text-left text-xs text-muted-foreground transition hover:border-primary/25 hover:text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <span className="line-clamp-2">{prompt}</span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ─────────────────────────── local AI fallback ─────────────────────────── */

function generateLocalResponse(message: string, code: string): string {
  const lower = message.toLowerCase();
  const lang = detectLanguage(code);
  const lines = code.trim().split('\n').length;
  const hasCode = code.trim().length > 0;

  if (lower.includes('explain')) {
    if (!hasCode) return 'Please paste some code in the Code Context editor first, then I can explain it!';
    return `Here's a quick analysis of your ${lang} code:\n\n• ${lines} lines of code detected\n• ${describeCode(code)}\n• Language: ${lang}\n\n${generateOfflineCodeSummary(code)}\n\n⚠️ For a full AI explanation, start the backend (cd backend → npm run dev) and add GEMINI_API_KEY or OPENAI_API_KEY to backend/.env.`;
  }
  if (lower.includes('debug') || lower.includes('error') || lower.includes('bug')) {
    if (!hasCode) return 'Paste your buggy code in the Code Context editor first!';
    const issues: string[] = [];
    if (/console\.log/.test(code)) issues.push('• Debug console.log() found — probably not the bug, but clean these up');
    if (/catch\s*\(\w*\)\s*\{\s*\}/.test(code)) issues.push('• Empty catch block — errors are being silently swallowed here');
    if (/==\s/.test(code) && !/===\s/.test(code)) issues.push('• Loose == comparison used — this can cause type coercion bugs, use === instead');
    if (/var\s/.test(code)) issues.push('• var used — can cause hoisting bugs, switch to const/let');
    if (issues.length === 0) issues.push('• No obvious syntax or style issues spotted by static scan');
    return `Quick bug scan of your ${lang} code:\n\n${issues.join('\n')}\n\nFor deeper debugging:\n1. Add console.log() before the failing line to inspect values\n2. Check array indices for off-by-one errors\n3. Verify all variables are defined before use\n\n⚠️ For AI-powered debugging, start the backend and add an API key to backend/.env.`;
  }
  if (lower.includes('optim')) {
    if (!hasCode) return 'Paste the code you want to optimize in the Code Context editor!';
    const tips: string[] = [];
    if (/for[\s\S]{0,80}for/.test(code)) tips.push('🗺️ Replace nested loops with a Map/Set for O(n) time complexity');
    if (/\.forEach|\.map|\.filter/.test(code)) tips.push('✅ Good: using built-in array methods — these are optimised');
    if (/console\.log/.test(code)) tips.push('🧹 Remove console.log() calls — these slow down production code');
    if (tips.length === 0) tips.push('🔄 Avoid re-computing values inside loops — cache them in a variable');
    tips.push('✂️ Keep functions under 20 lines — split large functions into helpers');
    tips.push('🎯 Use early returns to reduce nesting depth');
    return `Optimization suggestions for your ${lang} code:\n\n${tips.join('\n')}\n\n⚠️ For AI-powered optimization, start the backend and add an API key.`;
  }
  if (lower.includes('test')) {
    if (!hasCode) return 'Paste the code you want to test in the Code Context editor!';
    return `Test cases to write for your ${lang} code:\n\n✅ Happy path — typical valid inputs\n📭 Empty inputs — empty string, empty array, null, undefined\n🔢 Edge values — 0, -1, very large numbers, single character\n🔁 Duplicates — repeated values in arrays/strings\n🚫 Invalid inputs — wrong types, missing required args\n${lang === 'JavaScript' || lang === 'TypeScript' ? '⚡ Async edge cases — what if a Promise rejects?\n' : ''}\n⚠️ For auto-generated unit tests, start the backend and add an API key.`;
  }

  if (!hasCode) {
    return `Got it — you asked: "${message}"\n\nTry pasting some code in the Code Context editor and use the Explain, Debug, Optimize, or Generate Tests buttons for instant analysis!`;
  }

  return `I see you're working on ${lines} lines of ${lang} code.\n\nI'm currently in offline mode (backend unreachable). To get full AI answers:\n\n1. Open a terminal and run: cd backend && npm run dev\n2. Add an AI key to backend/.env:\n   GEMINI_API_KEY="your-key"  ← free at aistudio.google.com\n   or OPENAI_API_KEY="sk-..."\n\nOnce online, I can answer: "${message}" with full context.`;
}

function detectLanguage(code: string): string {
  if (/public\s+class\s+\w+|System\.out\.(print|println)|void\s+main\s*\(/.test(code)) return 'Java';
  if (/def\s+\w+\s*\(|^\s*print\s*\(|import\s+\w+\s*$|:\s*$/m.test(code)) return 'Python';
  if (/using\s+System|namespace\s+\w+|Console\.Write/.test(code)) return 'C#';
  if (/#include\s*<|std::|cout\s*<<|int\s+main\s*\(/.test(code)) return 'C++';
  if (/interface\s+\w+|:\s*(string|number|boolean|void)\b|<[A-Z]\w*>/.test(code)) return 'TypeScript';
  if (/require\s*\(|module\.exports|process\.env/.test(code)) return 'Node.js';
  if (/import\s+React|jsx|useState|useEffect|<\w+\s*\/>/.test(code)) return 'React';
  if (/<html|<div|<p\s|<h[1-6]|<!DOCTYPE/i.test(code)) return 'HTML';
  if (/\{[\s\S]*:\s*[\w#"'(]|@media|margin:|padding:|font-size:/.test(code)) return 'CSS';
  if (/SELECT\s+|FROM\s+|WHERE\s+|INSERT\s+INTO/i.test(code)) return 'SQL';
  if (/function\s*\w*\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|=>\s*\{?/.test(code)) return 'JavaScript';
  return 'Unknown';
}

function describeCode(code: string): string {
  if (/class\s+\w+\s+extends/.test(code)) return 'It defines an inherited class — object-oriented pattern.';
  if (/class\s+\w+/.test(code)) return 'It defines a class with methods.';
  if (/for[\s\S]{0,80}for/.test(code)) return 'It uses nested loops — O(n²) time complexity is possible.';
  if (/for|while/.test(code)) return 'It uses a loop to iterate over data.';
  if (/function\s+(\w+)[\s\S]{0,200}\b\1\s*\(/.test(code)) return 'It appears to use recursion.';
  if (/new\s+(Map|Set)\b/.test(code)) return 'It uses a Map or Set — efficient O(1) lookups.';
  if (/=>\s*{?/.test(code)) return 'It uses arrow functions — modern JS/TS style.';
  return 'It is a short function — review the logic for edge cases.';
}

function generateOfflineCodeSummary(code: string): string {
  const parts: string[] = [];
  if (/new\s+Map\b/.test(code)) parts.push('Uses a Map for O(1) key lookup — good choice');
  if (/new\s+Set\b/.test(code)) parts.push('Uses a Set for unique value tracking — efficient');
  if (/for[\s\S]{0,80}for/.test(code)) parts.push('Contains nested loops — watch for O(n²) performance on large inputs');
  if (/\.sort\s*\(/.test(code)) parts.push('Uses sorting — typically O(n log n) time');
  if (/console\.log/.test(code)) parts.push('Has console.log() calls — remove for production');
  if (/var\s/.test(code)) parts.push('Uses var — consider upgrading to const/let');
  if (parts.length === 0) parts.push('Code appears well-structured at a glance');
  return parts.map(p => `• ${p}`).join('\n');
}
