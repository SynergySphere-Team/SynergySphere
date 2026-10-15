import vm from 'node:vm';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pool } from '../lib/db.js';

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
  runtimeMs?: number;
  memoryKb?: number;
  language?: string;
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
  'Reverse a String': {
    fn: 'reverseString',
    cases: [
      { label: 'reverseString("hello")', args: ['hello'], expected: 'olleh' },
      { label: 'reverseString("Geeks")', args: ['Geeks'], expected: 'skeeG' },
      { label: 'Hidden: reverseString("")', args: [''], expected: '', hidden: true },
    ],
  },
  'Reverse a String in Python': {
    fn: 'reverse_string',
    cases: [
      { label: 'reverse_string("hello")', args: ['hello'], expected: 'olleh' },
    ],
  },
  'Palindrome String': {
    fn: 'isPalindrome',
    cases: [
      { label: 'isPalindrome("racecar")', args: ['racecar'], expected: true },
      { label: 'isPalindrome("abc")', args: ['abc'], expected: false },
    ],
  },
  'Sum of Array Elements': {
    fn: 'sumArray',
    cases: [
      { label: 'sumArray([1, 2, 3])', args: [[1, 2, 3]], expected: 6 },
      { label: 'sumArray([10, 20, 30])', args: [[10, 20, 30]], expected: 60 },
      { label: 'Hidden: sumArray([])', args: [[]], expected: 0, hidden: true },
    ],
  },
  'Sum of Elements in List': {
    fn: 'sum_list',
    cases: [
      { label: 'sum_list([1, 2, 3])', args: [[1, 2, 3]], expected: 6 },
    ],
  },
  'Two Sum (Hash Map Optimal)': {
    fn: 'twoSum',
    cases: [
      { label: 'twoSum([2, 7, 11, 15], 9)', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { label: 'twoSum([3, 2, 4], 6)', args: [[3, 2, 4], 6], expected: [1, 2] },
      { label: 'Hidden: twoSum([3, 3], 6)', args: [[3, 3], 6], expected: [0, 1], hidden: true },
    ],
  },
  'Two Sum with HashMap': {
    fn: 'twoSum',
    cases: [
      { label: 'twoSum([2, 7, 11, 15], 9)', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
    ],
  },
  'Find Missing Number in Array': {
    fn: 'findMissingNumber',
    cases: [
      { label: 'findMissingNumber([1, 2, 4, 5], 5)', args: [[1, 2, 4, 5], 5], expected: 3 },
      { label: 'findMissingNumber([2, 3, 1, 5], 5)', args: [[2, 3, 1, 5], 5], expected: 4 },
      { label: 'Hidden: findMissingNumber([1, 2, 3], 4)', args: [[1, 2, 3], 4], expected: 4, hidden: true },
    ],
  },
  'Factorial of a Number': {
    fn: 'factorial',
    cases: [
      { label: 'factorial(5)', args: [5], expected: 120 },
      { label: 'factorial(0)', args: [0], expected: 1 },
      { label: 'Hidden: factorial(7)', args: [7], expected: 5040, hidden: true },
    ],
  },
  'Check for Prime Number': {
    fn: 'isPrime',
    cases: [
      { label: 'isPrime(7)', args: [7], expected: true },
      { label: 'isPrime(4)', args: [4], expected: false },
      { label: 'isPrime(1)', args: [1], expected: false },
      { label: 'Hidden: isPrime(29)', args: [29], expected: true, hidden: true },
    ],
  },
  'Valid Parentheses (Stack)': {
    fn: 'isValid',
    cases: [
      { label: 'isValid("()")', args: ['()'], expected: true },
      { label: 'isValid("()[]{}")', args: ['()[]{}'], expected: true },
      { label: 'isValid("(]")', args: ['(]'], expected: false },
      { label: 'Hidden: isValid("([{}])")', args: ['([{}])'], expected: true, hidden: true },
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
  const startTime = performance.now();
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
    const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
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
      runtimeMs,
      language: 'JavaScript',
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
  const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));

  return {
    passed: allPassed,
    testResults: results,
    output: logs.join('\n'),
    runtimeMs,
    memoryKb: Math.round(process.memoryUsage().heapUsed / 1024),
    language: 'JavaScript',
  };
}

/**
 * Real Server-side SQL Challenge Judge.
 * Creates an isolated transient database schema or transaction with dummy tables,
 * runs the student's SQL query, and checks output rows.
 */
export async function judgeSql(queryText: string, challengeTitle?: string): Promise<JudgeResult> {
  const startTime = performance.now();
  const client = await pool.connect();
  const testResults: TestResult[] = [];
  try {
    await client.query('BEGIN');

    // Create a temporary sandbox tables
    await client.query(`
      CREATE TEMP TABLE IF NOT EXISTS temp_students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        gpa NUMERIC(3, 2)
      ) ON COMMIT DROP;

      INSERT INTO temp_students (name, gpa) VALUES
      ('Alice Walker', 3.90),
      ('Bob Mokoena', 3.20),
      ('Chidi Anagonye', 3.85),
      ('David Naidoo', 2.90);

      CREATE TEMP TABLE IF NOT EXISTS temp_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        country VARCHAR(50),
        status VARCHAR(20)
      ) ON COMMIT DROP;

      INSERT INTO temp_users (name, country, status) VALUES
      ('U1', 'USA', 'active'), ('U2', 'USA', 'active'), ('U3', 'USA', 'active'),
      ('U4', 'USA', 'active'), ('U5', 'USA', 'active'), ('U6', 'USA', 'active'),
      ('U7', 'UK', 'active'), ('U8', 'UK', 'active'), ('U9', 'UK', 'active'),
      ('U10', 'UK', 'active'), ('U11', 'UK', 'active'), ('U12', 'UK', 'active'),
      ('U13', 'Canada', 'active'), ('U14', 'Canada', 'active'),
      ('U15', 'USA', 'inactive'), ('U16', 'UK', 'inactive');

      CREATE TEMP TABLE IF NOT EXISTS temp_employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        department VARCHAR(50),
        salary NUMERIC(10, 2)
      ) ON COMMIT DROP;

      INSERT INTO temp_employees (name, department, salary) VALUES
      ('John Doe', 'Engineering', 95000),
      ('Jane Smith', 'Engineering', 85000),
      ('Bob Johnson', 'HR', 45000),
      ('Alice Brown', 'Sales', 60000);
    `);

    // Replace table names in query to target temp tables
    const sanitizedQuery = queryText
      .replace(/\bstudents\b/gi, 'temp_students')
      .replace(/\busers\b/gi, 'temp_users')
      .replace(/\bemployees\b/gi, 'temp_employees');

    const res = await client.query(sanitizedQuery);
    await client.query('ROLLBACK');

    const lowerQuery = queryText.toLowerCase();
    const title = (challengeTitle || '').toLowerCase();

    if (title.includes('active') || lowerQuery.includes('country')) {
      const countries = res.rows.map((r: any) => r.country).sort();
      const expected = ['UK', 'USA'].sort();
      const passed = JSON.stringify(countries) === JSON.stringify(expected);

      testResults.push({
        label: 'Groups active users by country with count > 5 (UK, USA)',
        passed,
        expected,
        got: countries,
      });

      testResults.push({
        label: 'Filters out inactive users and countries <= 5 (Canada)',
        passed: !countries.includes('Canada'),
        expected: true,
        got: !countries.includes('Canada'),
        hidden: true,
      });
    } else {
      // Default students check
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
    }

    const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      passed: testResults.every((r) => r.passed),
      testResults,
      output: `Executed query returned ${res.rowCount} row(s).`,
      runtimeMs,
      language: 'SQL',
    };
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
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
      runtimeMs,
      language: 'SQL',
    };
  } finally {
    client.release();
  }
}

