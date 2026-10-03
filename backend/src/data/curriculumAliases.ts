import type { LessonSpec } from './lectureCurriculumTypes.js';

export interface FlatLessonEntry {
  lesson: LessonSpec;
  subjectId: string;
  subjectName: string;
  moduleId: string;
  moduleName: string;
}

/**
 * Bidirectional mapping of legacy and shorthand lesson IDs (e.g., 'w3s-java-java-intro')
 * to canonical lesson IDs registered in W3Schools curriculum subjects.
 */
export const LEGACY_LESSON_ALIASES: Record<string, string> = {
  // Java
  'w3s-java-java-intro': 'java-java-tutorial-java-introduction',
  'w3s-java-java-introduction': 'java-java-tutorial-java-introduction',
  'w3s-java-java-get-started': 'java-java-tutorial-java-get-started',
  'w3s-java-java-syntax': 'java-java-tutorial-java-syntax',
  'w3s-java-java-variables': 'java-java-tutorial-java-variables',
  'w3s-java-java-data-types': 'java-java-tutorial-java-data-types',
  'w3s-java-java-type-casting': 'java-java-tutorial-java-type-casting',
  'w3s-java-java-operators': 'java-java-tutorial-java-operators',
  'w3s-java-java-strings': 'java-java-tutorial-java-strings',
  'w3s-java-java-math': 'java-java-tutorial-java-math',
  'w3s-java-java-booleans': 'java-java-tutorial-java-booleans',
  'w3s-java-java-if...else': 'java-java-tutorial-java-if-else',
  'w3s-java-java-if-else': 'java-java-tutorial-java-if-else',
  'w3s-java-java-switch': 'java-java-tutorial-java-switch',
  'w3s-java-java-while-loop': 'java-java-tutorial-java-while-loop',
  'w3s-java-java-for-loop': 'java-java-tutorial-java-for-loop',
  'w3s-java-java-break/continue': 'java-java-tutorial-java-break-continue',
  'w3s-java-java-break-continue': 'java-java-tutorial-java-break-continue',
  'w3s-java-java-arrays': 'java-java-tutorial-java-arrays',
  'w3s-java-java-methods': 'java-java-methods-java-methods',
  'w3s-java-java-classes/objects': 'java-java-classes-java-classes-objects',
  'w3s-java-java-classes-objects': 'java-java-classes-java-classes-objects',
  'w3s-java-java-oop': 'java-java-classes-java-oop',
  'w3s-java-java-class-attributes': 'java-java-classes-java-class-attributes',
  'w3s-java-java-class-methods': 'java-java-classes-java-class-methods',
  'w3s-java-java-constructors': 'java-java-classes-java-constructors',
  'w3s-java-java-modifiers': 'java-java-classes-java-modifiers',
  'w3s-java-java-encapsulation': 'java-java-classes-java-encapsulation',
  'w3s-java-java-packages-/-api': 'java-java-classes-java-packages-api',
  'w3s-java-java-packages-api': 'java-java-classes-java-packages-api',
  'w3s-java-java-inheritance': 'java-java-classes-java-inheritance',
  'w3s-java-java-polymorphism': 'java-java-classes-java-polymorphism',
  'w3s-java-java-inner-classes': 'java-java-classes-java-inner-classes',
  'w3s-java-java-abstraction': 'java-java-classes-java-abstraction',
  'w3s-java-java-interface': 'java-java-classes-java-interface',
  'w3s-java-java-enums': 'java-java-classes-java-enum',
  'w3s-java-java-user-input': 'java-java-input-and-date-java-user-input',
  'w3s-java-java-date': 'java-java-input-and-date-java-date',
  'w3s-java-java-arraylist': 'java-java-reference-java-arraylist-methods',
  'w3s-java-java-linkedlist': 'java-java-reference-java-linkedlist-methods',
  'w3s-java-java-hashmap': 'java-java-collections-and-built-in-classes-java-hashmap',
  'w3s-java-java-hashset': 'java-java-collections-and-built-in-classes-java-collections',
  'w3s-java-java-iterator': 'java-java-i-o-streams-java-iterator',
  'w3s-java-java-wrapper-classes': 'java-java-classes-java-classes-objects',
  'w3s-java-java-exceptions': 'java-java-errors-java-exceptions',
  'w3s-java-java-regex': 'java-java-reference-java-string-methods',
  'w3s-java-java-threads': 'java-java-i-o-streams-java-i-o-streams',
  'w3s-java-java-lambda': 'java-java-classes-java-anonymous-classes',

  // SQL
  'w3s-sql-sql-intro': 'sql-sql-fundamentals-sql-introduction',
  'w3s-sql-sql-introduction': 'sql-sql-fundamentals-sql-introduction',
  'w3s-sql-sql-syntax': 'sql-sql-fundamentals-sql-syntax',
  'w3s-sql-sql-select': 'sql-sql-fundamentals-sql-select',
  'w3s-sql-sql-where': 'sql-sql-fundamentals-sql-where',
  'w3s-sql-sql-order-by': 'sql-sql-fundamentals-sql-order-by',
  'w3s-sql-sql-insert-into': 'sql-sql-fundamentals-sql-insert-into',
  'w3s-sql-sql-null-values': 'sql-sql-fundamentals-sql-null-values',
  'w3s-sql-sql-update': 'sql-sql-fundamentals-sql-update',
  'w3s-sql-sql-delete': 'sql-sql-fundamentals-sql-delete',
  'w3s-sql-sql-min-and-max': 'sql-sql-functions-sql-min',
  'w3s-sql-sql-count': 'sql-sql-functions-sql-count',
  'w3s-sql-sql-like': 'sql-sql-functions-sql-like',
  'w3s-sql-sql-wildcards': 'sql-sql-functions-sql-wildcards',
  'w3s-sql-sql-in': 'sql-sql-functions-sql-in',
  'w3s-sql-sql-between': 'sql-sql-functions-sql-between',
  'w3s-sql-sql-joins': 'sql-sql-joins-sql-joins',
  'w3s-sql-sql-inner-join': 'sql-sql-joins-sql-inner-join',
  'w3s-sql-sql-left-join': 'sql-sql-joins-sql-left-join',
  'w3s-sql-sql-right-join': 'sql-sql-joins-sql-right-join',
  'w3s-sql-sql-group-by': 'sql-sql-grouping-and-conditions-sql-group-by',

  // HTML
  'w3s-html-html-intro': 'html-html-tutorial-html-introduction',
  'w3s-html-html-introduction': 'html-html-tutorial-html-introduction',
  'w3s-html-html-editors': 'html-html-tutorial-html-editors',
  'w3s-html-html-basic': 'html-html-tutorial-html-basic',
  'w3s-html-html-elements': 'html-html-tutorial-html-elements',
  'w3s-html-html-attributes': 'html-html-tutorial-html-attributes',
  'w3s-html-html-headings': 'html-html-tutorial-html-headings',
  'w3s-html-html-paragraphs': 'html-html-tutorial-html-paragraphs',
  'w3s-html-html-styles': 'html-html-tutorial-html-styles',
  'w3s-html-html-formatting': 'html-html-tutorial-html-formatting',
  'w3s-html-html-links': 'html-html-tutorial-html-links',
  'w3s-html-html-images': 'html-html-tutorial-html-images',
  'w3s-html-html-tables': 'html-html-tutorial-html-tables',
  'w3s-html-html-lists': 'html-html-tutorial-html-lists',
  'w3s-html-html-block-and-inline': 'html-html-tutorial-html-block-and-inline',
  'w3s-html-html-classes': 'html-html-tutorial-html-classes',
  'w3s-html-html-id': 'html-html-tutorial-html-id',
  'w3s-html-html-forms': 'html-html-forms-html-forms',

  // CSS
  'w3s-css-css-intro': 'css-css-fundamentals-css-introduction',
  'w3s-css-css-introduction': 'css-css-fundamentals-css-introduction',
  'w3s-css-css-syntax': 'css-css-fundamentals-css-syntax',
  'w3s-css-css-selectors': 'css-css-fundamentals-css-selectors',
  'w3s-css-css-box-model': 'css-css-fundamentals-css-box-model',
  'w3s-css-css-flexbox': 'css-css-responsive-design-css-flexbox',
  'w3s-css-css-grid': 'css-css-responsive-design-css-grid',

  // JavaScript
  'w3s-javascript-js-intro': 'javascript-javascript-fundamentals-javascript-introduction',
  'w3s-javascript-js-variables': 'javascript-javascript-fundamentals-javascript-variables',
  'w3s-javascript-js-functions': 'javascript-javascript-functions-function-introduction',
  'w3s-javascript-js-objects': 'javascript-javascript-objects-object-introduction',
  'w3s-javascript-js-arrays': 'javascript-javascript-arrays-javascript-arrays',
  'w3s-javascript-js-arrow-function': 'javascript-javascript-functions-arrow-functions',
  'w3s-javascript-js-async': 'javascript-javascript-asynchronous-programming-async-await',

  // React
  'w3s-react-react-intro': 'react-react-fundamentals-react-introduction',
  'w3s-react-react-introduction': 'react-react-fundamentals-react-introduction',
  'w3s-react-react-get-started': 'react-react-fundamentals-react-get-started',
  'w3s-react-react-jsx': 'react-react-jsx-jsx-introduction',
  'w3s-react-react-components': 'react-react-components-react-components',
  'w3s-react-react-props': 'react-react-components-react-props',
  'w3s-react-react-state': 'react-react-hooks-usestate',
  'w3s-react-react-hooks': 'react-react-hooks-what-is-hooks',
  'w3s-react-react-usestate': 'react-react-hooks-usestate',
  'w3s-react-react-useeffect': 'react-react-hooks-useeffect',

  // Node.js
  'w3s-nodejs-node.js-intro': 'nodejs-node-js-fundamentals-node-introduction',
  'w3s-nodejs-node-intro': 'nodejs-node-js-fundamentals-node-introduction',
  'w3s-nodejs-node.js-get-started': 'nodejs-node-js-fundamentals-node-get-started',
  'w3s-nodejs-node.js-modules': 'nodejs-node-js-modules-node-modules',
  'w3s-nodejs-node.js-http-module': 'nodejs-node-js-core-modules-http-module',
  'w3s-nodejs-node.js-file-system': 'nodejs-node-js-core-modules-file-system',
  'w3s-nodejs-node.js-url-module': 'nodejs-node-js-core-modules-url-module',
  'w3s-nodejs-node.js-events': 'nodejs-node-js-core-modules-events-module',

  // TypeScript
  'w3s-typescript-ts-intro': 'typescript-typescript-fundamentals-typescript-introduction',
  'w3s-typescript-ts-simple-types': 'typescript-typescript-fundamentals-typescript-simple-types',
  'w3s-typescript-ts-arrays': 'typescript-typescript-fundamentals-typescript-arrays',
  'w3s-typescript-ts-tuples': 'typescript-typescript-fundamentals-typescript-tuples',
  'w3s-typescript-ts-object-types': 'typescript-typescript-fundamentals-typescript-object-types',
  'w3s-typescript-ts-enums': 'typescript-typescript-fundamentals-typescript-enums',
  'w3s-typescript-ts-type-aliases': 'typescript-typescript-fundamentals-typescript-type-aliases',
  'w3s-typescript-ts-interfaces': 'typescript-typescript-fundamentals-typescript-interfaces',
  'w3s-typescript-ts-aliases-and-interfaces': 'typescript-typescript-fundamentals-typescript-interfaces',
  'w3s-typescript-ts-union-types': 'typescript-typescript-fundamentals-typescript-union-types',
  'w3s-typescript-ts-functions': 'typescript-typescript-fundamentals-typescript-functions',
};

