'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import { BUILTIN_CHALLENGES } from '@/data/builtinChallenges';
import { LiveCodeRoomBar } from './LiveCodeRoomBar';
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Code2,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Terminal,
  Trophy,
  X,
} from 'lucide-react';

/* ─────────────────────────── types ─────────────────────────── */

export interface Challenge {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  language: string | null;
  starterCode: string | null;
  solution?: string;
  xpReward: number;
  hint?: string;
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
}

export interface RealtimeHintAnalysis {
  statusBadge: string;
  badgeTone: 'success' | 'info' | 'warning' | 'default';
  message: string;
  approachStep: string;
  checks: Array<{ label: string; passed: boolean }>;
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

/* ─────────────────────────── language config ─────────────────────────── */

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300',
  TypeScript: 'border-blue-400/40 bg-blue-400/10 text-blue-300',
  Python: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  Java: 'border-orange-400/40 bg-orange-400/10 text-orange-300',
  'C++': 'border-purple-400/40 bg-purple-400/10 text-purple-300',
  'C#': 'border-violet-400/40 bg-violet-400/10 text-violet-300',
  SQL: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  HTML: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
  CSS: 'border-pink-400/40 bg-pink-400/10 text-pink-300',
  React: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
  'Node.js': 'border-green-400/40 bg-green-400/10 text-green-300',
};

const ALL_LANGUAGES = ['All', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'SQL', 'HTML', 'CSS', 'React', 'Node.js'];

/* ─────────────────────────── challenge data ─────────────────────────── */

const fallbackChallenges: Challenge[] = BUILTIN_CHALLENGES;

/* ─────────────────────────── per-challenge test cases (JS only runs locally) ─── */

