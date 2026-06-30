'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Code2,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Terminal,
  Trophy,
  X,
} from 'lucide-react';

/* ─────────────────────────── types ─────────────────────────── */

interface Challenge {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  language: string | null;
  starterCode: string | null;
  xpReward: number;
}

interface TestCase {
  label: string;
  args: unknown[];
  expected: unknown;
}

interface TestResult {
  label: string;
  passed: boolean;
  expected: unknown;
  got: unknown;
  error?: string;
}

/* ─────────────────────────── challenge data ─────────────────────────── */

const fallbackChallenges: Challenge[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    description:
      'Given an array of integers and a target value, return the indices of two numbers that add up to the target.',
    language: 'JavaScript',
    starterCode:
      'function twoSum(nums, target) {\n  // your solution here\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const match = target - nums[i];\n    if (seen.has(match)) return [seen.get(match), i];\n    seen.set(nums[i], i);\n  }\n}',
    xpReward: 50,
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'EASY',
    description:
      'Given a string containing just the characters (, ), {, }, [ and ], determine if the input string is valid.',
    language: 'JavaScript',
    starterCode:
      'function isValid(s) {\n  // your solution here\n  const stack = [];\n  const pairs = { ")": "(", "]": "[", "}": "{" };\n  for (const char of s) {\n    if (!pairs[char]) stack.push(char);\n    else if (stack.pop() !== pairs[char]) return false;\n  }\n  return stack.length === 0;\n}',
    xpReward: 60,
  },
  {
    id: 'longest-substring',
    title: 'Longest Substring',
    difficulty: 'MEDIUM',
    description:
      'Find the length of the longest substring without repeating characters.',
    language: 'JavaScript',
    starterCode:
      'function lengthOfLongestSubstring(s) {\n  // your solution here\n  let left = 0, best = 0;\n  const seen = new Map();\n  for (let right = 0; right < s.length; right++) {\n    if (seen.has(s[right])) left = Math.max(left, seen.get(s[right]) + 1);\n    seen.set(s[right], right);\n    best = Math.max(best, right - left + 1);\n  }\n  return best;\n}',
    xpReward: 120,
  },
  {
    id: 'reverse-linked-list',
    title: 'Reverse Linked List',
    difficulty: 'EASY',
    description:
      'Reverse a singly linked list. Write a function that takes the head node and returns the new head.',
    language: 'JavaScript',
    starterCode:
      'function reverseList(head) {\n  // your solution here\n  let prev = null, curr = head;\n  while (curr) {\n    const next = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = next;\n  }\n  return prev;\n}',
    xpReward: 80,
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci Number',
    difficulty: 'EASY',
    description:
      'Given n, calculate F(n) – the nth Fibonacci number. F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2).',
    language: 'JavaScript',
    starterCode:
      'function fib(n) {\n  // your solution here\n  if (n <= 1) return n;\n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];\n  return b;\n}',
    xpReward: 40,
  },
  {
    id: 'merge-sorted-arrays',
    title: 'Merge Sorted Arrays',
    difficulty: 'MEDIUM',
    description:
      'Merge two sorted arrays nums1 and nums2 and return a sorted merged array.',
    language: 'JavaScript',
    starterCode:
      'function merge(nums1, nums2) {\n  // your solution here\n  return [...nums1, ...nums2].sort((a, b) => a - b);\n}',
    xpReward: 100,
  },
];

/* ─────────────────────────── per-challenge test cases ─────────────────────────── */

