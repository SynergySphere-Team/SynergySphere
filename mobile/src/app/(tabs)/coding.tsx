import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, TextInput, Modal, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { CurriculumDashboard } from '@/components/curriculum/CurriculumDashboard';
import { LessonViewer } from '@/components/curriculum/LessonViewer';
import { LiveCodeRoomBar } from '@/components/coding/LiveCodeRoomBar';
import type { Challenge, LearningResource } from '@/types/api';

const ALL_LANGUAGES = ['All', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'SQL', 'HTML', 'CSS', 'React', 'Node.js'] as const;
const DIFFICULTIES = ['ALL', 'EASY', 'MEDIUM', 'HARD'] as const;

import { BUILTIN_CHALLENGES, type BuiltinChallenge } from '@/data/builtinChallenges';
import { BUILTIN_RESOURCES } from '@/data/builtinResources';
export { BUILTIN_CHALLENGES, BUILTIN_RESOURCES, type BuiltinChallenge };

export function isResourceMatchingLanguage(resource: LearningResource, selectedLanguage: string): boolean {
  if (selectedLanguage === 'All') return true;
  const sel = selectedLanguage.toLowerCase();
  
  if (resource.language) {
    if (resource.language.toLowerCase() === sel) return true;
  }
  
  const topic = (resource.topic || '').toLowerCase();
  const title = (resource.title || '').toLowerCase();
  const id = (resource.id || '').toLowerCase();

  if (sel === 'javascript') {
    return topic === 'javascript' || id.startsWith('js-') || id.startsWith('javascript-') || title.includes('javascript');
  }
  if (sel === 'typescript') {
    return topic === 'typescript' || id.startsWith('ts-') || id.startsWith('typescript-') || title.includes('typescript');
  }
  if (sel === 'python') {
    return topic === 'python' || id.startsWith('py-') || id.startsWith('python-') || title.includes('python');
  }
  if (sel === 'sql') {
    return topic === 'sql' || id.startsWith('sql-') || title.includes('sql');
  }
  if (sel === 'java') {
    return topic === 'java' || id.startsWith('java-') || title.includes('java');
  }
  if (sel === 'c++') {
    return topic === 'c++' || id.startsWith('cpp-') || id.startsWith('c++-') || title.includes('c++');
  }
  if (sel === 'c#') {
    return topic === 'c#' || id.startsWith('cs-') || id.startsWith('csharp-') || title.includes('c#');
  }
  if (sel === 'html') {
    return topic === 'html' || id.startsWith('html-') || title.includes('html');
  }
  if (sel === 'css') {
    return topic === 'css' || id.startsWith('css-') || title.includes('css');
  }
  if (sel === 'react') {
    return topic === 'react' || id.startsWith('react-') || title.includes('react');
  }
  if (sel === 'node.js') {
    return topic === 'node.js' || topic === 'node' || id.startsWith('node-') || title.includes('node');
  }

  return topic === sel;
}

export interface RealtimeHintAnalysis {
  statusBadge: string;
  badgeTone: 'info' | 'warning' | 'success';
  message: string;
  approachStep: string;
  checks: Array<{ label: string; passed: boolean }>;
}

