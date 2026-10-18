/**
 * High-accuracy search and word-recognition engine for SynergySphere Learning Hub.
 *
 * Grounding the AI Workspace requires accurately matching what a student asks
 * against both:
 *  1. Programming Academy (1,000+ structured W3Schools lessons across 11 tracks)
 *  2. Coding Challenges (60 interactive challenges across 11 tracks)
 *
 * Word Recognition Features:
 *  - Stemming & morphological normalization (e.g. "arrays" -> "array", "looping" -> "loop")
 *  - Programming synonym and alias expansion (e.g. "hashmap" -> "map", "arrow function" -> "lambda")
 *  - Language & track intent detection (e.g. "in python", "java loops", "react state")
 *  - Compound phrase matching (e.g. "binary search", "two sum", "sql inner join")
 *  - Typo tolerance via bounded Damerau-Levenshtein similarity
 *  - Multi-field weighted scoring (exact title > stemmed title > concepts > syntax > overview)
 */

import { getAllFlatLessons } from '../data/curriculumCatalog.js';
import type { FlatLessonEntry } from '../data/curriculumAliases.js';
import { LEARNING_HUB_CHALLENGES, type LearningHubChallenge } from '../data/learningHubChallenges.js';

export interface LearningHubMatch {
  type: 'lesson' | 'challenge';
  id: string;
  title: string;
  subjectName: string;
  moduleName?: string;
  difficulty: string;
  overview: string;
  starterCode?: string;
  starterLanguage?: string;
  score: number;
  matchReasons: string[];
  rawLesson?: FlatLessonEntry;
  rawChallenge?: LearningHubChallenge;
}

/* ─────────────────────────── Language & Track Aliases ─────────────────────────── */

export const LANGUAGE_ALIASES: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  ecmascript: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  python: 'Python',
  py: 'Python',
  java: 'Java',
  'c++': 'C++',
  cpp: 'C++',
  'c#': 'C#',
  csharp: 'C#',
  cs: 'C#',
  sql: 'SQL',
  mysql: 'SQL',
  postgresql: 'SQL',
  postgres: 'SQL',
  html: 'HTML',
  html5: 'HTML',
  css: 'CSS',
  css3: 'CSS',
  react: 'React',
  reactjs: 'React',
  node: 'Node.js',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
};

/* ─────────────────────────── Concept Synonyms ─────────────────────────── */

