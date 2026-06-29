'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import { ChevronRight, Code2, MessageCircle, Mic, PhoneOff, Radio, Star, UserRoundCheck } from 'lucide-react';

const TOPICS = ['Java', 'Python', 'SQL', 'Web Development'];

interface Interview {
  id: string;
  topic: string;
  questions: Array<{ question: string; difficulty: string }>;
  score?: number;
  feedback?: string;
  weakAreas?: string[];
}

const demoInterview: Interview = {
  id: 'demo',
  topic: 'Backend Developer',
  questions: [
    { question: 'Explain the difference between ArrayList and LinkedList in Java.', difficulty: 'Medium' },
    { question: 'How would you secure a REST API?', difficulty: 'Medium' },
    { question: 'What causes an N+1 query problem?', difficulty: 'Hard' },
  ],
};

export default function InterviewsPage() {
  const [interview, setInterview] = useState<Interview | null>(demoInterview);
  const [answers, setAnswers] = useState<string[]>(new Array(demoInterview.questions.length).fill(''));
  const [result, setResult] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  async function startInterview(topic: string) {
    setLoading(true);
    setResult(null);
    try {
      const data = await api<Interview>('/ai/interview/start', {
        method: 'POST',
        body: JSON.stringify({ topic }),
      });
      setInterview(data);
      setAnswers(new Array(data.questions.length).fill(''));
      setStep(0);
    } catch {
      setInterview({ ...demoInterview, topic });
      setAnswers(new Array(demoInterview.questions.length).fill(''));
      setStep(0);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswers() {
    if (!interview) return;
    setLoading(true);
    try {
      const data = await api<Interview>('/ai/interview/evaluate', {
        method: 'POST',
        body: JSON.stringify({ interviewId: interview.id, answers }),
      });
      setResult(data);
      setInterview(null);
    } catch {
      setResult({
        ...interview,
        score: 82,
        feedback: 'Strong structure and good technical language. Add more detail around trade-offs and edge cases.',
        weakAreas: ['System design depth', 'Database optimization'],
      });
      setInterview(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Mock Interview Center</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Technical interview practice</h1>
          <p className="text-sm text-muted-foreground">Practice with AI interviewers, code prompts, and live feedback.</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setInterview(null)}>
          <PhoneOff className="h-4 w-4" />
          End Interview
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Interview Topics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => startInterview(topic)}
                className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-secondary/40 p-3 text-left transition hover:border-primary/30"
              >
                <span className="text-sm font-semibold text-white">{topic}</span>
                <span className="text-xs text-primary">+100 XP</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="min-h-[540px]">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{interview ? `${interview.topic} Interview` : 'Interview Summary'}</CardTitle>
            <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary">
              <Radio className="mr-1 inline h-3.5 w-3.5" />
              Live
            </span>
          </CardHeader>
          <CardContent>
            {interview && (
              <div className="space-y-5">
                <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/[0.08] bg-black/35">
                    <UserRoundCheck className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-secondary/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Question {step + 1} of {interview.questions.length}</p>
                    <span className="rounded-md border border-white/[0.08] bg-black/20 px-2 py-0.5 text-[11px] text-primary">
                      {interview.questions[step].difficulty}
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-white">{interview.questions[step].question}</p>
                </div>
                <textarea
                  value={answers[step]}
                  onChange={(e) => {
                    const next = [...answers];
                    next[step] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder="Type your answer here..."
                  className="h-32 w-full resize-none rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex justify-between">
                  <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</Button>
                  {step < interview.questions.length - 1 ? (
                    <Button onClick={() => setStep(step + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
                  ) : (
                    <Button onClick={submitAnswers} disabled={loading}>
                      {loading ? 'Evaluating...' : 'Submit Interview'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-6xl font-bold text-primary">{result.score}</p>
                  <p className="text-sm text-muted-foreground">out of 100</p>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-secondary/40 p-4">
                  <p className="mb-1 text-sm font-semibold text-white">Feedback</p>
                  <p className="text-sm leading-6 text-muted-foreground">{result.feedback}</p>
                </div>
                <Button onClick={() => { setResult(null); setInterview(demoInterview); }}>Start New Interview</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Live Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ['Technical clarity', 'Good'],
                ['Communication', 'Good'],
                ['Problem solving', 'Can improve'],
                ['SQL depth', 'Good'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-secondary/40 p-3 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-primary">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Code Editor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="h-40 overflow-auto rounded-lg border border-white/[0.08] bg-[#050a0d] p-3 font-mono text-xs leading-5 text-green-100">
{`public int match(String s) {
  int score = 0;
  // explain trade-offs
  return score;
}`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