const challengeTests: Record<string, { fn: string; cases: TestCase[] }> = {
  'two-sum': {
    fn: 'twoSum',
    cases: [
      { label: 'twoSum([2,7,11,15], 9)', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { label: 'twoSum([3,2,4], 6)', args: [[3, 2, 4], 6], expected: [1, 2] },
      { label: 'twoSum([3,3], 6)', args: [[3, 3], 6], expected: [0, 1] },
    ],
  },
  'valid-parentheses': {
    fn: 'isValid',
    cases: [
      { label: 'isValid("()")', args: ['()'], expected: true },
      { label: 'isValid("()[]{}")', args: ['()[]{}'], expected: true },
      { label: 'isValid("(]")', args: ['(]'], expected: false },
      { label: 'isValid("{[]}")', args: ['{[]}'], expected: true },
    ],
  },
  'longest-substring': {
    fn: 'lengthOfLongestSubstring',
    cases: [
      { label: 'lengthOfLongestSubstring("abcabcbb")', args: ['abcabcbb'], expected: 3 },
      { label: 'lengthOfLongestSubstring("bbbbb")', args: ['bbbbb'], expected: 1 },
      { label: 'lengthOfLongestSubstring("pwwkew")', args: ['pwwkew'], expected: 3 },
      { label: 'lengthOfLongestSubstring("")', args: [''], expected: 0 },
    ],
  },
  'reverse-linked-list': {
    fn: 'reverseList',
    cases: [
      {
        label: 'reverseList([1→2→3→4→5])',
        args: [{ val: 1, next: { val: 2, next: { val: 3, next: { val: 4, next: { val: 5, next: null } } } } }],
        expected: [5, 4, 3, 2, 1],
      },
      {
        label: 'reverseList([1→2])',
        args: [{ val: 1, next: { val: 2, next: null } }],
        expected: [2, 1],
      },
      { label: 'reverseList(null)', args: [null], expected: [] },
    ],
  },
  fibonacci: {
    fn: 'fib',
    cases: [
      { label: 'fib(0)', args: [0], expected: 0 },
      { label: 'fib(1)', args: [1], expected: 1 },
      { label: 'fib(4)', args: [4], expected: 3 },
      { label: 'fib(10)', args: [10], expected: 55 },
    ],
  },
  'merge-sorted-arrays': {
    fn: 'merge',
    cases: [
      { label: 'merge([1,3,5],[2,4,6])', args: [[1, 3, 5], [2, 4, 6]], expected: [1, 2, 3, 4, 5, 6] },
      { label: 'merge([1],[2])', args: [[1], [2]], expected: [1, 2] },
      { label: 'merge([],[1])', args: [[], [1]], expected: [1] },
    ],
  },
};

/* ─────────────────────────── per-challenge AI hints ─────────────────────────── */

const challengeHints: Record<string, string[]> = {
  'two-sum': [
    '💡 A brute-force O(n²) loop works, but try a hash map for O(n).',
    '💡 For each number, check if (target - nums[i]) is already in the map.',
    '💡 Store the index of each visited number as the map value.',
  ],
  'valid-parentheses': [
    '💡 Use a stack – push opening brackets, pop when you see a closing bracket.',
    '💡 Map each closing bracket to its expected opening bracket.',
    '💡 At the end, the stack must be empty for the string to be valid.',
  ],
  'longest-substring': [
    '💡 Sliding window: maintain two pointers (left, right).',
    '💡 Use a Map to track the last-seen index of each character.',
    '💡 When a repeat is found, move the left pointer past the previous occurrence.',
  ],
  'reverse-linked-list': [
    '💡 You need three pointers: prev (null), curr, and next.',
    '💡 In each step: save curr.next, point curr.next to prev, advance both pointers.',
    '💡 When curr is null, prev is your new head.',
  ],
  fibonacci: [
    '💡 Base cases: fib(0)=0 and fib(1)=1.',
    '💡 Avoid recursion – use two variables and iterate for O(n) time.',
    '💡 At each step: [a, b] = [b, a + b].',
  ],
  'merge-sorted-arrays': [
    '💡 Simplest: concatenate and sort. For O(n+m) use a two-pointer merge.',
    '💡 Compare the front elements of each array and push the smaller one.',
    '💡 After one array is exhausted, append the remainder of the other.',
  ],
};

/* ─────────────────────────── helpers ─────────────────────────── */

function deepEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Convert a linked-list node to an array for easy comparison */
function linkedListToArray(node: { val: number; next: unknown } | null): number[] {
  const arr: number[] = [];
  let curr = node;
  while (curr) {
    arr.push(curr.val);
    curr = curr.next as { val: number; next: unknown } | null;
  }
  return arr;
}

function runTests(code: string, challengeId: string): TestResult[] {
  const spec = challengeTests[challengeId];
  if (!spec) return [];

  let fn: (...args: unknown[]) => unknown;
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function(`${code}; return ${spec.fn};`);
    fn = factory();
    if (typeof fn !== 'function') throw new Error(`${spec.fn} is not a function`);
  } catch (e) {
    return spec.cases.map((c) => ({
      label: c.label,
      passed: false,
      expected: c.expected,
      got: undefined,
      error: (e as Error).message,
    }));
  }

  return spec.cases.map((tc) => {
    try {
      let got = fn(...(tc.args as unknown[]));
      // Normalise linked-list results
      if (challengeId === 'reverse-linked-list') {
        got = linkedListToArray(got as { val: number; next: unknown } | null);
      }
      const passed = deepEqual(got, tc.expected);
      return { label: tc.label, passed, expected: tc.expected, got };
    } catch (e) {
      return {
        label: tc.label,
        passed: false,
        expected: tc.expected,
        got: undefined,
        error: (e as Error).message,
      };
    }
  });
}

/* ─────────────────────────── component ─────────────────────────── */