// Populate clean non-w3s variations as aliases too
for (const [k, v] of Object.entries(LEGACY_LESSON_ALIASES)) {
  const clean = k.replace(/^w3s-/, '');
  if (!LEGACY_LESSON_ALIASES[clean]) {
    LEGACY_LESSON_ALIASES[clean] = v;
  }
}

/** Reverse mapping: canonical ID -> array of legacy aliases */
const REVERSE_ALIASES: Record<string, string[]> = {};
for (const [alias, canonical] of Object.entries(LEGACY_LESSON_ALIASES)) {
  if (!REVERSE_ALIASES[canonical]) {
    REVERSE_ALIASES[canonical] = [];
  }
  REVERSE_ALIASES[canonical].push(alias);
}

export function getCanonicalLessonId(rawId: string): string {
  if (!rawId || typeof rawId !== 'string') return '';
  const trimmed = rawId.trim();
  const lower = trimmed.toLowerCase();
  return LEGACY_LESSON_ALIASES[trimmed] || LEGACY_LESSON_ALIASES[lower] || trimmed;
}

export function getAliasesForLesson(canonicalId: string): string[] {
  return REVERSE_ALIASES[canonicalId] || [];
}

/**
 * Resolves a requested lesson ID to its matching flat lesson entry and index.
 * Handles exact IDs, case variations, legacy 'w3s-*' IDs, shorthand slugs, and fuzzy matching.
 */
