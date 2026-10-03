import type { ExampleSnippet } from './types.js';

export function getTypeScriptExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/simple type|primitive|number|string|boolean/.test(t)) {
    return {
      title: 'TypeScript Simple & Primitive Types',
      language: 'typescript',
      code: `let userName: string = 'Alice';
let age: number = 28;
let isActive: boolean = true;

console.log(\`User: \${userName}, Age: \${age}, Active: \${isActive}\`);`,
      explanation: 'TypeScript supports explicit static typing for primitive JavaScript types (string, number, boolean).\n\nExpected Output:\nUser: Alice, Age: 28, Active: true',
      syntax: [
        'let varName: string = "text";',
        'let count: number = 42;',
        'let flag: boolean = true;',
      ],
      rules: [
        'Prefer type inference when initializing variables with unambiguous literal values.',
        'Use explicit type annotations for function parameters and uninitialized variables.',
        'Avoid casting with any when a precise primitive or union type is known.',
      ],
      commonMistakes: [
        'Redundantly annotating simple literals where TypeScript already infers the correct type.',
        'Assigning a value of a different type to an explicitly typed variable without conversion.',
      ],
    };
  }

  if (/special type|any|unknown|never|void/.test(t)) {
    return {
      title: 'TypeScript Special Types (unknown, never, void)',
      language: 'typescript',
      code: `// unknown is the type-safe counterpart of any
let userInput: unknown = 'Hello TypeScript';

if (typeof userInput === 'string') {
  console.log('Normalized input:', userInput.toUpperCase());
}

function throwError(message: string): never {
  throw new Error(message);
}

function logMessage(msg: string): void {
  console.log('Log:', msg);
}

logMessage('System ready');`,
      explanation: 'Special types provide compile-time safety for edge cases: unknown requires narrowing before use; never represents unreachable execution; void indicates absence of return value.\n\nExpected Output:\nNormalized input: HELLO TYPESCRIPT\nLog: System ready',
      syntax: [
        'let value: unknown;',
        'function error(): never { throw new Error(); }',
        'function log(): void { console.log(); }',
      ],
    };
  }

  if (/array|tuple/.test(t)) {
    return {
      title: 'TypeScript Arrays & Tuples',
      language: 'typescript',
      code: `// Typed Array
const numbers: number[] = [10, 20, 30, 40];
numbers.push(50);

// Typed Tuple: fixed length and fixed types in order
let studentRecord: [number, string, boolean];
studentRecord = [101, 'Ada Lovelace', true];

console.log('Numbers array length:', numbers.length);
console.log('Student ID:', studentRecord[0], 'Name:', studentRecord[1]);`,
      explanation: 'Arrays store homogeneous elements. Tuples enforce strict length and specific types at each array index position.\n\nExpected Output:\nNumbers array length: 5\nStudent ID: 101 Name: Ada Lovelace',
      syntax: [
        'const items: type[] = [];',
        'let tuple: [type1, type2] = [val1, val2];',
        'const readonlyList: readonly string[] = ["a", "b"];',
      ],
    };
  }

  if (/interface|type alias/.test(t)) {
    return {
      title: 'TypeScript Interfaces & Type Aliases',
      language: 'typescript',
      code: `interface User {
  readonly id: number;
  name: string;
  email?: string; // Optional property
}

interface Employee extends User {
  department: string;
}

const engineer: Employee = {
  id: 1,
  name: 'Grace Hopper',
  department: 'Computer Science',
};

console.log(\`Employee \${engineer.name} works in \${engineer.department}.\`);`,
      explanation: 'Interfaces define contracts for object structures and can be extended to model rich domain hierarchies.\n\nExpected Output:\nEmployee Grace Hopper works in Computer Science.',
      syntax: [
        'interface Name { prop: type; optional?: type; }',
        'interface Child extends Parent { additionalProp: type; }',
        'type AliasName = string | number;',
      ],
    };
  }

  if (/union|intersection/.test(t)) {
    return {
      title: 'TypeScript Union & Intersection Types',
      language: 'typescript',
      code: `type ID = string | number;

function printId(id: ID) {
  if (typeof id === 'string') {
    console.log('String ID:', id.toUpperCase());
  } else {
    console.log('Numeric ID:', id.toFixed(2));
  }
}

type Timed = { timestamp: number };
type LogEntry = { message: string } & Timed;

const entry: LogEntry = { message: 'Database connected', timestamp: Date.now() };

printId('usr_9281');
printId(42);
console.log('Log message:', entry.message);`,
      explanation: 'Union types (|) allow values of multiple distinct types. Intersection types (&) combine multiple type structures together.\n\nExpected Output:\nString ID: USR_9281\nNumeric ID: 42.00\nLog message: Database connected',
      syntax: [
        'type Union = TypeA | TypeB;',
        'type Intersection = TypeA & TypeB;',
      ],
    };
  }

  if (/function|parameter/.test(t)) {
    return {
      title: 'TypeScript Typed Functions',
      language: 'typescript',
      code: `function calculateTotal(price: number, taxRate: number = 0.05, discount?: number): number {
  let subtotal = price * (1 + taxRate);
  if (discount) {
    subtotal -= discount;
  }
  return Math.round(subtotal * 100) / 100;
}

const total1 = calculateTotal(100);
const total2 = calculateTotal(100, 0.10, 15);

console.log('Total 1 (default tax):', total1);
console.log('Total 2 (discounted):', total2);`,
      explanation: 'TypeScript enables type annotations on function parameters, default values, optional params, and return types.\n\nExpected Output:\nTotal 1 (default tax): 105\nTotal 2 (discounted): 95',
      syntax: [
        'function name(param: type, optional?: type): returnType { return val; }',
        'const arrowFn = (a: number): number => a * 2;',
      ],
    };
  }

  if (/casting|assertion/.test(t)) {
    return {
      title: 'TypeScript Type Casting (as)',
      language: 'typescript',
      code: `const unknownValue: unknown = 'Hello, TypeScript World!';

// Safe type assertion using "as" keyword
const strLength: number = (unknownValue as string).length;

console.log('Length of string:', strLength);`,
      explanation: 'Type assertions tell the TypeScript compiler to treat a value as a specific type when you know more about the shape than the compiler does.\n\nExpected Output:\nLength of string: 23',
      syntax: [
        'const result = (variable as TargetType);',
        'const numberValue = (unknownVal as number);',
      ],
    };
  }

  if (/class|modifier|access/.test(t)) {
    return {
      title: 'TypeScript Classes & Access Modifiers',
      language: 'typescript',
      code: `class BankAccount {
  public readonly accountNumber: string;
  private balance: number;
  protected accountHolder: string;

  constructor(accountNumber: string, initialBalance: number, holder: string) {
    this.accountNumber = accountNumber;
    this.balance = initialBalance;
    this.accountHolder = holder;
  }

  public deposit(amount: number): void {
    if (amount > 0) this.balance += amount;
  }

  public getBalance(): number {
    return this.balance;
  }
}

const account = new BankAccount('ACC-1002', 500, 'Alex');
account.deposit(250);
console.log('Account:', account.accountNumber, 'Balance:', account.getBalance());`,
      explanation: 'TypeScript extends classes with access modifiers: public (accessible everywhere), private (class internal only), and protected (class and subclasses).\n\nExpected Output:\nAccount: ACC-1002 Balance: 750',
      syntax: [
        'class MyClass { private secret: string; public method(): void {} }',
      ],
    };
  }

  if (/generic/.test(t)) {
    return {
      title: 'TypeScript Generics',
      language: 'typescript',
      code: `// Generic function working across arbitrary types
function wrapInBox<T>(value: T): { content: T; timestamp: string } {
  return {
    content: value,
    timestamp: new Date().toISOString().substring(0, 10),
  };
}

const stringBox = wrapInBox<string>('Developer Toolkit');
const numberBox = wrapInBox<number>(2026);

console.log('String Box content:', stringBox.content);
console.log('Number Box content:', numberBox.content);`,
      explanation: 'Generics introduce type variables (<T>) allowing functions, classes, and interfaces to work with any type while preserving strict type safety.\n\nExpected Output:\nString Box content: Developer Toolkit\nNumber Box content: 2026',
      syntax: [
        'function fn<T>(param: T): T { return param; }',
        'interface Container<T> { value: T; }',
      ],
    };
  }

  if (/utility type|partial|record|omit|pick/.test(t)) {
    return {
      title: 'TypeScript Utility Types (Partial, Pick, Omit, Record)',
      language: 'typescript',
      code: `interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

// Partial makes all properties optional (great for update payloads)
type TaskUpdate = Partial<Task>;

// Pick extracts specific properties
type TaskPreview = Pick<Task, 'id' | 'title'>;

// Omit excludes specific properties
type CreateTaskInput = Omit<Task, 'id'>;

const preview: TaskPreview = { id: 'T-1', title: 'Implement Auth' };
const update: TaskUpdate = { completed: true };

console.log('Task Preview:', preview.title, 'Completed update:', update.completed);`,
      explanation: 'TypeScript provides built-in utility types to transform existing types flexibly without duplicating interface definitions.\n\nExpected Output:\nTask Preview: Implement Auth Completed update: true',
      syntax: [
        'type OptionalTask = Partial<Task>;',
        'type CompactTask = Pick<Task, "id" | "title">;',
        'type NewTask = Omit<Task, "id">;',
        'type StringMap = Record<string, number>;',
      ],
    };
  }

  if (/enum/.test(t)) {
    return {
      title: 'TypeScript Enums',
      language: 'typescript',
      code: `enum HttpStatus {
  OK = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

function handleResponse(status: HttpStatus) {
  if (status === HttpStatus.OK) {
    console.log('Request succeeded with code 200.');
  } else {
    console.log('Request failed with error code:', status);
  }
}

handleResponse(HttpStatus.OK);
handleResponse(HttpStatus.NotFound);`,
      explanation: 'Enums allow defining a set of named constants to represent fixed state or categorical options with semantic clarity.\n\nExpected Output:\nRequest succeeded with code 200.\nRequest failed with error code: 404',
      syntax: [
        'enum Direction { Up = "UP", Down = "DOWN" }',
      ],
    };
  }

  if (/keyof/.test(t)) {
    return {
      title: 'TypeScript keyof Operator',
      language: 'typescript',
      code: `interface Person {
  name: string;
  age: number;
  location: string;
}

// keyof Person produces union: 'name' | 'age' | 'location'
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const developer: Person = { name: 'Bob', age: 31, location: 'Cape Town' };
const devName = getProperty(developer, 'name');
console.log('Retrieved developer property:', devName);`,
      explanation: 'The keyof operator extracts the keys of an object type as a literal union type, ensuring safe property access.\n\nExpected Output:\nRetrieved developer property: Bob',
      syntax: [
        'type PersonKeys = keyof Person;',
        'function getProp<T, K extends keyof T>(obj: T, key: K): T[K]',
      ],
    };
  }

  if (/null|undefined|optional chaining/.test(t)) {
    return {
      title: 'TypeScript Null, Undefined & Optional Chaining',
      language: 'typescript',
      code: `interface Profile {
  user: {
    address?: {
      city?: string;
    };
  };
}

const profile: Profile = { user: {} };

// Optional chaining (?.) and nullish coalescing (??)
const city = profile.user.address?.city ?? 'Unknown City';
console.log('Resolved City:', city);`,
      explanation: 'TypeScript supports strict null checks, optional chaining (?.), and nullish coalescing (??) to prevent runtime TypeError.\n\nExpected Output:\nResolved City: Unknown City',
      syntax: [
        'const val = obj?.prop?.subProp ?? fallbackValue;',
      ],
    };
  }

  return {
    title: `TypeScript ${title}`,
    language: 'typescript',
    code: `interface Config {
  title: string;
  enabled: boolean;
}

const config: Config = {
  title: '${title}',
  enabled: true,
};

console.log(\`TypeScript module \${config.title} is active: \${config.enabled}\`);`,
    explanation: `Demonstrates ${title} using static type checking, interfaces, and compile-time correctness in TypeScript.\n\nExpected Output:\nTypeScript module ${title} is active: true`,
    syntax: [
      'interface TypeDef { field: type; }',
      'const data: TypeDef = { ... };',
    ],
  };
}
