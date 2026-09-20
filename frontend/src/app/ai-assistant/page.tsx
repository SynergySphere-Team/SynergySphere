'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

function analyzeCodeLocally(code: string): { title: string; items: string[] }[] {
  const lines = code.split('\n').length;
  const hasLoop = /for|while/.test(code);
  const hasNested = /for[\s\S]{0,50}for|while[\s\S]{0,50}while/.test(code);
  const hasRecursion = /function\s+(\w+)[\s\S]*\1\s*\(/.test(code);

  const complexity =
    hasNested ? 'O(n²) – nested loops detected' : hasLoop ? 'O(n) – single loop' : hasRecursion ? 'O(n) or worse – recursive' : 'O(1) – constant';
  const spaceComplexity = /new\s+(Map|Set|Array|\[)/.test(code) ? 'O(n) – uses extra storage' : 'O(1) – in-place';

  const issues: string[] = [];
  if (lines > 50) issues.push('Consider breaking into smaller functions');
  if (/console\.log/.test(code)) issues.push('Debug logs found – remove before production');
  if (!hasLoop && !hasRecursion && lines < 5) issues.push('Consider edge cases for empty inputs');
  if (issues.length === 0) issues.push('No obvious issues detected');

  const suggestions: string[] = [];
  if (hasNested) suggestions.push('Consider a hash map to reduce to O(n)');
  if (/var\s/.test(code)) suggestions.push('Prefer let/const over var');
  if (!/\/\/|\/\*/.test(code) && lines > 10) suggestions.push('Add comments for complex logic');
  if (suggestions.length === 0) suggestions.push('Code looks clean!');

  return [
    { title: 'Complexity', items: [`Time: ${complexity}`, `Space: ${spaceComplexity}`] },
    { title: 'Issues', items: issues },
    { title: 'Suggestions', items: suggestions },
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
  const [analysis, setAnalysis] = useState(() => analyzeCodeLocally(''));
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

  function clearChat() {
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
                      <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
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
              {analysis.map(({ title, items }) => (
                <div key={title} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                  <p className="mb-2 text-xs font-semibold text-white">{title}</p>
                  {items.map((item) => (
                    <p key={item} className="text-xs text-muted-foreground">{item}</p>
                  ))}
                </div>
              ))}
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

  if (lower.includes('explain')) {
    const lines = code.split('\n').length;
    return `Here's an explanation of your code:\n\n• The code is ${lines} lines long.\n• It appears to be ${detectLanguage(code)} code.\n• ${describeCode(code)}\n\n⚠️ For detailed AI explanations, connect the backend (port 4001) and add an OPENAI_API_KEY or GEMINI_API_KEY to backend/.env.`;
  }
  if (lower.includes('debug') || lower.includes('error') || lower.includes('bug')) {
    return `To help debug your code:\n\n1. Check for syntax errors – look at brackets, parentheses, and semicolons.\n2. Add console.log() statements to trace variable values.\n3. Check that all variables are declared before use.\n4. Look for off-by-one errors in loops.\n\n⚠️ For AI-powered debugging, connect the backend and add an API key to backend/.env.`;
  }
  if (lower.includes('optim')) {
    return `Optimization tips for your code:\n\n1. 🗺️ Use hash maps/sets for O(1) lookups instead of nested loops.\n2. 🔄 Avoid re-computing values inside loops – cache them.\n3. 🧹 Remove any console.log() debug statements.\n4. ✂️ Break large functions into smaller, focused ones.\n\n⚠️ For AI-powered optimization, connect the backend and add an API key to backend/.env.`;
  }
  if (lower.includes('test')) {
    return `Here are general test cases to consider:\n\n• ✅ Normal inputs (typical use case)\n• 📭 Empty inputs (empty string, empty array, null)\n• 🔢 Edge values (0, negative numbers, very large numbers)\n• 🔁 Duplicate values\n• 🃏 Single-element inputs\n\n⚠️ For AI-generated tests, connect the backend and add an API key to backend/.env.`;
  }

  return `I received your message: "${message}"\n\nI'm running in offline mode because the backend server is not reachable. Here's what you can do:\n\n1. Start the backend: open a terminal → cd backend → npm run dev\n2. Add an AI key to backend/.env:\n   GEMINI_API_KEY="your-key"  (free at aistudio.google.com)\n   or OPENAI_API_KEY="sk-..."\n\nOnce connected, I'll have full AI capabilities!`;
}

function detectLanguage(code: string): string {
  if (/public\s+class|System\.out|void\s+main/.test(code)) return 'Java';
  if (/def\s+\w+|import\s+\w+|print\(/.test(code)) return 'Python';
  if (/function\s*\(|const\s+|let\s+|=>\s*{/.test(code)) return 'JavaScript';
  return 'unknown language';
}

function describeCode(code: string): string {
  if (/for[\s\S]*for/.test(code)) return 'It uses nested loops, which may have O(n²) time complexity.';
  if (/for|while/.test(code)) return 'It uses a loop to iterate over data.';
  if (/class/.test(code)) return 'It defines a class with methods.';
  return 'Review the logic carefully for correctness.';
}