const CONCEPT_SYNONYMS: Record<string, string[]> = {
  closure: ['scope', 'closures', 'lexical scope', 'function scope', 'javascript scope'],
  closures: ['closure', 'scope', 'lexical scope', 'function scope', 'javascript scope'],
  scope: ['closure', 'closures', 'variable scope', 'block scope', 'function scope'],
  hashmap: ['hash map', 'dictionary', 'map', 'hash table', 'hashtable', 'dict'],
  'hash map': ['hashmap', 'dictionary', 'map', 'hash table', 'dict'],
  dict: ['dictionary', 'hashmap', 'map', 'hash map'],
  dictionary: ['dict', 'hashmap', 'map', 'hash table'],
  'arrow function': ['arrow functions', 'lambda', 'anonymous function'],
  lambda: ['arrow function', 'anonymous function'],
  'linked list': ['linkedlist', 'node list'],
  linkedlist: ['linked list'],
  'binary search': ['binarysearch', 'bsearch'],
  binarysearch: ['binary search'],
  fizzbuzz: ['fizz buzz'],
  'fizz buzz': ['fizzbuzz'],
  'two sum': ['twosum'],
  twosum: ['two sum'],
  'valid parentheses': ['balanced brackets', 'parentheses matching'],
  'async await': ['async', 'await', 'promise', 'promises', 'asynchronous'],
  async: ['async await', 'promise', 'promises', 'asynchronous'],
  asynchronous: ['async', 'async await', 'promise'],
  promise: ['promises', 'async', 'async await', 'then'],
  promises: ['promise', 'async', 'async await'],
  oop: ['object-oriented', 'object oriented', 'classes', 'inheritance', 'polymorphism'],
  'object-oriented': ['oop', 'classes', 'inheritance'],
  regex: ['regexp', 'regular expression', 'regular expressions', 'pattern matching'],
  'regular expression': ['regex', 'regexp'],
  join: ['joins', 'inner join', 'left join', 'sql join'],
  joins: ['join', 'inner join', 'left join', 'sql join'],
  'inner join': ['join', 'joins', 'sql join'],
  'left join': ['join', 'joins', 'sql join'],
  recursion: ['recursive', 'recurse', 'base case'],
  recursive: ['recursion', 'recurse'],
  loop: ['loops', 'looping', 'for loop', 'while loop', 'iteration', 'iterate'],
  loops: ['loop', 'looping', 'for loop', 'while loop'],
  looping: ['loop', 'loops', 'iteration'],
  array: ['arrays', 'list', 'lists'],
  arrays: ['array', 'list'],
  function: ['functions', 'method', 'methods', 'routine'],
  functions: ['function', 'method', 'methods'],
  method: ['methods', 'function'],
  methods: ['method', 'function'],
  variable: ['variables', 'var', 'let', 'const'],
  variables: ['variable', 'var', 'let', 'const'],
  class: ['classes', 'constructor', 'object'],
  classes: ['class', 'constructor'],
  pointer: ['pointers', 'memory address', 'dereference'],
  pointers: ['pointer', 'memory address'],
  hooks: ['hook', 'usestate', 'useeffect', 'usememo', 'usecallback', 'react hooks'],
  hook: ['hooks', 'usestate', 'useeffect'],
  usestate: ['state hook', 'hooks', 'react state'],
  useeffect: ['effect hook', 'hooks', 'lifecycle'],
  flexbox: ['flex', 'align-items', 'justify-content', 'display flex'],
  grid: ['css grid', 'grid-template'],
  destructuring: ['destructure', 'unpacking', 'object destructuring', 'array destructuring'],
  spread: ['spread operator', 'rest operator', '...'],
  ternary: ['ternary operator', 'conditional operator', 'short if'],
  stack: ['lifo', 'push pop'],
  queue: ['fifo', 'enqueue dequeue'],
};

/* ─────────────────────────── Morphological Stemming ─────────────────────────── */

export function stemWord(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 3) return w;

  if (w === 'indices' || w === 'indexes') return 'index';
  if (w === 'matrices') return 'matrix';
  if (w === 'children') return 'child';
  if (w === 'queries') return 'query';
  if (w === 'properties') return 'property';
  if (w === 'dictionaries') return 'dictionary';

  // Participle & continuous endings: -ing
  if (w.endsWith('ing') && w.length > 5) {
    const base = w.slice(0, -3);
    if (base.endsWith('pp') || base.endsWith('tt') || base.endsWith('nn') || base.endsWith('gg')) {
      return base.slice(0, -1);
    }
    if (base.endsWith('at') || base.endsWith('or') || base.endsWith('it') || base.endsWith('clos')) {
      return base + 'e';
    }
    return base;
  }

  // Adjective endings: -ic, -ive, -ous
  if (w === 'recursive' || w === 'recursively') return 'recursion';
  if (w === 'asynchronous' || w === 'asynchronously') return 'async';
  if (w === 'iterative' || w === 'iteratively') return 'iteration';

  // Past tense: -ed
  if (w.endsWith('ed') && w.length > 4) {
    const base = w.slice(0, -2);
    if (base.endsWith('i')) return base.slice(0, -1) + 'y';
    if (base.endsWith('pp') || base.endsWith('tt')) return base.slice(0, -1);
    return base;
  }

  // Plurals: -ies -> -y
  if (w.endsWith('ies') && w.length > 4) {
    return w.slice(0, -3) + 'y';
  }

  // Plurals: -es (classes, matches, switches, boxes)
  if ((w.endsWith('sses') || w.endsWith('ches') || w.endsWith('shes') || w.endsWith('xes')) && w.length > 4) {
    return w.slice(0, -2);
  }

  // Standard plural: -s (loops -> loop, arrays -> array, functions -> function)
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && w.length > 3) {
    return w.slice(0, -1);
  }

  return w;
}

