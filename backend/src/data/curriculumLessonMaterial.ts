import type { LessonContent, LessonSpec, ModuleSpec, SubjectSpec } from './lectureCurriculumTypes.js';

/**
 * The curriculum catalogue contains the W3Schools navigation structure.  This
 * layer deliberately replaces the old generated "Executing <lesson>" cards
 * with teaching material selected from the lesson's actual topic.  It keeps
 * the catalogue (and its source URLs) separate from presentation material so
 * a later source sync can update a title or a URL without reintroducing a
 * generic lesson body.
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
    application: 'Validate input, select behaviour, and process a sequence of records.',
  },
  collections: {
    focus: 'how ordered and keyed groups of values are stored, accessed, and changed',
    concept: 'collection operations',
    objective: 'select the collection operation that retrieves or updates the intended item',
    rule: 'Know whether an operation changes the collection or returns a new value.',
    mistake: 'Mixing up an item index with an item value or key.',
    application: 'Keep lists of tasks, lookup data, API records, and user selections.',
  },
  functions: {
    focus: 'how reusable behaviour receives input, performs work, and returns a result',
    concept: 'function contract',
    objective: 'state the inputs, output, and side effects of a function or method',
    rule: 'Give each function one focused responsibility.',
    mistake: 'Relying on a value outside the function when it should be a parameter.',
    application: 'Extract repeated logic into named, testable units.',
  },
  objects: {
    focus: 'how related state and behaviour are represented with objects, classes, and types',
    concept: 'object model',
    objective: 'distinguish instance data from behaviour shared by a type',
    rule: 'Keep a type responsible for the data it owns.',
    mistake: 'Exposing mutable internal state when a controlled method or property is safer.',
    application: 'Model domain entities such as users, orders, and UI components.',
  },
  errors: {
    focus: 'how failures are detected, investigated, and handled without hiding their cause',
    concept: 'error handling',
    objective: 'identify the failure path and describe the recovery or reporting behaviour',
    rule: 'Handle only errors you can explain or recover from.',
    mistake: 'Catching every error and continuing as though the operation succeeded.',
    application: 'Make file, network, and user-input failures understandable to users and developers.',
  },
  files: {
    focus: 'how data is read, written, buffered, and closed safely',
    concept: 'resource handling',
    objective: 'describe when a resource opens, is used, and is released',
    rule: 'Close or dispose of resources even when an operation fails.',
    mistake: 'Assuming a path exists or treating untrusted file content as valid data.',
    application: 'Persist application data, import files, and process server-side uploads.',
  },
  async: {
    focus: 'how work that finishes later is started, awaited, and recovered when it fails',
    concept: 'asynchronous control flow',
    objective: 'explain what waits for completion and what continues immediately',
    rule: 'Return or await asynchronous work so errors stay on the intended path.',
    mistake: 'Updating state before an asynchronous operation has finished.',
    application: 'Load API data, schedule work, and keep an interface responsive.',
  },
  modules: {
    focus: 'how code is organised into files, packages, and explicit public interfaces',
    concept: 'module boundary',
    objective: 'identify what a module exports and what another module imports',
    rule: 'Expose the smallest useful public API from each module.',
    mistake: 'Creating circular imports or relying on hidden global state.',
    application: 'Split an application into maintainable, independently testable parts.',
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

function codeExample(subjectId: string, family: LessonFamily, title: string): LessonContent['examples'] {
  if (family === 'practice' || family === 'reference' || family === 'topic') return undefined;

  const label = title.replace(/^(JavaScript|TypeScript|Node\.js|Python|Java|C\+\+|C#|React|HTML|CSS|SQL)\s*/i, '');
  const output = (code: string, expected: string, language: string) => [{
    title: `${label || title}: worked example`, language, code,
    explanation: `Expected output: ${expected}`,
  }];

  if (subjectId === 'sql') {
    if (/join/i.test(title)) return output(
      'SELECT o.id, c.name\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id;',
      'One row per order with the matching customer name.', 'sql');
    if (/group|count|sum|avg|min|max|having/i.test(title)) return output(
      'SELECT department, COUNT(*) AS people\nFROM employees\nGROUP BY department\nHAVING COUNT(*) > 1;',
      'Departments that contain at least two employees.', 'sql');
    if (/create|alter|drop|constraint|index|database|table/i.test(title)) return output(
      'CREATE TABLE tasks (\n  id INTEGER PRIMARY KEY,\n  title VARCHAR(120) NOT NULL\n);',
      'A tasks table with an identifier and a required title.', 'sql');
    return output(
      'SELECT name\nFROM customers\nWHERE active = TRUE\nORDER BY name;',
      'Active customer names, ordered alphabetically.', 'sql');
  }

  if (subjectId === 'html') {
    if (/form|input|textarea|select|checkbox|radio/i.test(title)) return output(
      '<form>\n  <label>Email <input type="email" required></label>\n  <button type="submit">Save</button>\n</form>',
      'A labelled email input and a submit button in the browser.', 'html');
    return output(
      '<main>\n  <h1>Lesson title</h1>\n  <p>Clear, semantic content belongs here.</p>\n</main>',
      'A page section with a heading and paragraph.', 'html');
  }

  if (subjectId === 'css') {
    if (/flex|grid|layout|position|display|align/i.test(title)) return output(
      '.cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));\n  gap: 1rem;\n}',
      'Cards flow into responsive columns with consistent spacing.', 'css');
    return output(
      '.notice {\n  color: #14532d;\n  background: #dcfce7;\n  padding: 0.75rem;\n}',
      'A readable notice with colour and spacing.', 'css');
  }

  if (subjectId === 'react') {
    if (/hook|state|usestate|effect|useeffect|context|reducer|memo|callback|ref/i.test(title)) return output(
      'import { useState } from "react";\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;\n}',
      'The button label increases after each click.', 'tsx');
    return output(
      'type GreetingProps = { name: string };\n\nexport function Greeting({ name }: GreetingProps) {\n  return <h1>Hello, {name}</h1>;\n}',
      'A reusable component renders a supplied name.', 'tsx');
  }

  if (subjectId === 'nodejs') {
    if (/http|express|rest|api|server/i.test(title)) return output(
      'import http from "node:http";\n\nhttp.createServer((_req, res) => {\n  res.writeHead(200, { "Content-Type": "application/json" });\n  res.end(JSON.stringify({ status: "ok" }));\n}).listen(3000);',
      'GET http://localhost:3000 responds with {"status":"ok"}.', 'javascript');
    return output(
      'import { readFile } from "node:fs/promises";\n\nconst text = await readFile("notes.txt", "utf8");\nconsole.log(text.length);',
      'The number of characters in notes.txt.', 'javascript');
  }

  if (subjectId === 'typescript') return output(
    'type User = { name: string; active: boolean };\n\nconst user: User = { name: "Ada", active: true };\nconsole.log(user.name);',
    'Ada', 'typescript');

  if (subjectId === 'python') {
    if (family === 'collections') return output('scores = [72, 91, 84]\nprint(max(scores))', '91', 'python');
    if (family === 'flow') return output('age = 19\nif age >= 18:\n    print("allowed")', 'allowed', 'python');
    if (family === 'functions') return output('def square(number):\n    return number * number\n\nprint(square(4))', '16', 'python');
    if (family === 'objects') return output('class User:\n    def __init__(self, name):\n        self.name = name\n\nprint(User("Ada").name)', 'Ada', 'python');
    return output('message = "Hello, Python"\nprint(message)', 'Hello, Python', 'python');
  }

  if (subjectId === 'cpp') {
    if (family === 'collections') return output('#include <iostream>\n#include <vector>\n\nint main() {\n  std::vector<int> scores{72, 91, 84};\n  std::cout << scores[1];\n}', '91', 'cpp');
    if (family === 'flow') return output('#include <iostream>\n\nint main() {\n  int age = 19;\n  if (age >= 18) std::cout << "allowed";\n}', 'allowed', 'cpp');
    return output('#include <iostream>\n\nint main() {\n  std::cout << "Hello, C++";\n}', 'Hello, C++', 'cpp');
  }

  if (subjectId === 'csharp') {
    if (family === 'collections') return output('var scores = new List<int> { 72, 91, 84 };\nConsole.WriteLine(scores[1]);', '91', 'csharp');
    if (family === 'flow') return output('int age = 19;\nif (age >= 18) Console.WriteLine("allowed");', 'allowed', 'csharp');
    return output('string message = "Hello, C#";\nConsole.WriteLine(message);', 'Hello, C#', 'csharp');
  }

  if (subjectId === 'java') {
    if (family === 'collections') return output('import java.util.List;\n\nclass Main {\n  public static void main(String[] args) {\n    var scores = List.of(72, 91, 84);\n    System.out.println(scores.get(1));\n  }\n}', '91', 'java');
    if (family === 'flow') return output('class Main {\n  public static void main(String[] args) {\n    int age = 19;\n    if (age >= 18) System.out.println("allowed");\n  }\n}', 'allowed', 'java');
    return output('class Main {\n  public static void main(String[] args) {\n    String message = "Hello, Java";\n    System.out.println(message);\n  }\n}', 'Hello, Java', 'java');
  }

  // JavaScript is the remaining runtime language in the selected catalogue.
  if (family === 'web') return output('document.querySelector("button")?.addEventListener("click", () => {\n  document.body.classList.toggle("ready");\n});', 'Clicking the button toggles the ready class on the page.', 'javascript');
  if (family === 'async') return output('const response = await fetch("/api/profile");\nconst profile = await response.json();\nconsole.log(profile.name);', 'The profile name returned by the API.', 'javascript');
  if (family === 'collections') return output('const scores = [72, 91, 84];\nconsole.log(scores.find((score) => score > 90));', '91', 'javascript');
  if (family === 'flow') return output('const age = 19;\nif (age >= 18) console.log("allowed");', 'allowed', 'javascript');
  if (family === 'functions') return output('const square = (number) => number * number;\nconsole.log(square(4));', '16', 'javascript');
  if (family === 'objects') return output('class User {\n  constructor(name) { this.name = name; }\n}\nconsole.log(new User("Ada").name);', 'Ada', 'javascript');
  return output('const message = "Hello, JavaScript";\nconsole.log(message);', 'Hello, JavaScript', 'javascript');
}

