'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import { CheckCircle, Code2, Lightbulb, Play, Terminal, Trophy } from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  language: string | null;
  starterCode: string | null;
  xpReward: number;
}

const fallbackChallenges: Challenge[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    description: 'Given an array of integers and a target value, return the indices of two numbers that add up to the target.',
    language: 'JavaScript',
    starterCode: 'function twoSum(nums, target) {\n  const seen = new Map();\n\n  for (let i = 0; i < nums.length; i++) {\n    const match = target - nums[i];\n    if (seen.has(match)) return [seen.get(match), i];\n    seen.set(nums[i], i);\n  }\n}',
    xpReward: 50,
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'EASY',
    description: 'Use a stack to decide whether every opening bracket has the correct closing bracket.',
    language: 'JavaScript',
    starterCode: 'function isValid(s) {\n  const stack = [];\n  const pairs = { ")": "(", "]": "[", "}": "{" };\n\n  for (const char of s) {\n    if (!pairs[char]) stack.push(char);\n    else if (stack.pop() !== pairs[char]) return false;\n  }\n\n  return stack.length === 0;\n}',
    xpReward: 60,
  },
  {
    id: 'longest-substring',
    title: 'Longest Substring',
    difficulty: 'MEDIUM',
    description: 'Find the longest substring without repeating characters using a sliding window.',
    language: 'JavaScript',
    starterCode: 'function lengthOfLongestSubstring(s) {\n  let left = 0;\n  let best = 0;\n  const seen = new Map();\n\n  for (let right = 0; right < s.length; right++) {\n    if (seen.has(s[right])) left = Math.max(left, seen.get(s[right]) + 1);\n    seen.set(s[right], right);\n    best = Math.max(best, right - left + 1);\n  }\n\n  return best;\n}',
    xpReward: 120,
  },
];

const tests = ['[2,7,11,15], 9 -> [0,1]', '[3,2,4], 6 -> [1,2]', '[3,3], 6 -> [0,1]'];

export default function CodingPage() {
  const [challenges, setChallenges] = useState<Challenge[]>(fallbackChallenges);
  const [selected, setSelected] = useState<Challenge>(fallbackChallenges[0]);
  const [code, setCode] = useState(fallbackChallenges[0].starterCode || '');
  const [result, setResult] = useState<{ passed: boolean; xpEarned: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Challenge[]>('/challenges')
      .then((items) => {
        const next = items.length ? items : fallbackChallenges;
        setChallenges(next);
        setSelected(next[0]);
        setCode(next[0].starterCode || '');
      })
      .catch(() => {
        setError('Could not load live challenges. Showing local examples only.');
        setChallenges(fallbackChallenges);
        setSelected(fallbackChallenges[0]);
        setCode(fallbackChallenges[0].starterCode || '');
      });
  }, []);

  function selectChallenge(challenge: Challenge) {
    setSelected(challenge);
    setCode(challenge.starterCode || '');
    setResult(null);
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const res = await api<{ passed: boolean; xpEarned: number }>(`/challenges/${selected.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setResult(res);
    } catch {
      setError('Could not submit this challenge. Please check the backend connection and try again.');
      setResult({ passed: false, xpEarned: 0 });
    } finally {
      setLoading(false);
    }
  }

  const difficultyColor: Record<string, string> = {
    EASY: 'border-green-400/30 bg-green-400/10 text-green-300',
    MEDIUM: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    HARD: 'border-red-400/30 bg-red-400/10 text-red-300',
  };

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">SkillUp Learning Hub</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Coding challenges</h1>
          <p className="text-sm text-muted-foreground">Practice algorithms, run tests, and collect XP.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', 'Easy', 'Medium', 'Hard', 'AI Topics'].map((filter) => (
            <button key={filter} className="rounded-lg border border-white/[0.08] bg-secondary/50 px-3 py-2 text-xs text-muted-foreground transition hover:text-primary">
              {filter}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Challenges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {challenges.map((challenge) => (
              <button
                key={challenge.id}
                onClick={() => selectChallenge(challenge)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selected.id === challenge.id
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-white/[0.07] bg-secondary/35 hover:border-primary/25'
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{challenge.title}</p>
                  <span className={`rounded-md border px-2 py-0.5 text-[11px] ${difficultyColor[challenge.difficulty]}`}>
                    {challenge.difficulty}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{challenge.description}</p>
                <p className="mt-2 text-[11px] text-primary">+{challenge.xpReward} XP</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{selected.title}</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{selected.description}</p>
            </div>
            <span className="rounded-lg border border-white/[0.08] bg-secondary/50 px-2 py-1 text-xs text-muted-foreground">
              {selected.language || 'JavaScript'}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-[360px] w-full resize-none rounded-lg border border-white/[0.08] bg-[#050a0d] p-4 font-mono text-sm leading-6 text-green-100 outline-none focus:ring-2 focus:ring-primary/30"
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={submit} disabled={loading}>
                <Play className="h-4 w-4" />
                {loading ? 'Running...' : 'Run Code'}
              </Button>
              <Button variant="secondary">Submit</Button>
              {result && (
                <div className={`flex items-center gap-2 text-sm ${result.passed ? 'text-green-300' : 'text-red-300'}`}>
                  <CheckCircle className="h-4 w-4" />
                  {result.passed ? `Passed! +${result.xpEarned} XP` : 'Not quite - try again.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Test Cases
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tests.map((test) => (
                <div key={test} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-3 font-mono text-xs text-muted-foreground">
                  {test}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                AI Hints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Hint 1: Use a hash map to store complements.</p>
              <p>Hint 2: Check each number once, then return the matching indices.</p>
              <Button variant="secondary" size="sm" className="w-full">Reveal Solution</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
