import type { LessonContent, LessonSpec, ModuleSpec, SubjectSpec } from './lectureCurriculumTypes.js';
import type { ExampleSnippet } from './curriculumSnippets/types.js';
import { getPythonExample } from './curriculumSnippets/python.js';
import { getSqlExample } from './curriculumSnippets/sql.js';
import { getJavaScriptExample } from './curriculumSnippets/javascript.js';
import { getHtmlExample } from './curriculumSnippets/html.js';
import { getCssExample } from './curriculumSnippets/css.js';
import { getJavaExample } from './curriculumSnippets/java.js';
import { getCppExample } from './curriculumSnippets/cpp.js';
import { getCSharpExample } from './curriculumSnippets/csharp.js';
import { getReactExample } from './curriculumSnippets/react.js';
import { getNodeExample } from './curriculumSnippets/nodejs.js';
import { getTypeScriptExample } from './curriculumSnippets/typescript.js';

export type { ExampleSnippet };

/**
 * The curriculum catalogue contains the W3Schools navigation structure.
 * This layer replaces generic placeholder templates with authentic teaching
 * material and canonical code examples directly modeled after W3Schools tutorials.
 */
type LessonFamily =
  | 'orientation'
  | 'values'
  | 'flow'
  | 'collections'
  | 'functions'
  | 'objects'
  | 'errors'
  | 'files'
  | 'async'
  | 'modules'
  | 'web'
  | 'markup'
  | 'database'
  | 'react'
  | 'node'
  | 'typescript'
  | 'practice'
  | 'reference'
  | 'topic';

interface FamilyGuide {
  focus: string;
  concept: string;
  objective: string;
  rule: string;
  mistake: string;
  application: string;
}

