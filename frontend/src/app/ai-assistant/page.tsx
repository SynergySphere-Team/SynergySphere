'use client';

import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/utils';
import { Bot, CheckCircle2, Code2, FileCode2, Send, Sparkles, User, Wand2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const starterCode = 'public class Main {\n  public static void main(String[] args) {\n    int n = 5;\n    for (int i = 0; i < n; i++) {\n      for (int j = 0; j <= i; j++) {\n        System.out.print(j + " ");\n      }\n      System.out.println();\n    }\n  }\n}';

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'I noticed your loop prints a growing pattern. Ask me to explain it, optimize it, or turn it into a challenge.',
    },
  ]);
  const [input, setInput] = useState('');
  const [codeContext, setCodeContext] = useState(starterCode);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await api<{ response: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg, context: codeContext || undefined }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I could not reach the AI service. Please check the backend connection or AI configuration and try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">AI Workspace</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Coding assistant</h1>
          <p className="text-sm text-muted-foreground">Debug, explain, refactor, and understand code in context.</p>
        </div>
        <Button variant="secondary" size="sm">
          <Wand2 className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.3fr_0.75fr]">
        <Card className="min-h-[650px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-[560px] flex-col">
            <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[84%] rounded-lg border px-4 py-3 text-sm leading-6 ${
                    msg.role === 'user'
                      ? 'border-primary/30 bg-primary/[0.15] text-primary'
                      : 'border-white/[0.08] bg-secondary/45 text-muted-foreground'
                  }`}>
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
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
                  <div className="rounded-lg border border-white/[0.08] bg-secondary/45 px-4 py-3 text-sm text-muted-foreground">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="mt-4 flex gap-2 border-t border-white/[0.08] pt-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about code, concepts, or best practices..."
                disabled={loading}
              />
              <Button onClick={send} disabled={loading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[650px]">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              Code Context
            </CardTitle>
            <span className="rounded-lg border border-white/[0.08] bg-secondary/50 px-2 py-1 text-xs text-muted-foreground">Java</span>
          </CardHeader>
          <CardContent>
            <textarea
              value={codeContext}
              onChange={(e) => setCodeContext(e.target.value)}
              className="h-[520px] w-full resize-none rounded-lg border border-white/[0.08] bg-[#050a0d] p-4 font-mono text-sm leading-6 text-green-100 outline-none focus:ring-2 focus:ring-primary/30"
              spellCheck={false}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {['Explain', 'Debug', 'Optimize', 'Generate tests'].map((action) => (
                <Button key={action} variant="secondary" size="sm">{action}</Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ['Complexity', 'Time: O(n^2)', 'Space: O(1)'],
                ['Issues', 'No major issues found', 'Output grows quickly'],
                ['Suggestions', 'Use StringBuilder for larger output', 'Add input validation'],
              ].map(([title, a, b]) => (
                <div key={title} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                  <p className="mb-2 text-xs font-semibold text-white">{title}</p>
                  <p className="text-xs text-muted-foreground">{a}</p>
                  <p className="text-xs text-muted-foreground">{b}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-primary" />
                Recent Prompts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {['Debug Spring Boot app', 'Explain binary trees', 'Generate REST API', 'Optimize SQL query'].map((prompt) => (
                <div key={prompt} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-secondary/40 p-3 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {prompt}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