export function getRealtimeHint(currentCode: string, challenge: BuiltinChallenge | Challenge | null): RealtimeHintAnalysis | null {
  if (!challenge) return null;
  const raw = currentCode.trim();
  const lower = raw.toLowerCase();
  const isStarter = !raw || raw === (challenge.starterCode || '').trim();

  const title = challenge.title.toLowerCase();
  const lang = (challenge.language || '').toLowerCase();
  const hasFunction = /function|def |class |=>|\bSELECT\b/i.test(raw);
  const hasReturn = /\breturn\b|\bSELECT\b/i.test(raw);

  let hintMsg = '';
  let logicPassed = false;

  if (lang.includes('sql') || title.includes('sql') || title.includes('query')) {
    const hasSelect = /\bselect\b/i.test(raw);
    const hasFrom = /\bfrom\b/i.test(raw);
    const hasWhere = /\bwhere\b/i.test(raw);
    const hasGroupBy = /\bgroup by\b/i.test(raw);
    const hasHaving = /\bhaving\b/i.test(raw);

    if (!hasSelect || !hasFrom) {
      hintMsg = '💡 SQL Syntax: Start with SELECT desired columns FROM target_table.';
    } else if (title.includes('active') || title.includes('count')) {
      if (!hasGroupBy) {
        hintMsg = '💡 GeeksforGeeks SQL Tip: Use GROUP BY country to aggregate active users by country.';
      } else if (!hasHaving) {
        hintMsg = '💡 GeeksforGeeks SQL Rule: Filter aggregated groups using HAVING COUNT(*) > 5.';
      } else {
        hintMsg = '✓ Optimal SQL Query structure detected! Ready to test.';
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

  if (isStarter) {
    return {
      statusBadge: 'Getting Started',
      badgeTone: 'info',
      message: '💡 Step 1: Read the problem constraints and write your solution inside the function stub.',
      approachStep: challenge.approach || 'Deconstruct the problem into parameters, boundary checks, and expected output.',
      checks,
    };
  }

  return {
    statusBadge: allPassed ? 'Ready to Test' : hasFunction ? 'Logic in Progress' : 'Drafting Code',
    badgeTone: allPassed ? 'success' : 'info',
    message: hintMsg,
    approachStep: challenge.approach || challenge.hint || 'Satisfy all unit test assertions.',
    checks,
  };
}

export interface RolePathLesson {
  id: string;
  title: string;
  phase: string;
  description: string;
  completed?: boolean;
}

export interface RolePathChallenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  xpReward: number;
  passed?: boolean;
}

export interface RolePath {
  id: string;
  title: string;
  targetRole: string;
  tagline: string;
  subjectIds: string[];
  curatedLessonIds?: string[];
  syllabus: RolePathLesson[];
  totalLessons: number;
  completedLessons: number;
  percent: number;
  recommendedChallenges: RolePathChallenge[];
  interviewTags: string[];
}

const BACKEND_INTERN_SYLLABUS: RolePathLesson[] = [
  { id: 'java-java-tutorial-java-introduction', title: 'Java Environment & JVM Architecture', phase: 'Phase 1: Language Syntax', description: 'Understanding bytecode, JDK, and running your first Java program.' },
  { id: 'java-java-tutorial-java-syntax', title: 'Syntax, Variables & Data Types', phase: 'Phase 1: Language Syntax', description: 'Primitive types, variables, and type casting rules in Java.' },
  { id: 'java-java-tutorial-java-operators', title: 'Operators, Logic & Expressions', phase: 'Phase 1: Language Syntax', description: 'Mathematical and boolean conditional evaluations.' },
  { id: 'java-java-tutorial-java-if-else', title: 'Control Flow & Branching', phase: 'Phase 1: Language Syntax', description: 'If-else statements, switch expressions, and loops.' },
  { id: 'java-java-methods-java-methods', title: 'Methods & Parameter Passing', phase: 'Phase 1: Language Syntax', description: 'Method signatures, return types, and overloading.' },
  { id: 'java-java-classes-java-oop', title: 'Object-Oriented Programming (OOP)', phase: 'Phase 2: Core Engineering', description: 'Classes, objects, attributes, and instantiation.' },
  { id: 'java-java-classes-java-encapsulation', title: 'Encapsulation & Access Modifiers', phase: 'Phase 2: Core Engineering', description: 'Public/private scope, getters, setters, and data hiding.' },
  { id: 'java-java-classes-java-inheritance', title: 'Inheritance & Method Overriding', phase: 'Phase 2: Core Engineering', description: 'Extending classes, super keyword, and polymorphism.' },
  { id: 'java-java-classes-java-interface', title: 'Interfaces & Abstract Classes', phase: 'Phase 2: Core Engineering', description: 'Decoupling software contracts and multiple implementation.' },
  { id: 'java-java-collections-and-built-in-classes-java-hashmap', title: 'Collections: HashMap & ArrayList', phase: 'Phase 2: Core Engineering', description: 'Key-value maps, lists, and time complexity in memory.' },
  { id: 'sql-sql-fundamentals-sql-introduction', title: 'SQL & Relational Databases', phase: 'Phase 3: Database & Persistence', description: 'RDBMS concepts, tables, primary keys, and schemas.' },
  { id: 'sql-sql-fundamentals-sql-select', title: 'SELECT Queries & Filters', phase: 'Phase 3: Database & Persistence', description: 'Filtering records with WHERE, ORDER BY, and LIMIT.' },
  { id: 'sql-sql-joins-sql-joins', title: 'Relational Joins (INNER, LEFT, RIGHT)', phase: 'Phase 3: Database & Persistence', description: 'Combining data across normalized relational tables.' },
  { id: 'sql-sql-grouping-and-conditions-sql-group-by', title: 'Aggregations & GROUP BY', phase: 'Phase 3: Database & Persistence', description: 'COUNT, SUM, AVG, and filtering grouped results with HAVING.' },
];

const FRONTEND_INTERN_SYLLABUS: RolePathLesson[] = [
  { id: 'html-html-tutorial-html-introduction', title: 'Semantic HTML5 Fundamentals', phase: 'Phase 1: Web Foundations', description: 'Document structure, accessibility, and modern tags.' },
  { id: 'html-html-forms-html-forms', title: 'Forms, Inputs & Validation', phase: 'Phase 1: Web Foundations', description: 'Building accessible client-side form controls.' },
  { id: 'css-css-fundamentals-css-box-model', title: 'CSS Box Model & Margin Collapsing', phase: 'Phase 1: Web Foundations', description: 'Content, padding, border, and margin calculations.' },
  { id: 'css-css-responsive-design-css-flexbox', title: 'Flexbox Layouts & Responsive Design', phase: 'Phase 1: Web Foundations', description: 'Flexible 1D box arrangements, alignment, and wrapping.' },
  { id: 'css-css-responsive-design-css-grid', title: 'CSS Grid 2D Systems', phase: 'Phase 1: Web Foundations', description: 'Rows, columns, areas, and responsive grid templates.' },
  { id: 'javascript-javascript-fundamentals-javascript-variables', title: 'Modern JavaScript (ES6+) Scope', phase: 'Phase 2: Modern JavaScript', description: 'Let, const, arrow functions, and lexical scope.' },
  { id: 'javascript-javascript-arrays-javascript-arrays', title: 'Array Iteration & Map/Filter/Reduce', phase: 'Phase 2: Modern JavaScript', description: 'Functional array manipulation and transformation.' },
  { id: 'javascript-javascript-asynchronous-programming-async-await', title: 'Async/Await & Fetch API', phase: 'Phase 2: Modern JavaScript', description: 'Handling asynchronous REST requests and error states.' },
  { id: 'react-react-fundamentals-react-introduction', title: 'React Component Architecture', phase: 'Phase 3: Reactive Frontend', description: 'Component lifecycles, JSX, and unidirectional data flow.' },
  { id: 'react-react-components-react-props', title: 'React Props & Composition', phase: 'Phase 3: Reactive Frontend', description: 'Passing data, callbacks, and component reusability.' },
  { id: 'react-react-hooks-usestate', title: 'State Management with useState', phase: 'Phase 3: Reactive Frontend', description: 'Reactive local state, updater functions, and re-renders.' },
  { id: 'react-react-hooks-useeffect', title: 'Side Effects with useEffect', phase: 'Phase 3: Reactive Frontend', description: 'API fetching, subscriptions, cleanup, and dependency arrays.' },
];

const FULLSTACK_SYLLABUS: RolePathLesson[] = [
  { id: 'nodejs-node-js-fundamentals-node-introduction', title: 'Node.js Runtime & Event Loop', phase: 'Phase 1: Backend Services', description: 'Non-blocking asynchronous I/O and module systems.' },
  { id: 'nodejs-node-js-core-modules-http-module', title: 'HTTP Servers & RESTful APIs', phase: 'Phase 1: Backend Services', description: 'Handling requests, status codes, and JSON responses.' },
  { id: 'typescript-typescript-fundamentals-typescript-introduction', title: 'TypeScript Types & Inference', phase: 'Phase 2: Full-Stack Type Safety', description: 'Primitive types, type assertions, and compilation.' },
  { id: 'typescript-typescript-fundamentals-typescript-interfaces', title: 'Interfaces & Data Contracts', phase: 'Phase 2: Full-Stack Type Safety', description: 'Defining shared API contracts and object models.' },
  { id: 'react-react-fundamentals-react-introduction', title: 'React Single-Page Client', phase: 'Phase 3: End-to-End Integration', description: 'Connecting UI frontend to backend REST endpoints.' },
  { id: 'sql-sql-fundamentals-sql-introduction', title: 'Relational Database Schema Design', phase: 'Phase 3: End-to-End Integration', description: 'Normalization, foreign keys, and indexes.' },
  { id: 'sql-sql-joins-sql-joins', title: 'Multi-Table Relational Queries', phase: 'Phase 3: End-to-End Integration', description: 'Optimizing joins and aggregations for APIs.' },
];

const BUILTIN_ROLE_PATHS: RolePath[] = [
  {
    id: 'backend-intern',
    title: 'Backend Intern (Java & SQL)',
    tagline: 'From syntax to database persistence, query optimization, and REST API microservices.',
    targetRole: 'Junior Backend Developer',
    subjectIds: ['java', 'sql'],
    curatedLessonIds: [
      'java-java-tutorial-java-introduction',
      'java-java-tutorial-java-syntax',
      'java-java-classes-java-oop',
      'sql-sql-fundamentals-sql-introduction',
      'sql-sql-joins-sql-joins',
    ],
    syllabus: BACKEND_INTERN_SYLLABUS,
    totalLessons: 63,
    completedLessons: 0,
    percent: 0,
    recommendedChallenges: [
      { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50, passed: false },
      { id: 'js-sum-array', title: 'Sum Array', difficulty: 'EASY', xpReward: 50, passed: false },
      { id: 'js-fizzbuzz', title: 'FizzBuzz', difficulty: 'MEDIUM', xpReward: 75, passed: false },
      { id: 'sql-customers', title: 'Active Customers Count', difficulty: 'MEDIUM', xpReward: 80, passed: false },
      { id: 'java-binary-search', title: 'Binary Search', difficulty: 'HARD', xpReward: 100, passed: false },
    ],
    interviewTags: ['Java', 'SQL', 'Spring Boot', 'Concurrency', 'Transactions'],
  },
  {
    id: 'frontend-intern',
    title: 'Frontend Intern (HTML, CSS, JS & React)',
    tagline: 'Modern accessible UI components, reactive state, DOM events, and client performance.',
    targetRole: 'Junior Frontend Developer',
    subjectIds: ['html', 'css', 'javascript', 'react'],
    curatedLessonIds: [
      'html-html-tutorial-html-introduction',
      'css-css-fundamentals-css-box-model',
      'javascript-javascript-functions-function-introduction',
      'react-react-fundamentals-react-introduction',
    ],
    syllabus: FRONTEND_INTERN_SYLLABUS,
    totalLessons: 42,
    completedLessons: 0,
    percent: 0,
    recommendedChallenges: [
      { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50, passed: false },
      { id: 'js-sum-array', title: 'Sum Array', difficulty: 'EASY', xpReward: 50, passed: false },
      { id: 'js-two-sum', title: 'Two Sum', difficulty: 'EASY', xpReward: 60, passed: false },
    ],
    interviewTags: ['JavaScript', 'React', 'CSS Box Model', 'HTML5', 'State Management'],
  },
  {
    id: 'fullstack-engineer',
    title: 'Full-Stack Developer (Node, React & SQL)',
    tagline: 'End-to-end applications: REST/WebSocket APIs, relational data models, and reactive frontend.',
    targetRole: 'Junior Full-Stack Engineer',
    subjectIds: ['nodejs', 'react', 'sql', 'typescript'],
    curatedLessonIds: [
      'nodejs-node-js-fundamentals-node-introduction',
      'typescript-typescript-fundamentals-typescript-introduction',
      'react-react-fundamentals-react-introduction',
      'sql-sql-fundamentals-sql-introduction',
    ],
    syllabus: FULLSTACK_SYLLABUS,
    totalLessons: 58,
    completedLessons: 0,
    percent: 0,
    recommendedChallenges: [
      { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50, passed: false },
      { id: 'sql-customers', title: 'Active Customers Count', difficulty: 'MEDIUM', xpReward: 80, passed: false },
      { id: 'java-binary-search', title: 'Binary Search', difficulty: 'HARD', xpReward: 100, passed: false },
    ],
    interviewTags: ['Node.js', 'React', 'SQL Joins', 'TypeScript', 'REST APIs'],
  },
];

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function formatTrackName(track: string): string {
  const names: Record<string, string> = {
    nodejs: 'Node.js',
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    csharp: 'C#',
    cpp: 'C++',
    react: 'React',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
  };
  return names[track.toLowerCase()] ?? `${track.charAt(0).toUpperCase()}${track.slice(1)}`;
}

function normalizeRolePath(value: unknown): RolePath | null {
  if (!value || typeof value !== 'object') return null;
  const path = value as Partial<RolePath>;
  if (typeof path.id !== 'string' || typeof path.title !== 'string') return null;

  const defaultSyllabus =
    path.id === 'backend-intern'
      ? BACKEND_INTERN_SYLLABUS
      : path.id === 'frontend-intern'
      ? FRONTEND_INTERN_SYLLABUS
      : FULLSTACK_SYLLABUS;

  const fallbackItem = BUILTIN_ROLE_PATHS.find((b) => b.id === path.id);

  const rawSyllabus = Array.isArray(path.syllabus) && path.syllabus.length > 0 ? path.syllabus : defaultSyllabus;
  const mergedSyllabus: RolePathLesson[] = rawSyllabus.map((item: any, idx: number) => {
    const fallbackLesson = defaultSyllabus[idx] || defaultSyllabus.find((d) => d.id === item?.id);
    return {
      id: typeof item?.id === 'string' ? item.id : fallbackLesson?.id || `lesson-${idx}`,
      title: typeof item?.title === 'string' ? item.title : fallbackLesson?.title || 'Lesson',
      phase: typeof item?.phase === 'string' ? item.phase : fallbackLesson?.phase || 'Phase 1: Language Syntax',
      description: typeof item?.description === 'string' ? item.description : fallbackLesson?.description || '',
      completed: Boolean(item?.completed),
    };
  });

  const totalLessons = typeof path.totalLessons === 'number' && Number.isFinite(path.totalLessons) ? path.totalLessons : mergedSyllabus.length;
  const completedLessons = typeof path.completedLessons === 'number' ? path.completedLessons : mergedSyllabus.filter((l) => l.completed).length;
  const percent = typeof path.percent === 'number' ? path.percent : Math.min(100, Math.round((completedLessons / Math.max(totalLessons, 1)) * 100));

  return {
    id: path.id,
    title: path.title,
    targetRole: typeof path.targetRole === 'string' ? path.targetRole : fallbackItem?.targetRole || 'Developer',
    tagline: typeof path.tagline === 'string' ? path.tagline : fallbackItem?.tagline || '',
    subjectIds: stringList(path.subjectIds).length > 0 ? stringList(path.subjectIds) : (fallbackItem?.subjectIds || []),
    curatedLessonIds: stringList(path.curatedLessonIds),
    syllabus: mergedSyllabus,
    totalLessons,
    completedLessons,
    percent,
    recommendedChallenges: Array.isArray(path.recommendedChallenges) && path.recommendedChallenges.length > 0
      ? path.recommendedChallenges.map((c: any) => ({
          id: typeof c?.id === 'string' ? c.id : String(c || ''),
          title: typeof c?.title === 'string' ? c.title : (typeof c?.id === 'string' ? c.id : 'Challenge'),
          difficulty: (['EASY', 'MEDIUM', 'HARD'].includes(c?.difficulty?.toUpperCase()) ? c.difficulty.toUpperCase() : 'MEDIUM') as any,
          xpReward: typeof c?.xpReward === 'number' ? c.xpReward : 50,
          passed: Boolean(c?.passed),
        })).filter((c) => c.id.length > 0)
      : (fallbackItem?.recommendedChallenges || []),
    interviewTags: stringList(path.interviewTags).length > 0
      ? stringList(path.interviewTags)
      : (fallbackItem?.interviewTags || []),
  };
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
}

export interface ChallengeEvaluation {
  action: 'test' | 'submit';
  passed: boolean;
  title: string;
  message?: string;
  xpEarned?: number;
  testResults?: Array<{ label: string; passed: boolean; expected?: unknown; got?: unknown; error?: string }>;
  output?: string;
  solution?: string | null;
}

export default function CodingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    challengeTitle?: string;
    challengeDescription?: string;
    challengeHint?: string;
    language?: string;
    starterCode?: string;
  }>();
  const { colors, theme } = useTheme();
  const { fontSize, largerText } = useAccessibility();

  // Mode: Academy vs Challenges vs Role Paths
  const [mode, setMode] = useState<'academy' | 'challenges' | 'rolepaths'>('academy');
  const [previousMode, setPreviousMode] = useState<'academy' | 'challenges' | 'rolepaths'>('rolepaths');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Challenges state
  const [items, setItems] = useState<Challenge[]>([]);
  const [resources, setResources] = useState<LearningResource[]>(BUILTIN_RESOURCES);
  const [selectedChallenge, setSelectedChallenge] = useState<BuiltinChallenge | Challenge | null>(BUILTIN_CHALLENGES[0]);
  const [code, setCode] = useState(BUILTIN_CHALLENGES[0].starterCode);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');

  useEffect(() => {
    if (params.challengeTitle) {
      setMode('challenges');
      const titleStr = String(params.challengeTitle);
      const descStr = String(params.challengeDescription || 'Complete this exercise based on your lecture notes.');
      const langStr = params.language || 'JavaScript';
      const customChallenge: BuiltinChallenge = {
        id: `lecture-${Date.now()}`,
        title: titleStr,
        description: descStr,
        difficulty: 'MEDIUM',
        language: langStr,
        xpReward: 50,
        starterCode: params.starterCode || `// ${titleStr}\n// ${descStr}\n\nfunction solution() {\n  // Write your code here\n}\n`,
        solution: `// Verified solution for ${titleStr}\nfunction solution() {\n  return true;\n}`,
        hint: params.challengeHint ? String(params.challengeHint) : 'Refer to your lecture study pack for guidance.',
      };
      setSelectedChallenge(customChallenge);
      setCode(customChallenge.starterCode);
    }
  }, [params.challengeTitle, params.challengeDescription, params.challengeHint, params.language, params.starterCode]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [showHint, setShowHint] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<ChallengeEvaluation | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Role paths and daily flashcards
  const [rolePaths, setRolePaths] = useState<RolePath[]>(BUILTIN_ROLE_PATHS);
  const [activeTrackId, setActiveTrackId] = useState<string>('backend-intern');
  const [selectedRolePathModal, setSelectedRolePathModal] = useState<RolePath | null>(null);
  const [activeRolePath, setActiveRolePath] = useState<RolePath | null>(null);
  const [enrolledToast, setEnrolledToast] = useState<string>('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardMessage, setFlashcardMessage] = useState('');

  // Tutorials quiz state
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const [refreshing, setRefreshing] = useState(false);

  // Restore active role path from SecureStore
  useEffect(() => {
    SecureStore.getItemAsync('synergysphere.active_role_path')
      .then((val) => {
        if (val) setActiveTrackId(val);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const [challengesData, learningData, rolePathsData, flashcardsData] = await Promise.allSettled([
        api.get<Challenge[]>('/challenges'),
        api.get<LearningResource[]>('/learning'),
        api.get<{ paths: RolePath[] }>('/curriculum/role-paths'),
        api.get<{ flashcards: Flashcard[]; totalDue: number }>('/curriculum/flashcards/daily-review'),
      ]);

      if (challengesData.status === 'fulfilled' && challengesData.value.length > 0) {
        setItems(challengesData.value);
      }
      if (learningData.status === 'fulfilled' && Array.isArray(learningData.value) && learningData.value.length > 0) {
        setResources(learningData.value);
      } else {
        setResources(BUILTIN_RESOURCES);
      }
      if (rolePathsData.status === 'fulfilled' && Array.isArray(rolePathsData.value?.paths) && rolePathsData.value.paths.length > 0) {
        setRolePaths(rolePathsData.value.paths.map(normalizeRolePath).filter((path): path is RolePath => path !== null));
      } else {
        setRolePaths(BUILTIN_ROLE_PATHS);
      }
      if (flashcardsData.status === 'fulfilled' && flashcardsData.value?.flashcards) {
        setFlashcards(flashcardsData.value.flashcards);
      }
    } catch {
      setResources(BUILTIN_RESOURCES);
    } finally {
      setLoaded(true);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  function handleOpenLessonFromPath(path: RolePath, lessonId?: string) {
    const nextUncompleted = path.syllabus?.find((l) => !l.completed);
    const targetId = lessonId || nextUncompleted?.id || path.curatedLessonIds?.[0] || path.syllabus?.[0]?.id || 'java-java-tutorial-java-introduction';
    setActiveRolePath(path);
    setPreviousMode('rolepaths');
    setSelectedRolePathModal(null);
    setSelectedLessonId(targetId);
  }

  function handleLaunchChallengeFromPath(ch: RolePathChallenge) {
    const match = allChallenges.find(
      (c) => c.id === ch.id || c.title.toLowerCase() === ch.title.toLowerCase()
    );
    if (match) {
      selectChallenge(match);
    } else {
      const fallbackCh: BuiltinChallenge = {
        id: ch.id,
        title: ch.title || ch.id,
        difficulty: ch.difficulty || 'MEDIUM',
        description: `Implement the algorithm or query solution for ${ch.title || ch.id} to satisfy verified unit test requirements.`,
        language: ch.id.startsWith('sql') ? 'SQL' : ch.id.startsWith('py') ? 'Python' : ch.id.startsWith('java') ? 'Java' : 'JavaScript',
        starterCode: ch.id.startsWith('sql')
          ? 'SELECT country, COUNT(*) AS count\nFROM users\nGROUP BY country;'
          : ch.id.startsWith('py')
          ? 'def solve():\n    pass\n'
          : 'function solve() {\n  // Write solution here\n}\n',
        hint: 'Deconstruct inputs and handle boundary conditions.',
        xpReward: ch.xpReward || 50,
      };
      selectChallenge(fallbackCh);
    }
    setSelectedRolePathModal(null);
    setMode('challenges');
  }

  function handleLaunchInterviewFromPath(path: RolePath) {
    setSelectedRolePathModal(null);
    router.push('/interviews' as never);
  }

  function handleSetActiveGoal(pathId: string, pathTitle: string) {
    setActiveTrackId(pathId);
    setEnrolledToast(`🎯 Set "${pathTitle}" as your active career focus goal!`);
    SecureStore.setItemAsync('synergysphere.active_role_path', pathId).catch(() => {});
    setTimeout(() => setEnrolledToast(''), 4000);
  }

  const [showQuestionPicker, setShowQuestionPicker] = useState(false);

  // Combine builtin and API challenges
  const allChallenges = [
    ...BUILTIN_CHALLENGES,
    ...items.filter((item) => !BUILTIN_CHALLENGES.some((b) => b.id === item.id)),
  ];

  const filteredChallenges = allChallenges.filter((ch) => {
    const langMatch = selectedLanguage === 'All' || (ch.language || '').toLowerCase() === selectedLanguage.toLowerCase();
    const diffMatch = selectedDifficulty === 'ALL' || ch.difficulty.toUpperCase() === selectedDifficulty;
    return langMatch && diffMatch;
  });

  // Questions scoped to the active language for Challenge Studio Prev/Next & Question Picker
  const studioQuestions = (() => {
    const activeLang = selectedLanguage !== 'All' ? selectedLanguage : (selectedChallenge?.language || 'JavaScript');
    const langScoped = allChallenges.filter((ch) => {
      const langMatch = (ch.language || '').toLowerCase() === activeLang.toLowerCase();
      const diffMatch = selectedDifficulty === 'ALL' || ch.difficulty.toUpperCase() === selectedDifficulty;
      return langMatch && diffMatch;
    });
    return langScoped.length > 0 ? langScoped : filteredChallenges;
  })();

  const currentQuestionIndex = selectedChallenge
    ? Math.max(0, studioQuestions.findIndex((c) => c.id === selectedChallenge.id))
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

  const filteredResources = resources.filter((resource) =>
    isResourceMatchingLanguage(resource, selectedLanguage)
  );

  useEffect(() => {
    if (filteredChallenges.length > 0) {
      const isSelectedStillValid = selectedChallenge && filteredChallenges.some((c) => c.id === selectedChallenge.id);
      if (!isSelectedStillValid) {
        selectChallenge(filteredChallenges[0]);
      }
    } else if (selectedLanguage !== 'All') {
      const langMatches = allChallenges.filter(
        (c) => (c.language || '').toLowerCase() === selectedLanguage.toLowerCase()
      );
      if (langMatches.length > 0 && (!selectedChallenge || (selectedChallenge.language || '').toLowerCase() !== selectedLanguage.toLowerCase())) {
        selectChallenge(langMatches[0]);
      }
    }
  }, [selectedLanguage, selectedDifficulty, allChallenges.length]);

  function handleSelectLanguage(lang: string) {
    setSelectedLanguage(lang);
    const nextFiltered = allChallenges.filter((ch) => {
      const langMatch = lang === 'All' || (ch.language || '').toLowerCase() === lang.toLowerCase();
      const diffMatch = selectedDifficulty === 'ALL' || ch.difficulty.toUpperCase() === selectedDifficulty;
      return langMatch && diffMatch;
    });
    if (nextFiltered.length > 0) {
      selectChallenge(nextFiltered[0]);
    } else {
      const langOnly = allChallenges.filter((ch) => (ch.language || '').toLowerCase() === lang.toLowerCase());
      if (langOnly.length > 0) {
        setSelectedDifficulty('ALL');
        selectChallenge(langOnly[0]);
      }
    }
  }

  function handleSelectDifficulty(diff: string) {
    setSelectedDifficulty(diff);
    const nextFiltered = allChallenges.filter((ch) => {
      const langMatch = selectedLanguage === 'All' || (ch.language || '').toLowerCase() === selectedLanguage.toLowerCase();
      const diffMatch = diff === 'ALL' || ch.difficulty.toUpperCase() === diff;
      return langMatch && diffMatch;
    });
    if (nextFiltered.length > 0) {
      selectChallenge(nextFiltered[0]);
    }
  }

  function selectChallenge(ch: BuiltinChallenge | Challenge) {
    setSelectedChallenge(ch);
    setCode(ch.starterCode || '// Write your solution here…\n');
    setShowHint(false);
    setShowBlueprint(false);
    setShowQuestionPicker(false);
    setTestOutput(null);
    setResult('');
    setError('');
  }

  function handleResetCode() {
    if (!selectedChallenge) return;
    setCode(selectedChallenge.starterCode || '');
    setTestOutput(null);
    setResult('');
    setError('');
  }

  async function handleRunTests() {
    if (!selectedChallenge || !code.trim()) return;
    setTesting(true);
    setTestOutput(null);
    try {
      const response = await api.post<{
        passed: boolean;
        output: string;
        error?: string;
        testResults?: Array<{ label: string; passed: boolean; expected?: unknown; got?: unknown; error?: string }>;
        solution?: string;
      }>(`/challenges/${selectedChallenge.id}/test`, {
        code,
        language: selectedChallenge.language || 'JavaScript',
      });
      const statusIcon = response.passed ? '✓' : '✗';
      setTestOutput(
        `${statusIcon} Server Judge: ${response.passed ? 'PASSED' : 'FAILED'}\n${response.output || ''}${
          response.error ? `\nError: ${response.error}` : ''
        }`
      );
      setEvaluation({
        action: 'test',
        passed: response.passed,
        title: response.passed ? 'RIGHT! All Tests Passed' : 'WRONG! Some Tests Failed',
        message: response.passed
          ? 'Great job! Your code produced the expected output on all test assertions.'
          : 'Your code did not satisfy all test assertions. Review the test breakdown and error logs below.',
        output: response.output,
        testResults: response.testResults,
        solution: response.solution || (selectedChallenge as BuiltinChallenge).solution || null,
      });
    } catch (err: any) {
      setEvaluation({
        action: 'test',
        passed: false,
        title: 'WRONG! Test Execution Failed',
        message: err?.message || 'Could not verify solution with server judge.',
        solution: (selectedChallenge as BuiltinChallenge).solution || null,
      });
      setTestOutput(`✗ Execution Error: ${err?.message || 'Could not verify solution with server judge.'}`);
    } finally {
      setTesting(false);
    }
  }

  async function submitSolution() {
    if (!selectedChallenge || !code.trim()) return;
    setSubmitting(true);
    setError('');
    setResult('');
    try {
      const response = await api.post<{
        passed: boolean;
        xpEarned: number;
        output?: string;
        testResults?: Array<{ label: string; passed: boolean; expected?: unknown; got?: unknown; error?: string }>;
        solution?: string;
      }>(
        `/challenges/${selectedChallenge.id}/submit`,
        { code, language: selectedChallenge.language || 'JavaScript' },
      );

      const refSolution = response.solution || (selectedChallenge as BuiltinChallenge).solution || null;

      if (response.passed) {
        setResult(`🎉 All server tests passed! You earned +${response.xpEarned} XP.`);
        setEvaluation({
          action: 'submit',
          passed: true,
          title: 'RIGHT! Solution Accepted',
          message: `Congratulations! Your solution passed all test cases. You earned +${response.xpEarned} XP!`,
          xpEarned: response.xpEarned,
          testResults: response.testResults,
          output: response.output,
          solution: refSolution,
        });
      } else {
        const details =
          response.testResults
            ?.map((t) => `${t.passed ? '✓' : '✗'} ${t.label}${t.error ? `: ${t.error}` : ''}`)
            .join('\n') || response.output || 'Solution did not pass all hidden server tests.';
        setError(`Failed server validation:\n${details}`);
        setEvaluation({
          action: 'submit',
          passed: false,
          title: 'WRONG! Solution Rejected',
          message: 'Your submitted code failed one or more unit tests. You can review the reference solution below to see how to solve it correctly.',
          testResults: response.testResults,
          output: response.output,
          solution: refSolution,
        });
      }
    } catch (err: any) {
      const refSolution = (selectedChallenge as BuiltinChallenge).solution || null;
      setError(err?.message || 'Submission failed. The server judge could not be reached.');
      setEvaluation({
        action: 'submit',
        passed: false,
        title: 'WRONG! Submission Verification Failed',
        message: err?.message || 'Submission failed. Check network or judge server.',
        solution: refSolution,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRateFlashcard(rating: 1 | 3 | 5) {
    const card = flashcards[currentFlashcardIndex];
    if (!card) return;
    try {
      await api.post('/curriculum/flashcards/review', {
        cardId: card.id,
        rating,
      });
      setFlashcardMessage(rating === 5 ? '✓ Easy — scheduled for later' : '✓ Reviewed — queued according to SM-2');
      setTimeout(() => {
        setFlashcardMessage('');
        setIsFlipped(false);
        if (currentFlashcardIndex + 1 < flashcards.length) {
          setCurrentFlashcardIndex((prev) => prev + 1);
        } else {
          setFlashcardMessage('🎉 Daily review complete! All spaced cards mastered.');
        }
      }, 700);
    } catch {
      setIsFlipped(false);
      if (currentFlashcardIndex + 1 < flashcards.length) {
        setCurrentFlashcardIndex((prev) => prev + 1);
      }
    }
  }

  async function checkResource(resource: LearningResource) {
    const answer = answers[resource.id];
    if (answer === undefined) return;
    setChecked((current) => ({ ...current, [resource.id]: true }));
    if (answer !== resource.answer) {
      // Incorrect answer: do NOT disable options, allow retrying!
      return;
    }
    // Correct answer: mark complete, award XP!
    try {
      const response = await api.post<{ xpEarned: number }>(`/learning/${resource.id}/complete`);
      setResources((current) => current.map((item) => (item.id === resource.id ? { ...item, completed: true } : item)));
      setResult(`🎉 Correct! You earned +${response.xpEarned || resource.xpReward} XP.`);
    } catch {
      setResources((current) => current.map((item) => (item.id === resource.id ? { ...item, completed: true } : item)));
      setResult(`🎉 Correct! You earned +${resource.xpReward} XP.`);
    }
  }

  function handleRetryResource(resourceId: string) {
    setChecked((current) => ({ ...current, [resourceId]: false }));
  }

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* LEARNING HUB HEADER */}
      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <View
          style={[
            styles.learningHubLogoWrapper,
            largerText && styles.learningHubLogoWrapperLarge,
            {
              backgroundColor:
                theme === 'dark'
                  ? 'rgba(16, 33, 40, 0.7)'
                  : 'rgba(237, 243, 239, 0.85)',
              borderColor:
                theme === 'dark'
                  ? 'rgba(145, 219, 94, 0.28)'
                  : 'rgba(145, 219, 94, 0.45)',
              shadowColor: theme === 'dark' ? '#91db5e' : '#10231D',
            },
          ]}
        >
          <Image
            source={require('../../../assets/images/learning-hub-logo.png')}
            style={[
              styles.learningHubLogo,
              largerText && styles.learningHubLogoLarge,
            ]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.headerText}>
          <Text
            allowFontScaling
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontSize: fontSize(24),
              },
            ]}
          >
            Learning{'\n'}Hub
          </Text>

          <Text
            allowFontScaling
            numberOfLines={2}
            style={[
              styles.headerSubtitle,
              {
                color: colors.muted,
                fontSize: fontSize(13),
                lineHeight: fontSize(18),
              },
            ]}
          >
            Explore structured programming tracks from W3Schools and master hands-on code challenges.
          </Text>
        </View>
      </View>

      {/* Mode Switcher Tabs */}
      <View style={styles.modeTabs}>
        <Pressable
          onPress={() => setMode('academy')}
          style={({ pressed }) => [
            styles.modeTab,
            mode === 'academy'
              ? [styles.modeTabActive, { backgroundColor: primaryAccent }]
              : [styles.modeTabInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="school-outline"
            size={18}
            color={mode === 'academy' ? '#ffffff' : colors.muted}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: mode === 'academy' ? '#ffffff' : colors.text },
            ]}
            numberOfLines={2}
          >
            Programming Academy
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('challenges')}
          style={({ pressed }) => [
            styles.modeTab,
            mode === 'challenges'
              ? [styles.modeTabActive, { backgroundColor: primaryAccent }]
              : [styles.modeTabInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="trophy-outline"
            size={18}
            color={mode === 'challenges' ? '#ffffff' : colors.muted}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: mode === 'challenges' ? '#ffffff' : colors.text },
            ]}
            numberOfLines={2}
          >
            Coding Challenges
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('rolepaths')}
          style={({ pressed }) => [
            styles.modeTab,
            mode === 'rolepaths'
              ? [styles.modeTabActive, { backgroundColor: primaryAccent }]
              : [styles.modeTabInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="git-network-outline"
            size={18}
            color={mode === 'rolepaths' ? '#ffffff' : colors.muted}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: mode === 'rolepaths' ? '#ffffff' : colors.text },
            ]}
            numberOfLines={2}
          >
            Role Paths
          </Text>
        </Pressable>
      </View>

      {error ? <Notice>{error}</Notice> : null}
      {result ? <Notice tone="success">{result}</Notice> : null}

      {/* Mode: Programming Academy (W3Schools) or Active Lesson */}
      {selectedLessonId ? (
        <LessonViewer
          lessonId={selectedLessonId}
          rolePath={activeRolePath}
          onLessonCompleted={(completedLessonId) => {
            setRolePaths((prevPaths) =>
              prevPaths.map((rp) => {
                const hasLesson = rp.syllabus.some((l) => l.id === completedLessonId);
                if (!hasLesson && rp.id !== activeRolePath?.id) return rp;
                const updatedSyllabus = rp.syllabus.map((item) =>
                  item.id === completedLessonId ? { ...item, completed: true } : item
                );
                const completedCount = updatedSyllabus.filter((l) => l.completed).length;
                const percent = Math.min(100, Math.round((completedCount / Math.max(updatedSyllabus.length, 1)) * 100));
                const updated = {
                  ...rp,
                  syllabus: updatedSyllabus,
                  completedLessons: completedCount,
                  percent,
                };
                if (activeRolePath && activeRolePath.id === rp.id) {
                  setActiveRolePath(updated);
                }
                return updated;
              })
            );
          }}
          onBack={() => {
            setSelectedLessonId(null);
            if (activeRolePath) {
              setMode('rolepaths');
              // Return directly to the "Curated Step-by-Step Curriculum" roadmap page
              const targetPath = rolePaths.find((rp) => rp.id === activeRolePath.id) || activeRolePath;
              setSelectedRolePathModal(targetPath);
            }
          }}
          onNavigateLesson={(nextId) => setSelectedLessonId(nextId)}
        />
      ) : mode === 'academy' ? (
        <CurriculumDashboard
          onSelectLesson={(lessonId) => {
            setActiveRolePath(null);
            setPreviousMode('academy');
            setSelectedLessonId(lessonId);
          }}
        />
      ) : null}

      {/* Mode: Coding Challenges Studio */}
      {mode === 'challenges' && !selectedLessonId ? (
        <>
          {/* Languages Filter Scroll */}
          <Text style={[styles.section, { color: colors.text }]}>Languages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {ALL_LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => handleSelectLanguage(lang)}
                style={({ pressed }) => [
                  styles.filterChip,
                  selectedLanguage === lang
                    ? [styles.filterChipActive, { backgroundColor: primaryAccent }]
                    : [styles.filterChipInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedLanguage === lang ? '#ffffff' : colors.text },
                  ]}
                >
                  {lang}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Difficulty Filter */}
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((diff) => (
              <Pressable
                key={diff}
                onPress={() => handleSelectDifficulty(diff)}
                style={({ pressed }) => [
                  styles.diffChip,
                  selectedDifficulty === diff
                    ? [styles.diffChipActive, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', borderColor: primaryAccent }]
                    : [styles.diffChipInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.diffChipText,
                    { color: selectedDifficulty === diff ? primaryAccent : colors.muted },
                  ]}
                >
                  {diff}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Challenge Selector */}
          <Text style={[styles.section, { color: colors.text }]}>Challenges ({filteredChallenges.length})</Text>
          {filteredChallenges.length === 0 ? (
            <Card style={styles.emptyFilterCard}>
              <Ionicons name="filter-outline" size={24} color={colors.muted} />
              <Text style={[styles.emptyFilterTitle, { color: colors.text }]}>
                No {selectedDifficulty !== 'ALL' ? selectedDifficulty : ''} challenges found for {selectedLanguage}
              </Text>
              <Text style={[styles.emptyFilterSub, { color: colors.muted }]}>
                Try selecting "ALL" difficulties or another programming language.
              </Text>
              <Pressable
                onPress={() => {
                  setSelectedLanguage('All');
                  setSelectedDifficulty('ALL');
                }}
                style={[styles.resetFilterBtn, { backgroundColor: primaryAccent }]}
              >
                <Text style={styles.resetFilterBtnText}>Reset Filters</Text>
              </Pressable>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengesScroll}>
              {filteredChallenges.map((ch) => {
                const diffColor =
                  ch.difficulty.toUpperCase() === 'EASY'
                    ? '#16a34a'
                    : ch.difficulty.toUpperCase() === 'MEDIUM'
                    ? '#d97706'
                    : '#dc2626';
                return (
                  <Pressable
                    key={ch.id}
                    onPress={() => selectChallenge(ch)}
                    style={({ pressed }) => [
                      styles.challengeCard,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                      selectedChallenge?.id === ch.id && { borderColor: primaryAccent, borderWidth: 2 },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.chCardHeader}>
                      <Text style={[styles.chCardLang, { color: primaryAccent }]}>{ch.language || 'Code'}</Text>
                      <View style={[styles.chXpBadge, { backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)' }]}>
                        <Text style={[styles.chXpText, { color: primaryAccent }]}>+{ch.xpReward} XP</Text>
                      </View>
                    </View>
                    <Text style={[styles.chCardTitle, { color: colors.text }]} numberOfLines={1}>{ch.title}</Text>
                    <View style={styles.diffBadgeRow}>
                      <View style={[styles.diffIndicatorDot, { backgroundColor: diffColor }]} />
                      <Text style={[styles.chCardDiff, { color: diffColor, fontWeight: '700' }]}>{ch.difficulty}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Active Challenge Studio */}
          {selectedChallenge ? (
            <>
              <Text style={[styles.section, { color: colors.text }]}>Challenge Studio</Text>
              <Card>
                {/* Challenge Studio Question Switcher & Prev/Next Bar */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    marginBottom: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceElevated,
                  }}
                >
                  <Pressable
                    onPress={goToPrevQuestion}
                    disabled={studioQuestions.length <= 1}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: studioQuestions.length <= 1 ? 0.4 : pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="chevron-back" size={14} color={colors.text} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Prev</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setShowQuestionPicker((prev) => !prev)}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 12, fontWeight: '700', color: primaryAccent }}
                    >
                      Q{currentQuestionIndex + 1}/{studioQuestions.length} ({selectedChallenge.language || 'Code'}) · Change
                    </Text>
                    <Ionicons
                      name={showQuestionPicker ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={primaryAccent}
                    />
                  </Pressable>

                  <Pressable
                    onPress={goToNextQuestion}
                    disabled={studioQuestions.length <= 1}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: primaryAccent,
                        backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)',
                        opacity: studioQuestions.length <= 1 ? 0.4 : pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: primaryAccent }}>Next</Text>
                    <Ionicons name="chevron-forward" size={14} color={primaryAccent} />
                  </Pressable>
                </View>

                {showQuestionPicker ? (
                  <View
                    style={{
                      maxHeight: 220,
                      marginBottom: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      padding: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>
                      SELECT {selectedChallenge.language?.toUpperCase() || 'CODING'} QUESTION ({studioQuestions.length} AVAILABLE):
                    </Text>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                      {studioQuestions.map((q, idx) => {
                        const isCurrent = q.id === selectedChallenge.id;
                        return (
                          <Pressable
                            key={q.id}
                            onPress={() => selectChallenge(q)}
                            style={({ pressed }) => [
                              {
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingVertical: 8,
                                paddingHorizontal: 10,
                                borderRadius: 8,
                                marginBottom: 4,
                                backgroundColor: isCurrent
                                  ? isLight
                                    ? '#E2F5DA'
                                    : 'rgba(30, 104, 39, 0.28)'
                                  : 'transparent',
                                opacity: pressed ? 0.7 : 1,
                              },
                            ]}
                          >
                            <Text
                              numberOfLines={1}
                              style={{
                                flex: 1,
                                fontSize: 12,
                                fontWeight: isCurrent ? '700' : '500',
                                color: isCurrent ? primaryAccent : colors.text,
                              }}
                            >
                              {idx + 1}. {q.title}
                            </Text>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted, marginLeft: 8 }}>
                              {q.difficulty}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                <View style={styles.studioHeader}>
                  <View style={styles.studioTitleWrap}>
                    <Text style={[styles.studioTitle, { color: colors.text }]}>{selectedChallenge.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <View
                        style={[
                          styles.diffBadgeMicro,
                          {
                            backgroundColor:
                              selectedChallenge.difficulty.toUpperCase() === 'EASY'
                                ? '#16a34a'
                                : selectedChallenge.difficulty.toUpperCase() === 'MEDIUM'
                                ? '#d97706'
                                : '#dc2626',
                          },
                        ]}
                      >
                        <Text style={styles.diffBadgeMicroText}>{selectedChallenge.difficulty}</Text>
                      </View>
                      <Text style={[styles.studioMeta, { color: primaryAccent }]}>
                        {selectedChallenge.language || 'Programming'} · +{selectedChallenge.xpReward} XP
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={handleResetCode}
                    style={({ pressed }) => [
                      styles.resetBtn,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="refresh-outline" size={14} color={colors.muted} />
                    <Text style={[styles.resetText, { color: colors.muted }]}>Reset</Text>
                  </Pressable>
                </View>

                <Text style={[styles.description, { color: colors.muted }]}>{selectedChallenge.description}</Text>

                {/* Real-Time GeeksforGeeks Live Code Hint & Progress */}
                {(() => {
                  const liveHint = getRealtimeHint(code, selectedChallenge);
                  if (!liveHint) return null;
                  return (
                    <View
                      style={[
                        styles.realtimeHintCard,
                        {
                          backgroundColor:
                            liveHint.badgeTone === 'success'
                              ? (isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.22)')
                              : (isLight ? '#EFF6FF' : 'rgba(30, 58, 138, 0.22)'),
                          borderColor:
                            liveHint.badgeTone === 'success' ? primaryAccent : (isLight ? '#93C5FD' : '#3B82F6'),
                        },
                      ]}
                    >
                      <View style={styles.realtimeHintHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons
                            name={liveHint.badgeTone === 'success' ? 'checkmark-circle' : 'bulb'}
                            size={16}
                            color={liveHint.badgeTone === 'success' ? primaryAccent : '#2563EB'}
                          />
                          <Text style={[styles.realtimeHintTitle, { color: colors.text }]}>
                            GeeksforGeeks Live Hint & Feedback
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.realtimeStatusPill,
                            {
                              backgroundColor:
                                liveHint.badgeTone === 'success'
                                  ? (isLight ? '#C8E6C9' : '#14532D')
                                  : (isLight ? '#DBEAFE' : '#1E3A8A'),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.realtimeStatusText,
                              { color: liveHint.badgeTone === 'success' ? '#166534' : '#1D4ED8' },
                            ]}
                          >
                            {liveHint.statusBadge}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.realtimeMessage, { color: colors.text }]}>
                        {liveHint.message}
                      </Text>

                      {/* Real-time Checklist */}
                      <View style={styles.realtimeChecklist}>
                        {liveHint.checks.map((chk) => (
                          <View key={chk.label} style={styles.realtimeCheckItem}>
                            <Ionicons
                              name={chk.passed ? 'checkmark-circle' : 'ellipse-outline'}
                              size={14}
                              color={chk.passed ? '#16A34A' : colors.muted}
                            />
                            <Text
                              style={[
                                styles.realtimeCheckText,
                                { color: chk.passed ? colors.text : colors.muted },
                              ]}
                            >
                              {chk.label}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Expandable Blueprint */}
                      {'approach' in selectedChallenge && selectedChallenge.approach ? (
                        <Pressable
                          onPress={() => setShowBlueprint(!showBlueprint)}
                          style={({ pressed }) => [
                            styles.blueprintToggle,
                            { borderColor: colors.border },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Ionicons name="git-network-outline" size={14} color={primaryAccent} />
                          <Text style={[styles.blueprintToggleText, { color: primaryAccent }]}>
                            {showBlueprint ? 'Hide Algorithm Blueprint' : 'GeeksforGeeks Algorithm Blueprint'}
                          </Text>
                          <Ionicons
                            name={showBlueprint ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={primaryAccent}
                          />
                        </Pressable>
                      ) : null}

                      {showBlueprint && 'approach' in selectedChallenge ? (
                        <View style={[styles.blueprintBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Text style={[styles.blueprintHeading, { color: colors.text }]}>Approach:</Text>
                          <Text style={[styles.blueprintBody, { color: colors.muted }]}>{selectedChallenge.approach}</Text>
                          <View style={styles.complexityRow}>
                            <Text style={[styles.complexityText, { color: primaryAccent }]}>
                              Time: {selectedChallenge.timeComplexity || 'O(N)'}
                            </Text>
                            <Text style={[styles.complexityText, { color: primaryAccent }]}>
                              Space: {selectedChallenge.spaceComplexity || 'O(1)'}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })()}

                {/* Hint Accordion */}
                {'hint' in selectedChallenge && selectedChallenge.hint ? (
                  <View style={styles.hintWrap}>
                    <Pressable
                      onPress={() => setShowHint(!showHint)}
                      style={({ pressed }) => [
                        styles.hintToggle,
                        { backgroundColor: isLight ? '#FFF8E1' : '#2A2410', borderColor: '#F59E0B' },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
                      <Text style={[styles.hintToggleText, { color: '#F59E0B' }]}>
                        {showHint ? 'Hide Static Hint' : 'Show Hint'}
                      </Text>
                    </Pressable>
                    {showHint ? (
                      <View style={[styles.hintBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={[styles.hintContent, { color: colors.text }]}>{selectedChallenge.hint}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Live Pair-Programming Room Bar */}
                <LiveCodeRoomBar
                  challengeId={selectedChallenge.id}
                  language={selectedChallenge.language || undefined}
                  code={code}
                  onRemoteCodeChange={(nextCode) => setCode(nextCode)}
                />

                {/* Mobile Keyboard Coding Accessory Symbols Bar */}
                <View style={{ marginBottom: 8 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                    {['{', '}', '(', ')', '[', ']', ';', '=>', '=', '!=', '<', '>', ':', '"', "'", 'tab', 'return', 'function', 'def', 'const', 'let'].map((sym) => (
                      <Pressable
                        key={sym}
                        onPress={() => {
                          if (sym === 'tab') {
                            setCode((prev) => prev + '  ');
                          } else {
                            setCode((prev) => prev + sym);
                          }
                        }}
                        style={({ pressed }) => [
                          {
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: isLight ? '#E5E7EB' : '#141d24',
                            borderWidth: 1,
                            borderColor: isLight ? '#D1D5DB' : '#23303b',
                          },
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: '700', color: primaryAccent }}>
                          {sym}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Code Editor */}
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  multiline
                  style={[styles.codeEditor, { backgroundColor: isLight ? '#F5F5F5' : '#050a0d', color: primaryAccent }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Test Output */}
                {testOutput ? (
                  <View style={[styles.outputBox, { backgroundColor: isLight ? '#E8F5E9' : '#0a1a0f', borderColor: primaryAccent }]}>
                    <Text style={[styles.outputText, { color: primaryAccent }]}>{testOutput}</Text>
                  </View>
                ) : null}

                {/* Action Controls */}
                <View style={styles.studioActions}>
                  <Button
                    title={testing ? 'Testing…' : 'Run Tests'}
                    secondary
                    onPress={handleRunTests}
                    disabled={testing || submitting}
                  />
                  <Button
                    title={submitting ? 'Submitting…' : 'Submit Solution'}
                    onPress={submitSolution}
                    disabled={submitting || !code.trim()}
                  />
                </View>

                <Pressable
                  onPress={goToNextQuestion}
                  disabled={studioQuestions.length <= 1}
                  style={({ pressed }) => [
                    {
                      marginTop: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: primaryAccent,
                      backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.12)',
                      opacity: studioQuestions.length <= 1 ? 0.45 : pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: primaryAccent }}>
                    Next Question in {selectedChallenge.language || 'Track'} ({currentQuestionIndex + 1}/{studioQuestions.length})
                  </Text>
                  <Ionicons name="arrow-forward" size={15} color={primaryAccent} />
                </Pressable>

                {/* Prominent Right / Wrong Submission Feedback Card */}
                {evaluation ? (
                  <View
                    style={[
                      styles.evaluationCard,
                      {
                        backgroundColor: evaluation.passed
                          ? isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.12)'
                          : isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
                        borderColor: evaluation.passed ? '#10B981' : '#EF4444',
                      },
                    ]}
                  >
                    <View style={styles.evaluationHeaderRow}>
                      <Ionicons
                        name={evaluation.passed ? 'checkmark-circle' : 'close-circle'}
                        size={24}
                        color={evaluation.passed ? '#10B981' : '#EF4444'}
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text
                          style={[
                            styles.evaluationTitle,
                            { color: evaluation.passed ? (isLight ? '#065F46' : '#34D399') : (isLight ? '#991B1B' : '#F87171') },
                          ]}
                        >
                          {evaluation.title}
                        </Text>
                        {evaluation.message ? (
                          <Text style={[styles.evaluationMessage, { color: colors.text }]}>
                            {evaluation.message}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Test Cases Breakdown */}
                    {evaluation.testResults && evaluation.testResults.length > 0 ? (
                      <View style={styles.testResultsList}>
                        <Text style={[styles.testResultsHeading, { color: colors.text }]}>Test Verification Breakdown:</Text>
                        {evaluation.testResults.map((t, idx) => (
                          <View key={idx} style={styles.testResultRow}>
                            <Ionicons
                              name={t.passed ? 'checkmark-circle' : 'close-circle'}
                              size={16}
                              color={t.passed ? '#10B981' : '#EF4444'}
                            />
                            <Text style={[styles.testResultLabel, { color: t.passed ? (isLight ? '#047857' : '#6EE7B7') : (isLight ? '#B91C1C' : '#FCA5A5') }]}>
                              {t.label} {t.passed ? '(Passed)' : '(Failed)'}
                            </Text>
                            {t.error ? <Text style={styles.testResultError}>- {t.error}</Text> : null}
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Solution Unlock & Reference Viewer */}
                <View style={{ marginTop: 12 }}>
                  <Pressable
                    onPress={() => setShowSolution((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.solutionToggleBtn,
                      {
                        backgroundColor: showSolution
                          ? (isLight ? '#E5E7EB' : '#1f2937')
                          : (isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)'),
                        borderColor: isLight ? '#10B981' : '#059669',
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name={showSolution ? 'eye-off-outline' : 'bulb'} size={18} color={primaryAccent} />
                    <Text style={[styles.solutionToggleText, { color: primaryAccent }]}>
                      {showSolution ? 'Hide Reference Solution' : '💡 View Reference Solution'}
                    </Text>
                  </Pressable>

                  {showSolution ? (
                    <View style={[styles.solutionContainer, { backgroundColor: isLight ? '#F9FAFB' : '#0b131a', borderColor: colors.border }]}>
                      <View style={styles.solutionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
                          <Text style={[styles.solutionHeaderTitle, { color: colors.text }]}>
                            Verified Reference Solution
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            const sol =
                              (selectedChallenge as BuiltinChallenge).solution ||
                              (selectedChallenge as any).solution ||
                              evaluation?.solution ||
                              selectedChallenge.starterCode;
                            if (sol) {
                              setCode(sol);
                              setResult('✓ Loaded reference solution into editor!');
                              setTimeout(() => setResult(''), 3000);
                            }
                          }}
                          style={({ pressed }) => [
                            styles.loadSolutionBtn,
                            { backgroundColor: primaryAccent },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Ionicons name="code-download-outline" size={14} color="#FFF" />
                          <Text style={styles.loadSolutionBtnText}>Load into Editor</Text>
                        </Pressable>
                      </View>

                      <Text
                        selectable
                        style={[
                          styles.solutionCodeBlock,
                          {
                            backgroundColor: isLight ? '#1E293B' : '#050a0d',
                            color: '#10B981',
                          },
                        ]}
                      >
                        {(selectedChallenge as BuiltinChallenge).solution ||
                          (selectedChallenge as any).solution ||
                          evaluation?.solution ||
                          selectedChallenge.starterCode}
                      </Text>

                      {selectedChallenge.approach ? (
                        <View style={styles.solutionApproachBox}>
                          <Text style={[styles.solutionApproachTitle, { color: colors.text }]}>
                            Algorithmic Approach & Key Invariants:
                          </Text>
                          <Text style={[styles.solutionApproachText, { color: colors.muted }]}>
                            {selectedChallenge.approach}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.complexityRow}>
                        {selectedChallenge.timeComplexity ? (
                          <View style={[styles.complexityChip, { backgroundColor: isLight ? '#EFF6FF' : '#1e3a5f' }]}>
                            <Text style={[styles.complexityChipText, { color: '#3B82F6' }]}>
                              Time: {selectedChallenge.timeComplexity}
                            </Text>
                          </View>
                        ) : null}
                        {selectedChallenge.spaceComplexity ? (
                          <View style={[styles.complexityChip, { backgroundColor: isLight ? '#FDF2F8' : '#4c1d3d' }]}>
                            <Text style={[styles.complexityChipText, { color: '#EC4899' }]}>
                              Space: {selectedChallenge.spaceComplexity}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Stuck? Paste Challenge Studio Code to AI Code Context & Get Insights */}
                <Pressable
                  onPress={() => {
                    if (selectedChallenge) {
                      const codeToSend = code.trim() || selectedChallenge.starterCode || '';
                      router.push({
                        pathname: '/ai-assistant',
                        params: {
                          tab: 'codeContext',
                          challengeTitle: selectedChallenge.title,
                          challengeDescription: selectedChallenge.description,
                          language: selectedChallenge.language || 'JavaScript',
                          code: codeToSend,
                          autoAsk: 'true',
                          ts: String(Date.now()),
                        },
                      });
                    } else {
                      router.push('/ai-assistant');
                    }
                  }}
                  style={({ pressed }) => [
                    styles.aiHelpRow,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="sparkles" size={16} color={primaryAccent} />
                  <Text style={[styles.aiHelpText, { color: colors.text }]}>
                    Stuck? Paste Code to AI Code Context &amp; Get Insights
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              </Card>
            </>
          ) : null}

          {/* Curated GeeksforGeeks Tutorials & Checks */}
          <Text style={[styles.section, { color: colors.text }]}>
            Curated Tutorials & Knowledge Checks{selectedLanguage !== 'All' ? ` (${selectedLanguage})` : ''}
          </Text>
          {filteredResources.length ? (
            filteredResources.map((resource) => {
                const answer = answers[resource.id];
                const isChecked = checked[resource.id];
                const correct = answer === resource.answer;
                const isExpanded = Boolean(expandedNotes[resource.id]);
                return (
                  <Card key={resource.id}>
                    <View style={styles.chCardHeader}>
                      <Text style={[styles.tag, { color: primaryAccent }]}>
                        {resource.topic} · {resource.level} · {resource.minutes} min
                      </Text>
                      {resource.completed ? (
                        <View style={[styles.chXpBadge, { backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)' }]}>
                          <Text style={[styles.chXpText, { color: primaryAccent }]}>Completed ✓</Text>
                        </View>
                      ) : (
                        <View style={[styles.chXpBadge, { backgroundColor: isLight ? '#FEF3C7' : 'rgba(217, 119, 6, 0.2)' }]}>
                          <Text style={[styles.chXpText, { color: '#D97706' }]}>+{resource.xpReward} XP</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>{resource.title}</Text>
                    <Text style={[styles.copy, { color: colors.muted }]}>{resource.outcome}</Text>

                    {/* In-App Study Notes & Tutorial Guide */}
                    <View style={styles.tutorialNotesWrapper}>
                      <Pressable
                        onPress={() => setExpandedNotes((curr) => ({ ...curr, [resource.id]: !curr[resource.id] }))}
                        style={({ pressed }) => [
                          styles.inAppNotesBtn,
                          {
                            backgroundColor: isLight ? '#F0FDF4' : 'rgba(30, 104, 39, 0.18)',
                            borderColor: primaryAccent,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons name="book-outline" size={15} color={primaryAccent} />
                        <Text style={[styles.inAppNotesBtnText, { color: primaryAccent }]}>
                          {isExpanded ? 'Hide In-App Study Notes' : '📖 Read Tutorial Notes (In-App)'}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={15}
                          color={primaryAccent}
                        />
                      </Pressable>

                      {isExpanded && resource.notes ? (
                        <View
                          style={[
                            styles.notesBox,
                            {
                              backgroundColor: isLight ? '#FAFDF9' : colors.surfaceElevated,
                              borderColor: isLight ? '#C8E6C9' : colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.notesHeading, { color: primaryAccent }]}>
                            GeeksforGeeks Core Concept Summary:
                          </Text>
                          <Text style={[styles.notesContent, { color: colors.text }]}>
                            {resource.notes}
                          </Text>
                        </View>
                      ) : null}

                      {/* Companion External Link */}
                      <Pressable
                        onPress={() => Linking.openURL(resource.url).catch(() => setError('Could not open external tutorial.'))}
                        style={({ pressed }) => [
                          styles.externalRefLink,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons name="open-outline" size={13} color={colors.muted} />
                        <Text style={[styles.externalRefText, { color: colors.muted }]}>
                          Open full article on GeeksforGeeks.org
                        </Text>
                      </Pressable>
                    </View>

                    {/* Question & Knowledge Check */}
                    <Text style={[styles.question, { color: colors.text }]}>{resource.question}</Text>
                    {resource.options.map((option, index) => {
                      const isSelected = answer === index;
                      const isThisCorrect = isChecked && index === resource.answer;
                      const isThisWrong = isChecked && isSelected && !correct;
                      return (
                        <Pressable
                          key={option}
                          disabled={resource.completed}
                          onPress={() => {
                            setAnswers((curr) => ({ ...curr, [resource.id]: index }));
                            if (isChecked && !correct) {
                              setChecked((curr) => ({ ...curr, [resource.id]: false }));
                            }
                          }}
                          style={({ pressed }) => [
                            styles.option,
                            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                            isSelected && { borderColor: primaryAccent, borderWidth: 1.5 },
                            isThisCorrect && {
                              backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)',
                              borderColor: primaryAccent,
                            },
                            isThisWrong && {
                              backgroundColor: isLight ? '#FDE8E8' : '#421d24',
                              borderColor: colors.danger,
                            },
                            pressed && !resource.completed && styles.pressed,
                          ]}
                        >
                          <View
                            style={[
                              styles.radio,
                              { borderColor: colors.muted },
                              isSelected && { borderColor: primaryAccent },
                              isThisCorrect && { borderColor: primaryAccent },
                              isThisWrong && { borderColor: colors.danger },
                            ]}
                          >
                            {isSelected ? (
                              <View
                                style={[
                                  styles.radioDot,
                                  { backgroundColor: isThisWrong ? colors.danger : primaryAccent },
                                ]}
                              />
                            ) : null}
                          </View>
                          <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                        </Pressable>
                      );
                    })}

                    {/* Interactive Confirmation & Feedback Banners */}
                    {isChecked ? (
                      correct ? (
                        <View style={[styles.feedbackBanner, { backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)', borderColor: primaryAccent }]}>
                          <Ionicons name="checkmark-circle" size={18} color={primaryAccent} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.feedbackTitle, { color: primaryAccent }]}>
                              ✓ Correct! +{resource.xpReward} XP earned
                            </Text>
                            {resource.explanation ? (
                              <Text style={[styles.feedbackExplanation, { color: colors.text }]}>
                                {resource.explanation}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.feedbackBanner, { backgroundColor: isLight ? '#FDE8E8' : '#421d24', borderColor: colors.danger }]}>
                          <Ionicons name="close-circle" size={18} color={colors.danger} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.feedbackTitle, { color: colors.danger }]}>
                              ✗ Incorrect answer
                            </Text>
                            <Text style={[styles.feedbackExplanation, { color: colors.text }]}>
                              Review the In-App Tutorial Notes above and try again!
                            </Text>
                          </View>
                        </View>
                      )
                    ) : null}

                    {/* Action Buttons */}
                    {resource.completed ? (
                      <View style={styles.completedRow}>
                        <Ionicons name="checkmark-done" size={18} color={primaryAccent} />
                        <Text style={[styles.complete, { color: primaryAccent }]}>
                          Mastered · +{resource.xpReward} XP earned
                        </Text>
                      </View>
                    ) : isChecked && !correct ? (
                      <Button
                        title="Try Again"
                        secondary
                        onPress={() => handleRetryResource(resource.id)}
                      />
                    ) : (
                      <Button
                        title={isChecked && correct ? 'Completed ✓' : 'Check answer'}
                        onPress={() => checkResource(resource)}
                        disabled={answer === undefined || (isChecked && correct)}
                      />
                    )}
                  </Card>
                );
              })
          ) : (
            <Card style={styles.emptyFilterCard}>
              <Ionicons name="book-outline" size={28} color={colors.muted} />
              <Text style={[styles.emptyFilterTitle, { color: colors.text }]}>
                No curated tutorials found for {selectedLanguage}
              </Text>
              <Text style={[styles.emptyFilterSub, { color: colors.muted }]}>
                Switch back to "All" to browse all fundamental algorithms, data structures, and programming languages.
              </Text>
              <Pressable
                onPress={() => setSelectedLanguage('All')}
                style={({ pressed }) => [
                  styles.filterChip,
                  styles.filterChipActive,
                  { backgroundColor: primaryAccent, alignSelf: 'center', marginTop: 10 },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.filterChipText, { color: '#ffffff' }]}>
                  Show All Tutorials
                </Text>
              </Pressable>
            </Card>
          )}
        </>
      ) : null}

      {/* Mode: Role Paths & Spaced Flashcards */}
      {mode === 'rolepaths' && !selectedLessonId ? (
        <>
          {/* Explainer Guide Card */}
          <Card style={{ backgroundColor: isLight ? '#f6fbf7' : colors.surfaceElevated, borderColor: isLight ? '#c8e6c9' : colors.border, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={[styles.guideIconWrap, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)' }]}>
                <Ionicons name="compass-outline" size={22} color={primaryAccent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                  What are Role Paths?
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>
                  Curated career blueprints bridging 3 learning pillars
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 19, marginBottom: 12 }}>
              Role Paths connect foundational syntax, algorithmic problem solving, and simulated technical interviews into an end-to-end career roadmap for software engineering positions.
            </Text>

            <View style={styles.pillarsRow}>
              <View style={[styles.pillarPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="school-outline" size={15} color={primaryAccent} />
                <Text style={[styles.pillarPillTitle, { color: colors.text }]}>1. Academy</Text>
                <Text style={[styles.pillarPillSub, { color: colors.muted }]}>Curated Lessons</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.muted} />
              <View style={[styles.pillarPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="code-slash-outline" size={15} color={primaryAccent} />
                <Text style={[styles.pillarPillTitle, { color: colors.text }]}>2. Challenges</Text>
                <Text style={[styles.pillarPillSub, { color: colors.muted }]}>Verified Code</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.muted} />
              <View style={[styles.pillarPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="mic-outline" size={15} color={primaryAccent} />
                <Text style={[styles.pillarPillTitle, { color: colors.text }]}>3. Interviews</Text>
                <Text style={[styles.pillarPillSub, { color: colors.muted }]}>AI Mock Coach</Text>
              </View>
            </View>
          </Card>

          {enrolledToast ? (
            <Notice tone="success">{enrolledToast}</Notice>
          ) : null}

          {/* Daily Spaced Repetition (SM-2) */}
          <Text style={[styles.section, { color: colors.text }]}>Daily Spaced Review (SM-2)</Text>
          <Card>
            {flashcardMessage ? (
              <Notice tone="success">{flashcardMessage}</Notice>
            ) : null}

            {flashcards.length > 0 && currentFlashcardIndex < flashcards.length ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
                    Card {currentFlashcardIndex + 1} of {flashcards.length} · {flashcards[currentFlashcardIndex].topic}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Tap to flip</Text>
                </View>

                <Pressable
                  onPress={() => setIsFlipped(!isFlipped)}
                  style={{
                    minHeight: 120,
                    borderRadius: 10,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: isFlipped ? primaryAccent : colors.border,
                    backgroundColor: colors.surfaceElevated,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 4 }}>
                    {isFlipped ? 'ANSWER' : 'QUESTION'}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 22 }}>
                    {isFlipped ? flashcards[currentFlashcardIndex].back : flashcards[currentFlashcardIndex].front}
                  </Text>
                </Pressable>

                {isFlipped ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Button
                      title="Hard (1)"
                      secondary
                      onPress={() => handleRateFlashcard(1)}
                    />
                    <Button
                      title="Good (3)"
                      secondary
                      onPress={() => handleRateFlashcard(3)}
                    />
                    <Button
                      title="Easy (5)"
                      onPress={() => handleRateFlashcard(5)}
                    />
                  </View>
                ) : (
                  <Button
                    title="Reveal Answer"
                    secondary
                    onPress={() => setIsFlipped(true)}
                  />
                )}
              </View>
            ) : (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={32} color={primaryAccent} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6 }}>
                  No Reviews Due Today
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 2 }}>
                  Your spaced repetition queue is clear. Return tomorrow for your 10-minute review!
                </Text>
              </View>
            )}
          </Card>

          {/* Curated Career Role Paths */}
          <Text style={[styles.section, { color: colors.text }]}>Curated Career Role Paths</Text>
          {rolePaths.map((path) => {
            const isActive = activeTrackId === path.id;
            return (
              <View key={path.id} style={{ marginBottom: 16 }}>
                {/* Heading placed outside of the card container */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                      {path.title}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: primaryAccent, marginTop: 2 }}>
                      {path.targetRole}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', flexShrink: 0 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
                      {path.totalLessons} Lessons
                    </Text>
                  </View>
                </View>

                <Card style={isActive ? { borderColor: primaryAccent, borderWidth: 1.5 } : undefined}>
                  {/* Active Goal Ribbon */}
                  {isActive ? (
                    <View style={[styles.activeGoalBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.25)' }]}>
                      <Ionicons name="star" size={12} color={primaryAccent} />
                      <Text style={[styles.activeGoalBadgeText, { color: primaryAccent }]}>
                        ACTIVE CAREER GOAL
                      </Text>
                    </View>
                  ) : null}

                  <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: 12 }}>
                    {path.tagline}
                  </Text>

                {/* Completion Progress Bar */}
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                      Progress
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
                      {path.completedLessons || 0} of {path.totalLessons} Lessons ({path.percent || 0}%)
                    </Text>
                  </View>
                  <View style={[styles.pathProgressTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.pathProgressFill,
                        {
                          backgroundColor: primaryAccent,
                          width: `${Math.min(100, Math.max(path.percent || 0, 4))}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Pillar 1: Curriculum Tracks */}
                <View style={[styles.pathPillarBox, { backgroundColor: isLight ? '#FAFAFA' : colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="school-outline" size={14} color={primaryAccent} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                        Curriculum Syllabus ({path.syllabus?.length || path.totalLessons} Lessons)
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setSelectedRolePathModal(path)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
                        View All ↗
                      </Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {path.subjectIds.map((sub) => (
                      <View key={sub} style={[styles.subTrackPill, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                          {formatTrackName(sub)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => handleOpenLessonFromPath(path)}
                      style={({ pressed }) => [
                        styles.actionBtnPrimary,
                        { backgroundColor: primaryAccent, opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Ionicons name="play" size={12} color="#ffffff" />
                      <Text style={styles.actionBtnPrimaryText}>Start Learning</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedRolePathModal(path)}
                      style={({ pressed }) => [
                        styles.actionBtnSecondary,
                        { borderColor: colors.border, backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Ionicons name="list" size={12} color={colors.text} />
                      <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>Roadmap</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Pillar 2: Hands-on Code Challenges (Interactive) */}
                <View style={[styles.pathPillarBox, { backgroundColor: isLight ? '#FAFAFA' : colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="code-slash-outline" size={14} color={primaryAccent} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                      Verified Code Challenges (Tap to solve):
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {path.recommendedChallenges.map((ch) => (
                      <Pressable
                        key={ch.id}
                        onPress={() => handleLaunchChallengeFromPath(ch)}
                        style={({ pressed }) => [
                          styles.challengeChipBtn,
                          {
                            borderColor: primaryAccent,
                            backgroundColor: isLight ? '#F0F9F1' : 'rgba(30, 104, 39, 0.15)',
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Ionicons name="flash-outline" size={12} color={primaryAccent} />
                        <Text style={[styles.challengeChipTitle, { color: colors.text }]}>
                          {ch.title}
                        </Text>
                        <View style={[styles.diffBadgeMicro, { backgroundColor: ch.difficulty === 'EASY' ? '#388E3C' : ch.difficulty === 'HARD' ? '#D32F2F' : '#F57C00' }]}>
                          <Text style={styles.diffBadgeMicroText}>{ch.difficulty}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Pillar 3: Mock Interview Prep */}
                <View style={[styles.pathPillarBox, { backgroundColor: isLight ? '#FAFAFA' : colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="mic-outline" size={14} color={primaryAccent} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                        Technical Mock Interview Topics:
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {path.interviewTags.map((tag) => (
                      <View key={tag} style={[styles.interviewTagPill, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <Text style={{ fontSize: 11, color: colors.muted }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => handleLaunchInterviewFromPath(path)}
                    style={({ pressed }) => [
                      styles.actionBtnSecondary,
                      { borderColor: primaryAccent, backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="chatbubbles-outline" size={13} color={primaryAccent} />
                    <Text style={[styles.actionBtnSecondaryText, { color: primaryAccent }]}>
                      Practice in Interview Coach ↗
                    </Text>
                  </Pressable>
                </View>

                {/* Goal Enrollment Toggle Footer */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                  <Pressable
                    onPress={() => handleSetActiveGoal(path.id, path.title)}
                    style={({ pressed }) => [
                      styles.goalToggleBtn,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Ionicons
                      name={isActive ? 'star' : 'star-outline'}
                      size={14}
                      color={isActive ? primaryAccent : colors.muted}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isActive ? primaryAccent : colors.muted,
                      }}
                    >
                      {isActive ? 'Current Career Goal' : 'Set as Career Goal'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            </View>
          );
        })}
        </>
      ) : null}

      {/* Syllabus Roadmap Modal */}
      <Modal
        visible={Boolean(selectedRolePathModal)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRolePathModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedRolePathModal?.title}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {selectedRolePathModal?.targetRole} · {selectedRolePathModal?.totalLessons} Lessons
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedRolePathModal(null)}
                style={({ pressed }) => [
                  styles.modalCloseBtn,
                  { backgroundColor: colors.surfaceElevated, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Modal Content */}
            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 14 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Overview & Quick Launch Banner */}
              <View style={[styles.modalSummaryBox, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', borderColor: primaryAccent }]}>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 19, marginBottom: 10 }}>
                  {selectedRolePathModal?.tagline}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => selectedRolePathModal && handleOpenLessonFromPath(selectedRolePathModal)}
                    style={({ pressed }) => [
                      styles.actionBtnPrimary,
                      { flex: 1, backgroundColor: primaryAccent, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="play" size={13} color="#ffffff" />
                    <Text style={styles.actionBtnPrimaryText}>Start Learning</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => selectedRolePathModal && handleLaunchInterviewFromPath(selectedRolePathModal)}
                    style={({ pressed }) => [
                      styles.actionBtnSecondary,
                      { flex: 1, borderColor: primaryAccent, backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="mic-outline" size={13} color={primaryAccent} />
                    <Text style={[styles.actionBtnSecondaryText, { color: primaryAccent }]}>Mock Interview</Text>
                  </Pressable>
                </View>
              </View>

              {/* Phase-by-Phase Lessons Syllabus */}
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 4 }}>
                Curated Step-by-Step Curriculum
              </Text>

              {selectedRolePathModal?.syllabus?.map((lesson, idx) => (
                <View
                  key={lesson.id}
                  style={[
                    styles.syllabusLessonItem,
                    {
                      backgroundColor: lesson.completed
                        ? (isLight ? '#F0F9F1' : 'rgba(30, 104, 39, 0.12)')
                        : colors.surfaceElevated,
                      borderColor: lesson.completed ? primaryAccent : colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                      <View style={[styles.phaseTag, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)' }]}>
                        <Text style={[styles.phaseTagText, { color: primaryAccent }]}>
                          {lesson.phase}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        Lesson {idx + 1}
                      </Text>
                      {lesson.completed ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="checkmark-circle" size={13} color={primaryAccent} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>Done</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.syllabusLessonTitle, { color: colors.text }]}>
                      {lesson.title}
                    </Text>
                    <Text style={[styles.syllabusLessonDesc, { color: colors.muted }]} numberOfLines={2}>
                      {lesson.description}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => selectedRolePathModal && handleOpenLessonFromPath(selectedRolePathModal, lesson.id)}
                    style={({ pressed }) => [
                      styles.studyBtn,
                      {
                        backgroundColor: lesson.completed ? (isLight ? '#2e7d32' : '#15803d') : primaryAccent,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.studyBtnText}>
                      {lesson.completed ? 'Review ↗' : 'Study ↗'}
                    </Text>
                  </Pressable>
                </View>
              ))}

              {/* Recommended Coding Challenges */}
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 8 }}>
                Required Verified Challenges
              </Text>
              {selectedRolePathModal?.recommendedChallenges.map((ch) => (
                <View
                  key={ch.id}
                  style={[
                    styles.syllabusLessonItem,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <View style={[styles.diffBadgeMicro, { backgroundColor: ch.difficulty === 'EASY' ? '#388E3C' : ch.difficulty === 'HARD' ? '#D32F2F' : '#F57C00' }]}>
                        <Text style={styles.diffBadgeMicroText}>{ch.difficulty}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
                        +{ch.xpReward} XP
                      </Text>
                    </View>
                    <Text style={[styles.syllabusLessonTitle, { color: colors.text }]}>
                      {ch.title}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleLaunchChallengeFromPath(ch)}
                    style={({ pressed }) => [
                      styles.studyBtn,
                      { backgroundColor: primaryAccent, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={styles.studyBtnText}>Solve Code ↗</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeTabs: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 12 },
  modeTab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    minHeight: 58,
  },
  modeTabActive: { elevation: 2 },
  modeTabInactive: { borderWidth: 1 },
  modeTabText: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  pressed: { opacity: 0.7 },
  section: { fontSize: 17, fontWeight: '800', marginTop: 14, marginBottom: 6 },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterChipActive: { elevation: 2 },
  filterChipInactive: { borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  diffRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  diffChip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  diffChipActive: { borderWidth: 1.5 },
  diffChipInactive: {},
  diffChipText: { fontSize: 11, fontWeight: '700' },
  challengesScroll: { gap: 10, paddingVertical: 4 },
  challengeCard: { width: 170, padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  chCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  chCardLang: { fontSize: 11, fontWeight: '800', flex: 1, minWidth: 0 },
  chXpBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start' },
  chXpText: { fontSize: 10, fontWeight: '800' },
  chCardTitle: { fontSize: 14, fontWeight: '700' },
  chCardDiff: { fontSize: 11 },
  studioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  studioTitleWrap: { flex: 1 },
  studioTitle: { fontSize: 17, fontWeight: '800' },
  studioMeta: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  resetText: { fontSize: 11, fontWeight: '600' },
  description: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  hintWrap: { marginBottom: 10 },
  hintToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  hintToggleText: { fontSize: 12, fontWeight: '700' },
  hintBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  hintContent: { fontSize: 12, lineHeight: 18 },
  codeEditor: { minHeight: 180, padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, lineHeight: 18, textAlignVertical: 'top', marginBottom: 10 },
  outputBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  outputText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  studioActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  aiHelpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  aiHelpText: { flex: 1, fontSize: 12, fontWeight: '600' },
  tag: { fontWeight: '800', fontSize: 12 },
  title: { fontSize: 16, fontWeight: '800' },
  copy: { lineHeight: 19, fontSize: 13 },
  question: { fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 4 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
  radio: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  radioDot: { width: 6, height: 6, borderRadius: 3 },
  optionText: { flex: 1, fontSize: 13 },
  complete: { fontWeight: '800', fontSize: 13 },
  guideIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pillarsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  pillarPill: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, gap: 2 },
  pillarPillTitle: { fontSize: 11, fontWeight: '800' },
  pillarPillSub: { fontSize: 9 },
  activeGoalBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  activeGoalBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  pathProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  pathProgressFill: { height: '100%', borderRadius: 3 },
  pathPillarBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  subTrackPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  actionBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  actionBtnPrimaryText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1 },
  actionBtnSecondaryText: { fontSize: 12, fontWeight: '700' },
  challengeChipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  challengeChipTitle: { fontSize: 12, fontWeight: '700' },
  diffBadgeMicro: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  diffBadgeMicroText: { fontSize: 9, fontWeight: '800', color: '#ffffff' },
  interviewTagPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  goalToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalSummaryBox: { padding: 12, borderRadius: 10, borderWidth: 1 },
  syllabusLessonItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, gap: 10 },
  phaseTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  phaseTagText: { fontSize: 10, fontWeight: '700' },
  syllabusLessonTitle: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  syllabusLessonDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  studyBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  studyBtnText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    minHeight: 88,
    width: '100%',
  },
  headerRowLarge: {
    alignItems: 'flex-start',
  },
  learningHubLogoWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 0,
  },
  learningHubLogoWrapperLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  learningHubLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  learningHubLogoLarge: {
    borderRadius: 31,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyFilterCard: { padding: 20, alignItems: 'center', justifyContent: 'center', marginVertical: 10, borderRadius: 12, borderWidth: 1, gap: 8 },
  emptyFilterTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  emptyFilterSub: { fontSize: 12, textAlign: 'center' },
  resetFilterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: 4 },
  resetFilterBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  diffBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  diffIndicatorDot: { width: 7, height: 7, borderRadius: 4 },
  realtimeHintCard: { padding: 12, borderRadius: 10, borderWidth: 1.5, marginBottom: 12, gap: 8 },
  realtimeHintHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  realtimeHintTitle: { fontSize: 13, fontWeight: '800' },
  realtimeStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  realtimeStatusText: { fontSize: 11, fontWeight: '800' },
  realtimeMessage: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  realtimeChecklist: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  realtimeCheckItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  realtimeCheckText: { fontSize: 11, fontWeight: '600' },
  blueprintToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderTopWidth: 1, marginTop: 4 },
  blueprintToggleText: { fontSize: 11, fontWeight: '700', flex: 1 },
  blueprintBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 4, gap: 4 },
  blueprintHeading: { fontSize: 11, fontWeight: '800' },
  blueprintBody: { fontSize: 11, lineHeight: 16 },
  complexityRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  complexityText: { fontSize: 11, fontWeight: '700' },
  tutorialNotesWrapper: { marginVertical: 6, gap: 6 },
  inAppNotesBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  inAppNotesBtnText: { flex: 1, fontSize: 12, fontWeight: '700' },
  notesBox: { padding: 12, borderRadius: 8, borderWidth: 1, gap: 6 },
  notesHeading: { fontSize: 12, fontWeight: '800' },
  notesContent: { fontSize: 12, lineHeight: 18 },
  externalRefLink: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3 },
  externalRefText: { fontSize: 11, textDecorationLine: 'underline' },
  feedbackBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  feedbackTitle: { fontSize: 12, fontWeight: '800' },
  feedbackExplanation: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  evaluationCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 12,
    gap: 8,
  },
  evaluationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  evaluationTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  evaluationMessage: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  testResultsList: {
    marginTop: 8,
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  testResultsHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  testResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testResultLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  testResultError: {
    fontSize: 11,
    color: '#EF4444',
  },
  solutionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  solutionToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  solutionContainer: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  solutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  solutionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  loadSolutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  loadSolutionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  solutionCodeBlock: {
    fontFamily: 'monospace',
    fontSize: 12,
    padding: 12,
    borderRadius: 8,
    lineHeight: 18,
  },
  solutionApproachBox: {
    gap: 4,
  },
  solutionApproachTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  solutionApproachText: {
    fontSize: 12,
    lineHeight: 17,
  },
  complexityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  complexityChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