const challengeTests: Record<string, { fn: string; cases: TestCase[] }> = {
  'js-hello-world': {
    fn: 'greet',
    cases: [{ label: 'greet()', args: [], expected: 'Hello, SynergySphere!' }],
  },
  'js-sum-array': {
    fn: 'sumArray',
    cases: [
      { label: 'sumArray([1,2,3])', args: [[1, 2, 3]], expected: 6 },
      { label: 'sumArray([10,-2,5])', args: [[10, -2, 5]], expected: 13 },
      { label: 'sumArray([])', args: [[]], expected: 0 },
    ],
  },
  'js-fizzbuzz': {
    fn: 'fizzBuzz',
    cases: [
      { label: 'fizzBuzz(3)', args: [3], expected: 'Fizz' },
      { label: 'fizzBuzz(5)', args: [5], expected: 'Buzz' },
      { label: 'fizzBuzz(15)', args: [15], expected: 'FizzBuzz' },
      { label: 'fizzBuzz(7)', args: [7], expected: 7 },
      { label: 'fizzBuzz(1)', args: [1], expected: 1 },
    ],
  },
  'js-binary-search': {
    fn: 'binarySearch',
    cases: [
      { label: 'binarySearch([1,2,3,4,5],3)', args: [[1, 2, 3, 4, 5], 3], expected: 2 },
      { label: 'binarySearch([1,2,3,4,5],6)', args: [[1, 2, 3, 4, 5], 6], expected: -1 },
      { label: 'binarySearch([1,3,5,7,9],1)', args: [[1, 3, 5, 7, 9], 1], expected: 0 },
      { label: 'binarySearch([1,3,5,7,9],9)', args: [[1, 3, 5, 7, 9], 9], expected: 4 },
    ],
  },
  'js-two-sum': {
    fn: 'twoSum',
    cases: [
      { label: 'twoSum([2,7,11,15],9)', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { label: 'twoSum([3,2,4],6)', args: [[3, 2, 4], 6], expected: [1, 2] },
      { label: 'twoSum([3,3],6)', args: [[3, 3], 6], expected: [0, 1] },
    ],
  },
  'js-valid-parentheses': {
    fn: 'isValid',
    cases: [
      { label: 'isValid("()")', args: ['()'], expected: true },
      { label: 'isValid("()[]{}")', args: ['()[]{}'], expected: true },
      { label: 'isValid("(]")', args: ['(]'], expected: false },
      { label: 'isValid("{[]}")', args: ['{[]}'], expected: true },
    ],
  },
  'js-longest-substring': {
    fn: 'lengthOfLongestSubstring',
    cases: [
      { label: 'lengthOfLongestSubstring("abcabcbb")', args: ['abcabcbb'], expected: 3 },
      { label: 'lengthOfLongestSubstring("bbbbb")', args: ['bbbbb'], expected: 1 },
      { label: 'lengthOfLongestSubstring("pwwkew")', args: ['pwwkew'], expected: 3 },
      { label: 'lengthOfLongestSubstring("")', args: [''], expected: 0 },
    ],
  },
  'js-fibonacci': {
    fn: 'fib',
    cases: [
      { label: 'fib(0)', args: [0], expected: 0 },
      { label: 'fib(1)', args: [1], expected: 1 },
      { label: 'fib(4)', args: [4], expected: 3 },
      { label: 'fib(10)', args: [10], expected: 55 },
    ],
  },
  'js-merge-sorted': {
    fn: 'merge',
    cases: [
      { label: 'merge([1,3,5],[2,4,6])', args: [[1, 3, 5], [2, 4, 6]], expected: [1, 2, 3, 4, 5, 6] },
      { label: 'merge([1],[2])', args: [[1], [2]], expected: [1, 2] },
      { label: 'merge([],[1])', args: [[], [1]], expected: [1] },
    ],
  },
  'js-max-depth': {
    fn: 'maxDepth',
    cases: [
      { label: 'maxDepth([1,2,3])', args: [[1, 2, 3]], expected: 1 },
      { label: 'maxDepth([1,[2]])', args: [[1, [2]]], expected: 2 },
      { label: 'maxDepth([1,[2,[3]]])', args: [[1, [2, [3]]]], expected: 3 },
    ],
  },
  'js-flatten': {
    fn: 'flatten',
    cases: [
      { label: 'flatten([1,[2,3]])', args: [[1, [2, 3]]], expected: [1, 2, 3] },
      { label: 'flatten([1,[2,[3,[4]]]])', args: [[1, [2, [3, [4]]]]], expected: [1, 2, 3, 4] },
      { label: 'flatten([1,2,3])', args: [[1, 2, 3]], expected: [1, 2, 3] },
    ],
  },
  'ts-typed-greet': {
    fn: 'greet',
    cases: [
      { label: 'greet("Alice")', args: ['Alice'], expected: 'Hello, Alice! Welcome to SynergySphere.' },
      { label: 'greet("World")', args: ['World'], expected: 'Hello, World! Welcome to SynergySphere.' },
    ],
  },
  'ts-generic-identity': {
    fn: 'identity',
    cases: [
      { label: 'identity(42)', args: [42], expected: 42 },
      { label: 'identity("hello")', args: ['hello'], expected: 'hello' },
      { label: 'identity(true)', args: [true], expected: true },
    ],
  },
  'ts-union-types': {
    fn: 'format',
    cases: [
      { label: 'format(99)', args: [99], expected: '$99' },
      { label: 'format("hello")', args: ['hello'], expected: 'HELLO' },
      { label: 'format(0)', args: [0], expected: '$0' },
    ],
  },
  'ts-tuple-swap': {
    fn: 'swap',
    cases: [
      { label: 'swap([1,"a"])', args: [[1, 'a']], expected: ['a', 1] },
      { label: 'swap([true, 42])', args: [[true, 42]], expected: [42, true] },
    ],
  },
};

/* ─────────────────────────── AI hints ─────────────────────────── */

const challengeHints: Record<string, string[]> = {
  'js-hello-world': ['💡 Return the exact string with correct spelling and punctuation.'],
  'js-sum-array': ['💡 Use a for loop or Array.reduce() to accumulate the total.', '💡 Handle the empty array case — it should return 0.'],
  'js-fizzbuzz': ['💡 Check the combined condition (n % 3 === 0 && n % 5 === 0) FIRST before checking separately.', '💡 Use the modulo operator % to check divisibility.'],
  'js-binary-search': ['💡 Use two pointers: low = 0, high = arr.length - 1.', '💡 mid = Math.floor((low + high) / 2). Narrow the range each iteration.', '💡 Return -1 when low > high.'],
  'js-two-sum': ['💡 Use a Map: key = number, value = its index.', '💡 For each number check if (target - nums[i]) is already in the map.'],
  'js-valid-parentheses': ['💡 Use a stack. Push opening brackets, pop for closing.', '💡 Map closing → expected opening: ) → (, ] → [, } → {.', '💡 At the end the stack must be empty.'],
  'js-longest-substring': ['💡 Sliding window with two pointers (left, right).', '💡 Use a Map to track the last index of each character.'],
  'js-fibonacci': ['💡 Use two variables a=0, b=1 and swap them iteratively.', '💡 Handle base cases: fib(0)=0, fib(1)=1.'],
  'js-merge-sorted': ['💡 Concatenate both arrays then sort, or use a two-pointer merge.'],
  'js-max-depth': ['💡 Check if each element is an array. Recurse if so, track the max depth.'],
  'js-flatten': ['💡 Recurse: for each element, if it\'s an array call flatten(element), otherwise push it.'],
  'ts-typed-greet': ['💡 Use template literals: `Hello, ${name}! Welcome to SynergySphere.`'],
  'ts-generic-identity': ['💡 Simply return the value — the type parameter T handles the typing.'],
  'ts-interface-area': ['💡 For Rectangle, area = width * height.'],
  'ts-union-types': ['💡 Use typeof value === "number" to branch between the two types.', '💡 For string use toUpperCase(), for number prepend "$".'],
  'ts-tuple-swap': ['💡 Destructure the tuple: const [a, b] = tuple; then return [b, a].'],
  'py-hello-world': ['💡 return "Hello, SynergySphere!" — note the exact capitalisation.'],
  'py-list-sum': ['💡 Initialise total=0, loop through numbers, add each. Return total.'],
  'py-fizzbuzz': ['💡 Check n % 3 == 0 and n % 5 == 0 together first.', '💡 Use str(n) to convert the number for the else case.'],
  'py-palindrome': ['💡 Compare s.lower() == s.lower()[::-1] using slicing.'],
  'py-count-vowels': ['💡 Create a set of vowels, iterate the string, count matches.'],
  'java-hello-world': ['💡 return "Hello, SynergySphere!"; — include the semicolon in Java.'],
  'java-factorial': ['💡 Initialise result=1L, loop from 2 to n, multiply result *= i.'],
  'java-reverse-string': ['💡 Loop from end to start: char[] chars = s.toCharArray(); reverse manually.'],
  'java-is-prime': ['💡 n < 2 is not prime. Check divisors from 2 to Math.sqrt(n).'],
  'java-fizzbuzz': ['💡 Chain if / else if checks. Return String.valueOf(n) at the end.'],
  'cpp-hello-world': ['💡 return "Hello, SynergySphere!"; — note exact spelling.'],
  'cpp-factorial': ['💡 long long result = 1; for(int i=2;i<=n;i++) result *= i; return result;'],
  'cpp-max-element': ['💡 Initialise max to nums[0], then iterate comparing each element.'],
  'cpp-is-palindrome': ['💡 Use two pointers: one from start, one from end, compare inward.'],
  'cpp-bubble-sort': ['💡 Nested loops: outer n-1 passes, inner compares adjacent and swaps if out of order.'],
  'cs-hello-world': ['💡 return "Hello, SynergySphere!"; — note capitalisation.'],
  'cs-fibonacci': ['💡 if(n<=1) return n; Use int a=0, b=1; swap in a loop.'],
  'cs-reverse-string': ['💡 Convert to char array, use two pointers to swap from outside in.'],
  'cs-count-words': ['💡 Use s.Trim().Split(new char[]{\' \'}, StringSplitOptions.RemoveEmptyEntries).Length'],
  'cs-is-anagram': ['💡 Sort both strings as char arrays and compare, or use a frequency dictionary.'],
  'sql-top-students': ['💡 Use WHERE gpa > 3.5 — GPA is a floating-point field.'],
  'sql-count-records': ['💡 Use COUNT(*) to count all rows. Alias with AS total_users.'],
  'sql-average-salary': ['💡 GROUP BY department, then HAVING AVG(salary) > 50000.'],
  'sql-join-orders': ['💡 INNER JOIN customers c ON o.customer_id = c.id, then WHERE o.total_amount > 100.'],
  'sql-top-n': ['💡 ORDER BY salary DESC LIMIT 5 — DESC for highest first.'],
  'sql-duplicate-emails': ['💡 GROUP BY email HAVING COUNT(*) > 1.'],
  'html-heading-paragraph': ['💡 <h1>SynergySphere</h1> followed by <p>Learn. Build. Impact.</p>'],
  'html-form': ['💡 Use <input type="email" required> and <input type="password" required> inside the <form>.'],
  'html-nav': ['💡 <ul> inside <nav>, each link in an <li><a href="...">...</a></li>.'],
  'html-table': ['💡 Use <thead><tr><th> for headers and <tbody><tr><td> for data rows.'],
  'css-center-div': ['💡 On .container: display:flex; justify-content:center; align-items:center;'],
  'css-style-button': ['💡 Don\'t forget cursor:pointer; and the :hover rule for the darker shade.'],
  'css-grid-layout': ['💡 display:grid; grid-template-columns: repeat(3,1fr); gap:16px;'],
  'css-card': ['💡 box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: box-shadow 0.2s ease;'],
  'react-hello-component': ['💡 Destructure the prop: function Greeting({ name }) { return <h1>Hello, {name}!</h1>; }'],
  'react-counter': ['💡 const [count, setCount] = useState(0); buttons call setCount(c => c+1) and setCount(c => c-1).'],
  'react-list-render': ['💡 Use items.map((item, i) => <li key={i}>{item}</li>); inside a <ul>.'],
  'react-toggle': ['💡 const [on, setOn] = useState(false); <button onClick={() => setOn(v => !v)}> renders "ON"/"OFF".'],
  'react-fetch-data': ['💡 useEffect(() => { fetch(url).then(r => r.json()).then(setUser); }, []); show loading state.'],
  'node-http-server': ['💡 res.writeHead(200); res.end("Hello from SynergySphere!");'],
  'node-read-json': ['💡 Wrap JSON.parse in try/catch and return null in the catch block.'],
  'node-async-await': ['💡 try { const data = await fs.promises.readFile(path, "utf8"); return JSON.parse(data); } catch { return null; }'],
  'node-filter-users': ['💡 return users.filter(u => u.active === true);'],
  'node-event-emitter': ['💡 publish: this.emit(event, data); subscribe: this.on(event, handler);'],
};

/* ─────────────────────────── helpers ─────────────────────────── */

function deepEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function runLocalTests(code: string, challengeId: string): TestResult[] {
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
      const got = fn(...(tc.args as unknown[]));
      const passed = deepEqual(got, tc.expected);
      return { label: tc.label, passed, expected: tc.expected, got };
    } catch (e) {
      return { label: tc.label, passed: false, expected: tc.expected, got: undefined, error: (e as Error).message };
    }
  });
}

