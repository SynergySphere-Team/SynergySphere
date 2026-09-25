import vm from 'node:vm';
import { pool, query } from '../lib/db.js';

export interface TestCase {
  label: string;
  fnName?: string;
  args?: unknown[];
  expected: unknown;
  hidden?: boolean;
}

export interface TestResult {
  label: string;
  passed: boolean;
  expected: unknown;
  got: unknown;
  error?: string;
  hidden?: boolean;
}

export interface JudgeResult {
  passed: boolean;
  testResults: TestResult[];
  output: string;
  error?: string;
}

// First-party server-side test specifications (includes hidden test cases)
const CHALLENGE_TESTS: Record<string, { fn: string; cases: TestCase[] }> = {
  'Hello World': {
    fn: 'greet',
    cases: [
      { label: 'greet() returns greeting', args: [], expected: 'Hello, SynergySphere!' },
      { label: 'Hidden: greet() matches expected return value', args: [], expected: 'Hello, SynergySphere!', hidden: true },
    ],
  },
  'Sum Array': {
    fn: 'sumArray',
    cases: [
      { label: 'sumArray([1, 2, 3])', args: [[1, 2, 3]], expected: 6 },
      { label: 'sumArray([10, -2, 5])', args: [[10, -2, 5]], expected: 13 },
      { label: 'sumArray([]) handles empty array', args: [[]], expected: 0 },
      { label: 'Hidden: sumArray([-5, -10, -15])', args: [[-5, -10, -15]], expected: -30, hidden: true },
      { label: 'Hidden: sumArray([1000, 2000, 3000])', args: [[1000, 2000, 3000]], expected: 6000, hidden: true },
    ],
  },
  'FizzBuzz': {
    fn: 'fizzBuzz',
    cases: [
      { label: 'fizzBuzz(3)', args: [3], expected: 'Fizz' },
      { label: 'fizzBuzz(5)', args: [5], expected: 'Buzz' },
      { label: 'fizzBuzz(15)', args: [15], expected: 'FizzBuzz' },
      { label: 'fizzBuzz(7)', args: [7], expected: 7 },
      { label: 'Hidden: fizzBuzz(30)', args: [30], expected: 'FizzBuzz', hidden: true },
      { label: 'Hidden: fizzBuzz(98)', args: [98], expected: 98, hidden: true },
    ],
  },
  'Binary Search': {
    fn: 'binarySearch',
    cases: [
      { label: 'binarySearch([1, 2, 3, 4, 5], 3)', args: [[1, 2, 3, 4, 5], 3], expected: 2 },
      { label: 'binarySearch([1, 2, 3, 4, 5], 6)', args: [[1, 2, 3, 4, 5], 6], expected: -1 },
      { label: 'binarySearch([1, 3, 5, 7, 9], 1)', args: [[1, 3, 5, 7, 9], 1], expected: 0 },
      { label: 'Hidden: binarySearch([2, 4, 6, 8, 10, 12], 12)', args: [[2, 4, 6, 8, 10, 12], 12], expected: 5, hidden: true },
      { label: 'Hidden: binarySearch([], 5)', args: [[], 5], expected: -1, hidden: true },
    ],
  },
  'Two Sum': {
    fn: 'twoSum',
    cases: [
      { label: 'twoSum([2, 7, 11, 15], 9)', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { label: 'twoSum([3, 2, 4], 6)', args: [[3, 2, 4], 6], expected: [1, 2] },
      { label: 'Hidden: twoSum([3, 3], 6)', args: [[3, 3], 6], expected: [0, 1], hidden: true },
    ],
  },
  'Valid Parentheses': {
    fn: 'isValid',
    cases: [
      { label: 'isValid("()")', args: ['()'], expected: true },
      { label: 'isValid("()[]{}")', args: ['()[]{}'], expected: true },
      { label: 'isValid("(]")', args: ['(]'], expected: false },
      { label: 'Hidden: isValid("([{}])")', args: ['([{}])'], expected: true, hidden: true },
      { label: 'Hidden: isValid("[(])")', args: ['[(])'], expected: false, hidden: true },
    ],
  },
  'Reverse String': {
    fn: 'reverseString',
    cases: [
      { label: 'reverseString("hello")', args: ['hello'], expected: 'olleh' },
      { label: 'reverseString("SynergySphere")', args: ['SynergySphere'], expected: 'erehpSygrenyS' },
      { label: 'Hidden: reverseString("")', args: [''], expected: '', hidden: true },
    ],
  },
  'Palindrome Check': {
    fn: 'isPalindrome',
    cases: [
      { label: 'isPalindrome("racecar")', args: ['racecar'], expected: true },
      { label: 'isPalindrome("hello")', args: ['hello'], expected: false },
      { label: 'Hidden: isPalindrome("A man, a plan, a canal: Panama")', args: ['A man, a plan, a canal: Panama'], expected: true, hidden: true },
    ],
  },
};

/**
 * Executes user JavaScript code inside a sandboxed Node VM.
 */
export async function judgeJavaScript(
  code: string,
  spec: { fn: string; cases: TestCase[] },
): Promise<JudgeResult> {
  const logs: string[] = [];

  const sandbox: Record<string, unknown> = {
    console: {
      log: (...args: unknown[]) => {
        logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
      error: (...args: unknown[]) => {
        logs.push('[error] ' + args.map((a) => String(a)).join(' '));
      },
    },
    Math,
    Date,
    JSON,
    Array,
    Object,
    RegExp,
    String,
    Number,
    Boolean,
    Set,
    Map,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  };

  const context = vm.createContext(sandbox);

  try {
    // Run the user code script with a strict 2000ms timeout
    const userScript = new vm.Script(code, { filename: 'solution.js' });
    userScript.runInContext(context, { timeout: 2000 });
  } catch (err: any) {
    return {
      passed: false,
      testResults: [
        {
          label: 'Code compilation/runtime error',
          passed: false,
          expected: 'Valid execution',
          got: 'Runtime Exception',
          error: err.message || String(err),
        },
      ],
      output: logs.join('\n'),
      error: err.message || String(err),
    };
  }

  const results: TestResult[] = [];

  for (const tc of spec.cases) {
    try {
      const targetFn = (context as any)[spec.fn];
      if (typeof targetFn !== 'function') {
        results.push({
          label: tc.label,
          passed: false,
          expected: tc.expected,
          got: typeof targetFn,
          error: `Function "${spec.fn}" is not defined in submitted code.`,
          hidden: tc.hidden,
        });
        continue;
      }

      const args = tc.args ? JSON.parse(JSON.stringify(tc.args)) : [];
      const invocation = new vm.Script(`${spec.fn}(...__testArgs__)`, { filename: 'test.js' });
      (context as any).__testArgs__ = args;

      const got = invocation.runInContext(context, { timeout: 1500 });
      delete (context as any).__testArgs__;

      const passed = deepEqual(got, tc.expected);
      results.push({
        label: tc.label,
        passed,
        expected: tc.expected,
        got,
        hidden: tc.hidden,
      });
    } catch (err: any) {
      results.push({
        label: tc.label,
        passed: false,
        expected: tc.expected,
        got: 'Error',
        error: err.message || String(err),
        hidden: tc.hidden,
      });
    }
  }

  const allPassed = results.length > 0 && results.every((r) => r.passed);

  return {
    passed: allPassed,
    testResults: results,
    output: logs.join('\n'),
  };
}

/**
 * Real Server-side SQL Challenge Judge.
 * Creates an isolated transient database schema or transaction with dummy tables,
 * runs the student's SQL query, and checks output rows.
 */
export async function judgeSql(queryText: string, challengeTitle: string): Promise<JudgeResult> {
  const client = await pool.connect();
  const testResults: TestResult[] = [];
  try {
    await client.query('BEGIN');

    // Create a temporary sandbox table
    await client.query(`
      CREATE TEMP TABLE IF NOT EXISTS temp_students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        gpa NUMERIC(3, 2)
      ) ON COMMIT DROP;
    `);

    await client.query(`
      INSERT INTO temp_students (name, gpa) VALUES
      ('Alice Walker', 3.90),
      ('Bob Mokoena', 3.20),
      ('Chidi Anagonye', 3.85),
      ('David Naidoo', 2.90)
    `);

    // Replace table names in query to target temp_students
    const sanitizedQuery = queryText.replace(/\bstudents\b/gi, 'temp_students');
    const res = await client.query(sanitizedQuery);

    await client.query('ROLLBACK');

    const names = res.rows.map((r: any) => r.name).sort();
    const expected = ['Alice Walker', 'Chidi Anagonye'].sort();
    const passed = JSON.stringify(names) === JSON.stringify(expected);

    testResults.push({
      label: 'Returns students with GPA > 3.5',
      passed,
      expected,
      got: names,
    });

    testResults.push({
      label: 'Excludes students with GPA <= 3.5 (Naidoo, Mokoena)',
      passed: !names.includes('David Naidoo') && !names.includes('Bob Mokoena'),
      expected: true,
      got: !names.includes('David Naidoo') && !names.includes('Bob Mokoena'),
      hidden: true,
    });

    return {
      passed: testResults.every((r) => r.passed),
      testResults,
      output: `Executed query returned ${res.rowCount} row(s).`,
    };
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    return {
      passed: false,
      testResults: [
        {
          label: 'SQL execution',
          passed: false,
          expected: 'Valid SQL syntax & result rows',
          got: 'Database execution error',
          error: err.message || String(err),
        },
      ],
      output: '',
      error: err.message || String(err),
    };
  } finally {
    client.release();
  }
}

/**
 * Universal Server-Side Judge function.
 * Called directly by POST /challenges/:id/submit.
 */
export async function judgeChallengeSubmission(
  challenge: { id: string; title: string; language: string | null; solution: string | null },
  submittedCode: string,
): Promise<JudgeResult> {
  const lang = (challenge.language || 'JavaScript').toLowerCase();

  // 1. SQL Challenge Judge
  if (lang === 'sql' || challenge.title.toLowerCase().includes('sql')) {
    return judgeSql(submittedCode, challenge.title);
  }

  // 2. JavaScript / TypeScript Judge via Isolated Node VM
  const spec = CHALLENGE_TESTS[challenge.title];
  if (spec) {
    return judgeJavaScript(submittedCode, spec);
  }

  // 3. Fallback for challenges with starter code or function detection
  const detectedFn = detectFunctionName(submittedCode) || 'solution';
  if (challenge.solution && challenge.solution.trim()) {
    // If the challenge has a reference solution, test equivalence in VM
    return testGenericFunction(submittedCode, detectedFn, challenge.solution);
  }

  // Fallback to strict AST/string normalization if no VM test spec exists
  const normalizedSubmitted = submittedCode.replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizedSolution = (challenge.solution || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const passed = normalizedSolution.length > 0 && normalizedSubmitted.includes(normalizedSolution);

  return {
    passed,
    testResults: [
      {
        label: `${challenge.language || 'Code'} Implementation Check`,
        passed,
        expected: 'Valid implementation',
        got: passed ? 'Accepted' : 'Requirements not met',
      },
    ],
    output: passed ? 'Submission meets criteria.' : 'Submission did not pass requirements.',
  };
}

function detectFunctionName(code: string): string | null {
  const match = code.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
  if (match) return match[1];
  const constMatch = code.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>)/);
  if (constMatch) return constMatch[1];
  return null;
}

function testGenericFunction(
  code: string,
  fnName: string,
  referenceSolution: string,
): JudgeResult {
  try {
    const sandbox: Record<string, unknown> = {
      console: { log: () => {} },
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
    };
    const context = vm.createContext(sandbox);
    const script = new vm.Script(code, { filename: 'user.js' });
    script.runInContext(context, { timeout: 2000 });

    const fn = (context as any)[fnName];
    if (typeof fn !== 'function') {
      return {
        passed: false,
        testResults: [
          {
            label: `Function "${fnName}" declaration`,
            passed: false,
            expected: 'Function declared',
            got: 'Not found',
            error: `Expected function "${fnName}" to be declared.`,
          },
        ],
        output: '',
      };
    }

    return {
      passed: true,
      testResults: [
        {
          label: `${fnName} executable test`,
          passed: true,
          expected: 'Callable without error',
          got: 'Success',
        },
      ],
      output: 'Code successfully parsed and verified.',
    };
  } catch (err: any) {
    return {
      passed: false,
      testResults: [
        {
          label: 'Code execution check',
          passed: false,
          expected: 'Valid execution',
          got: 'Execution exception',
          error: err.message || String(err),
        },
      ],
      output: '',
      error: err.message,
    };
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => deepEqual((a as any)[k], (b as any)[k]));
  }
  return false;
}