function familySyntax(subjectId: string, family: LessonFamily): string[] | undefined {
  if (family === 'practice' || family === 'reference' || family === 'topic') return undefined;
  if (subjectId === 'sql') return ['SELECT column FROM table WHERE condition;', 'INSERT INTO table (column) VALUES (value);'];
  if (subjectId === 'html') return ['<element attribute="value">content</element>'];
  if (subjectId === 'css') return ['selector { property: value; }'];
  if (subjectId === 'react') return ['function Component(props) { return <Element />; }'];
  if (subjectId === 'nodejs') return ['import { feature } from "node:module";', 'await asynchronousOperation();'];
  if (subjectId === 'typescript') return ['const value: Type = expression;', 'type Name = { property: Type };'];
  if (subjectId === 'python') return family === 'flow' ? ['if condition:', '    action()'] : ['name = value'];
  if (subjectId === 'cpp') return ['type name = value;', 'if (condition) { /* action */ }'];
  if (subjectId === 'csharp') return ['Type name = value;', 'if (condition) { /* action */ }'];
  if (subjectId === 'java') return ['Type name = value;', 'if (condition) { /* action */ }'];
  return family === 'flow' ? ['if (condition) { action(); }'] : ['const name = value;'];
}

function isGenericLesson(lesson: LessonSpec): boolean {
  return lesson.overview.startsWith('Master ')
    || lesson.content.explanation.includes('is an essential part of')
    || lesson.content.examples?.some((example) => /Executing .*demonstration|Demonstrating /.test(example.code)) === true;
}

/** Returns a topic-aware lesson body without mutating the imported source catalogue. */
export function materializeLesson(
  lesson: LessonSpec,
  subject: SubjectSpec,
  module: ModuleSpec,
  previousLessonTitle?: string,
): LessonSpec {
  if (!isGenericLesson(lesson)) return lesson;

  const family = familyFor(subject.id, lesson.title, module.name);
  const guide = FAMILY_GUIDES[family];
  const examples = codeExample(subject.id, family, lesson.title);
  const sourceUrl = lesson.sources[0]?.sourceUrl;
  const sourceInstruction = sourceUrl
    ? ` The linked W3Schools page is the source reference for the exact syntax and version-specific details.`
    : '';
  const prerequisite = previousLessonTitle ? [previousLessonTitle] : [];

  return {
    ...lesson,
    overview: `${lesson.title} focuses on ${guide.focus}.`,
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
      syntax: familySyntax(subject.id, family),
      examples,
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
      importantSyntax: familySyntax(subject.id, family),
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
    && !lesson.content.examples?.some((example) => /Executing .*demonstration|Demonstrating /.test(example.code));
}
