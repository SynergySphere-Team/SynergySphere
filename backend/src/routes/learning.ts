import { Router } from 'express';
import { newId, query, queryOne } from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { awardXp } from '../services/gamification.js';

const router = Router();

export interface BackendLearningResource {
  id: string;
  title: string;
  topic: string;
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
  {
    id: 'algorithm-basics',
    title: 'Algorithm Basics & Asymptotic Notations',
    topic: 'Algorithms',
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
    id: 'javascript-event-loop',
    title: 'JavaScript Event Loop & Microtask Queues',
    topic: 'JavaScript',
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
    id: 'python-memory-mutability',
    title: 'Python Memory Model & Object Mutability',
    topic: 'Python',
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
    id: 'sql-acid-transactions',
    title: 'SQL ACID Properties & Transaction Management',
    topic: 'SQL',
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
    id: 'oop-polymorphism',
    title: 'Object-Oriented Programming: Polymorphism & Overriding',
    topic: 'OOP',
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
    id: 'algorithms-dynamic-programming',
    title: 'Dynamic Programming: Memoization vs Tabulation',
    topic: 'Algorithms',
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