/* ─────────────────────────── Fuzzy Matching (Levenshtein) ─────────────────────────── */

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > 2) return 99; // Quick rejection

  const row = Array.from({ length: bl + 1 }, (_, i) => i);
  for (let i = 1; i <= al; i++) {
    let prev = i;
    for (let j = 1; j <= bl; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[bl] = prev;
  }
  return row[bl];
}

export function isFuzzyMatch(word: string, target: string): boolean {
  if (word === target) return true;
  if (target.startsWith(word) && word.length >= 4) return true;
  if (word.length >= 4 && target.length >= 4) {
    const dist = editDistance(word, target);
    return dist <= 1 || (word.length >= 7 && dist <= 2);
  }
  return false;
}

/* ─────────────────────────── Stopwords ─────────────────────────── */

/**
 * Filter non-informative words while PRESERVING critical programming terms
 * like "for", "while", "do", "if", "in", "is", "not", "new", "this" when combined with other words.
 */
const GENERAL_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'when', 'what', 'whats', 'how', 'why',
  'who', 'which', 'where', 'was', 'were', 'be', 'been', 'being', 'can', 'could',
  'should', 'would', 'will', 'shall', 'may', 'might', 'must', 'i', 'me', 'my',
  'we', 'our', 'you', 'your', 'it', 'its', 'they', 'them', 'their', 'there',
  'here', 'of', 'at', 'to', 'from', 'by', 'as', 'about', 'into', 'over', 'than',
  'too', 'very', 'just', 'some', 'any', 'explain', 'please', 'help', 'tell',
  'show', 'give', 'make', 'understand', 'meaning', 'difference', 'between',
]);

export interface ParsedQuery {
  raw: string;
  normalized: string;
  detectedLanguage?: string;
  tokens: string[];
  stemmedTokens: string[];
  expandedSynonyms: string[];
  isChallengeIntent: boolean;
}

