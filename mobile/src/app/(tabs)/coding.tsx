import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, TextInput, Modal, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { CurriculumDashboard } from '@/components/curriculum/CurriculumDashboard';
import { LessonViewer } from '@/components/curriculum/LessonViewer';
import type { Challenge, LearningResource } from '@/types/api';

const ALL_LANGUAGES = ['All', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'SQL', 'HTML', 'CSS', 'React', 'Node.js'] as const;
const DIFFICULTIES = ['ALL', 'EASY', 'MEDIUM', 'HARD'] as const;

interface BuiltinChallenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  description: string;
  language: string;
  starterCode: string;
  hint: string;
  xpReward: number;
}

const BUILTIN_CHALLENGES: BuiltinChallenge[] = [
  {
    id: 'js-hello-world',
    title: 'Hello World',
    difficulty: 'EASY',
    description: 'Write a function greet() that returns the string "Hello, SynergySphere!"',
    language: 'JavaScript',
    starterCode: 'function greet() {\n  return "Hello, SynergySphere!";\n}',
    hint: 'Return the exact string with matching punctuation and capitalization.',
    xpReward: 50,
  },
  {
    id: 'js-sum-array',
    title: 'Sum Array',
    difficulty: 'EASY',
    description: 'Write a function sumArray(arr) that returns the sum of all numbers in an array.',
    language: 'JavaScript',
    starterCode: 'function sumArray(arr) {\n  return arr.reduce((acc, n) => acc + n, 0);\n}',
    hint: 'You can use array.reduce() or a simple for...of loop.',
    xpReward: 50,
  },
  {
    id: 'js-two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    description: 'Given an array nums and target, return indices of two numbers adding up to target.',
    language: 'JavaScript',
    starterCode: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) return [map.get(complement), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}',
    hint: 'Store complement values in a Map for O(n) one-pass solution.',
    xpReward: 60,
  },
  {
    id: 'py-list-sum',
    title: 'List Sum',
    difficulty: 'EASY',
    description: 'Write sum_list(numbers) that returns the sum of all numbers in the list.',
    language: 'Python',
    starterCode: 'def sum_list(numbers):\n    total = 0\n    for n in numbers:\n        total += n\n    return total',
    hint: 'Iterate over elements and accumulate into a variable.',
    xpReward: 50,
  },
  {
    id: 'java-binary-search',
    title: 'Binary Search',
    difficulty: 'HARD',
    description: 'Implement binary search on a sorted array returning target index or -1.',
    language: 'Java',
    starterCode: 'public int binarySearch(int[] arr, int target) {\n  int low = 0, high = arr.length - 1;\n  while (low <= high) {\n    int mid = low + (high - low) / 2;\n    if (arr[mid] == target) return mid;\n    if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}',
    hint: 'Avoid integer overflow when computing mid with low + (high - low) / 2.',
    xpReward: 100,
  },
  {
    id: 'sql-customers',
    title: 'Active Customers Count',
    difficulty: 'MEDIUM',
    description: 'Write a SQL query to count active customers grouped by country having more than 5 users.',
    language: 'SQL',
    starterCode: 'SELECT country, COUNT(*) AS active_users\nFROM users\nWHERE status = \'active\'\nGROUP BY country\nHAVING COUNT(*) > 5;',
    hint: 'Filter on status before GROUP BY and filter aggregated count using HAVING.',
    xpReward: 80,
  },
];

export interface RolePathLesson {
  id: string;
  title: string;
  phase: string;
  description: string;
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

