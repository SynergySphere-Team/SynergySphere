'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownView } from '@/components/ui/MarkdownView';
import { api } from '@/lib/utils';
import {
  Bot,
  Bug,
  BookOpen,
  CheckCircle2,
  Code2,
  FileCode2,
  Loader2,
  Send,
  Sparkles,
  TestTube,
  Trash2,
  User,
  Wand2,
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
}

interface ChatResponse {
  response: string;
  grounding?: {
    source: 'lesson' | 'upload' | 'search' | 'none';
    lessonId: string | null;
    lessonTitle: string | null;
    subjectName: string | null;
    moduleName: string | null;
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

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "👋 Hi! I'm your SynergySphere AI Workspace assistant, grounded in the LectureToLife Programming Academy and your own study packs. Ask about the lesson you're studying, paste code, or use the quick actions!",
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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch lesson details when ?lesson=<id> is present (used for chip + editor prefill).
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
        // Prefill the editor with the lesson's first example, not a generic starter.
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Re-analyze whenever code changes
  useEffect(() => {
    setAnalysis(analyzeCodeLocally(codeContext));
  }, [codeContext]);

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

    try {
      const res = await api<ChatResponse>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text.trim(),
          context: contextToSend,
          // Pin the grounded lesson on every request so follow-ups stay in-lesson.
          ...(lesson ? { lessonId: lesson.id } : {}),
          history: historyFromMessages(baseMessages).slice(-20),
        }),
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
        },
      ]);
    } catch {
      // Fallback: generate a helpful local response
      const fallback = generateLocalResponse(text, codeContext);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fallback, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
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
      return;
    }
    sendMessage(action.prompt(codeContext), undefined, codeContext);
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
          : 'Chat cleared! Ask about any LectureToLife lesson or paste code and I can help.',
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
            {lesson ? 'Lesson Assistant' : 'Coding Assistant'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {lesson
              ? `Grounded in LectureToLife Programming Academy — ${lesson.subjectName ?? ''}${lesson.moduleName ? ` › ${lesson.moduleName}` : ''}`
              : 'Grounded in LectureToLife Programming Academy and your study packs.'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={clearChat} className="gap-2">
          <Wand2 className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Grounded lesson chip */}
      {lesson && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.07] px-4 py-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Grounded in</span>
          <span className="text-xs text-white">
            {lesson.subjectName ? `${lesson.subjectName} › ` : ''}
            {lesson.moduleName ? `${lesson.moduleName} › ` : ''}
            {lesson.title}
          </span>
          <button
            onClick={() => router.push('/learning-hub')}
            className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:text-white hover:underline"
          >
            Open lesson
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.3fr_0.75fr]">
        {/* ── AI Chat ── */}
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
                    {msg.role === 'assistant' && msg.lessonTitle && (
                      <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Based on: {msg.lessonTitle}
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
                  lesson ? `Ask about ${lesson.title}…` : 'Ask about code, concepts, errors…'
                }
                disabled={loading}
              />
              <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Code editor ── */}
        <Card className="min-h-[650px]">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              Code Context
            </CardTitle>
            <span className="rounded-lg border border-white/[0.08] bg-secondary/50 px-2 py-1 text-xs text-muted-foreground">
              {lesson?.firstExampleLanguage
                ? `${lesson.firstExampleLanguage} example from the lesson`
                : 'Java / JS / Python'}
            </span>
          </CardHeader>
          <CardContent>
            <textarea
              value={codeContext}
              onChange={(e) => {
                setCodeContext(e.target.value);
                setCodeEditedByUser(true);
              }}
              className="h-[430px] w-full resize-none rounded-lg border border-white/[0.08] bg-[#050a0d] p-4 font-mono text-sm leading-6 text-green-100 outline-none focus:ring-2 focus:ring-primary/30"
              spellCheck={false}
              placeholder="Paste your code here, then use the action buttons below…"
            />
            {/* Quick action buttons – all wired up */}
            <div className="mt-3 flex flex-wrap gap-2">
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
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/60">
              {lesson?.firstExampleCode
                ? 'Pre-filled with the first example from this lesson — edit it or paste your own code.'
                : 'Paste code above and click a button, or type a question in the chat.'}
            </p>
          </CardContent>
        </Card>

        {/* ── Right panel ── */}
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
                    onClick={() => sendMessage(prompt)}
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