const difficultyColor: Record<string, string> = {
  EASY: 'border-green-400/30 bg-green-400/10 text-green-300',
  MEDIUM: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  HARD: 'border-red-400/30 bg-red-400/10 text-red-300',
};

export default function CodingPage() {
  const [challenges, setChallenges] = useState<Challenge[]>(fallbackChallenges);
  const [selected, setSelected] = useState<Challenge>(fallbackChallenges[0]);
  const [code, setCode] = useState(fallbackChallenges[0].starterCode || '');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [submitResult, setSubmitResult] = useState<{ passed: boolean; xpEarned: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');

  // AI hints state
  const [hintIndex, setHintIndex] = useState(0);
  const [aiHint, setAiHint] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);

  // Filter
  const [activeFilter, setActiveFilter] = useState('All');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api<Challenge[]>('/challenges')
      .then((items) => {
        if (items.length) {
          setChallenges(items);
          setSelected(items[0]);
          setCode(items[0].starterCode || '');
        }
      })
      .catch(() => {
        setPageError('Backend offline – showing built-in challenges. Code runs fully in your browser.');
      });
  }, []);

  function selectChallenge(challenge: Challenge) {
    setSelected(challenge);
    setCode(challenge.starterCode || '');
    setTestResults([]);
    setSubmitResult(null);
    setHintIndex(0);
    setAiHint('');
    setShowHints(false);
  }

  function handleRun() {
    setRunning(true);
    setSubmitResult(null);
    // Slight delay so the UI updates before the potentially blocking eval
    setTimeout(() => {
      const results = runTests(code, selected.id);
      setTestResults(results);
      setRunning(false);
    }, 50);
  }

  async function handleSubmit() {
    // First run tests client-side
    const results = runTests(code, selected.id);
    setTestResults(results);
    const allPassed = results.length > 0 && results.every((r) => r.passed);

    setSubmitting(true);
    try {
      // Try backend submit for XP tracking
      const res = await api<{ passed: boolean; xpEarned: number }>(
        `/challenges/${selected.id}/submit`,
        { method: 'POST', body: JSON.stringify({ code, testResults: results.map((r) => ({ label: r.label, passed: r.passed })) }) }
      );
      setSubmitResult({ passed: allPassed, xpEarned: allPassed ? res.xpEarned : 0 });
    } catch {
      // Backend unavailable – use local result only
      setSubmitResult({ passed: allPassed, xpEarned: allPassed ? selected.xpReward : 0 });
    } finally {
      setSubmitting(false);
    }
  }

  async function getAiHint() {
    setHintLoading(true);
    setShowHints(true);
    const staticHints = challengeHints[selected.id] || [];

    // Try AI endpoint first
    try {
      const prompt = `I am working on the coding challenge "${selected.title}": ${selected.description}\n\nHere is my current code:\n${code}\n\nGive me ONE short, specific hint (1-2 sentences) to help me improve or fix my solution. Do NOT give the full answer.`;
      const res = await api<{ response: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: prompt }),
      });
      setAiHint(res.response);
    } catch {
      // Fallback to local hints
      const hint = staticHints[hintIndex % staticHints.length] || 'Think about the time complexity and whether a different data structure could help.';
      setAiHint(hint);
      setHintIndex((prev) => prev + 1);
    } finally {
      setHintLoading(false);
    }
  }

  function resetCode() {
    setCode(selected.starterCode || '');
    setTestResults([]);
    setSubmitResult(null);
  }

  const filteredChallenges = challenges.filter((c) => {
    if (activeFilter === 'All') return true;
    return c.difficulty === activeFilter.toUpperCase();
  });

  const allPassed = testResults.length > 0 && testResults.every((r) => r.passed);
  const passedCount = testResults.filter((r) => r.passed).length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            SkillUp Learning Hub
          </p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Coding Challenges</h1>
          <p className="text-sm text-muted-foreground">
            Practice algorithms, run tests in your browser, and collect XP.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', 'Easy', 'Medium', 'Hard'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-lg border px-3 py-2 text-xs transition ${
                activeFilter === filter
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-white/[0.08] bg-secondary/50 text-muted-foreground hover:text-primary'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {pageError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {pageError}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr_0.8fr]">
        {/* ── Challenge list ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Challenges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredChallenges.map((challenge) => (
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
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {challenge.description}
                </p>
                <p className="mt-2 text-[11px] text-primary">+{challenge.xpReward} XP</p>
              </button>
            ))}
            {filteredChallenges.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No challenges for this filter.</p>
            )}
          </CardContent>
        </Card>

        {/* ── Code editor ── */}
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{selected.title}</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{selected.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-white/[0.08] bg-secondary/50 px-2 py-1 text-xs text-muted-foreground">
                {selected.language || 'JavaScript'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-[320px] w-full resize-none rounded-lg border border-white/[0.08] bg-[#050a0d] p-4 font-mono text-sm leading-6 text-green-100 outline-none focus:ring-2 focus:ring-primary/30"
                spellCheck={false}
              />
              <button
                onClick={resetCode}
                title="Reset to starter code"
                className="absolute right-3 top-3 rounded-md border border-white/[0.08] bg-secondary/60 p-1.5 text-muted-foreground transition hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleRun} disabled={running || submitting} className="gap-2">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? 'Running…' : 'Run Tests'}
              </Button>
              <Button onClick={handleSubmit} disabled={running || submitting} variant="secondary" className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? 'Submitting…' : 'Submit'}
              </Button>
              {submitResult && (
                <div className={`flex items-center gap-2 text-sm ${submitResult.passed ? 'text-green-300' : 'text-red-300'}`}>
                  {submitResult.passed ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {submitResult.passed
                    ? `All tests passed! +${submitResult.xpEarned} XP earned`
                    : 'Some tests failed – keep trying!'}
                </div>
              )}
            </div>

            {/* Test results */}
            {testResults.length > 0 && (
              <div className="rounded-lg border border-white/[0.08] bg-[#050a0d] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white">
                    Test Results:{' '}
                    <span className={allPassed ? 'text-green-300' : 'text-amber-300'}>
                      {passedCount}/{testResults.length} passed
                    </span>
                  </p>
                  {allPassed && <CheckCircle className="h-4 w-4 text-green-400" />}
                </div>
                {testResults.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded-md border p-2.5 font-mono text-xs ${
                      r.passed
                        ? 'border-green-400/20 bg-green-400/5 text-green-300'
                        : 'border-red-400/20 bg-red-400/5 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r.passed ? '✓' : '✗'}
                      <span className="font-semibold">{r.label}</span>
                    </div>
                    {!r.passed && (
                      <div className="mt-1 pl-4 text-muted-foreground">
                        {r.error ? (
                          <span className="text-red-400">Error: {r.error}</span>
                        ) : (
                          <>
                            <div>Expected: <span className="text-white">{JSON.stringify(r.expected)}</span></div>
                            <div>Got:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span className="text-white">{JSON.stringify(r.got)}</span></div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right panel ── */}
        <div className="space-y-4">
          {/* Test cases reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Test Cases
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(challengeTests[selected.id]?.cases || []).map((tc, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 font-mono text-xs ${
                    testResults[i]?.passed === true
                      ? 'border-green-400/25 bg-green-400/5 text-green-300'
                      : testResults[i]?.passed === false
                      ? 'border-red-400/25 bg-red-400/5 text-red-300'
                      : 'border-white/[0.07] bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {testResults[i]?.passed === true ? '✓ ' : testResults[i]?.passed === false ? '✗ ' : '○ '}
                    <span>{tc.label}</span>
                  </div>
                  <div className="mt-1 pl-4 text-[10px] opacity-70">
                    → {JSON.stringify(tc.expected)}
                  </div>
                </div>
              ))}
              {!challengeTests[selected.id] && (
                <p className="text-xs text-muted-foreground">No test cases configured for this challenge.</p>
              )}
            </CardContent>
          </Card>

          {/* AI Hints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                AI Hints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-5 text-muted-foreground">
                Stuck? Get a hint tailored to your current code without spoiling the solution.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={getAiHint}
                disabled={hintLoading}
              >
                {hintLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lightbulb className="h-3.5 w-3.5" />
                )}
                {hintLoading ? 'Getting hint…' : 'Get AI Hint'}
              </Button>

              {showHints && aiHint && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">
                  {aiHint}
                </div>
              )}

              {/* Static quick tips (always visible) */}
              <div className="pt-1">
                <button
                  onClick={() => setShowHints((v) => !v)}
                  className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-white transition"
                >
                  <span>Quick tips for this challenge</span>
                  {showHints ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showHints && (
                  <div className="mt-2 space-y-2">
                    {(challengeHints[selected.id] || []).map((hint, i) => (
                      <p key={i} className="text-xs leading-5 text-muted-foreground">
                        {hint}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress for this challenge */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tests passing</span>
                  <span className={allPassed ? 'text-green-300' : 'text-amber-300'}>
                    {passedCount} / {testResults.length}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${allPassed ? 'bg-green-400' : 'bg-primary'}`}
                    style={{ width: `${testResults.length ? (passedCount / testResults.length) * 100 : 0}%` }}
                  />
                </div>
                {allPassed && (
                  <p className="text-xs text-green-300 font-semibold text-center pt-1">
                    🎉 Challenge complete! Press Submit to claim your +{selected.xpReward} XP.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