const FAMILY_GUIDES: Record<LessonFamily, FamilyGuide> = {
  orientation: {
    focus: 'how this technology is set up and where the selected feature fits in its workflow',
    concept: 'program setup',
    objective: 'set up a small, runnable example and identify the part that performs the work',
    rule: 'Run the smallest working example before adding new syntax.',
    mistake: 'Changing several things at once, then not knowing which change caused a problem.',
    application: 'Create a reliable starting point for a new project or exercise.',
  },
  values: {
    focus: 'how values are declared, represented, converted, and combined',
    concept: 'data and expressions',
    objective: 'predict the value and type produced by a short expression',
    rule: 'Choose a representation that matches the data you need to keep.',
    mistake: 'Assuming a conversion happens automatically when the language requires an explicit one.',
    application: 'Model input, calculations, configuration, and displayed values.',
  },
  flow: {
    focus: 'how a program chooses a path or repeats a task',
    concept: 'control flow',
    objective: 'trace which branch or iteration executes for a given input',
    rule: 'Make each condition express one clear decision.',
    mistake: 'Using assignment where a comparison is required, or writing a loop that never changes its condition.',
    application: 'Validate user actions, branch on status, and step through records.',
  },
  collections: {
    focus: 'how related items are ordered, looked up, updated, and transformed',
    concept: 'data collections',
    objective: 'choose the structure that matches how items must be retrieved or modified',
    rule: 'Know whether lookup by key or preservation of order is the primary requirement.',
    mistake: 'Modifying a collection while iterating over it without the collection\'s supported pattern.',
    application: 'Manage lists, registries, search indexes, and grouped results.',
  },
  functions: {
    focus: 'how operations are packaged, parameterised, reused, and scoped',
    concept: 'callable procedures',
    objective: 'state the inputs, side effects, and return value of the selected routine',
    rule: 'Keep each function focused on a single responsibility.',
    mistake: 'Relying on implicit global values instead of explicit parameters.',
    application: 'Build clear interfaces between different parts of a program.',
  },
  objects: {
    focus: 'how state and behaviour are encapsulated, shared, or specialized',
    concept: 'object design',
    objective: 'identify which class or instance owns each piece of state',
    rule: 'Expose only the methods needed to interact with the object.',
    mistake: 'Creating deep inheritance hierarchies when composition would be clearer.',
    application: 'Model business entities, domain services, and UI components.',
  },
  errors: {
    focus: 'how invalid inputs and unexpected runtime conditions are caught, handled, or reported',
    concept: 'error handling',
    objective: 'distinguish between predictable operational errors and fatal defects',
    rule: 'Catch errors at the level where you can actually handle or explain them.',
    mistake: 'Silently swallowing an exception without logging or rethrowing.',
    application: 'Keep programs stable and provide actionable feedback when things fail.',
  },
  files: {
    focus: 'how data is read, written, streamed, and persisted safely on disk',
    concept: 'file operations',
    objective: 'trace how file handles and resources are opened and closed',
    rule: 'Always close resources in a finally block or with an automatic resource construct.',
    mistake: 'Assuming a file exists or is readable without checking permissions or paths.',
    application: 'Persist configuration, process user uploads, and generate reports.',
  },
  async: {
    focus: 'how long-running tasks yield control and resume without blocking execution',
    concept: 'asynchronous coordination',
    objective: 'follow the execution order of promises, tasks, and callbacks',
    rule: 'Handle rejection or errors on every asynchronous code path.',
    mistake: 'Mixing synchronous assumptions with asynchronous return values.',
    application: 'Call external services, handle timeouts, and manage concurrent jobs.',
  },
  modules: {
    focus: 'how code is partitioned across files, packages, and dependencies',
    concept: 'module boundaries',
    objective: 'import only what is needed and export a clean public surface',
    rule: 'Keep module dependencies acyclic and explicit.',
    mistake: 'Leaking internal helper functions into the public export list.',
    application: 'Organise applications into reusable, testable packages.',
  },
  web: {
    focus: 'how browser APIs, the document, and events work together in a page',
    concept: 'browser interaction',
    objective: 'connect a user action or browser event to a visible change',
    rule: 'Read and update the correct element rather than rebuilding the whole page.',
    mistake: 'Querying an element before the document has created it.',
    application: 'Build forms, interactive controls, storage, and API-driven pages.',
  },
  markup: {
    focus: 'how semantic structure and visual rules produce an accessible, responsive page',
    concept: 'document and presentation structure',
    objective: 'choose markup or a style rule that expresses the selected purpose',
    rule: 'Use semantic HTML for meaning and CSS for presentation.',
    mistake: 'Using a visual element in place of an element with the correct meaning.',
    application: 'Create readable layouts that work across devices and assistive technology.',
  },
  database: {
    focus: 'how relational data is queried, changed, grouped, and protected by constraints',
    concept: 'relational query',
    objective: 'predict which rows and columns a statement returns or changes',
    rule: 'Use a restrictive WHERE clause before a data-changing statement.',
    mistake: 'Running UPDATE or DELETE without first verifying the selected rows.',
    application: 'Retrieve, report on, and safely maintain application data.',
  },
  react: {
    focus: 'how React composes UI from components, props, state, and effects',
    concept: 'component rendering',
    objective: 'identify what causes a component to render again',
    rule: 'Keep render logic pure and place external effects in the appropriate hook.',
    mistake: 'Mutating state directly instead of using the state setter.',
    application: 'Build reusable, interactive user-interface features.',
  },
  node: {
    focus: 'how Node.js runs JavaScript on the server and coordinates modules, I/O, and services',
    concept: 'server-side runtime',
    objective: 'follow a request or asynchronous operation through its Node.js code path',
    rule: 'Treat input, credentials, and external service responses as untrusted.',
    mistake: 'Blocking the event loop with slow synchronous work in a request handler.',
    application: 'Create APIs, command-line tools, integrations, and backend services.',
  },
  typescript: {
    focus: 'how TypeScript describes valid values and catches incompatible code before it runs',
    concept: 'static type contract',
    objective: 'express the allowed shape of a value with a type, interface, or generic',
    rule: 'Use the narrowest type that accurately describes the value.',
    mistake: 'Using any to silence a type error instead of modelling the missing case.',
    application: 'Make refactoring, API use, and collaboration safer in JavaScript projects.',
  },
  practice: {
    focus: 'how to apply the selected topic through a focused exercise and verify the result',
    concept: 'deliberate practice',
    objective: 'complete a small task without copying an entire solution',
    rule: 'Read the expected behaviour before writing the solution.',
    mistake: 'Treating a completed exercise as understood without explaining the result.',
    application: 'Turn a tutorial concept into a skill you can use in a new problem.',
  },
  reference: {
    focus: 'how to use the selected API, keyword, or language reference accurately',
    concept: 'reference lookup',
    objective: 'find the input, result, and constraints of the selected entry',
    rule: 'Check the documented return value and edge cases before using an API.',
    mistake: 'Assuming two similarly named methods have the same side effects.',
    application: 'Confirm syntax and behaviour while implementing or reviewing code.',
  },
  topic: {
    focus: 'the purpose, syntax, constraints, and practical use of this selected topic',
    concept: 'topic-specific technique',
    objective: 'explain the selected topic in your own words and use it in a small example',
    rule: 'Use the source reference to confirm details that depend on a specific runtime or version.',
    mistake: 'Applying the right syntax in a context where its prerequisites have not been met.',
    application: 'Connect this lesson to a focused task in the current technology.',
  },
};

