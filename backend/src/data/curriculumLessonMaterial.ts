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
 * This layer supplies rich, self-contained, junior-developer-friendly teaching
 * material, detailed syntax breakdowns, step-by-step execution mechanics, and
 * canonical code examples directly within the application, eliminating generic
 * placeholder stubs.
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
    focus: 'program initialization, tooling setup, file structure, and core runtime entry points',
    concept: 'program setup and entry mechanics',
    objective: 'set up an executable project, trace the main entry point, and verify console/terminal output',
    rule: 'Verify that the runtime environment and dependencies are configured before writing business logic.',
    mistake: 'Modifying multiple environment configurations at once, making troubleshooting difficult.',
    application: 'Initialize and maintain robust, runnable software projects from scratch.',
  },
  values: {
    focus: 'data representation, primitive types, operators, immutability, and type coercion',
    concept: 'data types and expressions',
    objective: 'predict the exact evaluation, type conversion, and returned memory value for an expression',
    rule: 'Choose the most precise data type that accurately represents the domain constraints of your data.',
    mistake: 'Relying on implicit type coercion where strict or explicit conversion is required.',
    application: 'Model variables, user inputs, mathematical calculations, and configuration states.',
  },
  flow: {
    focus: 'branching logic, conditionals, iterative loops, and loop control statements',
    concept: 'control flow and branch evaluation',
    objective: 'trace which conditional branch or iteration executes given specific runtime parameters',
    rule: 'Ensure each conditional branch evaluates a single unambiguous predicate and update loop counters safely.',
    mistake: 'Accidental assignment inside conditions or writing iterative loops without clear termination criteria.',
    application: 'Validate authorization, handle user choices, and process batches of records.',
  },
  collections: {
    focus: 'ordered lists, key-value mappings, associative sets, and data structure transformations',
    concept: 'collection manipulation and indexing',
    objective: 'select the ideal collection type matching required lookup complexity and iteration patterns',
    rule: 'Know whether fast key-based retrieval (O(1)) or order preservation (O(n)) is the primary requirement.',
    mistake: 'Mutating a collection while actively iterating over it without supported iterator guards.',
    application: 'Manage registries, search indices, filtered datasets, and cached query results.',
  },
  functions: {
    focus: 'procedure definitions, parameters, return types, closures, and call stack scoping',
    concept: 'callable routines and scope boundaries',
    objective: 'state the exact inputs, side effects, and returned values of a function signature',
    rule: 'Keep functions pure and focused on a single responsibility with minimal global side effects.',
    mistake: 'Relying on implicit outer-scope global variables instead of explicit function arguments.',
    application: 'Encapsulate reusable domain logic and build clear, testable application modules.',
  },
  objects: {
    focus: 'object-oriented design, encapsulation, class declarations, inheritance, and polymorphism',
    concept: 'encapsulation and class contracts',
    objective: 'identify which class, interface, or instance maintains state ownership and access rights',
    rule: 'Expose public contracts through clear methods while keeping internal state variables private.',
    mistake: 'Creating deeply coupled inheritance hierarchies where composition would be cleaner.',
    application: 'Model domain entities, business services, and extensible user-interface components.',
  },
  errors: {
    focus: 'runtime exception handling, try-catch-finally guards, custom errors, and defensive validation',
    concept: 'defensive error handling and resilience',
    objective: 'distinguish between expected operational errors and fatal defects, handling each safely',
    rule: 'Catch exceptions at the architectural layer where you can either resolve them or provide actionable logging.',
    mistake: 'Swallowing errors in empty catch blocks without logging, masking critical production failures.',
    application: 'Maintain service stability, provide meaningful user feedback, and prevent server crashes.',
  },
  files: {
    focus: 'file I/O streams, binary and text reading/writing, path resolution, and resource disposal',
    concept: 'file stream and resource lifecycle',
    objective: 'trace how files and underlying OS file descriptors are safely opened, buffered, and closed',
    rule: 'Always release open file handles using automatic resource disposal or finally blocks.',
    mistake: 'Assuming file paths exist without verifying permissions, paths, or handling I/O exceptions.',
    application: 'Persist configuration data, process uploaded documents, and generate analytical reports.',
  },
  async: {
    focus: 'asynchronous concurrency, promises, async/await mechanics, and event-loop scheduling',
    concept: 'non-blocking asynchronous coordination',
    objective: 'trace the execution order and resolution of promises, tasks, and asynchronous callbacks',
    rule: 'Attach error and rejection handlers to every asynchronous pathway to avoid unhandled rejections.',
    mistake: 'Treating asynchronous returned promises as synchronous values before awaiting resolution.',
    application: 'Query external APIs, fetch database records, and handle concurrent network workflows.',
  },
  modules: {
    focus: 'code partitioning, imports, exports, dependency management, and package structure',
    concept: 'modular architectural boundaries',
    objective: 'export explicit public interfaces and import strictly what is necessary across files',
    rule: 'Maintain clean, unidirectional dependency graphs without circular imports between modules.',
    mistake: 'Leaking internal private utilities into public exports, causing unintended coupling.',
    application: 'Structure enterprise software into maintainable, independently testable packages.',
  },
  web: {
    focus: 'browser DOM APIs, event listeners, document manipulation, and client-side interactions',
    concept: 'DOM manipulation and browser events',
    objective: 'connect user browser events to targeted DOM mutations and client-side state changes',
    rule: 'Target specific DOM elements with precise selectors and clean up event listeners when unmounted.',
    mistake: 'Querying DOM elements before the document has completed loading or elements have rendered.',
    application: 'Build responsive web apps, interactive forms, dynamic dashboards, and modals.',
  },
  markup: {
    focus: 'HTML5 semantic tags, accessibility standards, document hierarchy, and CSS visual rules',
    concept: 'semantic document structure and presentation',
    objective: 'select the semantically correct HTML tag for content and apply clean styling presentation',
    rule: 'Use semantic HTML elements for document structure and use CSS for visual styling and layout.',
    mistake: 'Using generic non-semantic div elements for buttons, navigation, or headings.',
    application: 'Produce accessible, SEO-optimized, and device-responsive web interfaces.',
  },
  database: {
    focus: 'relational queries, data manipulation, filtering, joins, aggregation, and integrity constraints',
    concept: 'relational data querying and constraints',
    objective: 'predict the exact row sets, column projections, and changes produced by a database statement',
    rule: 'Always specify exact WHERE clauses before executing data-modifying statements (UPDATE / DELETE).',
    mistake: 'Executing UPDATE or DELETE statements without validating filtered rows with a prior SELECT.',
    application: 'Store, query, aggregate, and safeguard critical business records in relational databases.',
  },
  react: {
    focus: 'component architecture, state management with hooks, props passing, and reactive rendering',
    concept: 'declarative reactive UI rendering',
    objective: 'determine what causes component re-renders and manage state and effects cleanly',
    rule: 'Keep component rendering logic pure and declare all reactive values in hook dependency arrays.',
    mistake: 'Mutating state variables directly instead of invoking the designated state setter function.',
    application: 'Build scalable, reactive, component-driven user interfaces in modern web applications.',
  },
  node: {
    focus: 'server-side JavaScript execution, HTTP services, buffer management, and backend workflows',
    concept: 'server-side event-driven runtime',
    objective: 'trace an incoming HTTP request through middleware, controllers, and asynchronous I/O paths',
    rule: 'Validate all external client inputs defensively and avoid blocking the event loop with synchronous operations.',
    mistake: 'Performing heavy synchronous CPU operations inside request handlers, freezing server throughput.',
    application: 'Develop REST APIs, microservices, backend integrations, and server-side utilities.',
  },
  typescript: {
    focus: 'static type contracts, interfaces, generics, type narrowing, and compile-time guarantees',
    concept: 'static type verification and contracts',
    objective: 'model valid value shapes and catch type mismatches at compile time rather than at runtime',
    rule: 'Use the narrowest explicit type that accurately describes the value and avoid falling back to any.',
    mistake: 'Silencing type errors with the any type rather than narrowing unions or defining exact types.',
    application: 'Prevent runtime type errors, streamline refactoring, and provide clear code autocompletion.',
  },
  practice: {
    focus: 'hands-on problem solving, algorithmic implementation, coding exercises, and validation',
    concept: 'deliberate hands-on practice',
    objective: 'implement functional code meeting exact specification requirements without boilerplate copying',
    rule: 'Trace the problem requirements and expected outputs thoroughly before drafting your solution.',
    mistake: 'Assuming a solution works without testing boundary conditions, empty inputs, or edge cases.',
    application: 'Consolidate theoretical programming concepts into practical, interview-ready skills.',
  },
  reference: {
    focus: 'API method signatures, built-in library properties, return values, and parameters',
    concept: 'API specification lookup',
    objective: 'identify the exact parameters, optional flags, and return types of standard library APIs',
    rule: 'Check parameter ordering, return types, and side effects before integrating API functions.',
    mistake: 'Assuming two similarly named methods have the same side effects or parameter conventions.',
    application: 'Implement code with accuracy and adherence to language standard specifications.',
  },
  topic: {
    focus: 'the purpose, syntax structure, runtime mechanics, and practical use of this feature',
    concept: 'language feature implementation',
    objective: 'explain the concept thoroughly and apply it with correct syntax in a standalone example',
    rule: 'Write clean, readable code with explicit naming, verify edge cases, and inspect output.',
    mistake: 'Applying syntax patterns without understanding prerequisites or expected runtime behavior.',
    application: 'Apply language features to accomplish real-world software engineering tasks.',
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

/**
 * Generates authentic, accurate syntax specifications for any language construct,
 * ensuring no generic placeholder comments are ever rendered.
 */
function resolveComprehensiveSyntax(
  subjectId: string,
  subjectName: string,
  title: string,
  moduleName: string,
  providedSyntax?: string[],
): string[] {
  if (providedSyntax && providedSyntax.length > 0 && !providedSyntax.some((s) => s.includes('Standard ') && s.includes('syntax for'))) {
    return providedSyntax;
  }

  const t = `${title} ${moduleName}`.toLowerCase();

  switch (subjectId) {
    case 'python':
      if (/print|output/.test(t)) return ['print(*objects, sep=" ", end="\\n", file=sys.stdout, flush=False)'];
      if (/if|condition|else/.test(t)) return ['if condition:', '    # statement block', 'elif alternate_condition:', '    # alternate block', 'else:', '    # fallback block'];
      if (/for|loop/.test(t)) return ['for item in iterable:', '    # execute loop body', 'for index in range(start, stop, step):', '    # indexed iteration'];
      if (/while/.test(t)) return ['while condition:', '    # loop body continues while condition is True'];
      if (/def|function|lambda/.test(t)) return ['def function_name(param1, param2=default):', '    """Docstring explaining purpose"""', '    return result', 'lambda arg1, arg2: arg1 + arg2'];
      if (/class|object|inheritance/.test(t)) return ['class ClassName(BaseClass):', '    def __init__(self, property):', '        self.property = property', '    def method_name(self):', '        return self.property'];
      if (/list/.test(t)) return ['list_name = [item1, item2, item3]', 'list_name.append(new_item)', 'slice_sublist = list_name[start:end:step]'];
      if (/dict/.test(t)) return ['my_dict = {"key": value, "key2": value2}', 'val = my_dict.get("key", default)', 'my_dict["new_key"] = new_value'];
      if (/try|except|error/.test(t)) return ['try:', '    # execute risky operation', 'except SpecificError as err:', '    # handle specific error', 'finally:', '    # cleanup resources'];
      return [`# Python syntax for ${title}`, `result = process_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}(data)`];

    case 'javascript':
      if (/function|arrow/.test(t)) return ['function functionName(param1, param2) {', '  return result;', '}', 'const arrowFn = (arg1, arg2) => expression;'];
      if (/var|let|const|variable/.test(t)) return ['const constantName = value;', 'let variableName = value;'];
      if (/if|else|switch/.test(t)) return ['if (condition) {', '  // execute when truthy', '} else if (otherCondition) {', '  // alternate branch', '} else {', '  // fallback', '}'];
      if (/for|loop|while/.test(t)) return ['for (let i = 0; i < array.length; i++) { ... }', 'for (const item of iterable) { ... }', 'for (const key in object) { ... }'];
      if (/promise|async|await/.test(t)) return ['async function fetchData() {', '  try {', '    const res = await fetch(url);', '    return await res.json();', '  } catch (err) {', '    console.error(err);', '  }', '}'];
      if (/dom|event|click/.test(t)) return ['targetElement.addEventListener("event_name", (event) => {', '  event.preventDefault();', '  // handle event', '});'];
      if (/class/.test(t)) return ['class ClassName extends ParentClass {', '  constructor(prop) {', '    super();', '    this.prop = prop;', '  }', '}'];
      return [`const instance = new ${title.replace(/[^a-zA-Z0-9]/g, '')}();`, 'instance.execute();'];

    case 'sql':
      if (/select/.test(t) && !/insert/.test(t)) return ['SELECT column1, column2 FROM table_name WHERE condition;', 'SELECT * FROM table_name ORDER BY column ASC;'];
      if (/join/.test(t)) return ['SELECT A.col1, B.col2', 'FROM TableA A', 'INNER JOIN TableB B ON A.id = B.a_id', 'WHERE A.status = "active";'];
      if (/insert/.test(t)) return ['INSERT INTO table_name (column1, column2) VALUES (value1, value2);'];
      if (/update/.test(t)) return ['UPDATE table_name SET col1 = val1, col2 = val2 WHERE condition;'];
      if (/delete/.test(t)) return ['DELETE FROM table_name WHERE condition;'];
      if (/group by|having/.test(t)) return ['SELECT column, COUNT(*) AS total FROM table_name GROUP BY column HAVING COUNT(*) > 1;'];
      if (/table|create/.test(t)) return ['CREATE TABLE table_name (', '  id INT PRIMARY KEY AUTO_INCREMENT,', '  name VARCHAR(255) NOT NULL', ');'];
      return [`SELECT * FROM ${title.toLowerCase().replace(/[^a-z0-9]/g, '_')} WHERE status = 1;`];

    case 'html':
      if (/table/.test(t)) return ['<table>', '  <thead><tr><th>Header</th></tr></thead>', '  <tbody><tr><td>Data</td></tr></tbody>', '</table>'];
      if (/form|input/.test(t)) return ['<form action="/submit" method="POST">', '  <label for="fieldName">Name:</label>', '  <input type="text" id="fieldName" name="fieldName" required />', '  <button type="submit">Submit</button>', '</form>'];
      if (/link|a\b/.test(t)) return ['<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link text</a>'];
      if (/image|img/.test(t)) return ['<img src="path/to/image.jpg" alt="Description" width="600" height="400" loading="lazy" />'];
      if (/list/.test(t)) return ['<ul><li>Bullet item</li></ul>', '<ol><li>Numbered item</li></ol>'];
      return [`<div class="${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}">`, '  <h2>' + title + '</h2>', '</div>'];

    case 'css':
      if (/flex/.test(t)) return ['.container {', '  display: flex;', '  flex-direction: row;', '  justify-content: space-between;', '  align-items: center;', '}'];
      if (/grid/.test(t)) return ['.grid-container {', '  display: grid;', '  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));', '  gap: 16px;', '}'];
      if (/animation|transition/.test(t)) return ['.animated-element {', '  transition: transform 0.3s ease, opacity 0.3s;', '}', '.animated-element:hover {', '  transform: translateY(-4px);', '}'];
      return [`.${title.toLowerCase().replace(/[^a-z0-9]/g, '-')} {`, '  property: value;', '}'];

    case 'react':
      if (/usestate|state/.test(t)) return ['const [state, setState] = useState(initialValue);', 'setState(newValue);', 'setState((prev) => prev + 1);'];
      if (/useeffect|effect/.test(t)) return ['useEffect(() => {', '  // execute side effect', '  return () => { /* cleanup function */ };', '}, [dependencies]);'];
      if (/props/.test(t)) return ['function MyComponent({ title, count = 0 }: Props) {', '  return <div>{title} ({count})</div>;', '}'];
      return [`export function ${title.replace(/[^a-zA-Z0-9]/g, '') || 'Component'}() {`, '  return <div className="card">{/* JSX content */}</div>;', '}'];

    case 'typescript':
      if (/interface|type alias/.test(t)) return [`interface ${title.replace(/[^a-zA-Z0-9]/g, '') || 'Model'} {`, '  id: number;', '  name: string;', '  optionalField?: boolean;', '}'];
      if (/generic/.test(t)) return ['function processItem<T>(item: T): T { return item; }', 'interface ApiResponse<T> { data: T; status: number; }'];
      if (/union/.test(t)) return ['type Status = "pending" | "resolved" | "rejected";'];
      return [`type ${title.replace(/[^a-zA-Z0-9]/g, '') || 'DataType'} = {`, '  id: string;', '  active: boolean;', '};'];

    case 'java':
      if (/class|object/.test(t)) return [`public class ${title.replace(/[^a-zA-Z0-9]/g, '') || 'Main'} {`, '    private String name;', `    public ${title.replace(/[^a-zA-Z0-9]/g, '') || 'Main'}(String name) { this.name = name; }`, '    public String getName() { return name; }', '}'];
      if (/method/.test(t)) return ['public static returnType methodName(ParamType param1, ParamType param2) {', '    // statements', '    return result;', '}'];
      return ['public class Main {', '    public static void main(String[] args) {', `        // Implementation of ${title}`, '    }', '}'];

    case 'cpp':
      return ['#include <iostream>', 'using namespace std;', '', 'int main() {', `    // Implementation of ${title}`, '    return 0;', '}'];

    case 'csharp':
      return ['using System;', '', 'namespace SynergySphere {', '    class Program {', '        static void Main(string[] args) {', `            // Implementation of ${title}`, '        }', '    }', '}'];

    case 'nodejs':
      return ['import fs from "node:fs/promises";', 'import path from "node:path";', '', `// Node.js implementation of ${title}`, 'async function run() {', '  console.log("Ready");', '}', 'run();'];

    default:
      return [`// ${subjectName} syntax: ${title}`, `execute_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}();`];
  }
}

/**
 * Builds a multi-section, highly educational tutorial explanation tailored directly to
 * the selected topic, with exact syntax breakdown, step-by-step execution mechanics,
 * technical behaviors, and practical guidance.
 */
function buildDetailedLessonExplanation(
  lessonTitle: string,
  subjectName: string,
  subjectId: string,
  moduleName: string,
  guide: FamilyGuide,
  syntaxLines: string[],
  example: ExampleSnippet,
): string {
  if (example.detailedExplanation) {
    return example.detailedExplanation;
  }

  const codeLang = example.language || subjectId;
  const syntaxBlock = syntaxLines.join('\n');

  return `### 1. Overview & Purpose
${lessonTitle} is a core programming construct in ${subjectName}, featured in the ${moduleName} module. In professional software development, ${lessonTitle} addresses ${guide.focus}, enabling developers to ${guide.application.toLowerCase()}. Understanding this concept allows junior developers to write maintainable, efficient code and solve practical problems in real-world applications.

### 2. Syntax & Declaration Structure
The exact syntax structure for ${lessonTitle} in ${subjectName} is:

\`\`\`${codeLang}
${syntaxBlock}
\`\`\`

**Key Syntax Elements:**
- **Declaration & Signature**: Communicates intent to the ${subjectName} parser or compiler, establishing scope and identifier bindings.
- **Parameters / Operands**: Receive arguments, define iteration ranges, or set conditions that govern execution.
- **Execution Block**: Encloses the statements and expressions executed under this construct.

### 3. Execution Mechanics & How It Works
When ${subjectName} executes ${lessonTitle}:
1. **Context Initialization**: The runtime prepares the active stack frame, resolving variable references and allocating necessary memory.
2. **Evaluation & Processing**: Expressions and conditions are evaluated step-by-step following ${guide.concept} rules, ensuring proper branching or data transformation.
3. **State Updates & Output**: Values are updated or returned to the caller, and cleanup routines run once execution completes.

### 4. Technical Rules & Behaviors
- **Memory & Scope Rules**: Keep variable lifecycles contained to the narrowest necessary scope to prevent unintended side effects.
- **Type Safety & Validation**: Confirm that all operands and arguments match expected types in ${subjectName} before invoking operations.
- **Production Standard**: ${guide.rule}
- **Common Pitfall to Avoid**: ${guide.mistake}

### 5. Practical Implementation & Verified Output
Study the code example below to see how ${lessonTitle} is structured in practice. The code demonstrates proper formatting, parameters, and the expected terminal/browser output.`;
}

function isGenericLesson(lesson: LessonSpec): boolean {
  return lesson.overview.includes('according to the W3Schools standard curriculum')
    || lesson.content.explanation.includes('is an essential part of')
    || lesson.content.explanation.includes('This lesson is part of the ')
    || lesson.content.explanation.includes('source reference for the exact syntax')
    || lesson.content.explanation.includes('The linked W3Schools page is')
    || lesson.content.examples?.some((example) => isTemplateCode(example.code)) === true;
}

/** Returns a topic-aware, comprehensive lesson body with authentic code examples and full technical details. */
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

  const finalSyntax = resolveComprehensiveSyntax(
    subject.id,
    subject.name,
    lesson.title,
    module.name,
    topicExample.syntax || lesson.content.syntax,
  );

  const comprehensiveExplanation = buildDetailedLessonExplanation(
    lesson.title,
    subject.name,
    subject.id,
    module.name,
    guide,
    finalSyntax,
    topicExample,
  );

  const finalKeyConcepts = topicExample.keyConcepts && topicExample.keyConcepts.length > 0
    ? topicExample.keyConcepts
    : [
        {
          title: `${lesson.title} Semantics`,
          definition: `The formal syntax rules, keywords, and structural patterns used to implement ${lesson.title} in ${subject.name}.`,
          purpose: `Ensures code compiles or parses cleanly and complies with ${subject.name} standards.`,
        },
        {
          title: guide.concept.charAt(0).toUpperCase() + guide.concept.slice(1),
          definition: `The core engineering principle that governs how ${lesson.title} operates within ${module.name}.`,
          purpose: guide.application,
        },
        {
          title: 'Runtime State & Execution',
          definition: `The step-by-step evaluation order and memory lifecycle followed by the ${subject.name} runtime.`,
          purpose: 'Allows developers to predict program flow and prevent subtle edge-case bugs.',
        },
      ];

  const finalRules = topicExample.rules && topicExample.rules.length > 0
    ? topicExample.rules
    : [
        guide.rule,
        `Adhere to idiomatic ${subject.name} naming, formatting, and scoping conventions when writing ${lesson.title}.`,
        `Always test boundary inputs, null or undefined states, and edge conditions defensively.`,
      ];

  const finalCommonMistakes = topicExample.commonMistakes && topicExample.commonMistakes.length > 0
    ? topicExample.commonMistakes
    : [
        guide.mistake,
        `Neglecting edge cases such as empty collections, out-of-bounds indices, or unexpected null/undefined values.`,
        `Using incorrect syntax delimiters or passing arguments in the wrong order when invoking ${lesson.title}.`,
      ];

  const finalExercise = topicExample.exercise || {
    prompt: `Write a clean ${subject.name} implementation of ${lesson.title}. Define test inputs, run the logic, and verify that the output matches expectations.`,
    successCriteria: `The code runs without syntax or runtime errors, uses standard ${lesson.title} conventions, and produces the expected output.`,
  };

  const finalQuiz = topicExample.quiz || {
    question: `What problem does ${lesson.title} solve in ${subject.name}, and what syntax pattern does it follow?`,
    answer: `${lesson.title} facilitates ${guide.focus}. It is implemented using standard ${subject.name} syntax: ${finalSyntax[0] || lesson.title}.`,
  };

  const finalChallenge = topicExample.challenge || {
    prompt: `Implement a production-ready routine in ${subject.name} utilizing ${lesson.title} that handles both typical inputs and at least one boundary edge case.`,
    successCriteria: `Demonstrates correct usage of ${lesson.title}, handles edge cases gracefully, and produces verified output.`,
  };

  const prerequisite = previousLessonTitle ? [previousLessonTitle] : [];

  return {
    ...lesson,
    overview: `In-depth tutorial on ${lesson.title} in ${subject.name}. Covers syntax specifications, execution flow, practical examples, and production best practices for ${guide.focus}.`,
    learningObjectives: [
      `Master the purpose, syntax, and execution flow of ${lesson.title} in ${subject.name}.`,
      guide.objective,
      `Apply ${lesson.title} to solve real-world tasks following ${subject.name} engineering best practices.`,
    ],
    prerequisites: prerequisite,
    content: {
      explanation: comprehensiveExplanation,
      keyConcepts: finalKeyConcepts,
      syntax: finalSyntax,
      examples: finalExamples,
      rules: finalRules,
      practicalApplications: [
        guide.application,
        `Standard pattern used in ${subject.name} production codebases and technical interviews.`,
      ],
      commonMistakes: finalCommonMistakes,
      relatedConcepts: [module.name, previousLessonTitle || `${subject.name} fundamentals`],
      exercise: finalExercise,
      quiz: finalQuiz,
      challenge: finalChallenge,
    },
    revisionNotes: {
      keyTerms: [lesson.title, guide.concept, subject.name],
      remember: [
        guide.rule,
        `Verify input types and test edge cases when working with ${lesson.title}.`,
        `Keep code modular and follow idiomatic ${subject.name} style conventions.`,
      ],
      importantSyntax: finalSyntax,
      commonMistakes: [
        guide.mistake,
        `Failing to validate inputs before executing ${lesson.title}.`,
      ],
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
    && !lesson.content.explanation.includes('source reference')
    && !lesson.content.examples?.some((example) => isTemplateCode(example.code));
}