const difficultyColor: Record<string, string> = {
  EASY: 'border-green-400/30 bg-green-400/10 text-green-300',
  MEDIUM: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  HARD: 'border-red-400/30 bg-red-400/10 text-red-300',
};

function isLocallyRunnable(challenge: Challenge): boolean {
  return !!challengeTests[challenge.id] && (challenge.language === 'JavaScript' || challenge.language === 'TypeScript');
}

const CHALLENGE_METADATA: Record<string, { approach: string; timeComplexity: string; spaceComplexity: string }> = {
  'js-hello-world': {
    approach: 'Declare function greet() and return string literal "Hello, SynergySphere!".',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'js-sum-array': {
    approach: 'Accumulate array numbers with arr.reduce((acc, curr) => acc + curr, 0) or for..of loop.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'js-palindrome': {
    approach: 'Two-pointer approach or reverse comparison: str === str.split("").reverse().join("").',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'js-two-sum': {
    approach: 'One-Pass Hash Map: Store seen values. For each num, check map.has(target - num) in O(1).',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'js-fizzbuzz': {
    approach: 'Branch with modulo %: check 15 (both 3 and 5) first, then 3, then 5, else return n.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'js-binary-search': {
    approach: 'Two pointers low and high. Halve search range each iteration using mid index.',
    timeComplexity: 'O(log N)',
    spaceComplexity: 'O(1)',
  },
  'js-valid-parentheses': {
    approach: 'Stack: push opening brackets, pop and verify matching closing bracket.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'js-longest-substring': {
    approach: 'Sliding window technique maintaining character index map to avoid repeating characters.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(min(N, M))',
  },
  'js-fibonacci': {
    approach: 'Iterative calculation storing previous two terms to prevent exponential stack overflow.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'js-merge-sorted': {
    approach: 'Two-pointer merge traversing both arrays in order.',
    timeComplexity: 'O(N + M)',
    spaceComplexity: 'O(N + M)',
  },
  'js-max-depth': {
    approach: 'Recursive depth calculation for nested arrays.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(D)',
  },
  'js-flatten': {
    approach: 'Recursively flatten nested array elements into a single 1D array.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'ts-typed-greet': {
    approach: 'Return formatted greeting string using template literals with explicit string parameter.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'ts-generic-identity': {
    approach: 'Preserve input type using generic type parameter T and return value unchanged.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'ts-interface-area': {
    approach: 'Implement Shape interface in Rectangle class with width * height calculation.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'ts-union-types': {
    approach: 'Use typeof narrowing to branch between number ($) and string (.toUpperCase()).',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'ts-tuple-swap': {
    approach: 'Destructure tuple [a, b] and return [b, a] with swapped types.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'py-hello-world': {
    approach: 'Return the greeting string literal.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'py-list-sum': {
    approach: 'Accumulate sum of elements using a for loop.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'py-fizzbuzz': {
    approach: 'Check divisibility by 15 first, then 3, then 5, else string of n.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'py-palindrome': {
    approach: 'Compare lowercase string with its reverse s[::-1].',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'py-count-vowels': {
    approach: 'Iterate characters in string and test membership in vowel set.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'java-hello-world': {
    approach: 'Return greeting string literal from greet method.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'java-factorial': {
    approach: 'Iterative multiplication from 2 to n using long accumulator.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'java-reverse-string': {
    approach: 'Two-pointer swap or reverse traversal over character array.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'java-is-prime': {
    approach: 'Trial division checking factors up to sqrt(n).',
    timeComplexity: 'O(√N)',
    spaceComplexity: 'O(1)',
  },
  'java-fizzbuzz': {
    approach: 'Branch with modulo checks starting with 15.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'cpp-hello-world': {
    approach: 'Return std::string literal.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'cpp-factorial': {
    approach: 'Iterative loop multiplying numbers up to n.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'cpp-max-element': {
    approach: 'Single pass finding maximum element in vector.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'cpp-is-palindrome': {
    approach: 'Two pointers from start and end comparing characters inward.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'cpp-bubble-sort': {
    approach: 'Compare adjacent elements and swap if out of order across passes.',
    timeComplexity: 'O(N²)',
    spaceComplexity: 'O(1)',
  },
  'cs-hello-world': {
    approach: 'Return greeting string literal from Greet method.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'cs-fibonacci': {
    approach: 'Iterative addition using two tracking variables.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'cs-reverse-string': {
    approach: 'Reverse character array in-place or traverse backwards.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'cs-count-words': {
    approach: 'Split string by whitespace omitting empty entries and return length.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'cs-is-anagram': {
    approach: 'Sort character arrays or compare character frequency dictionaries.',
    timeComplexity: 'O(N log N)',
    spaceComplexity: 'O(N)',
  },
  'sql-top-students': {
    approach: 'Filter rows with WHERE gpa > 3.5.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'sql-count-records': {
    approach: 'Aggregate table row count using COUNT(*).',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
  },
  'sql-average-salary': {
    approach: 'Group rows by department and filter aggregated groups with HAVING AVG(salary) > 50000.',
    timeComplexity: 'O(N log N)',
    spaceComplexity: 'O(D)',
  },
  'sql-join-orders': {
    approach: 'INNER JOIN orders and customers on customer_id, filter total_amount > 100.',
    timeComplexity: 'O(N + M)',
    spaceComplexity: 'O(N)',
  },
  'sql-top-n': {
    approach: 'Sort by salary descending and limit output to 5.',
    timeComplexity: 'O(N log N)',
    spaceComplexity: 'O(1)',
  },
  'sql-duplicate-emails': {
    approach: 'GROUP BY email HAVING COUNT(*) > 1.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(U)',
  },
  'html-heading-paragraph': {
    approach: 'Semantic <h1> heading and <p> paragraph tags.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'html-form': {
    approach: 'Form element with email and password inputs and submit button.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'html-nav': {
    approach: 'Nav wrapper enclosing unordered list of anchor links.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'html-table': {
    approach: 'Table with thead, tr, th headers and tbody, tr, td data rows.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'css-center-div': {
    approach: 'Flexbox centering: display: flex, justify-content: center, align-items: center.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'css-style-button': {
    approach: 'CSS background, padding, border-radius, cursor pointer, and :hover state.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'css-grid-layout': {
    approach: 'CSS Grid with 3 repeat(3, 1fr) columns and gap.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'css-card': {
    approach: 'Card padding, box-shadow, and hover transition elevation.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'react-hello-component': {
    approach: 'Functional component accepting name prop and rendering <h1>.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'react-counter': {
    approach: 'useState hook tracking count integer with increment/decrement handlers.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'react-list-render': {
    approach: 'Array.map returning <li> items with unique key attributes.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'react-toggle': {
    approach: 'useState boolean toggle flipping state on button click.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'react-fetch-data': {
    approach: 'useEffect hook fetching JSON API data on mount and updating state.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'node-http-server': {
    approach: 'http.createServer returning 200 OK and text payload.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  'node-read-json': {
    approach: 'JSON.parse with try/catch returning parsed object or null.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'node-async-await': {
    approach: 'fs.promises.readFile with await and JSON parsing in try/catch.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'node-filter-users': {
    approach: 'Array.filter returning items where active === true.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
  },
  'node-event-emitter': {
    approach: 'Inherit EventEmitter and expose publish (emit) and subscribe (on).',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
  },
};

export function getRealtimeHint(currentCode: string, challenge: Challenge | null): RealtimeHintAnalysis | null {
  if (!challenge) return null;
  const raw = currentCode.trim();
  const isStarter = !raw || raw === (challenge.starterCode || '').trim();

  const title = challenge.title.toLowerCase();
  const lang = (challenge.language || '').toLowerCase();
  const hasFunction = /function|def |class |=>|\bSELECT\b/i.test(raw);
  const hasReturn = /\breturn\b|\bSELECT\b/i.test(raw);

  let hintMsg = '';
  let logicPassed = false;

  if (lang.includes('sql') || title.includes('sql') || title.includes('query') || title.includes('salary') || title.includes('student') || title.includes('user') || title.includes('order')) {
    const hasSelect = /\bselect\b/i.test(raw);
    const hasFrom = /\bfrom\b/i.test(raw);
    const hasWhere = /\bwhere\b/i.test(raw);
    const hasGroupBy = /\bgroup by\b/i.test(raw);
    const hasHaving = /\bhaving\b/i.test(raw);
    const hasOrderBy = /\border by\b/i.test(raw);
    const hasJoin = /\bjoin\b/i.test(raw);

    if (!hasSelect || !hasFrom) {
      hintMsg = '💡 SQL Syntax: Start with SELECT desired columns FROM target_table.';
    } else if (title.includes('average') || title.includes('dept') || title.includes('salary')) {
      if (!hasGroupBy) {
        hintMsg = '💡 GeeksforGeeks SQL Rule: Use GROUP BY department to aggregate records per department.';
      } else if (!hasHaving) {
        hintMsg = '💡 GeeksforGeeks SQL Rule: Use HAVING AVG(salary) > 50000 to filter aggregated groups.';
      } else {
        hintMsg = '✓ Optimal SQL Aggregation structure detected! Ready to test.';
        logicPassed = true;
      }
    } else if (title.includes('join') || title.includes('order')) {
      if (!hasJoin) {
        hintMsg = '💡 GeeksforGeeks SQL Pattern: Join orders with customers on o.customer_id = c.id.';
      } else {
        hintMsg = '✓ SQL JOIN query detected! Check WHERE total_amount > 100.';
        logicPassed = true;
      }
    } else if (title.includes('top') && (title.includes('5') || title.includes('salary'))) {
      if (!hasOrderBy) {
        hintMsg = '💡 SQL Sorting: Use ORDER BY salary DESC to rank highest salaries first.';
      } else {
        hintMsg = '✓ ORDER BY detected! Add LIMIT 5 to return top 5 employees.';
        logicPassed = true;
      }
    } else {
      hintMsg = hasWhere ? '✓ Filter condition detected! Ready to test query.' : '💡 Add a WHERE clause to filter required rows.';
      logicPassed = hasWhere;
    }
  } else if (title.includes('two sum')) {
    const hasMap = /map|dict|\{\}/i.test(raw);
    const hasNestedLoop = /(for|while)[\s\S]+(for|while)/i.test(raw);
    if (hasNestedLoop) {
      hintMsg = '💡 GeeksforGeeks Optimization Tip: A nested loop runs in O(N²) time. You can optimize to O(N) by using a Map/Dictionary to store seen complements!';
    } else if (hasMap || /complement|target\s*-\s*/i.test(raw)) {
      hintMsg = '✓ Hash Map complement approach detected! Verify you return the indices [index1, index2].';
      logicPassed = true;
    } else {
      hintMsg = '💡 GeeksforGeeks Hint: Calculate complement = target - num for each element and check if it was seen before.';
    }
  } else if (title.includes('binary search')) {
    const hasLowHigh = /low|high|left|right/i.test(raw);
    const hasMid = /mid/i.test(raw);
    if (!hasLowHigh) {
      hintMsg = '💡 GeeksforGeeks Invariant: Initialize two pointers low = 0 and high = length - 1.';
    } else if (!hasMid) {
      hintMsg = '💡 Midpoint Formula: Compute mid = low + Math.floor((high - low) / 2) inside your while (low <= high) loop.';
    } else {
      hintMsg = '✓ Binary Search invariant detected! Adjust low = mid + 1 when target is greater, high = mid - 1 when target is smaller.';
      logicPassed = true;
    }
  } else if (title.includes('palindrome')) {
    const hasReverse = /reverse|split|::/i.test(raw);
    const hasPointers = /left|right|while/i.test(raw);
    if (hasReverse || hasPointers) {
      hintMsg = '✓ Palindrome verification approach detected! Ensure clean boolean return.';
      logicPassed = true;
    } else {
      hintMsg = '💡 GeeksforGeeks Hint: Check if characters from the outside inward match, or reverse the string and compare equality.';
    }
  } else if (title.includes('reverse')) {
    if (/reverse|split|pop|join|::/i.test(raw) || /(for|while)/i.test(raw)) {
      hintMsg = '✓ String reversal logic detected! Verify your return statement.';
      logicPassed = true;
    } else {
      hintMsg = '💡 GeeksforGeeks Hint: Reverse by swapping with two pointers or slicing/reversing array elements.';
    }
  } else if (title.includes('fizzbuzz')) {
    const hasModulo = /%/i.test(raw);
    const has15 = /15/i.test(raw) || (/% 3/i.test(raw) && /% 5/i.test(raw));
    if (!hasModulo) {
      hintMsg = '💡 GeeksforGeeks Hint: Use the modulo operator (%) to test divisibility by 3, 5, and 15.';
    } else if (!has15) {
      hintMsg = '⚠️ Precedence Rule: Check divisibility by both 3 and 5 (or 15) FIRST before checking 3 or 5 individually.';
    } else {
      hintMsg = '✓ Modulo divisibility branches detected! Ready to test.';
      logicPassed = true;
    }
  } else if (title.includes('parentheses') || title.includes('bracket')) {
    const hasStack = /stack|push|pop/i.test(raw);
    if (!hasStack) {
      hintMsg = '💡 GeeksforGeeks Stack Pattern: Use a stack to push opening brackets and pop when matched.';
    } else {
      hintMsg = '✓ Stack matching approach detected! Remember to check if stack is empty at the end.';
      logicPassed = true;
    }
  } else if (title.includes('prime')) {
    const hasSqrt = /sqrt|i\s*\*\s*i/i.test(raw);
    const hasModulo = /%/i.test(raw);
    if (!hasModulo) {
      hintMsg = '💡 GeeksforGeeks Math: A number is prime if it has no divisors other than 1 and itself. Use n % i === 0.';
    } else if (!hasSqrt) {
      hintMsg = '💡 GeeksforGeeks Optimization: Only test divisors up to sqrt(n) for O(√N) complexity instead of O(N).';
    } else {
      hintMsg = '✓ Optimized prime divisor loop detected! Remember to handle n <= 1.';
      logicPassed = true;
    }
  } else if (title.includes('factorial')) {
    const hasLoop = /for|while/i.test(raw);
    if (!hasLoop && !/factorial\(/i.test(raw)) {
      hintMsg = '💡 GeeksforGeeks Rule: Initialize result = 1 and loop from 2 to n multiplying result *= i.';
    } else {
      hintMsg = '✓ Factorial accumulation detected! Verify base case for n = 0 or 1 returns 1.';
      logicPassed = true;
    }
  } else {
    hintMsg = hasReturn ? '✓ Return statement detected! Run tests to verify correctness.' : '💡 Implement the function logic and ensure it returns the computed result.';
    logicPassed = hasReturn;
  }

  const checks = [
    { label: 'Function signature defined', passed: hasFunction },
    { label: 'Return / Output present', passed: hasReturn },
    { label: 'Algorithmic logic matching criteria', passed: logicPassed },
  ];

  const allPassed = checks.every((c) => c.passed);
  const metadata = CHALLENGE_METADATA[challenge.id];
  const approachStep = challenge.approach || metadata?.approach || 'Deconstruct the problem into parameters, boundary checks, and expected output.';

  if (isStarter) {
    return {
      statusBadge: 'Getting Started',
      badgeTone: 'info',
      message: '💡 Step 1: Read the problem constraints and write your solution inside the function stub.',
      approachStep,
      checks,
    };
  }

  return {
    statusBadge: allPassed ? 'Ready to Test' : hasFunction ? 'Logic in Progress' : 'Drafting Code',
    badgeTone: allPassed ? 'success' : 'info',
    message: hintMsg,
    approachStep: challenge.approach || metadata?.approach || challenge.hint || 'Satisfy all unit test assertions.',
    checks,
  };
}

/* ─────────────────────────── component ─────────────────────────── */

interface CodingChallengesSectionProps {
  showHeading?: boolean;
}

export function CodingChallengesSection({ showHeading = true }: CodingChallengesSectionProps) {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>(fallbackChallenges);
  const [selected, setSelected] = useState<Challenge | null>(fallbackChallenges[0]);
  const [code, setCode] = useState(fallbackChallenges[0].starterCode || '');
  const [showSolution, setShowSolution] = useState(false);
  const [solutionToast, setSolutionToast] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [submitResult, setSubmitResult] = useState<{ passed: boolean; xpEarned: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');

  // Filters
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [languageFilter, setLanguageFilter] = useState('All');

  // AI hints
  const [hintIndex, setHintIndex] = useState(0);
  const [aiHint, setAiHint] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api<Challenge[]>('/challenges')
      .then((items) => {
        if (items.length) {
          setChallenges([...items, ...fallbackChallenges.filter((f) => !items.find((i) => i.id === f.id))]);
        }
      })
      .catch(() => {
        setPageError('Running offline — showing all built-in challenges. JavaScript challenges run fully in-browser.');
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

  function handleSelectLanguage(lang: string) {
    setLanguageFilter(lang);
    const matches = challenges.filter((c) => {
      const langMatch = lang === 'All' || (c.language || '').toLowerCase() === lang.toLowerCase();
      const diffMatch = difficultyFilter === 'All' || c.difficulty.toUpperCase() === difficultyFilter.toUpperCase();
      return langMatch && diffMatch;
    });
    if (matches.length > 0) {
      selectChallenge(matches[0]);
    } else {
      const langOnly = challenges.filter((c) => (c.language || '').toLowerCase() === lang.toLowerCase());
      if (langOnly.length > 0) {
        setDifficultyFilter('All');
        selectChallenge(langOnly[0]);
      } else {
        setSelected(null);
        setCode('');
        setTestResults([]);
        setSubmitResult(null);
      }
    }
  }

  function handleSelectDifficulty(diff: string) {
    setDifficultyFilter(diff);
    const matches = challenges.filter((c) => {
      const langMatch = languageFilter === 'All' || (c.language || '').toLowerCase() === languageFilter.toLowerCase();
      const diffMatch = diff === 'All' || c.difficulty.toUpperCase() === diff.toUpperCase();
      return langMatch && diffMatch;
    });
    if (matches.length > 0) {
      selectChallenge(matches[0]);
    }
  }

  function resetFilters() {
    setLanguageFilter('All');
    setDifficultyFilter('All');
    if (challenges.length > 0) {
      selectChallenge(challenges[0]);
    }
  }

  // Combined filter: language + difficulty
  const filteredChallenges = challenges.filter((c) => {
    const langMatch = languageFilter === 'All' || c.language === languageFilter;
    const diffMatch = difficultyFilter === 'All' || c.difficulty === difficultyFilter.toUpperCase();
    return langMatch && diffMatch;
  });

  // Keep selection synchronized if current selection doesn't match active filters
  useEffect(() => {
    const isCurrentValid =
      selected !== null &&
      (languageFilter === 'All' || selected.language === languageFilter) &&
      (difficultyFilter === 'All' || selected.difficulty === difficultyFilter.toUpperCase());

    if (!isCurrentValid && filteredChallenges.length > 0) {
      selectChallenge(filteredChallenges[0]);
    } else if (filteredChallenges.length === 0 && selected !== null) {
      setSelected(null);
      setCode('');
      setTestResults([]);
      setSubmitResult(null);
    }
  }, [languageFilter, difficultyFilter, challenges, filteredChallenges, selected]);

  async function handleRun() {
    if (!selected) return;
    setRunning(true);
    setSubmitResult(null);
    setTestResults([]);

    if (isLocallyRunnable(selected)) {
      setTimeout(() => {
        const results = runLocalTests(code, selected.id);
        setTestResults(results);
        setRunning(false);
      }, 50);
      return;
    }

    // Backend execution for non-JS / non-TS languages
    try {
      const res = await api<{ passed: boolean; output: string; error?: string }>(
        `/challenges/${selected.id}/test`,
        { method: 'POST', body: JSON.stringify({ code, language: selected.language }) }
      );
      setTestResults([{
        label: `${selected.language} — Run Verification`,
        passed: res.passed,
        expected: 'Correct output',
        got: res.output || (res.passed ? 'Success' : 'Incorrect output'),
        error: res.error,
      }]);
    } catch {
      // Graceful offline mode for non-JS languages
      setTestResults([{
        label: `${selected.language} — Backend required`,
        passed: false,
        expected: 'Server execution',
        got: 'Not connected',
        error: `${selected.language} code needs the backend server to run. Make sure the backend is online and try again, or click Submit to validate.`,
      }]);
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setSubmitResult(null);

    if (isLocallyRunnable(selected)) {
      const localResults = runLocalTests(code, selected.id);
      setTestResults(localResults);
    }

    try {
      const res = await api<{
        passed: boolean;
        xpEarned: number;
        testResults?: Array<{ label: string; passed: boolean; error?: string; expected?: any; got?: any }>;
        output?: string;
      }>(
        `/challenges/${selected.id}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            code,
            language: selected.language,
          }),
        }
      );

      if (res.testResults && res.testResults.length > 0) {
        setTestResults(
          res.testResults.map((r) => ({
            label: r.label,
            passed: r.passed,
            expected: r.expected,
            got: r.got,
            error: r.error,
          }))
        );
      } else if (!isLocallyRunnable(selected)) {
        setTestResults([
          {
            label: `${selected.language} — Server Judge`,
            passed: res.passed,
            expected: 'All server tests pass',
            got: res.output || (res.passed ? 'Accepted ✓' : 'Failed test verification'),
          },
        ]);
      }

      setSubmitResult({ passed: res.passed, xpEarned: res.xpEarned });
    } catch (err: any) {
      setSubmitResult({ passed: false, xpEarned: 0 });
      setPageError(err?.message || 'Submission failed. The server judge could not be contacted.');
    } finally {
      setSubmitting(false);
    }
  }

  async function getAiHint() {
    if (!selected) return;
    setHintLoading(true);
    setShowHints(true);
    const staticHints = challengeHints[selected.id] || [];
    try {
      const prompt = `I am working on this ${selected.language} coding challenge — "${selected.title}": ${selected.description}\n\nMy current code:\n${code}\n\nGive me ONE specific hint (1-2 sentences) without giving the full solution.`;
      const res = await api<{ response: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: prompt }),
      });
      setAiHint(res.response);
    } catch {
      const hint = staticHints[hintIndex % (staticHints.length || 1)] || 'Think about the algorithm complexity and whether a built-in data structure could help.';
      setAiHint(hint);
      setHintIndex((prev) => prev + 1);
    } finally {
      setHintLoading(false);
    }
  }

  function resetCode() {
    if (!selected) return;
    setCode(selected.starterCode || '');
    setTestResults([]);
    setSubmitResult(null);
  }

  // Counts per language for badges
  const langCounts = ALL_LANGUAGES.reduce<Record<string, number>>((acc, lang) => {
    acc[lang] = lang === 'All' ? challenges.length : challenges.filter((c) => c.language === lang).length;
    return acc;
  }, {});

  const allPassed = testResults.length > 0 && testResults.every((r) => r.passed);
  const passedCount = testResults.filter((r) => r.passed).length;
  const localTestCases = selected ? (challengeTests[selected.id]?.cases || []) : [];
  const langColor = selected ? (LANGUAGE_COLORS[selected.language || ''] || 'border-white/[0.08] bg-secondary/50 text-muted-foreground') : '';
  const canRunLocally = selected ? isLocallyRunnable(selected) : false;
  const realtimeHint = selected ? getRealtimeHint(code, selected) : null;
  const metadata = selected ? CHALLENGE_METADATA[selected.id] : null;
  const approach = selected?.approach || metadata?.approach;
  const timeComplexity = selected?.timeComplexity || metadata?.timeComplexity;
  const spaceComplexity = selected?.spaceComplexity || metadata?.spaceComplexity;

  // Questions scoped to the currently active language (and difficulty filter if set) for Challenge Studio navigation
  const studioQuestions = (() => {
    const activeLang = languageFilter !== 'All' ? languageFilter : (selected?.language || 'JavaScript');
    const langScoped = challenges.filter((c) => {
      const langMatch = (c.language || '').toLowerCase() === activeLang.toLowerCase();
      const diffMatch = difficultyFilter === 'All' || c.difficulty.toUpperCase() === difficultyFilter.toUpperCase();
      return langMatch && diffMatch;
    });
    return langScoped.length > 0 ? langScoped : filteredChallenges;
  })();

  const currentQuestionIndex = selected
    ? Math.max(0, studioQuestions.findIndex((c) => c.id === selected.id))
    : 0;

  function goToPrevQuestion() {
    if (studioQuestions.length === 0) return;
    const prevIdx = (currentQuestionIndex - 1 + studioQuestions.length) % studioQuestions.length;
    selectChallenge(studioQuestions[prevIdx]);
  }

  function goToNextQuestion() {
    if (studioQuestions.length === 0) return;
    const nextIdx = (currentQuestionIndex + 1) % studioQuestions.length;
    selectChallenge(studioQuestions[nextIdx]);
  }

  return (
    <div>
      {/* ── Header & Filters ── */}
      {showHeading && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Coding Challenges</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Interactive Coding Practice</h1>
          <p className="text-sm text-muted-foreground">
            Practice across all 11 Learning Hub languages. JavaScript &amp; TypeScript run in your browser — all others verified server-side.
          </p>
        </div>
      )}

      {/* Language tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {ALL_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => handleSelectLanguage(lang)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              languageFilter === lang
                ? (LANGUAGE_COLORS[lang] || 'border-primary/50 bg-primary/15 text-primary')
                : 'border-white/[0.07] bg-secondary/40 text-muted-foreground hover:text-white'
            }`}
          >
            {lang}
            <span className="rounded bg-white/10 px-1 text-[10px]">{langCounts[lang]}</span>
          </button>
        ))}
      </div>

      {/* Difficulty filter */}
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Difficulty:</span>
        {['All', 'Easy', 'Medium', 'Hard'].map((f) => (
          <button
            key={f}
            onClick={() => handleSelectDifficulty(f)}
            className={`rounded-md border px-2.5 py-1 text-xs transition ${
              difficultyFilter === f
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-white/[0.07] bg-secondary/40 text-muted-foreground hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
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
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Challenges
              </span>
              <span className="text-xs font-normal text-muted-foreground">{filteredChallenges.length} shown</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
            {filteredChallenges.map((challenge) => (
              <button
                key={challenge.id}
                onClick={() => selectChallenge(challenge)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selected?.id === challenge.id
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-white/[0.07] bg-secondary/35 hover:border-primary/25'
                }`}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white leading-tight">{challenge.title}</p>
                  <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${difficultyColor[challenge.difficulty]}`}>
                    {challenge.difficulty}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{challenge.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${LANGUAGE_COLORS[challenge.language || ''] || 'text-muted-foreground'}`}>
                    {challenge.language}
                  </span>
                  <span className="text-[11px] text-primary">+{challenge.xpReward} XP</span>
                </div>
              </button>
            ))}
            {filteredChallenges.length === 0 && (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  No challenges match {languageFilter !== 'All' ? languageFilter : ''} ({difficultyFilter} difficulty).
                </p>
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Code editor / Studio ── */}
        {!selected ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <Trophy className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold text-white">No Challenge Selected</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              No challenge matches your current filters ({languageFilter}, {difficultyFilter}). Click below to clear filters and view all challenges.
            </p>
            <Button onClick={resetFilters} variant="outline" size="sm" className="mt-4">
              Reset Filters
            </Button>
          </Card>
        ) : (
          <Card>
            <CardHeader className="space-y-3 pb-3">
              {/* Challenge Studio Question Switcher & Prev/Next Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-secondary/40 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary shrink-0">
                    Challenge Studio
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">•</span>
                  <span className="text-xs font-semibold text-white shrink-0">
                    Question {currentQuestionIndex + 1} of {studioQuestions.length} ({selected.language || 'JavaScript'})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={goToPrevQuestion}
                    disabled={studioQuestions.length <= 1}
                    className="flex items-center gap-1 rounded-md border border-white/[0.1] bg-black/40 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-primary/40 hover:text-white disabled:opacity-40"
                    title="Previous question in this language"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <select
                    aria-label="Change question in Challenge Studio"
                    value={selected.id}
                    onChange={(e) => {
                      const nextQ = studioQuestions.find((q) => q.id === e.target.value);
                      if (nextQ) selectChallenge(nextQ);
                    }}
                    className="max-w-[210px] truncate rounded-md border border-white/[0.1] bg-[#050a0d] px-2 py-1 text-xs text-white outline-none focus:border-primary"
                  >
                    {studioQuestions.map((q, idx) => (
                      <option key={q.id} value={q.id} className="bg-[#050a0d] text-white">
                        {idx + 1}. {q.title} ({q.difficulty})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={goToNextQuestion}
                    disabled={studioQuestions.length <= 1}
                    className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-40"
                    title="Next question in this language"
                  >
                    Next Question
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base">{selected.title}</CardTitle>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{selected.description}</p>
                </div>
                <div className="ml-3 flex shrink-0 flex-col items-end gap-1.5">
                  <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${langColor}`}>
                    {selected.language || 'JavaScript'}
                  </span>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${difficultyColor[selected.difficulty]}`}>
                    {selected.difficulty}
                  </span>
                  {canRunLocally && (
                    <span className="rounded bg-green-400/10 px-1.5 py-0.5 text-[10px] text-green-400">⚡ In-browser</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <LiveCodeRoomBar
                challengeId={selected.id}
                language={selected.language}
                code={code}
                onRemoteCodeChange={(nextCode) => setCode(nextCode)}
              />
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-[300px] w-full resize-none rounded-lg border border-white/[0.08] bg-[#050a0d] p-4 font-mono text-sm leading-6 text-green-100 outline-none focus:ring-2 focus:ring-primary/30"
                  spellCheck={false}
                  placeholder={`Write your ${selected.language || 'code'} here…`}
                />
                <button
                  onClick={resetCode}
                  title="Reset to starter code"
                  className="absolute right-3 top-3 rounded-md border border-white/[0.08] bg-secondary/60 p-1.5 text-muted-foreground transition hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* GeeksforGeeks Live Studio Hint & Feedback */}
              {realtimeHint && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-white">GeeksforGeeks Live Studio Hint</span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        realtimeHint.badgeTone === 'success'
                          ? 'border border-green-400/30 bg-green-400/20 text-green-300'
                          : 'border border-primary/30 bg-primary/20 text-primary'
                      }`}
                    >
                      {realtimeHint.statusBadge}
                    </span>
                  </div>

                  <p className="text-xs leading-5 text-slate-200">{realtimeHint.message}</p>

                  {/* Live Checklist */}
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {realtimeHint.checks.map((check, idx) => (
                      <span
                        key={idx}
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border ${
                          check.passed
                            ? 'border-green-400/30 bg-green-400/10 text-green-300'
                            : 'border-white/[0.08] bg-black/20 text-slate-400'
                        }`}
                      >
                        {check.passed ? '✓' : '○'} {check.label}
                      </span>
                    ))}
                  </div>

                  {/* GeeksforGeeks Algorithm Blueprint */}
                  {(approach || timeComplexity || spaceComplexity) && (
                    <div className="border-t border-white/[0.08] pt-2 text-[11px] text-muted-foreground space-y-1">
                      {approach && (
                        <p>
                          <span className="font-semibold text-slate-300">GeeksforGeeks Approach:</span> {approach}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-[10px]">
                        {timeComplexity && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="h-3 w-3 text-amber-400" /> Time: {timeComplexity}
                          </span>
                        )}
                        {spaceComplexity && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Cpu className="h-3 w-3 text-blue-400" /> Space: {spaceComplexity}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleRun} disabled={running || submitting} className="gap-2">
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {running ? 'Running…' : canRunLocally ? 'Run Tests' : 'Test (Backend)'}
                </Button>
                <Button onClick={handleSubmit} disabled={running || submitting} variant="secondary" className="gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Submitting…' : 'Submit'}
                </Button>
                <Button
                  onClick={() => setShowSolution((prev) => !prev)}
                  variant="outline"
                  className="gap-1.5 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  {showSolution ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showSolution ? 'Hide Solution' : 'View Reference Solution'}
                </Button>
                <Button
                  type="button"
                  onClick={goToNextQuestion}
                  variant="outline"
                  className="gap-1 text-xs border-primary/30 text-primary hover:bg-primary/10"
                >
                  Next Question ({selected.language})
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                {submitResult && (
                  <div className={`flex items-center gap-2 text-sm ${submitResult.passed ? 'text-green-300' : 'text-red-300'}`}>
                    {submitResult.passed ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {submitResult.passed
                      ? `All tests passed! +${submitResult.xpEarned} XP earned`
                      : 'Incorrect — keep trying!'}
                  </div>
                )}
              </div>

              {/* Verified Reference Solution Box */}
              {showSolution && selected && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                      Verified Reference Solution ({selected.language})
                    </span>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                      onClick={() => {
                        const verifiedSol =
                          BUILTIN_CHALLENGES.find((b) => b.id === selected.id)?.solution ||
                          selected.solution ||
                          selected.starterCode;
                        if (verifiedSol) {
                          setCode(verifiedSol);
                          setSolutionToast('✓ Loaded reference solution into editor!');
                          setTimeout(() => setSolutionToast(''), 3000);
                        }
                      }}
                    >
                      Load into Editor
                    </Button>
                  </div>
                  {solutionToast && (
                    <p className="text-[11px] font-semibold text-emerald-400">{solutionToast}</p>
                  )}
                  <pre className="max-h-48 overflow-x-auto overflow-y-auto rounded bg-black/60 p-3 font-mono text-xs text-emerald-300">
                    {BUILTIN_CHALLENGES.find((b) => b.id === selected.id)?.solution || selected.solution || '// Reference solution not available'}
                  </pre>
                </div>
              )}

              {/* Stuck? Paste Challenge Studio code directly into AI Workspace Code Context & give insights */}
              <button
                type="button"
                onClick={() => {
                  const codeToSend = code.trim() || selected.starterCode || '';
                  const params = new URLSearchParams({
                    tab: 'codeContext',
                    challengeTitle: selected.title,
                    challengeDescription: selected.description,
                    language: selected.language || 'JavaScript',
                    code: codeToSend,
                    autoAsk: 'true',
                  });
                  router.push(`/ai-assistant?${params.toString()}`);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-primary/25 bg-primary/10 p-2.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Stuck? Paste Code to AI Code Context &amp; Get Insights
                </span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

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
                        <div className="mt-1 pl-4 font-sans text-muted-foreground">
                          {r.error ? (
                            <span className="text-red-400 text-[11px]">{r.error}</span>
                          ) : (
                            <>
                              <div className="text-[11px]">Expected: <span className="text-white">{JSON.stringify(r.expected)}</span></div>
                              <div className="text-[11px]">Got: <span className="text-white">{JSON.stringify(r.got)}</span></div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Progress bar */}
              {testResults.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className={allPassed ? 'text-green-300' : 'text-amber-300'}>{passedCount} / {testResults.length}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${allPassed ? 'bg-green-400' : 'bg-primary'}`}
                      style={{ width: `${testResults.length ? (passedCount / testResults.length) * 100 : 0}%` }}
                    />
                  </div>
                  {allPassed && (
                    <p className="text-xs text-green-300 font-semibold text-center">
                      🎉 All tests pass! Press Submit to claim +{selected.xpReward} XP.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Right panel ── */}
        <div className="space-y-4">
          {/* Test cases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Test Cases
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selected && canRunLocally && localTestCases.length > 0 ? (
                localTestCases.map((tc, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-2.5 font-mono text-xs ${
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
                    <div className="mt-1 pl-4 text-[10px] opacity-70">→ {JSON.stringify(tc.expected)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-white/[0.07] bg-secondary/30 p-3">
                  <p className="text-xs font-semibold text-white mb-1">
                    {selected ? `${selected.language} challenge` : 'Select a challenge'}
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {!selected
                      ? 'Choose a challenge from the list to view test cases and execution options.'
                      : canRunLocally
                      ? 'Click "Run Tests" to execute locally in your browser.'
                      : 'This challenge is verified server-side. Click "Test (Backend)" to check your solution, or click Submit to submit.'}
                  </p>
                </div>
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
                {selected
                  ? `Stuck? Get a ${selected.language}-specific hint without spoiling the answer.`
                  : 'Select a challenge to view guidance and hints.'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={getAiHint}
                disabled={hintLoading || !selected}
              >
                {hintLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
                {hintLoading ? 'Getting hint…' : 'Get AI Hint'}
              </Button>

              {showHints && aiHint && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground font-sans">
                  {aiHint}
                </div>
              )}

              {selected && (
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
                      {(challengeHints[selected.id] || ['💡 Break the problem into smaller steps and tackle each one individually.']).map((hint, i) => (
                        <p key={i} className="text-xs leading-5 text-muted-foreground">{hint}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Language info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Language Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selected ? (
                <>
                  <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${langColor}`}>
                    {selected.language}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {canRunLocally
                      ? '⚡ Runs instantly in-browser — no server needed.'
                      : '🖥️ Requires backend for execution. Make sure the backend is running.'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {challenges.filter((c) => c.language === selected.language).length} challenges available in {selected.language}.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Select a challenge above to see language and runtime details.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