function familyFor(subjectId: string, title: string, moduleName: string): LessonFamily {
  const value = `${title} ${moduleName}`.toLowerCase();
  if (/examples|exercise|quiz|challenge|practice problem|project|syllabus|study plan|interview|editor|compiler|certificate/.test(value)) return 'practice';
  if (/reference|keywords|methods|properties|versions|history/.test(value)) return 'reference';
  if (subjectId === 'sql') return 'database';
  if (subjectId === 'html' || subjectId === 'css') return 'markup';
  if (subjectId === 'react') return 'react';
  if (subjectId === 'nodejs') return 'node';
  if (subjectId === 'typescript') return 'typescript';
  if (/dom|event|window|browser|ajax|json|fetch|storage|geolocation|canvas|graphics|chart|api/.test(value)) return 'web';
  if (/async|promise|await|callback|timeout|event loop|worker|abort/.test(value)) return 'async';
  if (/error|debug|exception|try|catch|throw|validation/.test(value)) return 'errors';
  if (/file|stream|reader|writer|inputstream|outputstream|buffer|path/.test(value)) return 'files';
  if (/module|package|namespace|import|export|npm|dependency/.test(value)) return 'modules';
  if (/class|object|oop|constructor|inheritance|polymorphism|encapsulation|interface|abstract|enum|property|modifier|prototype|this keyword|super keyword/.test(value)) return 'objects';
  if (/method|function|parameter|argument|return|lambda|recursion|scope/.test(value)) return 'functions';
  if (/array|list|tuple|set|map|dictionary|collection|vector|stack|queue|deque|iterator|iterable|generator|linkedlist|hashmap/.test(value)) return 'collections';
  if (/if|else|switch|while|for loop|break|continue|conditional|boolean|logical|ternary|loop|control flow/.test(value)) return 'flow';
  if (/variable|constant|data type|type casting|operator|string|number|math|bigint|symbol|undefined|nan|destructuring|simple type|type inference|union type/.test(value)) return 'values';
  if (/home|introduction|get started|first app|where to|requirements|architecture|command line|syntax|statement|comment/.test(value)) return 'orientation';
  return 'topic';
}

// ---------------------------------------------------------------------------
// Template Detection
// ---------------------------------------------------------------------------

const TEMPLATE_HINTS = [
  'executing ',
  'demonstrating ',
  'lesson title',
  'this topic',
  'the selected topic',
  'select * from students where active = 1',
];

