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
