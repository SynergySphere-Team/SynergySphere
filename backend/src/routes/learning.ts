import { Router } from 'express';
import { newId, query, queryOne } from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { awardXp } from '../services/gamification.js';

const router = Router();

export interface BackendLearningResource {
  id: string;
  title: string;
  topic: string;
  language?: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  minutes: number;
  xpReward: number;
  source: string;
  url: string;
  outcome: string;
  notes: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

const resources: BackendLearningResource[] = [
  // ── Algorithms & DSA (General) ──────────────────────────────────────────
  {
    id: 'algorithm-basics',
    title: 'Algorithm Basics & Asymptotic Notations',
    topic: 'Algorithms',
    language: 'Algorithms',
    level: 'Beginner',
    minutes: 18,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/dsa/introduction-to-algorithms/',
    outcome: 'Define an algorithm and analyze its growth rate using Big-O, Big-Omega, and Big-Theta notations.',
    notes: '• An algorithm is a finite sequence of well-defined computer-implementable instructions to solve a class of specific problems.\n• Characteristics of an algorithm: Well-defined inputs & outputs, finiteness, definiteness, feasibility, and language independence.\n• Asymptotic Notations:\n  - Big-O (O): Upper bound on runtime growth rate (worst-case performance).\n  - Big-Omega (Ω): Lower bound on runtime (best-case performance).\n  - Big-Theta (Θ): Tight bound (both upper and lower bound match asymptotically).',
    question: 'In algorithm analysis, what does Big-O notation strictly represent?',
    options: [
      'Worst-case upper bound on the running time growth rate',
      'Exact CPU execution time measured in milliseconds',
      'Best-case performance baseline of an algorithm',
      'The number of hardware threads utilized during execution'
    ],
    answer: 0,
    explanation: 'According to GeeksforGeeks, Big-O notation defines an upper bound of an algorithm: f(n) <= c * g(n) for all n >= n0. It guarantees that the algorithm will not take longer than this upper bound in the worst-case scenario.'
  },
  {
    id: 'complexity-basics',
    title: 'Analyse Algorithm Efficiency & Time Complexity',
    topic: 'Algorithms',
    language: 'Algorithms',
    level: 'Intermediate',
    minutes: 25,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/dsa/analysis-of-algorithms/',
    outcome: 'Calculate and compare time and space complexities across polynomial, logarithmic, and exponential orders.',
    notes: '• Order of Growth (Fastest to Slowest):\n  O(1) < O(log N) < O(N) < O(N log N) < O(N²) < O(2^N) < O(N!)\n• Constant Time O(1): Array index lookup, push/pop on stack.\n• Logarithmic Time O(log N): Binary Search, divide-and-conquer tree descent.\n• Linear Time O(N): Iterating through an unindexed array once.\n• Space Complexity includes auxiliary space (temporary variables, recursion stack) plus input space.',
    question: 'What is the worst-case time complexity of Binary Search on a sorted array of size N?',
    options: [
      'O(log N)',
      'O(N)',
      'O(N log N)',
      'O(1)'
    ],
    answer: 0,
    explanation: 'Binary Search halves the search space at each iteration (N -> N/2 -> N/4 -> ... -> 1). The number of divisions needed to reach 1 is log2(N), giving an optimal worst-case time complexity of O(log N).'
  },
  {
    id: 'dsa-arrays-vs-linkedlists',
    title: 'Arrays vs Singly Linked Lists',
    topic: 'Data Structures',
    language: 'Data Structures',
    level: 'Beginner',
    minutes: 22,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/linked-list-vs-array/',
    outcome: 'Compare memory contiguousness, cache locality, and access versus insertion time complexities.',
    notes: '• Array Memory Layout: Elements are stored in contiguous memory blocks. Allows O(1) random access via arithmetic offset (base + index * size). Cache locality is high.\n• Linked List Memory Layout: Nodes are stored dynamically anywhere in the heap and connected via pointers/references. Each node stores data and a next pointer.\n• Insertions/Deletions:\n  - At head: Linked List takes O(1); Array takes O(N) due to shifting.\n  - Random Access: Array takes O(1); Linked List requires O(N) traversal.',
    question: 'How does memory allocation differ between a standard Array and a Singly Linked List in memory?',
    options: [
      'Arrays occupy contiguous memory blocks; Linked Lists allocate nodes non-contiguously with pointer references',
      'Arrays allocate individual heap nodes via pointers; Linked Lists use a single fixed continuous buffer',
      'Linked Lists support O(1) random access by index; Arrays require O(N) linear search',
      'Arrays cannot store primitive values; Linked Lists can only store primitives'
    ],
    answer: 0,
    explanation: 'As explained on GeeksforGeeks, arrays require contiguous memory slots, enabling O(1) direct index addressing. In contrast, linked list nodes can reside at scattered heap addresses linked together by reference pointers, requiring sequential traversal.'
  },
  {
    id: 'dsa-stack-lifo',
    title: 'Stack Data Structure & Call Stack Architecture',
    topic: 'Data Structures',
    language: 'Data Structures',
    level: 'Beginner',
    minutes: 20,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/stack-data-structure/',
    outcome: 'Implement LIFO operations and understand how computer architectures use the stack for program execution.',
    notes: '• A Stack is a linear data structure that follows the LIFO (Last-In, First-Out) principle.\n• Core Stack Operations (all O(1)):\n  - push(x): Inserts element onto the top of the stack.\n  - pop(): Removes and returns the top element.\n  - peek() / top(): Returns top element without removing.\n  - isEmpty(): Checks if stack has 0 elements.\n• Primary Applications: Expression parsing (infix to postfix), bracket validation, Undo/Redo mechanisms, and CPU function activation call stacks.',
    question: 'Which real-world computer architecture system directly relies on the Stack (LIFO) data structure?',
    options: [
      'Function call execution and activation frame call stack',
      'CPU round-robin preemptive scheduler queue',
      'Printer spooler document buffer',
      'Disk drive elevator seek algorithm'
    ],
    answer: 0,
    explanation: 'The CPU call stack uses the LIFO property to manage nested function calls. Each function invocation pushes an activation frame (parameters, local variables, return address). Upon return, the frame is popped, restoring the caller context.'
  },
  {
    id: 'dsa-hash-tables',
    title: 'Hash Tables & Collision Resolution Techniques',
    topic: 'Data Structures',
    language: 'Data Structures',
    level: 'Intermediate',
    minutes: 28,
    xpReward: 30,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/hashing-set-2-separate-chaining/',
    outcome: 'Understand hash functions, load factors, separate chaining, and open addressing.',
    notes: '• Hashing maps arbitrary keys into fixed table indices via a hash function h(key).\n• Collisions happen when two different keys produce the same index (h(k1) == h(k2)).\n• Collision Resolution Strategies:\n  1. Separate Chaining: Each bucket holds a linked list (or balanced BST) of entries hashing to that slot.\n  2. Open Addressing: Probes alternative empty buckets in the table (Linear Probing, Quadratic Probing, Double Hashing).\n• Average time complexity for search/insert/delete is O(1); worst-case with all collisions is O(N).',
    question: 'In a Hash Map, what is the "Separate Chaining" technique used for?',
    options: [
      'Resolving hash collisions by storing multiple key-value pairs in a linked list at the same bucket',
      'Encrypting user passwords into SHA-256 cryptographic hashes',
      'Sorting hash table keys into alphabetical order before iteration',
      'Compressing large string keys into 32-bit floating point numbers'
    ],
    answer: 0,
    explanation: 'In Separate Chaining, each cell of the hash table acts as a head pointer to a linked list. When a collision occurs, the new key-value pair is appended to the linked list at that bucket, resolving conflicts without resizing the table immediately.'
  },
  {
    id: 'algorithms-dynamic-programming',
    title: 'Dynamic Programming: Memoization vs Tabulation',
    topic: 'Algorithms',
    language: 'Algorithms',
    level: 'Intermediate',
    minutes: 30,
    xpReward: 30,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/tabulation-vs-memoization/',
    outcome: 'Identify overlapping subproblems and optimal substructure, and implement top-down and bottom-up DP.',
    notes: '• Dynamic Programming (DP) is an algorithmic optimization technique for problems with:\n  1. Overlapping Subproblems: The same subproblems are solved repeatedly.\n  2. Optimal Substructure: The optimal solution can be constructed from optimal solutions to subproblems.\n• Top-Down (Memoization): Uses recursion starting from the original problem down to base cases, caching results in a hash map or array to avoid recomputation.\n• Bottom-Up (Tabulation): Solves smaller subproblems first iteratively, storing values in an array/table and building up to the main answer without recursion stack overhead.',
    question: 'What is the primary architectural difference between Memoization and Tabulation in Dynamic Programming?',
    options: [
      'Memoization is Top-Down (recursive with return caching); Tabulation is Bottom-Up (iterative table filling)',
      'Memoization is exclusively used for graphs; Tabulation is exclusively used for sorting',
      'Memoization avoids subproblems; Tabulation introduces duplicate subproblems',
      'Tabulation relies on the recursion call stack; Memoization uses while-loops'
    ],
    answer: 0,
    explanation: 'On GeeksforGeeks, Memoization is described as Top-Down because it starts with the overall problem and breaks it down recursively, storing answers in a lookup table. Tabulation is Bottom-Up because it starts with base cases and iteratively builds the solution table without recursion.'
  },

  // ── JavaScript ───────────────────────────────────────────────────────────
  {
    id: 'javascript-event-loop',
    title: 'JavaScript Event Loop & Microtask Queues',
    topic: 'JavaScript',
    language: 'JavaScript',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/how-javascript-works-behind-the-scene-event-loop/',
    outcome: 'Trace the execution order of synchronous code, microtasks (Promises), and macrotasks (setTimeout).',
    notes: '• JavaScript is single-threaded with a non-blocking asynchronous concurrency model powered by the Event Loop.\n• Architecture:\n  1. Call Stack: Synchronous execution of frames.\n  2. Microtask Queue: Highest priority queue containing Promise .then() / .catch(), queueMicrotask(), and process.nextTick().\n  3. Macrotask Queue: Timers (setTimeout, setInterval), setImmediate(), I/O callbacks.\n• Crucial Rule: The Event Loop drains the ENTIRE Microtask Queue between every single macrotask.',
    question: 'In JavaScript\'s Event Loop, which queue has priority for execution immediately after the current call stack empties?',
    options: [
      'Microtask Queue (Promises, queueMicrotask) before Macrotask Queue (setTimeout)',
      'Macrotask Queue (setTimeout) before Promise .then() callbacks',
      'Both queues execute simultaneously across multi-threaded CPU cores',
      'Web Worker message queue before any synchronous call frames'
    ],
    answer: 0,
    explanation: 'GeeksforGeeks details that after the synchronous Call Stack empties, the Event Loop prioritizes the Microtask Queue (Promise handlers, queueMicrotask). Only once all microtasks have executed does it process the next macrotask (such as setTimeout).'
  },
  {
    id: 'javascript-async-promises',
    title: 'Promises, Async/Await & Error Propagation',
    topic: 'JavaScript',
    language: 'JavaScript',
    level: 'Intermediate',
    minutes: 22,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/javascript-promises/',
    outcome: 'Master Promise states, chaining, Promise.all vs Promise.allSettled, and async/await syntax.',
    notes: '• A Promise represents the eventual completion or failure of an asynchronous operation and its resulting value.\n• Promise States: Pending, Fulfilled, Rejected.\n• Async/await is syntactic sugar over native Promises, pausing execution of the async function until the awaited promise settles.\n• Promise.all fails fast on any rejected promise, while Promise.allSettled waits for all promises to conclude regardless of errors.',
    question: 'What distinguishes Promise.allSettled() from Promise.all() in modern JavaScript?',
    options: [
      'Promise.allSettled awaits all promises regardless of rejections; Promise.all rejects immediately on first error',
      'Promise.allSettled executes synchronously while Promise.all executes asynchronously',
      'Promise.allSettled can only accept numerical values in its array parameter',
      'Promise.all cancels pending network requests automatically'
    ],
    answer: 0,
    explanation: 'Promise.allSettled resolves only when all input promises have either fulfilled or rejected, returning an array of outcome objects. Promise.all rejects immediately upon encountering the first rejection.'
  },
  {
    id: 'javascript-closures-scope',
    title: 'Closures & Lexical Scoping in JavaScript',
    topic: 'JavaScript',
    language: 'JavaScript',
    level: 'Beginner',
    minutes: 20,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/closure-in-javascript/',
    outcome: 'Understand lexical scoping, outer variable retention, and memory encapsulation.',
    notes: '• A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment).\n• In JavaScript, closures are created every time a function is created, at function creation time.\n• Closures enable data privacy, factory functions, currying, and memoization patterns.',
    question: 'Why does an inner function retain access to variables of an outer enclosing function even after the outer function has returned?',
    options: [
      'The inner function forms a closure containing references to its enclosing lexical environment',
      'All variables declared in JavaScript are automatically promoted to global scope',
      'The Garbage Collector duplicates all local variables into CPU registers',
      'Functions in JavaScript are compiled into static C structures'
    ],
    answer: 0,
    explanation: 'A closure preserves the reference to the lexical scope in which it was declared, preventing garbage collection of referenced variables while the inner function exists.'
  },
  {
    id: 'javascript-prototypes',
    title: 'Prototypes & Prototypal Inheritance Chain',
    topic: 'JavaScript',
    language: 'JavaScript',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/prototype-in-javascript/',
    outcome: 'Differentiate between prototype and __proto__, and trace property lookup through the prototype chain to Object.prototype.',
    notes: '• Every JavaScript object has a private internal link to another object called its prototype.\n• When accessing a property on an object, JavaScript looks at the object itself. If not found, it traverses up the prototype chain until it either finds the property or reaches `null` (end of chain).\n• `Object.create(proto)` creates a new object with `proto` as its prototype without invoking constructor functions.\n• ES6 classes are syntactic sugar over prototypal delegation.',
    question: 'What is returned when looking up a non-existent property on a JavaScript object once the prototype chain reaches null?',
    options: [
      'undefined',
      'null',
      'ReferenceError exception',
      'false'
    ],
    answer: 0,
    explanation: 'When property resolution reaches the end of the prototype chain (Object.prototype.__proto__ which is null) without finding the property, JavaScript evaluates the expression to undefined.'
  },

  // ── TypeScript ───────────────────────────────────────────────────────────
  {
    id: 'typescript-generics-constraints',
    title: 'TypeScript Generics & Keyof Type Constraints',
    topic: 'TypeScript',
    language: 'TypeScript',
    level: 'Intermediate',
    minutes: 25,
    xpReward: 30,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/typescript-generics/',
    outcome: 'Write reusable, type-safe components and functions using type parameters and extends constraints.',
    notes: '• Generics allow writing reusable code that works with a variety of types rather than a single concrete type.\n• Type Constraints: `function getProp<T, K extends keyof T>(obj: T, key: K): T[K]` restricts K to valid keys of T.\n• Generics preserve compile-time type fidelity without resorting to `any`.',
    question: 'In TypeScript, what is the role of `<K extends keyof T>` in a generic function declaration?',
    options: [
      'It restricts parameter K to only be an existing property key of object type T',
      'It dynamically generates all property values of object T at runtime',
      'It forces object T to inherit from class K',
      'It converts type T into an array of string keys'
    ],
    answer: 0,
    explanation: 'The constraint `K extends keyof T` guarantees compile-time validation that argument K is strictly a known key of type T, providing full autocomplete and type safety.'
  },
  {
    id: 'typescript-discriminated-unions',
    title: 'Type Narrowing & Discriminated Unions',
    topic: 'TypeScript',
    language: 'TypeScript',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/typescript-discriminated-unions/',
    outcome: 'Implement exhaustive pattern matching using literal discriminant properties and type guards.',
    notes: '• Discriminated Unions (tagged unions) combine union types with a common literal field (the discriminator, e.g. `kind: "circle" | "square"`).\n• Inside `switch(shape.kind)`, TypeScript narrows the type of shape automatically.\n• Exhaustiveness checking can be enforced with the `never` type in the default branch.',
    question: 'What is the primary benefit of using Discriminated Unions with a common literal tag property in TypeScript?',
    options: [
      'Enables the TypeScript compiler to automatically narrow types across conditional branches',
      'Compresses the JavaScript bundle size by eliminating unused interface definitions',
      'Converts TypeScript code into multi-threaded WebAssembly modules',
      'Allows bypassing runtime exception handling entirely'
    ],
    answer: 0,
    explanation: 'Discriminated unions enable flow-sensitive type narrowing. By checking the shared literal property (tag), TypeScript knows exactly which union member is being accessed.'
  },
  {
    id: 'typescript-utility-types',
    title: 'TypeScript Utility Types (Partial, Record, Pick, Omit)',
    topic: 'TypeScript',
    language: 'TypeScript',
    level: 'Beginner',
    minutes: 20,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/typescript-utility-types/',
    outcome: 'Transform types cleanly using built-in mapped and conditional type utilities.',
    notes: '• Partial<T>: Constructs a type with all properties of T set to optional.\n• Required<T>: Constructs a type with all properties of T set to required.\n• Pick<T, K>: Constructs a type by picking the set of properties K from T.\n• Omit<T, K>: Constructs a type by picking all properties from T and then removing K.\n• Record<K, T>: Constructs an object type whose property keys are K and property values are T.',
    question: 'Which TypeScript built-in utility type creates a new type containing only specified keys from an existing interface?',
    options: [
      'Pick<T, K>',
      'Omit<T, K>',
      'Partial<T>',
      'Record<K, T>'
    ],
    answer: 0,
    explanation: 'Pick<T, K> constructs a type by extracting the specified properties K from type T, while Omit<T, K> removes specified properties.'
  },
  {
    id: 'typescript-mapped-conditional',
    title: 'Mapped Types, Conditional Types & Infer',
    topic: 'TypeScript',
    language: 'TypeScript',
    level: 'Advanced',
    minutes: 28,
    xpReward: 35,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/typescript-mapped-types/',
    outcome: 'Write advanced type transformations using `[K in keyof T]`, conditional ternary types (`T extends U ? X : Y`), and `infer R`.',
    notes: '• Mapped Types iterate over keys with syntax `{ [K in keyof T]: T[K] }`.\n• Modifiers `+readonly`, `-readonly`, `?`, `-?` can add or remove mutability and optionality.\n• Conditional Types: `type IsString<T> = T extends string ? true : false`.\n• The `infer` keyword inside a conditional type declares a type variable to be deduced automatically from the matched type structure.',
    question: 'In TypeScript conditional types, what purpose does the `infer` keyword serve?',
    options: [
      'It introduces a new type variable within a condition to be extracted from the examined type structure',
      'It suppresses all compile-time type errors in the following statement',
      'It converts a dynamic runtime variable into a compile-time constant',
      'It imports foreign type definitions from external npm modules'
    ],
    answer: 0,
    explanation: 'The `infer` keyword enables type deduction inside a conditional type clause, allowing developers to extract inner types such as Promise payload types or function return types.'
  },

  // ── Python ───────────────────────────────────────────────────────────────
  {
    id: 'python-memory-mutability',
    title: 'Python Memory Model & Object Mutability',
    topic: 'Python',
    language: 'Python',
    level: 'Beginner',
    minutes: 20,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/mutable-vs-immutable-objects-in-python/',
    outcome: 'Distinguish between mutable and immutable Python objects and understand pass-by-object-reference.',
    notes: '• In Python, everything is an object. Variables are references (pointers) to objects in memory.\n• Immutable Objects: Cannot be changed in-place once created. Any modification produces a new object in memory.\n  - Examples: int, float, str, tuple, frozenset, bool.\n• Mutable Objects: Can have their internal state altered in-place without changing their memory address (id).\n  - Examples: list, dict, set, bytearray.\n• Be careful with default mutable arguments in functions (e.g., `def append_to(item, target=[])` shares the same list across calls).',
    question: 'In Python, which of the following core data types is strictly immutable?',
    options: [
      'Tuple',
      'List',
      'Dictionary',
      'Set'
    ],
    answer: 0,
    explanation: 'In Python, tuples, strings, integers, and floats are immutable. Once instantiated, their elements cannot be reassigned or mutated in place. Lists, dictionaries, and sets are mutable collections.'
  },
  {
    id: 'python-generators-yield',
    title: 'Python Generators & Memory-Efficient Iteration',
    topic: 'Python',
    language: 'Python',
    level: 'Intermediate',
    minutes: 25,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/generators-in-python/',
    outcome: 'Write lazy-evaluated generators using yield to process massive datasets in O(1) auxiliary memory.',
    notes: '• A Generator function contains one or more `yield` statements.\n• Instead of returning a value and terminating, `yield` pauses function execution and saves its local state.\n• When `next()` is called, the generator resumes immediately after the yield statement.\n• Memory Benefit: Generates items on the fly (lazy evaluation) rather than allocating entire lists in memory.',
    question: 'How do Python generators achieve significant memory savings compared to returning standard lists?',
    options: [
      'They yield items one-by-one via lazy evaluation without buffering entire sequences in RAM',
      'They compress integers into binary bitfields during iteration',
      'They delegate loop execution to GPU shaders',
      'They compile python loops directly into machine bytecode'
    ],
    answer: 0,
    explanation: 'Generators compute and produce values on demand (lazy evaluation). Only one element exists in memory at any given time, providing O(1) space complexity regardless of stream length.'
  },
  {
    id: 'python-decorators-closures',
    title: 'Python Decorators & Higher-Order Functions',
    topic: 'Python',
    language: 'Python',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/decorators-in-python/',
    outcome: 'Implement function decorators with arguments, preserve metadata using functools.wraps, and apply cross-cutting concerns.',
    notes: '• A decorator is a callable that takes another function as an argument, extends its behavior without modifying it, and returns a callable.\n• `@decorator` syntax is equivalent to `func = decorator(func)`.\n• `functools.wraps` copies function name, docstring, and annotations from the original function to the wrapper function.\n• Used for authentication, logging, caching (memoization), rate limiting, and execution profiling.',
    question: 'Why should `@functools.wraps(func)` always be used when writing a custom Python function decorator wrapper?',
    options: [
      'It preserves the original function\'s __name__, docstring, and signature metadata on the wrapper',
      'It forces Python to execute the function in a separate OS thread',
      'It prevents recursion depth exceptions in nested functions',
      'It encrypts the bytecode of the wrapped function'
    ],
    answer: 0,
    explanation: 'Without `@functools.wraps`, the decorated function\'s name and docstring are overwritten by the generic wrapper function name, making debugging and introspection difficult.'
  },
  {
    id: 'python-dunder-methods',
    title: 'Python Dunder Methods & Magic Protocols',
    topic: 'Python',
    language: 'Python',
    level: 'Advanced',
    minutes: 26,
    xpReward: 30,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/dunder-magic-methods-python/',
    outcome: 'Customize class behaviors by implementing __str__, __repr__, __len__, __getitem__, and context managers (__enter__/__exit__).',
    notes: '• Double Underscore (dunder) methods allow classes to hook into Python language operators and built-in functions.\n• `__len__`: Invoked by `len(obj)`.\n• `__getitem__`: Allows bracket indexing like `obj[key]`.\n• `__enter__` & `__exit__`: Support the `with` statement for resource management.\n• `__repr__`: Should return an unambiguous string representation of the object suitable for debugging.',
    question: 'In Python, which pair of dunder methods must a class implement to support the `with` context manager statement?',
    options: [
      '__enter__ and __exit__',
      '__open__ and __close__',
      '__start__ and __stop__',
      '__init__ and __del__'
    ],
    answer: 0,
    explanation: 'The context management protocol requires implementing `__enter__` (called before entering the with block) and `__exit__` (called when exiting the block, even if an exception occurs).'
  },

  // ── SQL ──────────────────────────────────────────────────────────────────
  {
    id: 'sql-acid-transactions',
    title: 'SQL ACID Properties & Transaction Management',
    topic: 'SQL',
    language: 'SQL',
    level: 'Intermediate',
    minutes: 26,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/acid-properties-in-dbms/',
    outcome: 'Explain Atomicity, Consistency, Isolation, and Durability in relational database systems.',
    notes: '• A Transaction is a single logical unit of database work (BEGIN ... COMMIT / ROLLBACK).\n• The 4 ACID Properties:\n  - Atomicity: "All or nothing" — if any operation in a transaction fails, all changes are rolled back.\n  - Consistency: The database must transition from one valid state to another, satisfying all constraints, keys, and cascades.\n  - Isolation: Concurrent transactions execute without dirty reads or uncommitted state leaking between them.\n  - Durability: Once a transaction commits, its writes persist permanently on disk even during power failure.',
    question: 'In relational database transaction management (ACID), what does "Isolation" specifically guarantee?',
    options: [
      'Concurrent transactions execute independently without interfering with one another, as if serial',
      'All statements within a transaction succeed completely or roll back entirely',
      'Committed transactions survive database restarts and hardware crashes',
      'Primary and foreign key constraints are strictly validated before every insert'
    ],
    answer: 0,
    explanation: 'According to GeeksforGeeks, Isolation ensures that concurrent execution of transactions results in a system state that would be obtained if transactions were executed serially one after another, preventing phenomena like dirty reads and phantom reads.'
  },
  {
    id: 'sql-btree-indexes',
    title: 'SQL B-Tree Indexing & Query Execution Plans',
    topic: 'SQL',
    language: 'SQL',
    level: 'Intermediate',
    minutes: 25,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/b-tree-indexing-in-databases/',
    outcome: 'Understand how B-Tree indexes speed up lookups from O(N) sequential scans to O(log N) tree traversals.',
    notes: '• A database index is a data structure (commonly B-Tree or B+Tree) that improves data retrieval speed.\n• Without an index, the database engine must execute a Full Table Scan (O(N)).\n• B-Tree maintains balanced keys in nodes, allowing range queries and equality lookups in O(log N) disk block reads.\n• Trade-offs: Indexes consume additional storage and incur write overhead on INSERT, UPDATE, and DELETE.',
    question: 'What is the primary operational trade-off of adding multiple indexes to a high-throughput SQL table?',
    options: [
      'Faster SELECT query performance at the cost of additional write overhead on INSERT, UPDATE, and DELETE',
      'Faster data insertion at the cost of slower SELECT queries',
      'Increased probability of relational foreign key constraint violations',
      'Inability to perform ACID transaction rollbacks'
    ],
    answer: 0,
    explanation: 'Indexes accelerate SELECT search operations via B-Tree lookups, but every write operation (INSERT/UPDATE/DELETE) must also update the index tree, adding write latency.'
  },
  {
    id: 'sql-window-functions',
    title: 'SQL Window Functions & Analytical Partitioning',
    topic: 'SQL',
    language: 'SQL',
    level: 'Intermediate',
    minutes: 25,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/window-functions-in-sql/',
    outcome: 'Calculate running totals, rankings, and moving averages using ROW_NUMBER(), RANK(), DENSE_RANK(), and OVER(PARTITION BY).',
    notes: '• Window functions perform calculations across a set of table rows that are related to the current row without collapsing rows like GROUP BY does.\n• Syntax: `FUNCTION() OVER (PARTITION BY col ORDER BY col)`.\n• ROW_NUMBER(): Assigns sequential unique integer.\n• RANK(): Assigns rank with gaps for ties (e.g. 1, 2, 2, 4).\n• DENSE_RANK(): Assigns rank without gaps for ties (e.g. 1, 2, 2, 3).\n• LEAD() and LAG(): Access preceding or following rows without self-joins.',
    question: 'How does DENSE_RANK() differ from RANK() when two rows share identical values in the ORDER BY clause?',
    options: [
      'DENSE_RANK() does not skip the next rank number after a tie, while RANK() leaves gaps in rank sequencing',
      'DENSE_RANK() can only be applied to string columns while RANK() is for integers',
      'DENSE_RANK() combines ties into a single row output',
      'RANK() is non-deterministic while DENSE_RANK() is strictly deterministic'
    ],
    answer: 0,
    explanation: 'When two or more rows tie, RANK leaves a gap in rank numbering (e.g., 1, 2, 2, 4). DENSE_RANK produces consecutive numbers without gaps (e.g., 1, 2, 2, 3).'
  },
  {
    id: 'sql-joins-subqueries',
    title: 'SQL Joins, CTEs & Correlated Subqueries',
    topic: 'SQL',
    language: 'SQL',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/sql-join-set-1-inner-left-right-and-full-joins/',
    outcome: 'Master INNER, LEFT, RIGHT, and FULL OUTER joins, recursive Common Table Expressions (WITH), and EXISTS clauses.',
    notes: '• INNER JOIN: Returns records that have matching values in both tables.\n• LEFT JOIN: Returns all records from left table and matched records from right table (NULL if no match).\n• Common Table Expressions (CTEs): Created using `WITH cte_name AS (SELECT ...)` to improve readability over nested subqueries.\n• Correlated Subqueries: A subquery that uses values from the outer query, evaluated once for each row processed by the outer query.',
    question: 'In a SQL LEFT JOIN, what value is populated in the right table columns for rows that have no match in the right table?',
    options: [
      'NULL',
      '0',
      'Empty string ("")',
      'The row is omitted from the result set'
    ],
    answer: 0,
    explanation: 'A LEFT JOIN preserves every row from the left table; whenever a row has no corresponding match in the right table, all right table attributes are populated with NULL.'
  },

  // ── Java ─────────────────────────────────────────────────────────────────
  {
    id: 'java-oop-polymorphism',
    title: 'Java OOP: Polymorphism & Dynamic Method Dispatch',
    topic: 'Java',
    language: 'Java',
    level: 'Intermediate',
    minutes: 22,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/polymorphism-in-java/',
    outcome: 'Contrast compile-time method overloading with runtime method overriding and virtual method dispatch.',
    notes: '• Polymorphism means "many forms". It allows objects of different classes to be treated through a shared interface.\n• Compile-Time (Static) Polymorphism: Method Overloading — methods in the same class sharing the same name but differing in number or types of parameters.\n• Run-Time (Dynamic) Polymorphism: Method Overriding — a derived subclass provides its own specific implementation for a method declared in its parent superclass.\n• Uses dynamic method dispatch (vtable) at runtime based on the actual object instance, not the reference type.',
    question: 'What is Method Overriding in Object-Oriented Programming (OOP)?',
    options: [
      'A subclass providing a specific implementation of a method already declared in its superclass',
      'Defining multiple methods in the same class with identical names but different parameter lists',
      'Hiding internal fields of a class behind private access modifiers and getters',
      'Instantiating an interface directly using the new keyword'
    ],
    answer: 0,
    explanation: 'Method Overriding occurs when a child class implements a method that is already defined in its parent superclass with the exact same name, return type, and parameters. This is the cornerstone of runtime (dynamic) polymorphism.'
  },
  {
    id: 'java-jvm-memory-gc',
    title: 'JVM Memory Architecture & Garbage Collection',
    topic: 'Java',
    language: 'Java',
    level: 'Intermediate',
    minutes: 28,
    xpReward: 30,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/jvm-works-jvm-architecture/',
    outcome: 'Differentiate between Java Heap and Stack memory, Eden space, and generational garbage collection.',
    notes: '• Stack Memory: Stores primitive values and references to heap objects; allocated per thread with automatic cleanup on stack frame pop.\n• Heap Memory: Stores all object instances and class data; shared across threads.\n• Generational GC: Objects start in Young Generation (Eden, Survivor spaces). Long-lived objects are promoted to Tenured (Old) Generation.\n• Stop-The-World events pause application threads during major GC cycles.',
    question: 'In Java JVM memory management, where are object instances allocated and managed by the Garbage Collector?',
    options: [
      'In the Heap Memory',
      'In the Thread Call Stack',
      'In CPU L1 Cache registers',
      'In the OS Kernel Swap space'
    ],
    answer: 0,
    explanation: 'In the JVM, all class object instances and arrays are allocated on the Heap. The Java Garbage Collector monitors and deallocates heap objects that are no longer reachable from GC roots.'
  },
  {
    id: 'java-collections-framework',
    title: 'Java Collections Framework: Map vs List vs Set',
    topic: 'Java',
    language: 'Java',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/collections-in-java-2/',
    outcome: 'Compare ArrayList vs LinkedList, HashSet vs TreeSet, and understand HashMap internal bucket hashing.',
    notes: '• List: Ordered collection allowing duplicate elements. ArrayList has O(1) index access but O(N) arbitrary insertion. LinkedList has O(1) head/tail insertion.\n• Set: Collection containing no duplicate elements. HashSet uses hashing (O(1)); TreeSet maintains sorted order using Red-Black BST (O(log N)).\n• Map: Key-value pairs. HashMap uses hashCode() & equals() with chaining (linked list / balanced tree in buckets for Java 8+).',
    question: 'What data structure does Java 8+ HashMap convert individual bucket linked lists into when collisions in that bucket exceed 8 elements?',
    options: [
      'Balanced Red-Black Tree',
      'B-Tree',
      'Doubly Linked List',
      'Static Array'
    ],
    answer: 0,
    explanation: 'In Java 8, when a bucket in a HashMap reaches TREEIFY_THRESHOLD (8 entries) and table capacity >= 64, it converts the linked list into a balanced Red-Black tree to guarantee O(log N) lookup instead of O(N) worst-case.'
  },
  {
    id: 'java-concurrency-threads',
    title: 'Java Concurrency: Volatile, Synchronized & ThreadPools',
    topic: 'Java',
    language: 'Java',
    level: 'Advanced',
    minutes: 28,
    xpReward: 35,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/multithreading-in-java/',
    outcome: 'Master thread lifecycle, race condition prevention, the `volatile` memory visibility modifier, and ExecutorService thread pooling.',
    notes: '• `synchronized`: Locks the intrinsic monitor of an object, guaranteeing mutual exclusion and memory visibility.\n• `volatile`: Guarantees that reads and writes are made directly to main memory, establishing a happens-before relationship, but does NOT guarantee atomicity (e.g. `count++`).\n• `java.util.concurrent.atomic.AtomicInteger`: Provides lock-free thread-safe atomic updates using CPU Compare-And-Swap (CAS).\n• `ExecutorService`: Manages a pool of reusable worker threads, avoiding overhead of creating new threads for each task.',
    question: 'In Java multithreading, what guarantee does the `volatile` keyword provide for a class field variable?',
    options: [
      'Memory visibility ensuring updates are immediately visible to all threads without local CPU cache staleness',
      'Mutual exclusion locking that prevents concurrent execution of code blocks',
      'Atomic compound operations for increment operations (i++)',
      'Automatic garbage collection prioritization'
    ],
    answer: 0,
    explanation: 'The `volatile` keyword guarantees that any thread reading the variable sees the most recent write made by any other thread, preventing stale CPU cache reads, though it does not provide lock atomicity.'
  },

  // ── C++ ──────────────────────────────────────────────────────────────────
  {
    id: 'cpp-pointers-raii',
    title: 'C++ Pointers, References & RAII Memory Management',
    topic: 'C++',
    language: 'C++',
    level: 'Intermediate',
    minutes: 26,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/pointers-in-c-and-c-addition-subtraction-increment-decrement/',
    outcome: 'Master pointer arithmetic, memory addresses, and Resource Acquisition Is Initialization (RAII).',
    notes: '• A pointer stores the memory address of another variable.\n• RAII (Resource Acquisition Is Initialization): Binds resource lifecycle (heap memory, sockets, file handles) to object lifetime.\n• Smart Pointers (C++11):\n  - std::unique_ptr: Exclusive ownership of heap resource.\n  - std::shared_ptr: Shared ownership via reference counting.\n• Destructors run automatically when objects go out of scope, guaranteeing leak-free cleanup.',
    question: 'What is the core guarantee provided by the RAII idiom in modern C++?',
    options: [
      'Resources are acquired in the constructor and automatically released in the destructor when exiting scope',
      'All variables are automatically converted into thread-safe atomic types',
      'Memory leaks are detected and fixed by a runtime garbage collector thread',
      'Pointer arithmetic is strictly converted into array indexing'
    ],
    answer: 0,
    explanation: 'RAII ensures that resource management is tied to object lifetime: resources are acquired during construction and released in the destructor when the object leaves its lexical scope, preventing resource leaks even during exceptions.'
  },
  {
    id: 'cpp-stl-containers',
    title: 'C++ STL Containers & Iterator Invalidation',
    topic: 'C++',
    language: 'C++',
    level: 'Intermediate',
    minutes: 25,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/containers-cpp-stl/',
    outcome: 'Select the optimal STL container (vector, deque, list, unordered_map) and prevent undefined behavior from iterator invalidation.',
    notes: '• Sequence Containers: `std::vector` (dynamic contiguous array), `std::deque` (double-ended chunked queue), `std::list` (doubly-linked list).\n• Associative Containers: `std::map` (ordered Red-Black tree, O(log N)), `std::unordered_map` (hash table, O(1) average).\n• Iterator Invalidation: When `std::vector` reallocates capacity on push_back, all existing iterators, pointers, and references to elements are invalidated.',
    question: 'In C++, when does an iterator pointing to a std::vector element become invalidated?',
    options: [
      'When an insertion causes vector size to exceed its current capacity, triggering memory reallocation',
      'Whenever the vector is passed by const reference to another function',
      'Only when vector.clear() is explicitly called',
      'Iterators to std::vector are never invalidated under any operation'
    ],
    answer: 0,
    explanation: 'When a std::vector exceeds its allocated capacity during push_back or insert, it allocates a larger memory buffer and moves all elements, invalidating all preexisting iterators, pointers, and references.'
  },
  {
    id: 'cpp-virtual-tables',
    title: 'C++ Virtual Functions, VTable & Dynamic Binding',
    topic: 'C++',
    language: 'C++',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/virtual-functions-and-runtime-polymorphism-in-c-set-1-introduction/',
    outcome: 'Explain dynamic dispatch using virtual method tables (VTable) and the necessity of virtual destructors in base classes.',
    notes: '• When a class declares a virtual function, the C++ compiler creates a VTable (table of function pointers) for the class and embeds a vptr pointer in each object instance.\n• At runtime, calls to virtual functions look up the actual function address in the object instance\'s VTable.\n• Virtual Destructors: Base classes with virtual functions MUST declare a `virtual ~Base() = default;` to avoid undefined behavior / memory leaks when deleting derived objects via base pointers.',
    question: 'Why is it critical to declare a virtual destructor in a C++ base class intended for inheritance?',
    options: [
      'To ensure derived class destructors are properly invoked when deleting an object through a base class pointer',
      'To prevent the compiler from generating default copy constructors',
      'To allow base class objects to be allocated in thread-local storage',
      'Virtual destructors are required for template metaprogramming instantiation'
    ],
    answer: 0,
    explanation: 'Deleting a derived object through a base pointer without a virtual destructor results in undefined behavior because only the base destructor runs, leaking derived class resources.'
  },
  {
    id: 'cpp-move-semantics',
    title: 'C++ Move Semantics, Rvalue References & std::move',
    topic: 'C++',
    language: 'C++',
    level: 'Advanced',
    minutes: 28,
    xpReward: 35,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/move-semantics-in-cpp/',
    outcome: 'Eliminate expensive deep copies by transferring heap ownership using rvalue references (T&&) and move constructors.',
    notes: '• Lvalue: An expression that refers to a specific memory location with an identifiable name (e.g. `int x = 5`).\n• Rvalue: A temporary value that does not persist beyond the expression (e.g. `10`, `x + y`, temporary return values).\n• Rvalue References (`T&&`): Bind to temporary objects, enabling Move Constructors and Move Assignment operators.\n• `std::move(x)`: Casts an lvalue into an rvalue reference, allowing its resources to be "pilfered" without copying.',
    question: 'What does the standard library function `std::move(x)` actually perform in C++11 and later?',
    options: [
      'It performs an unconditional static_cast of expression x to an rvalue reference type (T&&)',
      'It physically copies memory bytes from heap memory into CPU registers',
      'It creates an asynchronous background thread to move object buffers',
      'It deletes the original object from memory immediately'
    ],
    answer: 0,
    explanation: '`std::move` does not move any bytes at runtime; it is a compile-time cast that converts an lvalue expression into an rvalue reference (T&&), signaling to functions that the resource can be moved rather than copied.'
  },

  // ── C# ───────────────────────────────────────────────────────────────────
  {
    id: 'csharp-linq-queries',
    title: 'C# LINQ: Query Syntax, Lambdas & Deferred Execution',
    topic: 'C#',
    language: 'C#',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/linq-in-c-sharp/',
    outcome: 'Write declarative data transformations using LINQ extension methods and deferred execution pipelines.',
    notes: '• LINQ (Language Integrated Query) provides uniform query syntax across collections, SQL, and XML.\n• Deferred Execution: An operation is not executed when it is defined; it executes only when enumerated (e.g. via foreach, .ToList(), .Count()).\n• Key Methods: Select (map), Where (filter), OrderBy (sort), GroupBy (aggregate), Aggregate (reduce).',
    question: 'In C# LINQ, what does "Deferred Execution" mean when defining a query variable?',
    options: [
      'The query is not executed when constructed; evaluation occurs only when iterating or calling terminal methods like .ToList()',
      'The query runs on a background thread pool worker after a 500ms delay',
      'The query caches results indefinitely across application restarts',
      'The compiler defers type checking until runtime execution'
    ],
    answer: 0,
    explanation: 'Deferred execution means the query variable itself does not hold results; it stores query instructions. The actual filtering and projection execute when enumerating through the dataset.'
  },
  {
    id: 'csharp-async-await',
    title: 'C# Task Parallel Library (TPL) & Async/Await',
    topic: 'C#',
    language: 'C#',
    level: 'Intermediate',
    minutes: 26,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/async-and-await-in-c-sharp/',
    outcome: 'Master non-blocking asynchronous programming using Task, Task<T>, await, ConfigureAwait(false), and CancellationToken.',
    notes: '• The `async` keyword enables `await` expressions inside a method.\n• An `await` expression yields control back to the caller while the awaited Task completes, preventing thread blocking.\n• `Task.WhenAll()`: Awaits multiple concurrent tasks and returns when all complete.\n• `CancellationTokenSource`: Allows cooperative cancellation of in-flight asynchronous operations.\n• `ConfigureAwait(false)`: Discards SynchronizationContext capture in library code to prevent deadlocks in UI / ASP.NET synchronization.',
    question: 'In C#, what occurs to the current executing thread when an `await` keyword is encountered on an incomplete Task?',
    options: [
      'The thread is freed and returned to the ThreadPool while the remainder of the method is scheduled as a continuation',
      'The thread spins in a while-loop consuming 100% CPU until the task completes',
      'The operating system suspends the entire host process',
      'A new hardware thread is spawned on a separate CPU core'
    ],
    answer: 0,
    explanation: 'When an incomplete task is awaited, control yields back to the caller. The calling thread is not blocked; when the task finishes, the rest of the method resumes execution via the synchronization context or thread pool.'
  },
  {
    id: 'csharp-records-immutability',
    title: 'C# Records, Value Equality & With-Expressions',
    topic: 'C#',
    language: 'C#',
    level: 'Intermediate',
    minutes: 22,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/c-sharp-records/',
    outcome: 'Design immutable data models using positional record classes, record structs, value-based equality, and non-destructive mutation.',
    notes: '• Introduced in C# 9, `record` types are reference types (or value types with `record struct`) with built-in value-based equality.\n• Two record instances with identical property values are equal (`a == b` evaluates to true).\n• Init-only properties: Can only be assigned during object construction.\n• Non-destructive mutation: `var updated = original with { Name = "New" };` creates a copy with specified changes while leaving original untouched.',
    question: 'How does equality comparison (==) differ between two standard class instances and two record instances in C#?',
    options: [
      'Records use value-based equality comparing property values; classes use reference equality comparing memory addresses',
      'Classes compare property values; records only compare object GUIDs',
      'Records cannot be compared with ==; they require Equals() methods',
      'Records only support structural equality for numerical integer fields'
    ],
    answer: 0,
    explanation: 'In C#, records automatically synthesize equality operators that compare the values of all properties, whereas classes default to reference equality comparing heap memory addresses.'
  },
  {
    id: 'csharp-dependency-injection',
    title: 'C# .NET Dependency Injection & Service Lifetimes',
    topic: 'C#',
    language: 'C#',
    level: 'Advanced',
    minutes: 26,
    xpReward: 30,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/dependency-injection-in-c-sharp/',
    outcome: 'Configure .NET Core IoC containers using Transient, Scoped, and Singleton service registration lifetimes.',
    notes: '• Dependency Injection (DI) is a software design pattern where objects receive other objects that they depend on.\n• .NET Service Lifetimes:\n  1. Transient (`AddTransient`): Created each time they are requested.\n  2. Scoped (`AddScoped`): Created once per client request (connection scope, e.g. web request).\n  3. Singleton (`AddSingleton`): Created once on initial request and shared across the entire application lifecycle.\n• Beware: Injecting a Scoped service into a Singleton creates a Captive Dependency bug.',
    question: 'In ASP.NET Core, which service lifetime is created once per HTTP request and disposed when the request concludes?',
    options: [
      'Scoped (AddScoped)',
      'Transient (AddTransient)',
      'Singleton (AddSingleton)',
      'Static (AddStatic)'
    ],
    answer: 0,
    explanation: 'Scoped services are created once per HTTP client request scope and are disposed when the HTTP request completes. Entity Framework DbContext is a classic example of a Scoped service.'
  },

  // ── HTML ─────────────────────────────────────────────────────────────────
  {
    id: 'html-semantic-structure',
    title: 'Semantic HTML5 Architecture & Web Accessibility (ARIA)',
    topic: 'HTML',
    language: 'HTML',
    level: 'Beginner',
    minutes: 18,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/html5-semantics/',
    outcome: 'Structure accessible web pages using header, nav, main, section, article, and ARIA attributes.',
    notes: '• Semantic HTML uses tags that convey the meaning of the content contained within them (e.g., `<article>`, `<section>`, `<nav>`, `<aside>`, `<header>`, `<footer>`).\n• Benefits:\n  - SEO: Search engine crawlers understand content structure and relevance.\n  - Accessibility (a11y): Screen readers navigate semantic landmarks efficiently.\n  - Maintainability: Clean, self-documenting document outlines.',
    question: 'Why is using semantic elements like <main> and <nav> preferred over generic <div> containers in HTML5?',
    options: [
      'They provide clear structural landmarks for screen readers, search engines, and assistive devices',
      'They automatically enable hardware-accelerated 3D rendering in web browsers',
      'They increase network transfer speeds by compressing text payloads',
      'They eliminate the need for CSS styling entirely'
    ],
    answer: 0,
    explanation: 'Semantic elements provide meaningful information about the role of page regions to browsers, assistive technologies (screen readers), and search engine indexing bots.'
  },
  {
    id: 'html-dom-forms',
    title: 'HTML5 Forms, Constraint Validation & Enctypes',
    topic: 'HTML',
    language: 'HTML',
    level: 'Beginner',
    minutes: 20,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/html-forms/',
    outcome: 'Build robust forms with native regex patterns, input types (email, number, tel), and appropriate multipart/form-data encoding.',
    notes: '• HTML5 Form Validation: Uses native attributes like `required`, `pattern="[A-Za-z]+"`, `min`, `max`, `maxlength` without JavaScript.\n• Form Enctypes:\n  - `application/x-www-form-urlencoded`: Default encoding for key=value URL-encoded pairs.\n  - `multipart/form-data`: Required when form includes file uploads (`<input type="file">`).\n• `<label for="id">`: Associates text with form inputs, expanding the clickable target area and enabling screen readers.',
    question: 'Which `enctype` attribute value is strictly required on an HTML <form> element when submitting file uploads?',
    options: [
      'multipart/form-data',
      'application/x-www-form-urlencoded',
      'text/plain',
      'application/json'
    ],
    answer: 0,
    explanation: 'Uploading binary file data requires `enctype="multipart/form-data"`. Otherwise, only the file name as text would be sent rather than the file payload.'
  },
  {
    id: 'html-meta-performance',
    title: 'HTML5 Meta Tags, Viewport & Resource Hints',
    topic: 'HTML',
    language: 'HTML',
    level: 'Intermediate',
    minutes: 20,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/html-meta-tag/',
    outcome: 'Optimize web performance and mobile rendering with viewport tags, preload, prefetch, and Open Graph metadata.',
    notes: '• Responsive Viewport: `<meta name="viewport" content="width=device-width, initial-scale=1.0">` ensures proper mobile scaling.\n• Resource Hints:\n  - `<link rel="preload" as="font">`: High-priority fetch for critical assets needed on initial paint.\n  - `<link rel="prefetch">`: Low-priority fetch for assets likely needed on subsequent navigations.\n  - `<link rel="dns-prefetch">`: Resolves external third-party domain DNS early.\n• SEO & Social Cards: Open Graph (`og:title`, `og:image`) tags dictate how links appear when shared on platforms.',
    question: 'What is the purpose of `<link rel="preload">` in the HTML document head?',
    options: [
      'Instructs the browser to fetch high-priority critical resources immediately before parser discovery',
      'Permanently caches resources in browser LocalStorage',
      'Compresses images using gzip compression on the client',
      'Blocks page rendering until all background scripts finish downloading'
    ],
    answer: 0,
    explanation: '`rel="preload"` forces the browser to request high-priority resources (such as hero images, critical fonts, and stylesheets) early in the rendering lifecycle.'
  },
  {
    id: 'html-storage-workers',
    title: 'HTML5 Web Storage, IndexedDB & Service Workers',
    topic: 'HTML',
    language: 'HTML',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/html5-web-storage/',
    outcome: 'Compare LocalStorage, SessionStorage, IndexedDB, and Cache Storage for offline progressive web apps.',
    notes: '• LocalStorage: Synchronous key-value storage (~5MB limit) persisting across browser sessions.\n• SessionStorage: Cleared when browser tab/session terminates.\n• IndexedDB: Asynchronous transactional NoSQL database for large structured datasets.\n• Service Workers: Background script intercepting network requests, serving cached responses for offline PWAs.',
    question: 'Which browser client storage mechanism provides an asynchronous, transactional database suitable for storing large structured objects?',
    options: [
      'IndexedDB',
      'LocalStorage',
      'SessionStorage',
      'HTTP Cookies'
    ],
    answer: 0,
    explanation: 'IndexedDB is an asynchronous, transactional client-side database designed to store significant amounts of structured data (including files/blobs) without blocking the UI thread.'
  },

  // ── CSS ──────────────────────────────────────────────────────────────────
  {
    id: 'css-flexbox-grid',
    title: 'CSS Flexbox vs CSS Grid Layout Engines',
    topic: 'CSS',
    language: 'CSS',
    level: 'Beginner',
    minutes: 22,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/difference-between-css-grid-and-css-flexbox/',
    outcome: 'Choose appropriately between one-dimensional Flexbox and two-dimensional CSS Grid layouts.',
    notes: '• Flexbox (Flexible Box Layout): One-dimensional layout model (row OR column). Ideal for distributing space and aligning items along a single axis.\n• CSS Grid: Two-dimensional layout system (rows AND columns simultaneously). Ideal for full-page layouts, grid matrices, and overlapping template areas.\n• Flexbox is content-first; CSS Grid is layout-first.',
    question: 'What is the fundamental architectural difference between CSS Flexbox and CSS Grid?',
    options: [
      'Flexbox is a 1-dimensional layout engine (row or column); Grid is a 2-dimensional system (rows and columns)',
      'Flexbox only works on mobile browsers; Grid is exclusively for desktop displays',
      'Grid requires JavaScript to calculate pixel positions; Flexbox is native CSS',
      'Flexbox cannot align items vertically along the cross axis'
    ],
    answer: 0,
    explanation: 'Flexbox is designed for one-dimensional layouts (dealing with either a row or a column at a time), whereas CSS Grid is designed for two-dimensional layouts handling both rows and columns simultaneously.'
  },
  {
    id: 'css-cascade-specificity',
    title: 'The CSS Cascade, Specificity Weight & Inheritance',
    topic: 'CSS',
    language: 'CSS',
    level: 'Beginner',
    minutes: 22,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/css-specificity/',
    outcome: 'Calculate selector specificity scores (Inline > ID > Class/Pseudo-class > Element) and manage cascade layers (@layer).',
    notes: '• Specificity is a weight applied to a given CSS declaration determined by the number of each selector type.\n• Specificity Hierarchy (Highest to Lowest):\n  1. Inline styles (`style=""`): 1,0,0,0\n  2. IDs (`#header`): 0,1,0,0\n  3. Classes, attributes, pseudo-classes (`.card`, `[type]`, `:hover`): 0,0,1,0\n  4. Elements and pseudo-elements (`div`, `p`, `::before`): 0,0,0,1\n• `!important` overrides normal specificity rules but makes code difficult to maintain.',
    question: 'Which CSS selector has the highest specificity weight in the standard CSS cascade calculation?',
    options: [
      'ID selector (#nav)',
      'Class selector (.nav-bar)',
      'Element tag selector (nav)',
      'Attribute selector ([role="navigation"])'
    ],
    answer: 0,
    explanation: 'An ID selector (#nav) has a specificity weight of (0,1,0,0), overriding any number of class selectors (0,0,1,0) and element selectors (0,0,0,1).'
  },
  {
    id: 'css-box-model-centering',
    title: 'The CSS Box Model, Box-Sizing & Modern Centering',
    topic: 'CSS',
    language: 'CSS',
    level: 'Beginner',
    minutes: 20,
    xpReward: 20,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/css-box-model/',
    outcome: 'Master content-box vs border-box, margin collapsing, and modern CSS centering techniques (grid place-items: center).',
    notes: '• The CSS Box Model consists of: Content, Padding, Border, Margin.\n• `box-sizing: content-box` (default): Width and height apply only to content; padding and border add to final rendered dimensions.\n• `box-sizing: border-box` (best practice): Width and height include content, padding, and border.\n• Centering:\n  - CSS Grid: `display: grid; place-items: center;` (simplest modern way).\n  - Flexbox: `display: flex; justify-content: center; align-items: center;`.\n  - Margin auto: `margin-inline: auto;` for block elements with defined width.',
    question: 'Why do modern CSS resets universally apply `* { box-sizing: border-box; }` across all elements?',
    options: [
      'Padding and border widths are included inside the declared width/height, preventing layout overflow calculations',
      'It automatically converts all fonts into responsive vector glyphs',
      'It disables margin collapse between consecutive block elements',
      'It forces hardware acceleration for smooth 60fps scrolling'
    ],
    answer: 0,
    explanation: 'With `border-box`, declared widths and heights account for padding and borders, eliminating unintuitive size calculations where adding padding would widen an element.'
  },
  {
    id: 'css-animations-transitions',
    title: 'CSS Hardware Acceleration: Transforms, Transitions & Animations',
    topic: 'CSS',
    language: 'CSS',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/css3-animations/',
    outcome: 'Produce smooth 60fps animations utilizing GPU-accelerated properties (transform, opacity) and @keyframes.',
    notes: '• CSS Transitions smoothly interpolate changes between CSS property states over a duration.\n• CSS Animations use `@keyframes` to create multi-step keyframe sequences.\n• GPU Compositing: Animating `transform` (translate, scale, rotate) and `opacity` runs on the GPU compositor thread without triggering CPU Reflow (Layout) or Repaint.\n• Avoid animating `top`, `left`, `width`, or `height` as they force expensive layout recalculations on every frame.',
    question: 'Which pair of CSS properties is recommended for 60fps animations because they are handled by the GPU compositor without triggering reflow or repaint?',
    options: [
      'transform and opacity',
      'width and height',
      'top and left',
      'margin and padding'
    ],
    answer: 0,
    explanation: 'Modifying `transform` and `opacity` does not affect geometry or trigger layout recalculation (Reflow). The browser offloads compositing directly to the GPU for silky smooth 60fps performance.'
  },

  // ── React ────────────────────────────────────────────────────────────────
  {
    id: 'react-hooks-lifecycle',
    title: 'React Hooks Architecture: State, Effects & Dependencies',
    topic: 'React',
    language: 'React',
    level: 'Intermediate',
    minutes: 25,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/reactjs-hooks/',
    outcome: 'Master useState, useEffect cleanup phases, dependency arrays, and preventing stale closures.',
    notes: '• Hooks allow using state and lifecycle features without writing ES6 class components.\n• Rules of Hooks: Only call hooks at the top level (never in loops, conditions, or nested functions); only call from React functions.\n• useEffect Lifecycle:\n  - `[]`: Runs once after mount.\n  - `[dep]`: Runs when `dep` changes.\n  - Cleanup function returned runs before component unmount or before the effect re-executes.',
    question: 'In a React useEffect hook, when does the returned cleanup function execute?',
    options: [
      'Before the component unmounts and prior to the effect re-running due to dependency updates',
      'Immediately before the JSX DOM elements are parsed',
      'Only if an unhandled JavaScript exception occurs during rendering',
      'Every time any global browser window event triggers'
    ],
    answer: 0,
    explanation: 'The cleanup function returned by useEffect runs when the component unmounts and also immediately before re-running the effect on subsequent renders when dependencies change.'
  },
  {
    id: 'react-virtual-dom',
    title: 'React Virtual DOM, Diffing & Fiber Reconciliation',
    topic: 'React',
    language: 'React',
    level: 'Intermediate',
    minutes: 26,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/reactjs-virtual-dom/',
    outcome: 'Understand why direct DOM manipulation is slow, how React Fiber schedules updates, and the importance of keys in lists.',
    notes: '• Real DOM updates are expensive because they trigger browser style recalculations, reflow (layout), and repaint.\n• Virtual DOM (VDOM): A lightweight JavaScript object tree representation of the UI in memory.\n• Diffing Heuristic (O(N) reconciliation):\n  1. Elements of different types produce different trees.\n  2. Keys identify which items in a list have changed, been added, or been removed.\n• React Fiber: Re-implementation of the core reconciler enabling incremental rendering and task prioritization.',
    question: 'Why does React require a unique `key` prop when rendering lists of dynamic components?',
    options: [
      'To identify which items have changed, moved, or been removed, allowing optimal DOM reuse during reconciliation',
      'To assign unique CSS styling classes to each list item',
      'To store component state values directly in the browser cookie store',
      'Keys are required for TypeScript type checking compilation'
    ],
    answer: 0,
    explanation: 'Keys give React an identifier for list elements across renders. Without stable keys, React must re-render and mutate all list nodes rather than reordering or mutating only changed elements.'
  },
  {
    id: 'react-memo-performance',
    title: 'React Performance Optimization: useMemo, useCallback & React.memo',
    topic: 'React',
    language: 'React',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/react-js-usememo-hook/',
    outcome: 'Prevent unnecessary child re-renders by memoizing computational values and stable callback references.',
    notes: '• `React.memo(Component)`: Higher-order component that skips re-rendering if props have not changed (shallow comparison).\n• `useMemo(() => computeExpensiveValue(a, b), [a, b])`: Caches the result of an expensive calculation between renders.\n• `useCallback(fn, deps)`: Caches a function definition between renders, maintaining referential equality so child components wrapped in React.memo don\'t re-render needlessly.',
    question: 'What is the primary difference between `useMemo` and `useCallback` in React?',
    options: [
      '`useMemo` caches the calculated result of invoking a function; `useCallback` caches the function instance itself',
      '`useMemo` executes asynchronously on a background thread; `useCallback` is synchronous',
      '`useMemo` can only be used with numbers; `useCallback` is for strings',
      '`useCallback` triggers automatic component unmounting'
    ],
    answer: 0,
    explanation: '`useMemo` returns a memoized value by executing the supplied factory function. `useCallback` returns a memoized callback function definition with a stable memory reference.'
  },
  {
    id: 'react-context-state',
    title: 'State Management: React Context API vs External Stores',
    topic: 'React',
    language: 'React',
    level: 'Intermediate',
    minutes: 24,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/react-context-api/',
    outcome: 'Solve prop-drilling with React Context (createContext, useContext, Provider) while avoiding unnecessary re-renders.',
    notes: '• Prop Drilling: Passing props down through multiple layers of intermediate components that do not need them.\n• React Context: Provides a way to share values (theme, authenticated user, locale) across the component tree without passing props manually at every level.\n• Caveat: Any component calling `useContext(MyContext)` will re-render whenever the Context provider value changes.\n• Best Practice: Split contexts into smaller slices (e.g. AuthContext, ThemeContext) to limit re-render scope.',
    question: 'What performance drawback occurs if a high-frequency changing state is placed inside a single shared React Context?',
    options: [
      'Every component consuming that Context will re-render whenever the value updates, even if only interested in a small slice',
      'The browser memory heap will overflow within 30 seconds',
      'React Fiber halts all user interaction input events',
      'All local component state values are permanently wiped'
    ],
    answer: 0,
    explanation: 'React Context does not have built-in selector subscriptions: when the provider value updates, every consumer component triggers a re-render regardless of whether the specific sub-property it uses changed.'
  },

  // ── Node.js ──────────────────────────────────────────────────────────────
  {
    id: 'nodejs-event-driven-io',
    title: 'Node.js Non-Blocking I/O & Libuv Thread Pool',
    topic: 'Node.js',
    language: 'Node.js',
    level: 'Intermediate',
    minutes: 26,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/node-js-event-driven-architecture/',
    outcome: 'Trace how asynchronous I/O, OS kernel polling (epoll/kqueue), and libuv thread pool prevent blocking.',
    notes: '• Node.js operates on a single-threaded Event Loop backed by libuv.\n• Non-blocking System I/O: Network sockets utilize OS-level multiplexing (epoll on Linux, kqueue on macOS, IOCP on Windows).\n• Libuv Thread Pool: Handles CPU-intensive tasks (file system I/O, crypto, dns.lookup) across worker threads (default 4 threads).\n• Golden Rule: Never block the main Event Loop thread with expensive synchronous computations.',
    question: 'In Node.js, what component handles asynchronous file system operations and crypto hashing without blocking the main event thread?',
    options: [
      'The Libuv worker thread pool',
      'The Chrome V8 garbage collector',
      'The client browser JavaScript engine',
      'The operating system virtual memory pager'
    ],
    answer: 0,
    explanation: 'Libuv provides a multi-threaded pool (UV_THREADPOOL_SIZE, default 4 threads) to offload synchronous file system operations, compression, and cryptographic functions away from the single-threaded event loop.'
  },
  {
    id: 'nodejs-streams-buffers',
    title: 'Node.js Streams, Buffers & Pipeline Backpressure',
    topic: 'Node.js',
    language: 'Node.js',
    level: 'Intermediate',
    minutes: 25,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/node-js-streams/',
    outcome: 'Process massive multi-gigabyte files with Readable, Writable, Transform streams and stream.pipeline to manage backpressure.',
    notes: '• Buffers represent fixed-length raw binary memory allocated outside the V8 heap in Node.js.\n• Streams process data chunk-by-chunk without loading the entire payload into RAM.\n• 4 Stream Types: Readable, Writable, Duplex (read and write), Transform (modifies data as it passes through).\n• Backpressure occurs when a writable stream writes data slower than a readable stream reads it. `stream.pipeline` automatically manages backpressure and cleans up on error.',
    question: 'In Node.js streams, what does "Backpressure" refer to?',
    options: [
      'A build-up of data when a readable stream produces data faster than a writable stream can consume it',
      'A network timeout caused by slow upstream DNS resolution',
      'A CPU pipeline stalling on branch mispredictions',
      'A memory leak in the V8 garbage collector'
    ],
    answer: 0,
    explanation: 'Backpressure is the bottleneck where incoming data buffer overflows because the consumer (writable stream) is slower than the producer (readable stream). Proper stream pipelines pause the producer until the consumer is ready.'
  },
  {
    id: 'nodejs-cluster-workers',
    title: 'Scaling Node.js: Cluster Module & Worker Threads',
    topic: 'Node.js',
    language: 'Node.js',
    level: 'Advanced',
    minutes: 28,
    xpReward: 35,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/node-js-cluster-module/',
    outcome: 'Scale Node.js applications across multiple CPU cores using process clustering and execute CPU-heavy calculations with worker_threads.',
    notes: '• Single Process Limitation: By default, a Node.js process runs on a single CPU core.\n• Cluster Module: Forks multiple child processes (workers) sharing the same server port using OS-level round-robin connection distribution.\n• Worker Threads (`worker_threads`): Runs true multithreaded JavaScript code sharing memory (`SharedArrayBuffer`) within a single process, ideal for heavy CPU calculations without process overhead.',
    question: 'When should you choose `worker_threads` over the `cluster` module in Node.js?',
    options: [
      'For CPU-intensive computations (e.g. video transcoding, machine learning) sharing memory within a process',
      'For serving static web pages on multiple ports',
      'To run SQL database transactions concurrently',
      'To avoid installing the libuv native binary'
    ],
    answer: 0,
    explanation: 'Worker threads are ideal for offloading CPU-intensive algorithmic operations without the memory overhead of separate forked processes, while cluster is meant for scale-out network server processes.'
  },
  {
    id: 'nodejs-event-emitter',
    title: 'Node.js EventEmitter & Memory Leak Prevention',
    topic: 'Node.js',
    language: 'Node.js',
    level: 'Intermediate',
    minutes: 22,
    xpReward: 25,
    source: 'GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/node-js-events-module/',
    outcome: 'Build decoupled pub-sub architectures with EventEmitter and prevent MaxListenersExceeded memory leaks.',
    notes: '• The `EventEmitter` class from `node:events` facilitates event-driven communication.\n• Core Methods: `emitter.on(event, listener)`, `emitter.emit(event, ...args)`, `emitter.once(event, listener)`, `emitter.off(event, listener)`.\n• Memory Leak Warning: If more than 10 listeners are registered for a single event without removal, Node prints a `MaxListenersExceededWarning` to alert developers to potential memory leaks.\n• Always clean up event listeners (`removeListener` / `off`) when subscriptions are no longer needed.',
    question: 'Why does Node.js print a `MaxListenersExceededWarning` when more than 10 listeners are added to an EventEmitter?',
    options: [
      'To help detect and prevent accidental memory leaks from uncleaned listener references',
      'Because Node.js cannot allocate more than 10 function pointers in V8 memory',
      'Because exceeding 10 listeners causes an operating system socket error',
      'It is a fatal syntax error that crashes the Node.js process'
    ],
    answer: 0,
    explanation: 'The default threshold of 10 listeners is a built-in safety diagnostic in Node.js to alert developers to unintended listener accumulation and memory leaks.'
  }
];

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const completions = await query<{ resourceId: string }>(`SELECT "resourceId" FROM "LearningResourceCompletion" WHERE "userId" = $1`, [req.user!.userId]);
  const completed = new Set(completions.map((item) => item.resourceId));
  res.json(resources.map((resource) => ({ ...resource, completed: completed.has(resource.id) })));
});

router.post('/:id/complete', authenticate, async (req: AuthRequest, res) => {
  const resource = resources.find((item) => item.id === req.params.id);
  if (!resource) { res.status(404).json({ error: 'Learning resource not found' }); return; }
  const existing = await queryOne<{ id: string }>(`SELECT "id" FROM "LearningResourceCompletion" WHERE "userId" = $1 AND "resourceId" = $2`, [req.user!.userId, resource.id]);
  if (existing) { res.json({ completed: true, xpEarned: 0 }); return; }
  await queryOne(`INSERT INTO "LearningResourceCompletion" ("id", "userId", "resourceId") VALUES ($1, $2, $3) RETURNING "id"`, [newId(), req.user!.userId, resource.id]);
  await awardXp(req.user!.userId, resource.xpReward, 'Completed learning resource: ' + resource.title);
  res.status(201).json({ completed: true, xpEarned: resource.xpReward });
});

export default router;