  return {
    id: path.id,
    title: path.title,
    targetRole: typeof path.targetRole === 'string' ? path.targetRole : fallbackItem?.targetRole || 'Developer',
    tagline: typeof path.tagline === 'string' ? path.tagline : fallbackItem?.tagline || '',
    subjectIds: stringList(path.subjectIds).length > 0 ? stringList(path.subjectIds) : (fallbackItem?.subjectIds || []),
    curatedLessonIds: stringList(path.curatedLessonIds),
    syllabus: defaultSyllabus,
    totalLessons: typeof path.totalLessons === 'number' && Number.isFinite(path.totalLessons) ? path.totalLessons : defaultSyllabus.length,
    completedLessons: typeof path.completedLessons === 'number' ? path.completedLessons : 0,
    percent: typeof path.percent === 'number' ? path.percent : 0,
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

export default function CodingScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { fontSize, largerText } = useAccessibility();

  // Mode: Academy vs Challenges vs Role Paths
  const [mode, setMode] = useState<'academy' | 'challenges' | 'rolepaths'>('academy');
  const [previousMode, setPreviousMode] = useState<'academy' | 'challenges' | 'rolepaths'>('rolepaths');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Challenges state
  const [items, setItems] = useState<Challenge[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<BuiltinChallenge | Challenge | null>(BUILTIN_CHALLENGES[0]);
  const [code, setCode] = useState(BUILTIN_CHALLENGES[0].starterCode);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Role paths and daily flashcards
  const [rolePaths, setRolePaths] = useState<RolePath[]>(BUILTIN_ROLE_PATHS);
  const [activeTrackId, setActiveTrackId] = useState<string>('backend-intern');
  const [selectedRolePathModal, setSelectedRolePathModal] = useState<RolePath | null>(null);
  const [enrolledToast, setEnrolledToast] = useState<string>('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardMessage, setFlashcardMessage] = useState('');

  // Tutorials quiz state
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

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
      if (learningData.status === 'fulfilled') {
        setResources(learningData.value);
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
      // Fallbacks used
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
    const targetId = lessonId || path.curatedLessonIds?.[0] || path.syllabus?.[0]?.id || 'java-java-tutorial-java-introduction';
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

  // Combine builtin and API challenges
  const allChallenges = [
    ...BUILTIN_CHALLENGES,
    ...items.filter((item) => !BUILTIN_CHALLENGES.some((b) => b.id === item.id)),
  ];

  const filteredChallenges = allChallenges.filter((ch) => {
    const langMatch = selectedLanguage === 'All' || ch.language === selectedLanguage;
    const diffMatch = selectedDifficulty === 'ALL' || ch.difficulty.toUpperCase() === selectedDifficulty;
    return langMatch && diffMatch;
  });

  function selectChallenge(ch: BuiltinChallenge | Challenge) {
    setSelectedChallenge(ch);
    setCode(ch.starterCode || '// Write your solution here…\n');
    setShowHint(false);
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
    } catch (err: any) {
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
        testResults?: Array<{ label: string; passed: boolean; error?: string }>;
      }>(
        `/challenges/${selectedChallenge.id}/submit`,
        { code, language: selectedChallenge.language || 'JavaScript' },
      );

      if (response.passed) {
        setResult(`🎉 All server tests passed! You earned +${response.xpEarned} XP.`);
      } else {
        const details =
          response.testResults
            ?.map((t) => `${t.passed ? '✓' : '✗'} ${t.label}${t.error ? `: ${t.error}` : ''}`)
            .join('\n') || response.output || 'Solution did not pass all hidden server tests.';
        setError(`Failed server validation:\n${details}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Submission failed. The server judge could not be reached.');
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
    if (answer !== resource.answer || resource.completed) return;
    try {
      const response = await api.post<{ xpEarned: number }>(`/learning/${resource.id}/complete`);
      setResources((current) => current.map((item) => (item.id === resource.id ? { ...item, completed: true } : item)));
      setResult(`Tutorial completed! You earned +${response.xpEarned} XP.`);
    } catch {
      setResult(`Tutorial checked! Completed +${resource.xpReward} XP.`);
    }
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
        <Image
          source={require('../../../assets/images/learning-hub-logo.png')}
          style={[
            styles.learningHubLogo,
            largerText && styles.learningHubLogoLarge,
          ]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />

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
            Learning Hub
          </Text>

          <Text
            allowFontScaling
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
          onBack={() => {
            setSelectedLessonId(null);
            if (previousMode === 'rolepaths') {
              setMode('rolepaths');
            }
          }}
          onNavigateLesson={(nextId) => setSelectedLessonId(nextId)}
        />
      ) : mode === 'academy' ? (
        <CurriculumDashboard
          onSelectLesson={(lessonId) => {
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
                onPress={() => setSelectedLanguage(lang)}
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
                onPress={() => setSelectedDifficulty(diff)}
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengesScroll}>
            {filteredChallenges.map((ch) => (
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
                <Text style={[styles.chCardDiff, { color: colors.muted }]}>{ch.difficulty}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Active Challenge Studio */}
          {selectedChallenge ? (
            <>
              <Text style={[styles.section, { color: colors.text }]}>Challenge Studio</Text>
              <Card>
                <View style={styles.studioHeader}>
                  <View style={styles.studioTitleWrap}>
                    <Text style={[styles.studioTitle, { color: colors.text }]}>{selectedChallenge.title}</Text>
                    <Text style={[styles.studioMeta, { color: primaryAccent }]}>
                      {selectedChallenge.difficulty} · {selectedChallenge.language || 'Programming'} · +{selectedChallenge.xpReward} XP
                    </Text>
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
                        {showHint ? 'Hide Hint' : 'Show Hint'}
                      </Text>
                    </Pressable>
                    {showHint ? (
                      <View style={[styles.hintBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={[styles.hintContent, { color: colors.text }]}>{selectedChallenge.hint}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

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

                {/* Ask AI Assistant Deep Link */}
                <Pressable
                  onPress={() => router.push('/ai-assistant')}
                  style={({ pressed }) => [
                    styles.aiHelpRow,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="sparkles" size={16} color={primaryAccent} />
                  <Text style={[styles.aiHelpText, { color: colors.text }]}>
                    Stuck? Ask SynergySphere AI for hints or code review
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              </Card>
            </>
          ) : null}

          {/* Curated GeeksforGeeks Tutorials & Checks */}
          {resources.length ? (
            <>
              <Text style={[styles.section, { color: colors.text }]}>Curated Tutorials & Knowledge Checks</Text>
              {resources.map((resource) => {
                const answer = answers[resource.id];
                const isChecked = checked[resource.id];
                const correct = answer === resource.answer;
                return (
                  <Card key={resource.id}>
                    <Text style={[styles.tag, { color: primaryAccent }]}>
                      {resource.topic} · {resource.level} · {resource.minutes} min
                    </Text>
                    <Text style={[styles.title, { color: colors.text }]}>{resource.title}</Text>
                    <Text style={[styles.copy, { color: colors.muted }]}>{resource.outcome}</Text>
                    <Button
                      title={`Open ${resource.source} tutorial`}
                      secondary
                      onPress={() => Linking.openURL(resource.url).catch(() => setError('Could not open this tutorial link.'))}
                    />
                    <Text style={[styles.question, { color: colors.text }]}>{resource.question}</Text>
                    {resource.options.map((option, index) => (
                      <Pressable
                        key={option}
                        disabled={isChecked || resource.completed}
                        onPress={() => setAnswers((curr) => ({ ...curr, [resource.id]: index }))}
                        style={({ pressed }) => [
                          styles.option,
                          { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                          answer === index && { borderColor: primaryAccent },
                          isChecked && index === resource.answer && {
                            backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)',
                            borderColor: primaryAccent,
                          },
                          isChecked && answer === index && !correct && {
                            backgroundColor: isLight ? '#FDE8E8' : '#421d24',
                            borderColor: colors.danger,
                          },
                          pressed && !isChecked && styles.pressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.radio,
                            { borderColor: colors.muted },
                            answer === index && { borderColor: primaryAccent },
                          ]}
                        >
                          {answer === index ? (
                            <View style={[styles.radioDot, { backgroundColor: primaryAccent }]} />
                          ) : null}
                        </View>
                        <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                      </Pressable>
                    ))}
                    {resource.completed ? (
                      <Text style={[styles.complete, { color: primaryAccent }]}>Completed · +{resource.xpReward} XP earned</Text>
                    ) : (
                      <Button
                        title={isChecked ? (correct ? 'Correct — saved' : 'Review and try again') : 'Check answer'}
                        onPress={() => checkResource(resource)}
                        disabled={answer === undefined || (isChecked && !correct)}
                      />
                    )}
                  </Card>
                );
              })}
            </>
          ) : null}
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
              <Card key={path.id} style={isActive ? { borderColor: primaryAccent, borderWidth: 1.5 } : undefined}>
                {/* Active Goal Ribbon */}
                {isActive ? (
                  <View style={[styles.activeGoalBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.25)' }]}>
                    <Ionicons name="star" size={12} color={primaryAccent} />
                    <Text style={[styles.activeGoalBadgeText, { color: primaryAccent }]}>
                      ACTIVE CAREER GOAL
                    </Text>
                  </View>
                ) : null}

                {/* Card Title & Meta Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
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
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <View style={[styles.phaseTag, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)' }]}>
                        <Text style={[styles.phaseTagText, { color: primaryAccent }]}>
                          {lesson.phase}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        Lesson {idx + 1}
                      </Text>
                    </View>
                    <Text style={[styles.syllabusLessonTitle, { color: colors.text }]}>
                      {lesson.title}
                    </Text>
                    <Text style={[styles.syllabusLessonDesc, { color: colors.muted }]}>
                      {lesson.description}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => selectedRolePathModal && handleOpenLessonFromPath(selectedRolePathModal, lesson.id)}
                    style={({ pressed }) => [
                      styles.studyBtn,
                      { backgroundColor: primaryAccent, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={styles.studyBtnText}>Study ↗</Text>
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

              <View style={{ height: 20 }} />
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
    gap: 12,
    marginBottom: 10,
    paddingRight: 42,
  },
  headerRowLarge: {
    alignItems: 'flex-start',
  },
  learningHubLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  learningHubLogoLarge: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