const TEMPLATE_REGEX_HINTS = [
  /\/\/[^\n]+ in (javascript|typescript|node\.js|python|java|c\+\+|c#|react|html|css|sql)/i,
  /\/\* [^\n]+ (demonstration|styling)/i,
  /# [^\n]+ demonstration/i,
  /-- [^\n]+ query/i,
];

function isTemplateCode(code: string): boolean {
  const lower = code.toLowerCase();
  if (TEMPLATE_REGEX_HINTS.some((re) => re.test(code))) return true;
  return TEMPLATE_HINTS.some((hint) => lower.includes(hint));
}

function resolveTopicExample(subjectId: string, title: string): ExampleSnippet {
  switch (subjectId) {
    case 'python':
      return getPythonExample(title);
    case 'sql':
      return getSqlExample(title);
    case 'javascript':
      return getJavaScriptExample(title);
    case 'html':
      return getHtmlExample(title);
    case 'css':
      return getCssExample(title);
    case 'java':
      return getJavaExample(title);
    case 'cpp':
      return getCppExample(title);
    case 'csharp':
      return getCSharpExample(title);
    case 'react':
      return getReactExample(title);
    case 'nodejs':
      return getNodeExample(title);
    case 'typescript':
      return getTypeScriptExample(title);
    default:
      return {
        title: `${title} Example`,
        language: subjectId,
        code: `const feature = "${title}";\nconsole.log(feature);`,
        explanation: `Demonstrates ${title}.\n\nExpected Output:\n${title}`,
      };
  }
}

function isGenericLesson(lesson: LessonSpec): boolean {
  return lesson.overview.startsWith('Master ')
    || lesson.overview.startsWith('Master the ')
    || lesson.content.explanation.includes('is an essential part of')
    || lesson.content.explanation.includes('This lesson is part of the ')
    || lesson.content.examples?.some((example) => isTemplateCode(example.code)) === true;
}

/** Returns a topic-aware lesson body with authentic W3Schools code examples. */
export function materializeLesson(
  lesson: LessonSpec,
  subject: SubjectSpec,
  module: ModuleSpec,
  previousLessonTitle?: string,
): LessonSpec {
  const family = familyFor(subject.id, lesson.title, module.name);
  const guide = FAMILY_GUIDES[family];
  const topicExample = resolveTopicExample(subject.id, lesson.title);

  const existingExamples = lesson.content.examples ?? [];
  const hasSpecificExamples = existingExamples.length > 0 &&
    !existingExamples.some((ex) => isTemplateCode(ex.code));

  const finalExamples: LessonContent['examples'] = hasSpecificExamples
    ? existingExamples
    : [
        {
          title: topicExample.title,
          language: topicExample.language,
          code: topicExample.code,
          explanation: topicExample.explanation,
        },
      ];

  const finalSyntax = topicExample.syntax && topicExample.syntax.length > 0
    ? topicExample.syntax
    : lesson.content.syntax && lesson.content.syntax.length > 0
    ? lesson.content.syntax
    : [`// Standard ${subject.name} syntax for ${lesson.title}`];

  const sourceUrl = lesson.sources[0]?.sourceUrl;
  const sourceInstruction = sourceUrl
    ? ` The linked W3Schools page is the source reference for the exact syntax and version-specific details.`
    : '';
  const prerequisite = previousLessonTitle ? [previousLessonTitle] : [];

  return {
    ...lesson,
    overview: `${lesson.title} in ${subject.name} focuses on ${guide.focus}.`,
    learningObjectives: [
      `Explain ${lesson.title} in the context of ${subject.name}.`,
      guide.objective,
      `Use ${lesson.title} in a small ${subject.name} task and verify the result.`,
    ],
    prerequisites: prerequisite,
    content: {
      explanation: `${lesson.title} is part of the ${module.name} section of the ${subject.name} path. This lesson focuses on ${guide.focus}.${sourceInstruction}`,
      keyConcepts: [
        {
          title: lesson.title,
          definition: `The selected ${subject.name} topic. Study its purpose, syntax, valid inputs, and observable result before using it in a larger program.`,
          purpose: guide.application,
        },
        {
          title: guide.concept,
          definition: `The central idea that makes ${lesson.title} work in this lesson.`,
          purpose: `Use it to reason about ${lesson.title} instead of memorising isolated syntax.`,
        },
      ],
      syntax: finalSyntax,
      examples: finalExamples,
      rules: [guide.rule],
      practicalApplications: [guide.application],
      commonMistakes: [guide.mistake],
      relatedConcepts: [module.name, previousLessonTitle || `${subject.name} fundamentals`],
      exercise: {
        prompt: `Create the smallest ${subject.name} example that demonstrates ${lesson.title}. State what should happen before you run it.`,
        successCriteria: 'The example uses the selected topic intentionally and its result matches your prediction.',
      },
      quiz: {
        question: `What problem does ${lesson.title} solve in ${subject.name}?`,
        answer: `It supports ${guide.focus}.`,
      },
      challenge: {
        prompt: `Adapt the worked example for a realistic ${subject.name} task, then explain one edge case you considered.`,
        successCriteria: 'Your solution names the selected concept, handles the stated edge case, and produces the expected result.',
      },
    },
    revisionNotes: {
      keyTerms: [lesson.title, guide.concept, subject.name],
      remember: [guide.rule, `Use the source reference when ${lesson.title} depends on a library or runtime version.`],
      importantSyntax: finalSyntax,
      commonMistakes: [guide.mistake],
    },
  };
}

export function materializeSubjectLessons(subject: SubjectSpec): SubjectSpec {
  return {
    ...subject,
    modules: subject.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson, index) =>
        materializeLesson(lesson, subject, module, module.lessons[index - 1]?.title),
      ),
    })),
  };
}

export function isMaterializedLessonRelevant(lesson: LessonSpec): boolean {
  return !isGenericLesson(lesson)
    && lesson.content.explanation.includes(lesson.title)
    && !lesson.content.examples?.some((example) => isTemplateCode(example.code));
}