export function resolveLessonEntry(
  rawId: string,
  allEntries: FlatLessonEntry[]
): { entry: FlatLessonEntry; index: number } | null {
  if (!rawId || typeof rawId !== 'string') return null;
  const targetId = rawId.trim();

  // 1. Exact match
  let idx = allEntries.findIndex((e) => e.lesson.id === targetId);
  if (idx !== -1) return { entry: allEntries[idx], index: idx };

  // 2. Case-insensitive exact match
  const lower = targetId.toLowerCase();
  idx = allEntries.findIndex((e) => e.lesson.id.toLowerCase() === lower);
  if (idx !== -1) return { entry: allEntries[idx], index: idx };

  // 3. Known explicit alias dictionary
  const aliasTarget = LEGACY_LESSON_ALIASES[targetId] || LEGACY_LESSON_ALIASES[lower];
  if (aliasTarget) {
    idx = allEntries.findIndex((e) => e.lesson.id === aliasTarget);
    if (idx !== -1) return { entry: allEntries[idx], index: idx };
  }

  // 4. Match stripped 'w3s-'
  const clean = lower.replace(/^w3s-/, '');
  idx = allEntries.findIndex((e) => e.lesson.id.toLowerCase() === clean);
  if (idx !== -1) return { entry: allEntries[idx], index: idx };

  // 5. Intelligent fuzzy match by subject + slug/title tokens
  const subjects = ['javascript', 'typescript', 'nodejs', 'react', 'csharp', 'python', 'java', 'html', 'css', 'sql', 'cpp'];
  const detectedSubject = subjects.find((s) => clean.startsWith(s + '-') || clean.startsWith(s));
  let rest = clean;
  if (detectedSubject) {
    rest = clean.slice(detectedSubject.length).replace(/^-+/, '');
  }

  const restTokens = rest
    .split(/[-_./]+/)
    .filter(Boolean)
    .filter((t) => t !== detectedSubject && t !== 'js' && t !== 'ts' && t !== 'node');

  const candidates = detectedSubject
    ? allEntries.map((e, i) => ({ entry: e, index: i })).filter((c) => c.entry.subjectId === detectedSubject)
    : allEntries.map((e, i) => ({ entry: e, index: i }));

  const normTokenStr = restTokens.join('').replace(/[^a-z0-9]/g, '');

  let bestMatch: { entry: FlatLessonEntry; index: number } | null = null;
  let bestScore = 0;

  for (const cand of candidates) {
    const candNormId = cand.entry.lesson.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const candNormTitle = cand.entry.lesson.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    let score = 0;

    if (candNormId.endsWith(normTokenStr)) score += 50;
    if (candNormTitle === normTokenStr) score += 40;
    if (candNormId.includes(normTokenStr)) score += 30;
    if (candNormTitle.includes(normTokenStr)) score += 25;

    if (normTokenStr.includes('intro') && (candNormId.includes('introduction') || candNormTitle.includes('introduction'))) {
      score += 35;
    }

    for (const tok of restTokens) {
      if (tok === 'intro') {
        if (candNormId.includes('introduction') || candNormTitle.includes('introduction')) score += 10;
      } else if (candNormId.includes(tok) || candNormTitle.includes(tok)) {
        score += 10;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = cand;
    }
  }

  if (bestMatch && bestScore >= 20) {
    return bestMatch;
  }

  return null;
}