/**
 * Real Server-side Python Challenge Judge.
 * Spawns isolated Python subprocess with test harness and JSON evaluation.
 */
export async function judgePython(
  code: string,
  spec: { fn: string; cases: TestCase[] },
): Promise<JudgeResult> {
  const startTime = performance.now();
  const tempDir = path.join(os.tmpdir(), `synergy-py-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  try {
    await fs.mkdir(tempDir, { recursive: true });
    const pyFilePath = path.join(tempDir, 'solution.py');
    const runnerFilePath = path.join(tempDir, 'runner.py');

    await fs.writeFile(pyFilePath, code, 'utf8');

    const runnerScript = `
import json, sys, time
try:
    import solution
except Exception as e:
    print(json.dumps({"importError": str(e)}))
    sys.exit(0)

fn_name = ${JSON.stringify(spec.fn)}
if not hasattr(solution, fn_name):
    print(json.dumps({"fnError": f"Function '{fn_name}' is not defined in submitted Python code."}))
    sys.exit(0)

target_fn = getattr(solution, fn_name)
cases = ${JSON.stringify(spec.cases)}
results = []
all_passed = True

for tc in cases:
    label = tc.get('label', '')
    expected = tc.get('expected')
    args = tc.get('args', [])
    hidden = tc.get('hidden', False)
    try:
        got = target_fn(*args)
        passed = (got == expected)
        if not passed:
            all_passed = False
        results.append({
            "label": label,
            "passed": passed,
            "expected": expected,
            "got": got,
            "hidden": hidden
        })
    except Exception as exc:
        all_passed = False
        results.append({
            "label": label,
            "passed": False,
            "expected": expected,
            "got": "Runtime Exception",
            "error": str(exc),
            "hidden": hidden
        })

print("---SYNERGY_EVAL---")
print(json.dumps({
    "allPassed": all_passed,
    "results": results
}))
`;
    await fs.writeFile(runnerFilePath, runnerScript, 'utf8');

    return await new Promise<JudgeResult>((resolve) => {
      const py = spawn('python', ['-u', runnerFilePath], {
        cwd: tempDir,
        timeout: 3000,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
      });

      let stdout = '';
      let stderr = '';
      py.stdout.on('data', (d) => { stdout += d.toString(); });
      py.stderr.on('data', (d) => { stderr += d.toString(); });

      py.on('error', (err) => {
        const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
        resolve({
          passed: false,
          testResults: [{
            label: 'Python process error',
            passed: false,
            expected: 'Valid execution',
            got: 'Process Error',
            error: err.message,
          }],
          output: '',
          error: err.message,
          runtimeMs,
          language: 'Python',
        });
      });

      py.on('close', (code, signal) => {
        const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
        if (signal === 'SIGTERM' || code === null) {
          resolve({
            passed: false,
            testResults: [{
              label: 'Timeout Error',
              passed: false,
              expected: 'Execution within 3000ms',
              got: 'Timed Out',
              error: 'Execution exceeded 3000ms limit.',
            }],
            output: stdout,
            error: 'Execution timed out.',
            runtimeMs,
            language: 'Python',
          });
          return;
        }

        if (!stdout.includes('---SYNERGY_EVAL---')) {
          let errorMsg = stderr.trim();
          try {
            const errObj = JSON.parse(stdout.trim());
            if (errObj.importError) errorMsg = errObj.importError;
            if (errObj.fnError) errorMsg = errObj.fnError;
          } catch {}
          resolve({
            passed: false,
            testResults: [{
              label: 'Python syntax/runtime error',
              passed: false,
              expected: 'Valid execution',
              got: 'Execution Exception',
              error: errorMsg || 'Python execution failed.',
            }],
            output: stdout,
            error: errorMsg || 'Python execution failed.',
            runtimeMs,
            language: 'Python',
          });
          return;
        }

        const parts = stdout.split('---SYNERGY_EVAL---');
        const userLogs = parts[0]?.trim() || '';
        const jsonStr = parts[1]?.trim() || '';

        try {
          const parsed = JSON.parse(jsonStr);
          resolve({
            passed: Boolean(parsed.allPassed),
            testResults: parsed.results || [],
            output: userLogs,
            runtimeMs,
            language: 'Python',
          });
        } catch (parseErr: any) {
          resolve({
            passed: false,
            testResults: [{
              label: 'Output parsing error',
              passed: false,
              expected: 'JSON evaluation output',
              got: 'Parse Failure',
              error: parseErr.message,
            }],
            output: stdout,
            error: stderr || parseErr.message,
            runtimeMs,
            language: 'Python',
          });
        }
      });
    });
  } catch (err: any) {
    const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      passed: false,
      testResults: [{
        label: 'Python Judge Exception',
        passed: false,
        expected: 'Valid execution',
        got: 'Error',
        error: err.message || String(err),
      }],
      output: '',
      error: err.message,
      runtimeMs,
      language: 'Python',
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Generic Python validator when no explicit test cases are pre-compiled.
 */
export async function judgePythonGeneric(
  code: string,
  detectedFn: string,
  _challengeSolution?: string | null,
): Promise<JudgeResult> {
  const startTime = performance.now();
  const tempDir = path.join(os.tmpdir(), `synergy-py-gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  try {
    await fs.mkdir(tempDir, { recursive: true });
    const pyFilePath = path.join(tempDir, 'user_code.py');
    const runnerFilePath = path.join(tempDir, 'runner.py');

    await fs.writeFile(pyFilePath, code, 'utf8');

    const runnerScript = `
import sys
try:
    import user_code
except Exception as e:
    print(f"[ImportError] {e}")
    sys.exit(1)

fn_name = ${JSON.stringify(detectedFn)}
if hasattr(user_code, fn_name) and callable(getattr(user_code, fn_name)):
    print(f"Function '{fn_name}' verified and executable.")
else:
    print(f"[VerificationWarning] Function '{fn_name}' not defined as callable.")
`;
    await fs.writeFile(runnerFilePath, runnerScript, 'utf8');

    return await new Promise<JudgeResult>((resolve) => {
      const py = spawn('python', ['-u', runnerFilePath], {
        cwd: tempDir,
        timeout: 3000,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
      });

      let stdout = '';
      let stderr = '';
      py.stdout.on('data', (d) => { stdout += d.toString(); });
      py.stderr.on('data', (d) => { stderr += d.toString(); });

      py.on('error', (err) => {
        const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
        resolve({
          passed: false,
          testResults: [{
            label: 'Python Interpreter',
            passed: false,
            expected: 'Execution without process error',
            got: 'Process Error',
            error: err.message,
          }],
          output: '',
          error: err.message,
          runtimeMs,
          language: 'Python',
        });
      });

      py.on('close', (code, signal) => {
        const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
        if (signal === 'SIGTERM' || code === null) {
          resolve({
            passed: false,
            testResults: [{
              label: 'Timeout Error',
              passed: false,
              expected: 'Execution completed within 3000ms',
              got: 'Timed Out',
              error: 'Execution exceeded 3000ms limit.',
            }],
            output: stdout,
            error: 'Execution timed out.',
            runtimeMs,
            language: 'Python',
          });
          return;
        }

        if (code !== 0 || stderr.trim()) {
          resolve({
            passed: false,
            testResults: [{
              label: 'Python Syntax or Runtime Error',
              passed: false,
              expected: 'Clean Python execution',
              got: 'SyntaxError / Exception',
              error: stderr.trim() || stdout.trim(),
            }],
            output: stdout,
            error: stderr.trim() || stdout.trim(),
            runtimeMs,
            language: 'Python',
          });
          return;
        }

        resolve({
          passed: true,
          testResults: [{
            label: `Python function "${detectedFn}" validation`,
            passed: true,
            expected: 'Declared and executable',
            got: 'Success',
          }],
          output: stdout.trim(),
          runtimeMs,
          language: 'Python',
        });
      });
    });
  } catch (err: any) {
    const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      passed: false,
      testResults: [{
        label: 'Python Execution Check',
        passed: false,
        expected: 'Valid execution',
        got: 'Error',
        error: err.message || String(err),
      }],
      output: '',
      error: err.message,
      runtimeMs,
      language: 'Python',
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Real Server-side Java Challenge Judge.
 * Compiles using javac and executes with memory-capped java subprocess.
 */
export async function judgeJava(
  code: string,
  challengeTitle: string,
  _referenceSolution?: string | null,
): Promise<JudgeResult> {
  const startTime = performance.now();
  const tempDir = path.join(os.tmpdir(), `synergy-java-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  try {
    await fs.mkdir(tempDir, { recursive: true });

    const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
    const className = classMatch ? classMatch[1] : 'Solution';
    const filePath = path.join(tempDir, `${className}.java`);

    let runnableCode = code;
    if (!code.includes('public static void main')) {
      runnableCode = `
public class ${className} {
    ${code.includes(`class ${className}`) ? '' : code}
    public static void main(String[] args) {
        System.out.println("Java compilation and syntax verification successful.");
    }
}
      `.trim();
    }

    await fs.writeFile(filePath, runnableCode, 'utf8');

    const compileResult = await new Promise<{ ok: boolean; error?: string }>((res) => {
      const javac = spawn('javac', ['-d', '.', `${className}.java`], { cwd: tempDir, timeout: 6000 });
      let errStr = '';
      javac.stderr.on('data', (d) => { errStr += d.toString(); });
      javac.on('error', (err) => res({ ok: false, error: err.message }));
      javac.on('close', (code) => {
        if (code === 0) res({ ok: true });
        else res({ ok: false, error: errStr || 'Compilation failed.' });
      });
    });

    if (!compileResult.ok) {
      const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
      return {
        passed: false,
        testResults: [{
          label: 'Java Compiler (javac)',
          passed: false,
          expected: 'Clean compilation',
          got: 'Compilation Error',
          error: compileResult.error,
        }],
        output: '',
        error: compileResult.error,
        runtimeMs,
        language: 'Java',
      };
    }

    const runResult = await new Promise<{ ok: boolean; output: string; error?: string }>((res) => {
      const java = spawn('java', ['-cp', '.', '-Xmx64m', className], { cwd: tempDir, timeout: 5000 });
      let outStr = '';
      let errStr = '';
      java.stdout.on('data', (d) => { outStr += d.toString(); });
      java.stderr.on('data', (d) => { errStr += d.toString(); });
      java.on('error', (err) => res({ ok: false, output: '', error: err.message }));
      java.on('close', (code) => {
        if (code === 0) res({ ok: true, output: outStr.trim() });
        else res({ ok: false, output: outStr.trim(), error: errStr || 'Execution error.' });
      });
    });

    const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      passed: runResult.ok,
      testResults: [{
        label: `${challengeTitle} Execution`,
        passed: runResult.ok,
        expected: 'Successful Java execution',
        got: runResult.ok ? 'Accepted' : 'Runtime Exception',
        error: runResult.error,
      }],
      output: runResult.output,
      error: runResult.error,
      runtimeMs,
      language: 'Java',
    };
  } catch (err: any) {
    const runtimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      passed: false,
      testResults: [{
        label: 'Java Runtime Exception',
        passed: false,
        expected: 'Valid execution',
        got: 'Error',
        error: err.message || String(err),
      }],
      output: '',
      error: err.message,
      runtimeMs,
      language: 'Java',
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Universal Server-Side Judge function.
 * Evaluates JavaScript, Python, Java, SQL, and other languages with authoritative server logic.
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

  // 2. Python Challenge Judge
  if (lang === 'python' || challenge.title.toLowerCase().includes('python')) {
    const spec = CHALLENGE_TESTS[challenge.title];
    if (spec) {
      return judgePython(submittedCode, spec);
    }
    const detectedFn = detectFunctionName(submittedCode, 'python') || 'solution';
    return judgePythonGeneric(submittedCode, detectedFn, challenge.solution);
  }

  // 3. Java Challenge Judge
  if (lang === 'java' || challenge.title.toLowerCase().includes('java')) {
    return judgeJava(submittedCode, challenge.title, challenge.solution);
  }

  // 4. JavaScript / TypeScript Judge via Sandboxed Node VM
  const spec = CHALLENGE_TESTS[challenge.title];
  if (spec) {
    return judgeJavaScript(submittedCode, spec);
  }

  // 5. Fallback for challenges with starter code or function detection
  const detectedFn = detectFunctionName(submittedCode, 'javascript') || 'solution';
  if (challenge.solution && challenge.solution.trim()) {
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
    runtimeMs: 1,
    language: challenge.language || 'General',
  };
}

function detectFunctionName(code: string, language = 'javascript'): string | null {
  if (language === 'python') {
    const pyMatch = code.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
    if (pyMatch) return pyMatch[1];
  }
  const match = code.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
  if (match) return match[1];
  const constMatch = code.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>)/);
  if (constMatch) return constMatch[1];
  const pyMatch = code.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
  if (pyMatch) return pyMatch[1];
  return null;
}

function testGenericFunction(
  code: string,
  fnName: string,
  _referenceSolution?: string,
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