export function parseLearningHubQuery(q: string): ParsedQuery {
  const raw = q.trim();
  const normalized = raw.toLowerCase().replace(/['"`]/g, '');

  const words = normalized
    .split(/[^a-z0-9+#.-]+/)
    .filter((w) => w.length > 0);

  // 1. Detect explicit programming language (exact or fuzzy)
  let detectedLanguage: string | undefined;
  for (const w of words) {
    if (LANGUAGE_ALIASES[w]) {
      detectedLanguage = LANGUAGE_ALIASES[w];
      break;
    }
  }
  if (!detectedLanguage) {
    for (const w of words) {
      if (w.length >= 4) {
        for (const [alias, lang] of Object.entries(LANGUAGE_ALIASES)) {
          if (alias.length >= 4 && isFuzzyMatch(w, alias)) {
            detectedLanguage = lang;
            break;
          }
        }
        if (detectedLanguage) break;
      }
    }
  }

  // 2. Filter informative tokens
  const tokens = words.filter((w) => {
    if (GENERAL_STOPWORDS.has(w)) return false;
    // Don't keep standalone "in" or "with" unless adjacent to code keywords
    if (w === 'in' || w === 'with' || w === 'on' || w === 'for') {
      return words.includes('loop') || words.includes('each') || words.includes('comprehension');
    }
    return w.length >= 2;
  });

  // 3. Stem tokens
  const stemmedTokens = tokens.map(stemWord);

  // 4. Expand synonyms and common concept phrases
  const expandedSynonyms: string[] = [];
  for (const t of tokens) {
    const syns = CONCEPT_SYNONYMS[t];
    if (syns) expandedSynonyms.push(...syns);
  }
  // Also check two-word combos in the query
  for (let i = 0; i < words.length - 1; i++) {
    const pair = `${words[i]} ${words[i + 1]}`;
    const syns = CONCEPT_SYNONYMS[pair];
    if (syns) expandedSynonyms.push(...syns);
  }

  // 5. Detect challenge intent
  const isChallengeIntent =
    /\b(challenge|exercise|problem|practice|task|solution|test cases|fizzbuzz|two sum|binary search)\b/i.test(
      raw,
    );

  return {
    raw,
    normalized,
    detectedLanguage,
    tokens,
    stemmedTokens,
    expandedSynonyms: [...new Set(expandedSynonyms)],
    isChallengeIntent,
  };
}

/* ─────────────────────────── Scoring Engine ─────────────────────────── */

function scoreLessonMatch(entry: FlatLessonEntry, parsed: ParsedQuery): { score: number; reasons: string[] } {
  const { lesson, subjectName, moduleName } = entry;
  const reasons: string[] = [];
  let score = 0;

  const titleLower = lesson.title.toLowerCase();
  const titleStemmed = stemWord(titleLower);
  const subjectLower = subjectName.toLowerCase();
  const moduleLower = moduleName.toLowerCase();
  const overviewLower = lesson.overview.toLowerCase();
  const concepts = (lesson.content.keyConcepts ?? []).map((c) => `${c.title} ${c.definition}`.toLowerCase());
  const syntax = (lesson.content.syntax ?? []).map((s) => s.toLowerCase());

  // Language matching / filter
  if (parsed.detectedLanguage) {
    if (subjectName.toLowerCase() === parsed.detectedLanguage.toLowerCase()) {
      score += 130;
      reasons.push(`Target Language: ${parsed.detectedLanguage}`);
    } else {
      // Strong demote when another language was specifically requested
      score -= 160;
    }
  }

  // Full query exact match in title
  if (titleLower === parsed.normalized) {
    score += 200;
    reasons.push('Exact Title Match');
  } else if (titleLower.includes(parsed.normalized)) {
    score += 120;
    reasons.push('Title Contains Query');
  }

  // Token & Stem matching
  let matchedTokenCount = 0;
  for (let i = 0; i < parsed.tokens.length; i++) {
    const token = parsed.tokens[i];
    const stemmed = parsed.stemmedTokens[i];

    let tokenMatched = false;

    // Exact word in title
    if (titleLower.split(/\s+/).includes(token) || titleStemmed.split(/\s+/).includes(stemmed)) {
      score += 65;
      tokenMatched = true;
      reasons.push(`Title word: "${token}"`);
    } else if (titleLower.includes(token) || titleLower.includes(stemmed)) {
      score += 45;
      tokenMatched = true;
    } else if (isFuzzyMatch(token, titleLower)) {
      score += 35;
      tokenMatched = true;
      reasons.push(`Fuzzy title: "${token}"`);
    }

    // Module or Subject match
    if (moduleLower.includes(token) || moduleLower.includes(stemmed)) {
      score += 20;
      tokenMatched = true;
    }
    if (subjectLower.includes(token)) {
      score += 25;
      tokenMatched = true;
    }

    // Key Concepts match
    if (concepts.some((c) => c.includes(token) || c.includes(stemmed))) {
      score += 35;
      tokenMatched = true;
      reasons.push(`Key concept: "${token}"`);
    }

    // Syntax match
    if (syntax.some((s) => s.includes(token) || s.includes(stemmed))) {
      score += 25;
      tokenMatched = true;
    }

    // Overview match
    if (overviewLower.includes(token) || overviewLower.includes(stemmed)) {
      score += 15;
      tokenMatched = true;
    }

    if (tokenMatched) matchedTokenCount++;
  }

  // Concept Synonym Boost
  for (const syn of parsed.expandedSynonyms) {
    if (titleLower.includes(syn)) {
      score += 50;
      reasons.push(`Synonym match: "${syn}"`);
    } else if (concepts.some((c) => c.includes(syn))) {
      score += 30;
    }
  }

  // Coverage bonus: if query had 2+ tokens and matched all of them
  if (parsed.tokens.length >= 2 && matchedTokenCount >= parsed.tokens.length) {
    score += 50;
    reasons.push('Full Query Coverage');
  }

  return { score, reasons };
}

function scoreChallengeMatch(challenge: LearningHubChallenge, parsed: ParsedQuery): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const titleLower = challenge.title.toLowerCase();
  const descLower = challenge.description.toLowerCase();
  const langLower = (challenge.language || '').toLowerCase();

  // Language match
  if (parsed.detectedLanguage) {
    if (langLower.includes(parsed.detectedLanguage.toLowerCase())) {
      score += 130;
      reasons.push(`Challenge Language: ${parsed.detectedLanguage}`);
    } else {
      score -= 160;
    }
  }

  // Challenge intent boost
  if (parsed.isChallengeIntent) {
    score += 70;
    reasons.push('Challenge Intent');
  }

  // Exact title match
  if (titleLower === parsed.normalized) {
    score += 220;
    reasons.push('Exact Challenge Title');
  } else if (titleLower.includes(parsed.normalized)) {
    score += 130;
    reasons.push('Challenge Title Match');
  }

  // Token matching
  let matchedTokens = 0;
  for (let i = 0; i < parsed.tokens.length; i++) {
    const token = parsed.tokens[i];
    const stemmed = parsed.stemmedTokens[i];

    let hit = false;
    if (titleLower.split(/\s+/).includes(token) || titleLower.includes(stemmed)) {
      score += 75;
      hit = true;
      reasons.push(`Challenge Title: "${token}"`);
    } else if (isFuzzyMatch(token, titleLower)) {
      score += 45;
      hit = true;
      reasons.push(`Fuzzy Challenge: "${token}"`);
    }

    if (descLower.includes(token) || descLower.includes(stemmed)) {
      score += 25;
      hit = true;
    }

    if (hit) matchedTokens++;
  }

  // Coverage bonus
  if (parsed.tokens.length >= 2 && matchedTokens >= parsed.tokens.length) {
    score += 60;
    reasons.push('Full Query Coverage');
  }

  return { score, reasons };
}

/* ─────────────────────────── Unified Search Function ─────────────────────────── */

export function searchLearningHub(query: string, limit = 10): LearningHubMatch[] {
  const parsed = parseLearningHubQuery(query);
  if (parsed.tokens.length === 0 && !parsed.detectedLanguage && parsed.raw.length < 2) {
    return [];
  }

  const results: LearningHubMatch[] = [];

  // 1. Search Curriculum Lessons (1,032 flat lessons)
  const allLessons = getAllFlatLessons();
  for (const entry of allLessons) {
    const { score, reasons } = scoreLessonMatch(entry, parsed);
    if (score > 25) {
      results.push({
        type: 'lesson',
        id: entry.lesson.id,
        title: entry.lesson.title,
        subjectName: entry.subjectName,
        moduleName: entry.moduleName,
        difficulty: entry.lesson.difficulty,
        overview: entry.lesson.overview,
        starterCode: entry.lesson.content.examples?.[0]?.code,
        starterLanguage: entry.lesson.content.examples?.[0]?.language || entry.subjectId,
        score,
        matchReasons: reasons,
        rawLesson: entry,
      });
    }
  }

  // 2. Search Coding Challenges (60 challenges)
  for (const challenge of LEARNING_HUB_CHALLENGES) {
    const { score, reasons } = scoreChallengeMatch(challenge, parsed);
    if (score > 30) {
      results.push({
        type: 'challenge',
        id: challenge.id,
        title: challenge.title,
        subjectName: challenge.language || 'Coding Challenge',
        difficulty: challenge.difficulty,
        overview: challenge.description,
        starterCode: challenge.starterCode || undefined,
        starterLanguage: challenge.language || 'code',
        score,
        matchReasons: reasons,
        rawChallenge: challenge,
      });
    }
  }

  // Sort by highest relevance score, then by difficulty / title stability
  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return results.slice(0, limit);
}
