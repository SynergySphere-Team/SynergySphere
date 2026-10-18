'use client';

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownView } from '@/components/ui/MarkdownView';
import { api, fetchApiResponse, getStoredToken } from '@/lib/utils';
import { analyzeCodeOffline } from '@/utils/offlineCodeAnalyzer';
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
  Copy,
  ExternalLink,
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

export interface CodeActionResult {
  action: 'explain' | 'debug' | 'optimize' | 'test' | 'review' | 'custom';
  title: string;
  output: string;
  fromAi: boolean;
  provider?: string;
  timestamp: Date;
}

/* ─────────────────────────── quick action definitions ─────────────────────────── */

const quickActions = [
  {
    id: 'explain' as const,
    label: 'Explain',
    icon: Sparkles,
    prompt: (code: string) =>
      `Explain this code clearly and concisely, step by step:\n\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    id: 'debug' as const,
    label: 'Debug',
    icon: Bug,
    prompt: (code: string) =>
      `Find and fix any bugs or issues in this code. List each problem and show the corrected version:\n\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    id: 'optimize' as const,
    label: 'Optimize',
    icon: Zap,
    prompt: (code: string) =>
      `Optimize this code for better performance and readability. Show the improved version with an explanation of changes:\n\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    id: 'test' as const,
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
  const challengeTitleParam = searchParams.get('challengeTitle') || '';
  const challengeDescParam = searchParams.get('challengeDescription') || '';
  const languageParam = searchParams.get('language') || '';
  const codeParam = searchParams.get('code') || '';
  const autoAskParam = searchParams.get('autoAsk') || '';
  const tabParam = searchParams.get('tab') || '';
  const lastAutoAskKeyRef = useRef<string>('');

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "👋 Hi! I'm your SynergySphere AI Workspace assistant, grounded in the Learning Hub (1,000+ programming lessons & 500+ interactive coding challenges). Type any question right here in Conversation for a direct answer, or switch to Code Context to paste and analyze code!",
      timestamp: new Date(),
    },
  ]);
  const [threads, setThreads] = useState<Array<{ id: string; title: string; updatedAt: string }>>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [codeContext, setCodeContext] = useState('');
  const [codeEditedByUser, setCodeEditedByUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult[] | null>(null);
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);
  const [lesson, setLesson] = useState<LessonPreview | null>(null);
  const [challenge, setChallenge] = useState<ChallengePreview | null>(null);

  // Tab State: 'conversation' vs 'codeContext' vs 'split'
  const [activeTab, setActiveTab] = useState<'conversation' | 'codeContext' | 'split'>(
    tabParam === 'codeContext' || autoAskParam === 'true' ? 'codeContext' : 'conversation'
  );
  // Expandable & Collapsible Chat History state
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Code Action Output State (Rendered directly in Code Context)
  const [codeActionResult, setCodeActionResult] = useState<CodeActionResult | null>(null);
  const [codeActionLoading, setCodeActionLoading] = useState<'explain' | 'debug' | 'optimize' | 'test' | 'review' | 'custom' | null>(null);
  const [codeQuestion, setCodeQuestion] = useState('');
  const [copiedCodeOutput, setCopiedCodeOutput] = useState(false);

  // Backend AI Key Status
  const [hasServerKey, setHasServerKey] = useState(true);

  useEffect(() => {
    api<{ hasEnvKey: boolean; provider?: string | null }>('/ai/key-status')
      .then((res) => {
        if (typeof res?.hasEnvKey === 'boolean') setHasServerKey(res.hasEnvKey);
      })
      .catch(() => {});
  }, []);

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

    const contextToSend = forcedContext?.trim() || undefined;

    const payload = {
      message: text.trim(),
      ...(activeThreadId ? { threadId: activeThreadId } : {}),
      context: contextToSend,
      ...(lesson ? { lessonId: lesson.id } : {}),
      ...(challenge ? { challengeId: challenge.id } : {}),
      history: historyFromMessages(baseMessages).slice(-20),
    };

    if (activeThreadId) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId && (t.title === 'New Chat Thread' || t.title === 'Untitled Thread')
            ? { ...t, title: text.trim().slice(0, 44) }
            : t
        )
      );
    }

    let streamSuccess = false;
    const token = getStoredToken();
    const streamHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    try {
      const response = await fetchApiResponse('/ai/chat/stream', {
        method: 'POST',
        headers: streamHeaders,
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
        const fallback = generateLocalResponse(text, '');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: fallback, timestamp: new Date() },
        ]);
      }
    }
    setLoading(false);
  }

  async function runCodeContextReview(
    codeToAnalyze: string,
    langHint?: string,
    cTitle?: string,
    cDesc?: string,
    customQ?: string
  ) {
    const trimmed = codeToAnalyze.trim();
    if (!trimmed) return;
    setActiveTab((prev) => (prev === 'split' ? 'split' : 'codeContext'));
    const actionType: 'review' | 'custom' = customQ ? 'custom' : 'review';
    setCodeActionLoading(actionType);

    const detectedLang = langHint || detectLanguage(trimmed);
    const offlineExplain = analyzeCodeOffline('explain', trimmed, detectedLang).output;
    const offlineDebug = analyzeCodeOffline('debug', trimmed, detectedLang).output;
    const offlineCombined = cTitle
      ? `### Challenge Code Review: ${cTitle}\n\n${offlineDebug}\n\n---\n\n${offlineExplain}`
      : `${offlineDebug}\n\n---\n\n${offlineExplain}`;

    try {
      const res = await api<{
        ok: boolean;
        action: string;
        output: string;
        fromAi: boolean;
        provider?: string;
      }>('/ai/code-action', {
        method: 'POST',
        body: JSON.stringify({
          action: actionType,
          code: trimmed,
          language: detectedLang,
          lessonId: lesson?.id,
          challengeId: challenge?.id,
          challengeTitle: cTitle,
          challengeDescription: cDesc,
          customPrompt: customQ,
        }),
      });

      setCodeActionResult({
        action: actionType,
        title: customQ
          ? `Answer: ${customQ.slice(0, 48)}`
          : cTitle
            ? `AI Code Review: ${cTitle}`
            : 'Full Code Review & Solution',
        output: res.output || offlineCombined,
        fromAi: res.fromAi,
        provider: res.provider || (res.fromAi ? 'Cloud AI' : 'Offline Local Engine'),
        timestamp: new Date(),
      });
    } catch {
      setCodeActionResult({
        action: actionType,
        title: customQ
          ? `Answer: ${customQ.slice(0, 48)}`
          : cTitle
            ? `Code Review: ${cTitle}`
            : 'Full Code Review & Solution',
        output: offlineCombined,
        fromAi: false,
        provider: 'Offline Local Engine',
        timestamp: new Date(),
      });
    } finally {
      setCodeActionLoading(null);
    }
  }

  async function handleAskAboutCode() {
    const trimmedCode = codeContext.trim();
    if (!trimmedCode) {
      setCodeActionResult({
        action: 'custom',
        title: 'No Code Detected',
        output: '⚠️ **No Code Detected in Editor**\n\nPlease paste or type some code in the **Code Context** editor above first, then ask your question to get an answer directly under Code Context.',
        fromAi: false,
        timestamp: new Date(),
      });
      return;
    }
    const q = codeQuestion.trim();
    setCodeQuestion('');
    await runCodeContextReview(
      trimmedCode,
      challenge?.language || lesson?.firstExampleLanguage || languageParam || detectLanguage(trimmedCode),
      challenge?.title || challengeTitleParam || undefined,
      challenge?.overview || challengeDescParam || undefined,
      q || 'Review this code, explain how it works, point out any bugs, and provide the corrected solution.'
    );
  }

  // Automatically trigger code review IN CODE CONTEXT when arriving from Coding Challenge "Ask SynergySphere AI"
  useEffect(() => {
    if (tabParam === 'codeContext' || autoAskParam === 'true') {
      setActiveTab('codeContext');
    }
    const autoAskKey = `${challengeTitleParam}::${codeParam}`;
    if (
      (autoAskParam === 'true' || tabParam === 'codeContext') &&
      (challengeTitleParam || codeParam) &&
      lastAutoAskKeyRef.current !== autoAskKey
    ) {
      lastAutoAskKeyRef.current = autoAskKey;
      const codeToUse = codeParam || '';
      setActiveTab('codeContext');
      if (codeToUse) {
        setCodeContext(codeToUse);
        setCodeEditedByUser(true);
        void runCodeContextReview(
          codeToUse,
          languageParam || undefined,
          challengeTitleParam || undefined,
          challengeDescParam || undefined
        );
      }
    }
  }, [autoAskParam, tabParam, challengeTitleParam, challengeDescParam, languageParam, codeParam]);

  // Load saved threads on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api<Array<{ id: string; title: string; updatedAt: string }>>('/ai/threads');
        if (!cancelled && Array.isArray(list)) {
          setThreads(list);
          if (list.length > 0 && !activeThreadId) {
            setActiveThreadId(list[0].id);
          }
        }
      } catch {
        // ignore if offline
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch persistent chat history on mount / activeThreadId change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const querySuffix = activeThreadId ? `?threadId=${encodeURIComponent(activeThreadId)}` : '';
        const history = await api<
          Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: string }>
        >(`/ai/chat/history${querySuffix}`);
        if (!cancelled && Array.isArray(history)) {
          const cleaned = history.filter(
            (m) =>
              !(
                m.role === 'assistant' &&
                /paste (some |your |the )?code in the Code Context/i.test(m.content)
              )
          );
          if (cleaned.length > 0) {
            setMessages(
              cleaned.map((m) => ({
                role: m.role,
                content: m.content,
                timestamp: new Date(m.createdAt),
              }))
            );
          } else if (activeThreadId) {
            setMessages([
              {
                role: 'assistant',
                content: lesson
                  ? `👋 Ready to discuss "${lesson.title}" in this thread!`
                  : challenge
                    ? `👋 Ready to work on "${challenge.title}" in this thread!`
                    : "👋 New conversation thread started! Type any question below for a direct answer.",
                timestamp: new Date(),
              },
            ]);
          }
        }
      } catch {
        // Fall back to the default welcome message if offline or not logged in
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeThreadId]);

  async function handleQuickAction(action: (typeof quickActions)[number]) {
    if (!codeContext.trim()) {
      setCodeActionResult({
        action: action.id,
        title: action.label,
        output: `⚠️ **No Code Detected in Editor**\n\nPlease paste or type some code in the **Code Context** editor above first, then click **${action.label}** to receive an instant AI response right here.`,
        fromAi: false,
        timestamp: new Date(),
      });
      return;
    }

    // Keep user in Code Context editor – do NOT switch to conversation page!
    setCodeActionLoading(action.id);

    const offlineResult = analyzeCodeOffline(action.id, codeContext, detectLanguage(codeContext));

    try {
      const res = await api<{
        ok: boolean;
        action: 'explain' | 'debug' | 'optimize' | 'test';
        output: string;
        fromAi: boolean;
        provider?: string;
      }>('/ai/code-action', {
        method: 'POST',
        body: JSON.stringify({
          action: action.id,
          code: codeContext,
          language: detectLanguage(codeContext),
          lessonId: lesson?.id,
          challengeId: challenge?.id,
        }),
      });

      setCodeActionResult({
        action: action.id,
        title: action.label,
        output: res.output || offlineResult.output,
        fromAi: res.fromAi,
        provider: res.provider || (res.fromAi ? 'Cloud AI' : 'Offline Local Engine'),
        timestamp: new Date(),
      });
    } catch {
      // 100% resilient local analysis supporting all 11 languages
      setCodeActionResult({
        action: action.id,
        title: action.label,
        output: offlineResult.output,
        fromAi: false,
        provider: 'Offline Local Engine',
        timestamp: new Date(),
      });
    } finally {
      setCodeActionLoading(null);
    }
  }

  function handleClearCodeAndOutput() {
    setCodeContext('');
    setCodeEditedByUser(false);
    setAnalysis(null);
    setCodeActionResult(null);
  }

  const handleApplyExtractedCode = (output: string) => {
    const match = output.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
    if (match && match[1]) {
      setCodeContext(match[1].trim());
      setCodeEditedByUser(true);
    }
  };

  const hasCodeBlock = (output: string) => /```(?:[a-zA-Z0-9_-]+)?\n[\s\S]*?```/.test(output);

  async function startNewThread() {
    try {
      const created = await api<{ id: string; title: string; updatedAt: string }>('/ai/threads', {
        method: 'POST',
        body: JSON.stringify({
          title: lesson ? lesson.title : challenge ? challenge.title : 'New Chat Thread',
          lessonId: lesson?.id,
        }),
      });
      if (created?.id) {
        setThreads((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
        setActiveThreadId(created.id);
      }
    } catch {
      setActiveThreadId(null);
    }
    setMessages([
      {
        role: 'assistant',
        content: lesson
          ? `New thread started! Ask me anything about "${lesson.title}" — I'll stay grounded in that lesson.`
          : challenge
            ? `New thread started! Ready to work on the "${challenge.title}" challenge.`
            : 'New thread started! Ask about any Learning Hub lesson or challenge, paste code, or use search above.',
        timestamp: new Date(),
      },
    ]);
  }

  async function deleteThread(threadId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api(`/ai/threads/${threadId}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    setThreads((prev) => {
      const remaining = prev.filter((t) => t.id !== threadId);
      if (activeThreadId === threadId) {
        setActiveThreadId(remaining[0]?.id || null);
      }
      return remaining;
    });
  }

  async function clearChat() {
    if (!window.confirm('Clear all messages in this conversation?')) return;
    try {
      const suffix = activeThreadId ? `?threadId=${encodeURIComponent(activeThreadId)}` : '';
      await api(`/ai/chat/history${suffix}`, { method: 'DELETE' });
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

  async function deleteCurrentThread() {
    if (!window.confirm('Delete this conversation permanently and start a new one?')) return;
    const threadId = activeThreadId;
    try {
      if (threadId) {
        await api(`/ai/threads/${threadId}`, { method: 'DELETE' });
      } else {
        await api('/ai/chat/history', { method: 'DELETE' });
      }
    } catch {
      // Offline or signed out: continue with the local removal.
    }
    if (threadId) {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    }
    await startNewThread();
  }

  async function clearAllConversations() {
    if (!window.confirm('Clear ALL conversations and chat history? This cannot be undone.')) return;
    try {
      await api('/ai/threads', { method: 'DELETE' });
    } catch {
      // Offline or signed out: continue with the local removal.
    }
    setThreads([]);
    setActiveThreadId(null);
    setMessages([
      {
        role: 'assistant',
        content: 'All conversations cleared! Ask about any Learning Hub lesson or challenge, paste code, or use search above to get started.',
        timestamp: new Date(),
      },
    ]);
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="default" size="sm" onClick={startNewThread} className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            + New Thread
          </Button>
          <Button variant="secondary" size="sm" onClick={clearChat} className="gap-1.5" title="Clear all messages in the live conversation">
            <Trash2 className="h-3.5 w-3.5" />
            Clear Chat
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={deleteCurrentThread}
            className="gap-1.5 text-rose-300 hover:text-rose-200"
            title="Delete this conversation and start a new one"
          >
            <X className="h-3.5 w-3.5" />
            Delete &amp; Start New
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={clearAllConversations}
            className="gap-1.5 text-rose-300 hover:text-rose-200"
            title="Delete every conversation and the chat history"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Saved Multi-Thread Selector Bar */}
      {threads.length > 0 && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
            Threads:
          </span>
          {threads.map((t) => {
            const isSelected = activeThreadId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setActiveThreadId(t.id)}
                className={`group flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs transition shrink-0 ${
                  isSelected
                    ? 'border-primary/50 bg-primary/15 text-primary font-semibold'
                    : 'border-white/10 bg-secondary/30 text-muted-foreground hover:border-white/25 hover:text-white'
                }`}
              >
                <span className="max-w-[180px] truncate">{t.title || 'Untitled Thread'}</span>
                <button
                  type="button"
                  onClick={(e) => deleteThread(t.id, e)}
                  className="rounded-full p-0.5 text-muted-foreground/70 hover:bg-white/10 hover:text-red-400"
                  title="Delete thread"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

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
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Live Conversation
              </CardTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-white gap-1.5"
                  title="Clear all messages in the live conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Conversation
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteCurrentThread}
                  className="h-7 px-2 text-xs text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 gap-1.5"
                  title="Delete this conversation and start a new one"
                >
                  <X className="h-3.5 w-3.5" />
                  Delete &amp; New
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllConversations}
                  className="h-7 px-2 text-xs text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 gap-1.5"
                  title="Clear every conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All
                </Button>
              </div>
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
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Code Context
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-secondary/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {hasServerKey ? 'AI Engine: Cloud Active' : 'AI Engine: Local Ready (11 Languages)'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCodeAndOutput}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 gap-1.5 transition"
                  title="Clear code editor and remove previous AI response"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Code
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllConversations}
                  className="h-7 px-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 gap-1.5 transition"
                  title="Clear every conversation across the AI Workspace"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All Conversations
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
            <CardContent className="space-y-3">
              <textarea
                value={codeContext}
                onChange={(e) => {
                  setCodeContext(e.target.value);
                  setCodeEditedByUser(true);
                }}
                className="h-[360px] w-full resize-none rounded-lg border border-white/[0.08] bg-[#050a0d] p-4 font-mono text-sm leading-6 text-green-100 outline-none focus:ring-2 focus:ring-primary/30 overflow-y-auto"
                spellCheck={false}
                placeholder="Paste your code here, then use the action buttons below…"
              />
              {/* Quick action buttons – all wired up */}
              <div className="flex flex-wrap items-center gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const isThisLoading = codeActionLoading === action.id;
                  return (
                    <Button
                      key={action.label}
                      variant="secondary"
                      size="sm"
                      disabled={codeActionLoading !== null}
                      onClick={() => handleQuickAction(action)}
                      className={`gap-1.5 transition ${
                        isThisLoading ? 'border-primary/50 bg-primary/20 text-white' : ''
                      }`}
                    >
                      {isThisLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                      {action.label}
                    </Button>
                  );
                })}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={codeActionLoading !== null}
                  onClick={() => {
                    if (!codeContext.trim()) {
                      setCodeActionResult({
                        action: 'review',
                        title: 'Full Review & Solution',
                        output: '⚠️ **No Code Detected in Editor**\n\nPlease paste or type some code in the **Code Context** editor above first, then click **Full Review & Solution**.',
                        fromAi: false,
                        timestamp: new Date(),
                      });
                      return;
                    }
                    void runCodeContextReview(
                      codeContext,
                      challenge?.language || lesson?.firstExampleLanguage || languageParam || detectLanguage(codeContext),
                      challenge?.title || challengeTitleParam || undefined,
                      challenge?.overview || challengeDescParam || undefined
                    );
                  }}
                  className={`gap-1.5 border border-primary/30 text-primary hover:bg-primary/15 transition ${
                    codeActionLoading === 'review' ? 'border-primary/50 bg-primary/20 text-white' : ''
                  }`}
                >
                  {codeActionLoading === 'review' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Full Review & Solution
                </Button>
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

              {/* Inline Question Input for Code Context */}
              <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-secondary/20 p-3">
                <p className="text-xs font-semibold text-white">
                  Ask a Question about this Code (Answered right here under Code Context):
                </p>
                <div className="flex gap-2">
                  <Input
                    value={codeQuestion}
                    onChange={(e) => setCodeQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskAboutCode()}
                    placeholder="e.g., Why does my loop fail on edge cases? How do I fix line 4?"
                    disabled={codeActionLoading !== null}
                  />
                  <Button
                    onClick={() => handleAskAboutCode()}
                    disabled={codeActionLoading !== null}
                    className="shrink-0 gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Get Answer Here
                  </Button>
                </div>
              </div>

              {/* Loading Indicator for Code Action */}
              {codeActionLoading && (
                <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        SynergySphere AI is analyzing your code…
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Generating {codeActionLoading === 'test' ? 'unit test suite' : codeActionLoading} analysis directly under Code Context.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Code Action Output Section (Rendered directly in Code Context) */}
              {codeActionResult && !codeActionLoading && (
                <div className="space-y-2 pt-1">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Live Code Analysis
                  </h3>
                  <div className="rounded-xl border border-white/[0.1] bg-[#070e13] p-4 shadow-xl">
                    {/* Result Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                          <Sparkles className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {codeActionResult.title}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            codeActionResult.fromAi
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-primary/15 text-primary border border-primary/30'
                          }`}
                        >
                          {codeActionResult.fromAi ? '⚡ Cloud AI Answer' : '⚡ Local Analysis (11 Languages)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(codeActionResult.output);
                            setCopiedCodeOutput(true);
                            setTimeout(() => setCopiedCodeOutput(false), 2000);
                          }}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-white"
                          title="Copy answer to clipboard"
                        >
                          {copiedCodeOutput ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>

                        {hasCodeBlock(codeActionResult.output) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleApplyExtractedCode(codeActionResult.output)}
                            className="h-7 px-2.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25"
                            title="Apply the code snippet from this answer into the editor"
                          >
                            Apply to Editor
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCodeActionResult(null)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-400"
                          title="Dismiss this answer"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </div>

                    {/* Output content rendered in Markdown */}
                    <div className="max-h-[500px] overflow-y-auto pr-2 scrollbar-thin text-sm leading-relaxed text-zinc-200">
                      <MarkdownView content={codeActionResult.output} />
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground/60">
                {lesson?.firstExampleCode
                  ? 'Pre-filled with the first example from this lesson — edit it or paste your own code.'
                  : challenge?.starterCode
                    ? 'Pre-filled with challenge starter code — edit it or ask for algorithmic hints!'
                    : 'Paste code above and click a button or ask a question. All Code Context answers appear directly under Code Context.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Right Panel (Recent Prompts & Quick Tips) ── */}
        <div className="space-y-4">
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
                      if (activeTab === 'codeContext' && codeContext.trim()) {
                        void runCodeContextReview(
                          codeContext,
                          challenge?.language || lesson?.firstExampleLanguage || languageParam || detectLanguage(codeContext),
                          challenge?.title || challengeTitleParam || undefined,
                          challenge?.overview || challengeDescParam || undefined,
                          prompt
                        );
                      } else {
                        sendMessage(prompt);
                      }
                    }}
                    disabled={loading || codeActionLoading !== null}
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
  const fencedMatch = message.match(/```(?:[\w+-]+)?\s*\n?([\s\S]*?)```/);
  const inlineCodeCandidate = fencedMatch?.[1]?.trim() || (
    /\b(function\s+\w+|def\s+\w+|public\s+class|SELECT\s+.+\s+FROM|const\s+\w+\s*=)\b/i.test(message)
      ? message.trim()
      : ''
  );
  const effectiveCode = code.trim() || inlineCodeCandidate;
  const hasCode = effectiveCode.length > 0;
  const lang = hasCode ? detectLanguage(effectiveCode) : 'JavaScript';

  if (hasCode) {
    if (lower.includes('explain')) {
      return analyzeCodeOffline('explain', effectiveCode, lang).output;
    }
    if (lower.includes('debug') || lower.includes('error') || lower.includes('bug') || lower.includes('fix')) {
      return analyzeCodeOffline('debug', effectiveCode, lang).output;
    }
    if (lower.includes('optim')) {
      return analyzeCodeOffline('optimize', effectiveCode, lang).output;
    }
    if (lower.includes('test')) {
      return analyzeCodeOffline('test', effectiveCode, lang).output;
    }
    const explainReport = analyzeCodeOffline('explain', effectiveCode, lang).output;
    const debugReport = analyzeCodeOffline('debug', effectiveCode, lang).output;
    return `### SynergySphere Code Review (${lang})\n\n${explainReport}\n\n---\n\n### Bug Discovery & Recommended Solution\n\n${debugReport}`;
  }

  // Direct conversational answers for questions typed in Conversation tab
  if (/\b(loop|for|while|iterate|iteration)\b/.test(lower)) {
    return (
      `### Loops & Iteration Explained\n\n` +
      `A **loop** repeats a block of code while a condition holds or over every element in a collection:\n\n` +
      `- **\`for\` loop**: Best when you need the numeric index or a fixed number of iterations.\n` +
      `- **\`for...of\` / \`for item in list\`**: Cleanest way to iterate directly over values.\n` +
      `- **\`while\` loop**: Continues executing as long as its condition evaluates to \`true\`.\n` +
      `- **Functional methods (\`.map\`, \`.filter\`, \`.reduce\`)**: Transform arrays declaratively without mutating the original array.\n\n` +
      `\`\`\`javascript\nconst items = [10, 20, 30];\nfor (const value of items) {\n  console.log(value);\n}\nconst doubled = items.map((n) => n * 2);\n\`\`\``
    );
  }

  if (/\b(async|await|promise|fetch|callback|asynchronous)\b/.test(lower)) {
    return (
      `### Asynchronous Programming (\`Promise\` & \`async/await\`)\n\n` +
      `Asynchronous code allows network requests, timers, and I/O operations to run without blocking the main thread:\n\n` +
      `1. **\`Promise\`**: Represents an operation that will complete in the future (\`pending\` → \`fulfilled\` or \`rejected\`).\n` +
      `2. **\`async / await\`**: Lets you write asynchronous Promise-based code cleanly like synchronous step-by-step code.\n` +
      `3. **Error Handling**: Wrap \`await\` calls in \`try / catch\` blocks to handle rejected promises safely.\n\n` +
      `\`\`\`javascript\nasync function loadUserProfile(id) {\n  try {\n    const res = await fetch(\`/api/users/\${id}\`);\n    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n    return await res.json();\n  } catch (err) {\n    console.error('Failed to fetch user:', err);\n    return null;\n  }\n}\n\`\`\``
    );
  }

  if (/\b(sql|join|select|where|group by|database|query)\b/.test(lower)) {
    return (
      `### SQL Queries & Joins\n\n` +
      `- **\`INNER JOIN\`**: Returns rows that have matching keys in **both** tables.\n` +
      `- **\`LEFT JOIN\`**: Returns **all** rows from the left table plus matching rows from the right table (\`NULL\` when unmatched).\n` +
      `- **\`WHERE\` vs \`HAVING\`**: \`WHERE\` filters individual rows before \`GROUP BY\`; \`HAVING\` filters aggregated groups after \`GROUP BY\`.\n\n` +
      `\`\`\`sql\nSELECT u.name, COUNT(o.id) AS order_count\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nGROUP BY u.id, u.name\nHAVING COUNT(o.id) > 0\nORDER BY order_count DESC;\n\`\`\``
    );
  }

  if (/\b(react|usestate|useeffect|props|state|hook|component)\b/.test(lower)) {
    return (
      `### React Components, Props & Hooks\n\n` +
      `- **\`props\`**: Read-only inputs passed from a parent component.\n` +
      `- **\`useState\`**: Manages local component state and triggers a re-render when updated.\n` +
      `- **\`useEffect\`**: Runs side effects (API calls, subscriptions, timers) when dependencies change.\n\n` +
      `\`\`\`tsx\nimport { useState } from 'react';\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount((c) => c + 1)}>\n      Count: {count}\n    </button>\n  );\n}\n\`\`\``
    );
  }

  if (/\b(python|list|dict|dictionary|tuple|set|comprehension)\b/.test(lower)) {
    return (
      `### Python Data Structures & Idioms\n\n` +
      `- **List (\`[]\`)**: Ordered, mutable sequence; supports list comprehensions \`[x * 2 for x in nums]\`.\n` +
      `- **Dictionary (\`{}\`)**: Key-value hash map providing $O(1)$ average lookup.\n` +
      `- **Set (\`set()\`)**: Unordered collection of unique elements for fast membership testing.\n\n` +
      `\`\`\`python\ndef summarize_numbers(nums: list[int]) -> dict[str, float]:\n    if not nums:\n        return {"count": 0, "sum": 0, "avg": 0.0}\n    total = sum(nums)\n    return {"count": len(nums), "sum": total, "avg": round(total / len(nums), 2)}\n\`\`\``
    );
  }

  if (/\b(debug|error|bug|exception|fix|null|undefined)\b/.test(lower)) {
    return (
      `### Debugging & Root-Cause Checklist\n\n` +
      `1. **Guard Inputs Early**: Check for \`null\`, \`undefined\`, and empty collections at the top of your function.\n` +
      `2. **Check Off-by-One Bounds**: Use \`i < arr.length\` instead of \`i <= arr.length\` for 0-indexed arrays.\n` +
      `3. **Verify Equality & Types**: Use strict equality (\`===\`) in JS/TS and \`.equals()\` for object comparisons in Java/C#.\n` +
      `4. **Inspect Async Flows**: Ensure every Promise is \`await\`ed and errors are caught in \`try/catch\`.\n\n` +
      `You can also paste the exact error message or code snippet right here in the chat and I will walk through the fix line by line!`
    );
  }

  return (
    `### Answer: ${message.slice(0, 90)}\n\n` +
    `Here is a direct breakdown and implementation guide for your question:\n\n` +
    `1. **Core Concept**: Define the expected inputs, transformation logic, and return value clearly.\n` +
    `2. **Optimal Approach**: Prefer $O(n)$ single-pass algorithms using a \`Map\` / \`Set\` / \`dict\` over $O(n^2)$ nested loops when searching or deduplicating data.\n` +
    `3. **Edge Cases**: Explicitly handle empty inputs (\`[]\`, \`""\`), single-element cases, and boundary values (\`0\`, negative numbers).\n\n` +
    `\`\`\`javascript\nfunction solve(items) {\n  if (!Array.isArray(items) || items.length === 0) return [];\n  const seen = new Set();\n  return items.filter((item) => {\n    if (seen.has(item)) return false;\n    seen.add(item);\n    return true;\n  });\n}\n\`\`\``
  );
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
