import type { LessonContent, LessonSpec, ModuleSpec, SubjectSpec } from './lectureCurriculumTypes.js';

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

// ---------------------------------------------------------------------------
// W3Schools Canonical Code Examples by Technology & Topic
// ---------------------------------------------------------------------------

type ExampleSnippet = {
  title: string;
  language: string;
  code: string;
  explanation: string;
  syntax?: string[];
};

function getPythonExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/home|intro/.test(t)) {
    return {
      title: 'Python print() Output',
      language: 'python',
      code: 'print("Hello, World!")',
      explanation: 'The classic introductory example from W3Schools Python tutorial.\n\nExpected Output:\nHello, World!',
      syntax: ['print(value)']
    };
  }
  if (/get started|version/.test(t)) {
    return {
      title: 'Check Python Version',
      language: 'python',
      code: 'import sys\nprint(sys.version)',
      explanation: 'W3Schools example demonstrating how to inspect the active Python runtime version.\n\nExpected Output:\n3.12.x (active Python interpreter version)',
      syntax: ['import sys', 'sys.version']
    };
  }
  if (/syntax|statement/.test(t)) {
    return {
      title: 'Python Indentation Syntax',
      language: 'python',
      code: 'if 5 > 2:\n    print("Five is greater than two!")',
      explanation: 'Python uses indentation to indicate a block of code, unlike languages using curly brackets.\n\nExpected Output:\nFive is greater than two!',
      syntax: ['if condition:', '    statement']
    };
  }
  if (/comment/.test(t)) {
    return {
      title: 'Python Comments',
      language: 'python',
      code: '# This is a single-line comment\nprint("Comments are ignored by Python")\n"""\nThis is a multiline\nstring used as a comment\n"""',
      explanation: 'Comments start with a hash symbol (#) and Python will ignore them when running code.\n\nExpected Output:\nComments are ignored by Python',
      syntax: ['# comment text', '""" multiline comment """']
    };
  }
  if (/variable/.test(t)) {
    return {
      title: 'Python Variables & Assignment',
      language: 'python',
      code: 'x = 5\ny = "John"\nprint(x)\nprint(y)',
      explanation: 'Variables are containers for storing data values. In Python, variables are created when you assign a value to them.\n\nExpected Output:\n5\nJohn',
      syntax: ['variable_name = value']
    };
  }
  if (/data type/.test(t)) {
    return {
      title: 'Getting the Data Type',
      language: 'python',
      code: 'x = 5\ny = "Hello"\nz = [1, 2, 3]\nprint(type(x))\nprint(type(y))\nprint(type(z))',
      explanation: 'You can get the data type of any object by using the type() function.\n\nExpected Output:\n<class \'int\'>\n<class \'str\'>\n<class \'list\'>',
      syntax: ['type(object)']
    };
  }
  if (/number/.test(t)) {
    return {
      title: 'Python Numbers',
      language: 'python',
      code: 'x = 1    # int\ny = 2.8  # float\nz = 1j   # complex\nprint(type(x))\nprint(type(y))\nprint(type(z))',
      explanation: 'There are three numeric types in Python: int, float, and complex.\n\nExpected Output:\n<class \'int\'>\n<class \'float\'>\n<class \'complex\'>',
      syntax: ['x = 1', 'y = 2.8', 'z = 1j']
    };
  }
  if (/cast/.test(t)) {
    return {
      title: 'Python Type Casting',
      language: 'python',
      code: 'x = int(1)\ny = int(2.8)\nz = float("3")\nw = str(4.2)\nprint(x, y, z, w)',
      explanation: 'Casting in Python is done using constructor functions like int(), float(), and str().\n\nExpected Output:\n1 2 3.0 4.2',
      syntax: ['int(value)', 'float(value)', 'str(value)']
    };
  }
  if (/string/.test(t)) {
    return {
      title: 'Python Strings & Slicing',
      language: 'python',
      code: 'a = "Hello, World!"\nprint(a[1])\nprint(a[2:5])\nprint(len(a))\nprint(a.upper())',
      explanation: 'Strings in Python are arrays of bytes representing unicode characters.\n\nExpected Output:\ne\nllo\n13\nHELLO, WORLD!',
      syntax: ['string[index]', 'string[start:end]', 'len(string)']
    };
  }
  if (/boolean/.test(t)) {
    return {
      title: 'Python Booleans',
      language: 'python',
      code: 'print(10 > 9)\nprint(10 == 9)\nprint(10 < 9)\nprint(bool("Hello"))',
      explanation: 'Booleans represent one of two values: True or False.\n\nExpected Output:\nTrue\nFalse\nFalse\nTrue',
      syntax: ['bool(expression)', 'a == b', 'a > b']
    };
  }
  if (/operator/.test(t)) {
    return {
      title: 'Python Arithmetic Operators',
      language: 'python',
      code: 'x = 10\ny = 3\nprint("Add:", x + y)\nprint("Multiply:", x * y)\nprint("Division:", x / y)\nprint("Modulus:", x % y)\nprint("Exponent:", x ** y)',
      explanation: 'Operators are used to perform operations on variables and values.\n\nExpected Output:\nAdd: 13\nMultiply: 30\nDivision: 3.3333333333333335\nModulus: 1\nExponent: 1000',
      syntax: ['a + b', 'a * b', 'a / b', 'a % b', 'a ** b']
    };
  }
  if (/comprehension/.test(t)) {
    return {
      title: 'Python List Comprehension',
      language: 'python',
      code: 'fruits = ["apple", "banana", "cherry", "kiwi", "mango"]\nnewlist = [x for x in fruits if "a" in x]\nprint(newlist)',
      explanation: 'List comprehension offers a shorter syntax when creating a new list based on existing values.\n\nExpected Output:\n[\'apple\', \'banana\', \'mango\']',
      syntax: ['[expression for item in iterable if condition == True]']
    };
  }
  if (/list/.test(t)) {
    return {
      title: 'Python Lists',
      language: 'python',
      code: 'thislist = ["apple", "banana", "cherry"]\nthislist.append("orange")\nprint("Length:", len(thislist))\nprint("First item:", thislist[0])\nprint("All items:", thislist)',
      explanation: 'Lists are used to store multiple items in a single variable. Lists are ordered, changeable, and allow duplicates.\n\nExpected Output:\nLength: 4\nFirst item: apple\nAll items: [\'apple\', \'banana\', \'cherry\', \'orange\']',
      syntax: ['list_name = [item1, item2]', 'list_name.append(item)', 'list_name[index]']
    };
  }
  if (/tuple/.test(t)) {
    return {
      title: 'Python Tuples',
      language: 'python',
      code: 'thistuple = ("apple", "banana", "cherry")\nprint(thistuple)\nprint("Length:", len(thistuple))\nprint("Item 1:", thistuple[1])',
      explanation: 'Tuples are used to store multiple items in a single variable. A tuple is an ordered and unchangeable collection.\n\nExpected Output:\n(\'apple\', \'banana\', \'cherry\')\nLength: 3\nItem 1: banana',
      syntax: ['tuple_name = (item1, item2)', 'tuple_name[index]']
    };
  }
  if (/set|frozenset/.test(t)) {
    return {
      title: 'Python Sets',
      language: 'python',
      code: 'thisset = {"apple", "banana", "cherry"}\nthisset.add("orange")\nprint("Set items:", thisset)\nprint("Is apple in set?", "apple" in thisset)',
      explanation: 'Sets are used to store multiple items in a single variable. Sets are unordered, unchangeable, and unindexed with unique values.\n\nExpected Output:\nSet items: {\'orange\', \'cherry\', \'banana\', \'apple\'}\nIs apple in set? True',
      syntax: ['set_name = {item1, item2}', 'set_name.add(item)']
    };
  }
  if (/dictionar/.test(t)) {
    return {
      title: 'Python Dictionaries',
      language: 'python',
      code: 'thisdict = {\n    "brand": "Ford",\n    "model": "Mustang",\n    "year": 1964\n}\nprint(thisdict["brand"])\nthisdict["year"] = 2020\nprint(thisdict)',
      explanation: 'Dictionaries are used to store data values in key:value pairs. A dictionary is an ordered, changeable collection with no duplicates.\n\nExpected Output:\nFord\n{\'brand\': \'Ford\', \'model\': \'Mustang\', \'year\': 2020}',
      syntax: ['dict_name = {key: value}', 'dict_name[key] = new_value']
    };
  }
  if (/if|else|elif|control flow/.test(t)) {
    return {
      title: 'Python If...Else Statements',
      language: 'python',
      code: 'a = 200\nb = 33\nif b > a:\n    print("b is greater than a")\nelif a == b:\n    print("a and b are equal")\nelse:\n    print("a is greater than b")',
      explanation: 'Python supports conditional statements using if, elif, and else with colon-based indentation blocks.\n\nExpected Output:\na is greater than b',
      syntax: ['if condition:', '    statement', 'elif condition:', '    statement', 'else:', '    statement']
    };
  }
  if (/while/.test(t)) {
    return {
      title: 'Python While Loops',
      language: 'python',
      code: 'i = 1\nwhile i < 6:\n    print(i)\n    i += 1',
      explanation: 'With the while loop we can execute a set of statements as long as a condition is true.\n\nExpected Output:\n1\n2\n3\n4\n5',
      syntax: ['while condition:', '    statements', '    counter_update']
    };
  }
  if (/for loop|loop/.test(t)) {
    return {
      title: 'Python For Loops',
      language: 'python',
      code: 'fruits = ["apple", "banana", "cherry"]\nfor x in fruits:\n    print(x)\n\nfor i in range(3):\n    print("Index:", i)',
      explanation: 'A for loop is used for iterating over a sequence (such as a list, tuple, dictionary, set, or string).\n\nExpected Output:\napple\nbanana\ncherry\nIndex: 0\nIndex: 1\nIndex: 2',
      syntax: ['for item in iterable:', '    statement', 'for i in range(n):']
    };
  }
  if (/lambda/.test(t)) {
    return {
      title: 'Python Lambda Functions',
      language: 'python',
      code: 'x = lambda a, b : a * b\nprint("5 * 6 =", x(5, 6))\n\ndoubler = lambda a : a * 2\nprint("Double 11 =", doubler(11))',
      explanation: 'A lambda function is a small anonymous function that can take any number of arguments, but can only have one expression.\n\nExpected Output:\n5 * 6 = 30\nDouble 11 = 22',
      syntax: ['lambda arguments : expression']
    };
  }
  if (/function/.test(t)) {
    return {
      title: 'Python Functions',
      language: 'python',
      code: 'def my_function(fname, lname):\n    return f"Hello, {fname} {lname}!"\n\nmessage = my_function("Emil", "Refsnes")\nprint(message)',
      explanation: 'A function is a block of code which only runs when it is called. You can pass data, known as parameters, into a function.\n\nExpected Output:\nHello, Emil Refsnes!',
      syntax: ['def function_name(param1, param2):', '    return result']
    };
  }
  if (/class|object|oop/.test(t)) {
    return {
      title: 'Python Classes and Objects',
      language: 'python',
      code: 'class Person:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n\n    def introduce(self):\n        print(f"Hello, my name is {self.name} and I am {self.age}")\n\np1 = Person("John", 36)\np1.introduce()',
      explanation: 'Python is an object oriented programming language. Almost everything in Python is an object, with its properties and methods.\n\nExpected Output:\nHello, my name is John and I am 36',
      syntax: ['class ClassName:', '    def __init__(self, params):', '        self.prop = val']
    };
  }
  if (/inherit/.test(t)) {
    return {
      title: 'Python Class Inheritance',
      language: 'python',
      code: 'class Person:\n    def __init__(self, fname, lname):\n        self.firstname = fname\n        self.lastname = lname\n\n    def printname(self):\n        print(self.firstname, self.lastname)\n\nclass Student(Person):\n    pass\n\nx = Student("Mike", "Olsen")\nx.printname()',
      explanation: 'Inheritance allows us to define a class that inherits all the methods and properties from another class.\n\nExpected Output:\nMike Olsen',
      syntax: ['class ParentClass:', 'class ChildClass(ParentClass):']
    };
  }
  if (/iterator/.test(t)) {
    return {
      title: 'Python Iterators',
      language: 'python',
      code: 'mytuple = ("apple", "banana", "cherry")\nmyit = iter(mytuple)\nprint(next(myit))\nprint(next(myit))\nprint(next(myit))',
      explanation: 'An iterator is an object that contains a countable number of values that can be iterated upon using iter() and next().\n\nExpected Output:\napple\nbanana\ncherry',
      syntax: ['iter_obj = iter(iterable)', 'next(iter_obj)']
    };
  }
  if (/polymorph/.test(t)) {
    return {
      title: 'Python Polymorphism',
      language: 'python',
      code: 'class Car:\n    def move(self):\n        print("Drive!")\n\nclass Boat:\n    def move(self):\n        print("Sail!")\n\nfor vehicle in (Car(), Boat()):\n    vehicle.move()',
      explanation: 'Polymorphism allows methods in different classes to have the same name, but take different actions.\n\nExpected Output:\nDrive!\nSail!',
      syntax: ['class A: def move(self):', 'class B: def move(self):']
    };
  }
  if (/scope/.test(t)) {
    return {
      title: 'Python Variable Scope',
      language: 'python',
      code: 'x = 300  # Global scope\n\ndef myfunc():\n    global x\n    x = 200  # Modifying global\n    print("Inside:", x)\n\nmyfunc()\nprint("Outside:", x)',
      explanation: 'A variable created inside a function belongs to the local scope of that function. The global keyword binds to the module scope.\n\nExpected Output:\nInside: 200\nOutside: 200',
      syntax: ['global variable_name']
    };
  }
  if (/module|pip/.test(t)) {
    return {
      title: 'Python Modules',
      language: 'python',
      code: 'import math\n\nprint("Square root of 64:", math.sqrt(64))\nprint("Pi value:", round(math.pi, 4))',
      explanation: 'Consider a module to be the same as a code library. A file containing a set of functions you want to include in your application.\n\nExpected Output:\nSquare root of 64: 8.0\nPi value: 3.1416',
      syntax: ['import module_name', 'from module_name import function']
    };
  }
  if (/date/.test(t)) {
    return {
      title: 'Python Datetime',
      language: 'python',
      code: 'import datetime\n\nx = datetime.datetime.now()\nprint("Year:", x.year)\nprint("Weekday:", x.strftime("%A"))',
      explanation: 'A date in Python is not a data type of its own, but we can import the datetime module to work with dates as date objects.\n\nExpected Output:\nYear: (current year)\nWeekday: (current weekday name)',
      syntax: ['import datetime', 'datetime.datetime.now()']
    };
  }
  if (/math/.test(t)) {
    return {
      title: 'Python Math Functions',
      language: 'python',
      code: 'import math\n\nprint("Min:", min(5, 10, 25))\nprint("Max:", max(5, 10, 25))\nprint("Ceil of 1.4:", math.ceil(1.4))\nprint("Floor of 1.4:", math.floor(1.4))',
      explanation: 'Python has a set of built-in math functions, and an extensive math module that allows you to perform mathematical tasks on numbers.\n\nExpected Output:\nMin: 5\nMax: 25\nCeil of 1.4: 2\nFloor of 1.4: 1',
      syntax: ['min(values)', 'max(values)', 'math.ceil(x)', 'math.floor(x)']
    };
  }
  if (/json/.test(t)) {
    return {
      title: 'Python JSON Parsing',
      language: 'python',
      code: 'import json\n\n# JSON string to Python dictionary\nx = \'{"name":"John", "age":30, "city":"New York"}\'\ny = json.loads(x)\nprint("Name:", y["name"])\n\n# Python dictionary to JSON string\nz = json.dumps({"brand": "Ford", "electric": False})\nprint("JSON output:", z)',
      explanation: 'Python has a built-in package called json, which can be used to parse and encode JSON data.\n\nExpected Output:\nName: John\nJSON output: {"brand": "Ford", "electric": false}',
      syntax: ['json.loads(json_string)', 'json.dumps(python_object)']
    };
  }
  if (/regex|regular expression/.test(t)) {
    return {
      title: 'Python RegEx',
      language: 'python',
      code: 'import re\n\ntxt = "The rain in Spain"\nx = re.findall("ai", txt)\nprint("Matches found:", x)\n\nmatch = re.search("^The.*Spain$", txt)\nprint("Full match?", bool(match))',
      explanation: 'A RegEx, or Regular Expression, is a sequence of characters that forms a search pattern.\n\nExpected Output:\nMatches found: [\'ai\', \'ai\']\nFull match? True',
      syntax: ['import re', 're.findall(pattern, string)', 're.search(pattern, string)']
    };
  }
  if (/try|except|error/.test(t)) {
    return {
      title: 'Python Try...Except Blocks',
      language: 'python',
      code: 'try:\n    print(undeclared_variable)\nexcept NameError:\n    print("Variable is not defined")\nexcept Exception as err:\n    print("Something else went wrong:", err)\nfinally:\n    print("The try-except block finished")',
      explanation: 'The try block lets you test a block of code for errors. The except block lets you handle the error. The finally block executes regardless.\n\nExpected Output:\nVariable is not defined\nThe try-except block finished',
      syntax: ['try:', '    statement', 'except ExceptionType:', '    handle_error', 'finally:', '    cleanup']
    };
  }
  if (/user input|input/.test(t)) {
    return {
      title: 'Python User Input',
      language: 'python',
      code: 'username = input("Enter username: ")\nprint("Username is: " + username)',
      explanation: 'Python allows for user input. That means we are able to ask the user for input using the input() built-in method.\n\nExpected Output:\nEnter username: (input string)\nUsername is: (input string)',
      syntax: ['variable = input(prompt_string)']
    };
  }
  if (/file/.test(t)) {
    return {
      title: 'Python File Handling',
      language: 'python',
      code: 'with open("demofile.txt", "w") as f:\n    f.write("Now the file has more content!")\n\nwith open("demofile.txt", "r") as f:\n    content = f.read()\n    print(content)',
      explanation: 'The key function for working with files in Python is the open() function. Using with open ensures resources are closed automatically.\n\nExpected Output:\nNow the file has more content!',
      syntax: ['with open(filename, mode) as f:', '    f.write(text)', '    f.read()']
    };
  }
  if (/numpy/.test(t)) {
    return {
      title: 'NumPy Arrays',
      language: 'python',
      code: 'import numpy as np\n\narr = np.array([1, 2, 3, 4, 5])\nprint("Array:", arr)\nprint("Dimensions:", arr.ndim)\nprint("Type:", type(arr))',
      explanation: 'NumPy is a Python library used for working with arrays. It also has functions for working in domain of linear algebra and matrices.\n\nExpected Output:\nArray: [1 2 3 4 5]\nDimensions: 1\nType: <class \'numpy.ndarray\'>',
      syntax: ['import numpy as np', 'arr = np.array(list)']
    };
  }
  if (/pandas/.test(t)) {
    return {
      title: 'Pandas DataFrames',
      language: 'python',
      code: 'import pandas as pd\n\ndata = {\n    "calories": [420, 380, 390],\n    "duration": [50, 40, 45]\n}\ndf = pd.DataFrame(data)\nprint(df)',
      explanation: 'Pandas is a Python library used for working with data sets. It has functions for analyzing, cleaning, exploring, and manipulating data.\n\nExpected Output:\n   calories  duration\n0       420        50\n1       380        40\n2       390        45',
      syntax: ['import pandas as pd', 'df = pd.DataFrame(data_dict)']
    };
  }
  if (/mysql/.test(t)) {
    return {
      title: 'Python MySQL Connection',
      language: 'python',
      code: 'import mysql.connector\n\nmydb = mysql.connector.connect(\n    host="localhost",\n    user="yourusername",\n    password="yourpassword"\n)\nprint("MySQL connection established:", bool(mydb))',
      explanation: 'Python can be used in database applications. One of the most popular databases is MySQL using mysql.connector.\n\nExpected Output:\nMySQL connection established: True',
      syntax: ['import mysql.connector', 'mydb = mysql.connector.connect(...)']
    };
  }
  if (/mongodb/.test(t)) {
    return {
      title: 'Python MongoDB Connection',
      language: 'python',
      code: 'import pymongo\n\nmyclient = pymongo.MongoClient("mongodb://localhost:27017/")\nmydb = myclient["mydatabase"]\nprint("Databases:", myclient.list_database_names())',
      explanation: 'MongoDB stores data in JSON-like documents, which makes the database very flexible and scalable using the pymongo driver.\n\nExpected Output:\nDatabases: [\'admin\', \'config\', \'local\']',
      syntax: ['import pymongo', 'client = pymongo.MongoClient(uri)']
    };
  }

  return {
    title: 'Python Code Example',
    language: 'python',
    code: 'x = 10\ny = 20\nprint("Calculated result:", x + y)',
    explanation: 'Demonstrates execution of the Python statement and standard console output.\n\nExpected Output:\nCalculated result: 30',
    syntax: ['print(expression)']
  };
}

function getSqlExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/distinct/.test(t)) {
    return {
      title: 'SQL SELECT DISTINCT',
      language: 'sql',
      code: 'SELECT DISTINCT Country FROM Customers\nORDER BY Country;',
      explanation: 'The SELECT DISTINCT statement is used to return only distinct (different) values from a column.\n\nExpected Output:\nCountry\n-------\nArgentina\nAustria\nBelgium\nBrazil\nCanada',
      syntax: ['SELECT DISTINCT column1, column2 FROM table_name;']
    };
  }
  if (/select top|limit/.test(t)) {
    return {
      title: 'SQL SELECT TOP / LIMIT',
      language: 'sql',
      code: 'SELECT TOP 3 * FROM Customers\nWHERE Country = \'Germany\';',
      explanation: 'The SELECT TOP clause is used to specify the number of records to return from the result set.\n\nExpected Output:\nCustomerID | CustomerName        | City    | Country\n1          | Alfreds Futterkiste | Berlin  | Germany\n6          | Blauer See Delikatessen | Mannheim | Germany\n17         | Drachenblut Delikatessen | Aachen | Germany',
      syntax: ['SELECT TOP number | percent column_name(s) FROM table_name;']
    };
  }
  if (/where/.test(t)) {
    return {
      title: 'SQL WHERE Clause Filter',
      language: 'sql',
      code: 'SELECT * FROM Customers\nWHERE Country = \'Mexico\';',
      explanation: 'The WHERE clause is used to filter records that fulfill a specified condition.\n\nExpected Output:\nCustomerID | CustomerName                 | City        | Country\n2          | Ana Trujillo Emparedados y helados | México D.F. | Mexico\n3          | Antonio Moreno Taquería      | México D.F. | Mexico',
      syntax: ['SELECT column1, column2 FROM table_name WHERE condition;']
    };
  }
  if (/order by/.test(t)) {
    return {
      title: 'SQL ORDER BY Sorting',
      language: 'sql',
      code: 'SELECT ProductName, Price FROM Products\nORDER BY Price DESC;',
      explanation: 'The ORDER BY keyword is used to sort the result-set in ascending (ASC) or descending (DESC) order.\n\nExpected Output:\nProductName             | Price\n------------------------+------\nCôte de Blaye           | 263.50\nThüringer Rostbratwurst | 123.79\nMishi Kobe Niku         | 97.00',
      syntax: ['SELECT column1, column2 FROM table_name ORDER BY column1 [ASC|DESC];']
    };
  }
  if (/and|or|not/.test(t)) {
    return {
      title: 'SQL AND, OR, NOT Logical Operators',
      language: 'sql',
      code: 'SELECT * FROM Customers\nWHERE Country = \'Germany\' AND (City = \'Berlin\' OR City = \'Stuttgart\');',
      explanation: 'The WHERE clause can be combined with AND, OR, and NOT operators to filter records on multiple criteria.\n\nExpected Output:\nCustomerID | CustomerName        | City      | Country\n1          | Alfreds Futterkiste | Berlin    | Germany\n25         | Frankenversand      | Stuttgart | Germany',
      syntax: ['WHERE condition1 AND (condition2 OR condition3);']
    };
  }
  if (/insert into|insert/.test(t)) {
    return {
      title: 'SQL INSERT INTO Statement',
      language: 'sql',
      code: 'INSERT INTO Customers (CustomerName, ContactName, Address, City, PostalCode, Country)\nVALUES (\'Cardinal\', \'Tom B. Erichsen\', \'Skagen 21\', \'Stavanger\', \'4006\', \'Norway\');',
      explanation: 'The INSERT INTO statement is used to insert new records in a table.\n\nExpected Output:\nQuery OK, 1 row affected (0.01 sec)',
      syntax: ['INSERT INTO table_name (column1, column2) VALUES (value1, value2);']
    };
  }
  if (/null/.test(t)) {
    return {
      title: 'SQL IS NULL / IS NOT NULL',
      language: 'sql',
      code: 'SELECT CustomerName, ContactName, Address\nFROM Customers\nWHERE Address IS NULL;',
      explanation: 'A field with a NULL value is a field with no value. Use IS NULL and IS NOT NULL to test for empty fields.\n\nExpected Output:\n(0 rows returned if all customers have addresses)',
      syntax: ['SELECT columns FROM table_name WHERE column_name IS NULL;']
    };
  }
  if (/update/.test(t)) {
    return {
      title: 'SQL UPDATE Statement',
      language: 'sql',
      code: 'UPDATE Customers\nSET ContactName = \'Alfred Schmidt\', City = \'Frankfurt\'\nWHERE CustomerID = 1;',
      explanation: 'The UPDATE statement is used to modify the existing records in a table. Note the WHERE clause!\n\nExpected Output:\nQuery OK, 1 row affected (0.01 sec)',
      syntax: ['UPDATE table_name SET column1 = value1, column2 = value2 WHERE condition;']
    };
  }
  if (/delete/.test(t)) {
    return {
      title: 'SQL DELETE Statement',
      language: 'sql',
      code: 'DELETE FROM Customers\nWHERE CustomerName = \'Alfreds Futterkiste\';',
      explanation: 'The DELETE statement is used to delete existing records in a table.\n\nExpected Output:\nQuery OK, 1 row affected (0.01 sec)',
      syntax: ['DELETE FROM table_name WHERE condition;']
    };
  }
  if (/min|max/.test(t)) {
    return {
      title: 'SQL MIN() and MAX() Functions',
      language: 'sql',
      code: 'SELECT MIN(Price) AS SmallestPrice, MAX(Price) AS LargestPrice\nFROM Products;',
      explanation: 'MIN() returns the smallest value of the selected column. MAX() returns the largest value.\n\nExpected Output:\nSmallestPrice | LargestPrice\n--------------+-------------\n2.50          | 263.50',
      syntax: ['SELECT MIN(column_name) FROM table_name;', 'SELECT MAX(column_name) FROM table_name;']
    };
  }
  if (/count|avg|sum/.test(t)) {
    return {
      title: 'SQL COUNT(), AVG(), and SUM() Functions',
      language: 'sql',
      code: 'SELECT COUNT(ProductID) AS TotalProducts,\n       AVG(Price) AS AveragePrice,\n       SUM(Price) AS TotalPriceSum\nFROM Products;',
      explanation: 'The COUNT() function returns the number of rows. The AVG() function returns the average value. The SUM() function returns the total sum.\n\nExpected Output:\nTotalProducts | AveragePrice | TotalPriceSum\n--------------+--------------+--------------\n77            | 28.8663      | 2222.71',
      syntax: ['SELECT COUNT(column) FROM table;', 'SELECT AVG(column) FROM table;', 'SELECT SUM(column) FROM table;']
    };
  }
  if (/like|wildcard/.test(t)) {
    return {
      title: 'SQL LIKE Operator & Wildcards',
      language: 'sql',
      code: 'SELECT * FROM Customers\nWHERE CustomerName LIKE \'a%\';',
      explanation: 'The LIKE operator is used in a WHERE clause to search for a specified pattern in a column (% represents zero or more characters).\n\nExpected Output:\nCustomerID | CustomerName        | City   | Country\n1          | Alfreds Futterkiste | Berlin | Germany\n2          | Ana Trujillo...     | Mexico | Mexico',
      syntax: ['SELECT * FROM table WHERE column LIKE pattern;']
    };
  }
  if (/in/.test(t)) {
    return {
      title: 'SQL IN Operator',
      language: 'sql',
      code: 'SELECT * FROM Customers\nWHERE Country IN (\'Germany\', \'France\', \'UK\');',
      explanation: 'The IN operator allows you to specify multiple values in a WHERE clause (a shorthand for multiple OR conditions).\n\nExpected Output:\nCustomerID | CustomerName        | City   | Country\n1          | Alfreds Futterkiste | Berlin | Germany\n4          | Around the Horn     | London | UK',
      syntax: ['SELECT column(s) FROM table WHERE column IN (val1, val2, ...);']
    };
  }
  if (/between/.test(t)) {
    return {
      title: 'SQL BETWEEN Operator',
      language: 'sql',
      code: 'SELECT * FROM Products\nWHERE Price BETWEEN 10 AND 20;',
      explanation: 'The BETWEEN operator selects values within a given range. The values can be numbers, text, or dates (inclusive).\n\nExpected Output:\nProductID | ProductName   | Price\n----------+---------------+------\n1         | Chai          | 18.00\n2         | Chang         | 19.00\n3         | Aniseed Syrup | 10.00',
      syntax: ['SELECT column(s) FROM table WHERE column BETWEEN val1 AND val2;']
    };
  }
  if (/alias/.test(t)) {
    return {
      title: 'SQL Aliases (AS Keyword)',
      language: 'sql',
      code: 'SELECT CustomerID AS ID, CustomerName AS Customer\nFROM Customers;',
      explanation: 'SQL aliases are used to give a table, or a column in a table, a temporary name to make column names more readable.\n\nExpected Output:\nID | Customer\n---+--------------------\n1  | Alfreds Futterkiste\n2  | Ana Trujillo...',
      syntax: ['SELECT column_name AS alias_name FROM table_name;']
    };
  }
  if (/inner join|join/.test(t)) {
    return {
      title: 'SQL INNER JOIN',
      language: 'sql',
      code: 'SELECT Orders.OrderID, Customers.CustomerName, Orders.OrderDate\nFROM Orders\nINNER JOIN Customers ON Orders.CustomerID = Customers.CustomerID;',
      explanation: 'The INNER JOIN keyword selects records that have matching values in both tables.\n\nExpected Output:\nOrderID | CustomerName   | OrderDate\n--------+----------------+----------\n10248   | Vins et alcools| 1996-07-04\n10249   | Toms Spezial   | 1996-07-05',
      syntax: ['SELECT columns FROM table1 INNER JOIN table2 ON table1.col = table2.col;']
    };
  }
  if (/group by/.test(t)) {
    return {
      title: 'SQL GROUP BY Statement',
      language: 'sql',
      code: 'SELECT COUNT(CustomerID) AS NumberOfCustomers, Country\nFROM Customers\nGROUP BY Country\nORDER BY COUNT(CustomerID) DESC;',
      explanation: 'The GROUP BY statement groups rows that have the same values into summary rows, typically used with aggregate functions.\n\nExpected Output:\nNumberOfCustomers | Country\n------------------+--------\n13                | USA\n11                | Germany\n11                | France',
      syntax: ['SELECT COUNT(col), col FROM table GROUP BY col;']
    };
  }
  if (/having/.test(t)) {
    return {
      title: 'SQL HAVING Clause',
      language: 'sql',
      code: 'SELECT COUNT(CustomerID) AS CustomerCount, Country\nFROM Customers\nGROUP BY Country\nHAVING COUNT(CustomerID) > 5\nORDER BY COUNT(CustomerID) DESC;',
      explanation: 'The HAVING clause was added to SQL because the WHERE keyword cannot be used with aggregate functions.\n\nExpected Output:\nCustomerCount | Country\n--------------+--------\n13            | USA\n11            | Germany\n11            | France',
      syntax: ['SELECT column, COUNT(*) FROM table GROUP BY column HAVING condition;']
    };
  }
  if (/exists/.test(t)) {
    return {
      title: 'SQL EXISTS Operator',
      language: 'sql',
      code: 'SELECT SupplierName\nFROM Suppliers\nWHERE EXISTS (\n    SELECT ProductName FROM Products\n    WHERE Products.SupplierID = Suppliers.supplierID AND Price < 20\n);',
      explanation: 'The EXISTS operator is used to test for the existence of any record in a subquery (returns TRUE if records exist).\n\nExpected Output:\nSupplierName\n------------------------\nExotic Liquids\nNew Orleans Cajun Delights',
      syntax: ['SELECT columns FROM table WHERE EXISTS (subquery);']
    };
  }
  if (/case/.test(t)) {
    return {
      title: 'SQL CASE Statement',
      language: 'sql',
      code: 'SELECT OrderID, Quantity,\nCASE\n    WHEN Quantity > 30 THEN \'The quantity is greater than 30\'\n    WHEN Quantity = 30 THEN \'The quantity is 30\'\n    ELSE \'The quantity is under 30\'\nEND AS QuantityText\nFROM OrderDetails;',
      explanation: 'The CASE statement goes through conditions and returns a value when the first condition is met (like an IF-THEN-ELSE statement).\n\nExpected Output:\nOrderID | Quantity | QuantityText\n--------+----------+-----------------------------\n10248   | 12       | The quantity is under 30\n10248   | 40       | The quantity is greater than 30',
      syntax: ['CASE WHEN condition THEN result ELSE fallback END']
    };
  }
  if (/create table/.test(t)) {
    return {
      title: 'SQL CREATE TABLE Statement',
      language: 'sql',
      code: 'CREATE TABLE Persons (\n    PersonID int NOT NULL PRIMARY KEY,\n    LastName varchar(255) NOT NULL,\n    FirstName varchar(255),\n    Address varchar(255),\n    City varchar(255)\n);',
      explanation: 'The CREATE TABLE statement is used to create a new table in a database with specified column names and datatypes.\n\nExpected Output:\nQuery OK, 0 rows affected (0.02 sec)',
      syntax: ['CREATE TABLE table_name (column1 datatype, column2 datatype, ...);']
    };
  }
  if (/drop table|truncate/.test(t)) {
    return {
      title: 'SQL DROP TABLE and TRUNCATE',
      language: 'sql',
      code: '-- Delete the table definition and all records:\nDROP TABLE Shippers;\n\n-- Or delete all records without deleting the table structure:\nTRUNCATE TABLE Categories;',
      explanation: 'DROP TABLE removes the entire table from the database. TRUNCATE TABLE deletes data inside a table but keeps the structure.\n\nExpected Output:\nQuery OK, 0 rows affected (0.01 sec)',
      syntax: ['DROP TABLE table_name;', 'TRUNCATE TABLE table_name;']
    };
  }
  if (/alter table/.test(t)) {
    return {
      title: 'SQL ALTER TABLE Statement',
      language: 'sql',
      code: 'ALTER TABLE Customers\nADD Email varchar(255);',
      explanation: 'The ALTER TABLE statement is used to add, delete, or modify columns in an existing table.\n\nExpected Output:\nQuery OK, 0 rows affected (0.02 sec)',
      syntax: ['ALTER TABLE table_name ADD column_name datatype;']
    };
  }
  if (/constraint|primary key|foreign key|unique|check/.test(t)) {
    return {
      title: 'SQL Constraints (PRIMARY KEY, FOREIGN KEY)',
      language: 'sql',
      code: 'CREATE TABLE Orders (\n    OrderID int NOT NULL PRIMARY KEY,\n    OrderNumber int NOT NULL UNIQUE,\n    PersonID int FOREIGN KEY REFERENCES Persons(PersonID)\n);',
      explanation: 'SQL constraints specify rules for the data in a table to ensure accuracy and reliability.\n\nExpected Output:\nQuery OK, 0 rows affected (0.02 sec)',
      syntax: ['column_name datatype CONSTRAINT_TYPE']
    };
  }

  return {
    title: 'SQL SELECT Statement',
    language: 'sql',
    code: 'SELECT CustomerName, City, Country\nFROM Customers\nWHERE Country = \'Germany\';',
    explanation: 'The SELECT statement is used to select data from a database. The data returned is stored in a result table.\n\nExpected Output:\nCustomerName        | City      | Country\n--------------------+-----------+--------\nAlfreds Futterkiste | Berlin    | Germany\nFrankenversand      | Stuttgart | Germany',
    syntax: ['SELECT column1, column2 FROM table_name WHERE condition;']
  };
}

function getJavaScriptExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/home|intro|where to|output/.test(t)) {
    return {
      title: 'JavaScript DOM Output',
      language: 'javascript',
      code: 'document.getElementById("demo").innerHTML = "Hello JavaScript";',
      explanation: 'One of many JavaScript HTML methods. This example uses getElementById() to find an HTML element and change its inner HTML.\n\nExpected Output:\nElement with id="demo" content updated to "Hello JavaScript"',
      syntax: ['document.getElementById(id).innerHTML = content;']
    };
  }
  if (/syntax|statement|comment/.test(t)) {
    return {
      title: 'JavaScript Statements & Variables',
      language: 'javascript',
      code: 'let x, y, z;\nx = 5;\ny = 6;\nz = x + y;\nconsole.log("Result:", z);',
      explanation: 'JavaScript programs are executed line by line. Statements are separated by semicolons.\n\nExpected Output:\nResult: 11',
      syntax: ['let variable = value;', 'console.log(value);']
    };
  }
  if (/let|const|variable/.test(t)) {
    return {
      title: 'JavaScript let and const',
      language: 'javascript',
      code: 'let x = "John Doe";\nconst PI = 3.141592653589793;\nconsole.log(x);\nconsole.log("PI:", PI);',
      explanation: 'Variables declared with let have block scope and can be reassigned. Variables declared with const cannot be reassigned.\n\nExpected Output:\nJohn Doe\nPI: 3.141592653589793',
      syntax: ['let name = value;', 'const NAME = value;']
    };
  }
  if (/operator|arithmetic|assignment/.test(t)) {
    return {
      title: 'JavaScript Arithmetic Operators',
      language: 'javascript',
      code: 'let a = 3;\nlet x = (100 + 50) * a;\nconsole.log("x =", x);',
      explanation: 'Arithmetic operators perform arithmetic on numbers (literals or variables).\n\nExpected Output:\nx = 450',
      syntax: ['x = a + b;', 'x = a * b;']
    };
  }
  if (/data type|typeof/.test(t)) {
    return {
      title: 'JavaScript Data Types & typeof',
      language: 'javascript',
      code: 'let length = 16;\nlet lastName = "Johnson";\nlet isStudent = true;\nlet person = {firstName: "John", lastName: "Doe"};\n\nconsole.log(typeof length);\nconsole.log(typeof lastName);\nconsole.log(typeof isStudent);\nconsole.log(typeof person);',
      explanation: 'JavaScript variables can hold different data types: numbers, strings, booleans, objects and more.\n\nExpected Output:\nnumber\nstring\nboolean\nobject',
      syntax: ['typeof operand']
    };
  }
  if (/arrow function/.test(t)) {
    return {
      title: 'JavaScript Arrow Functions',
      language: 'javascript',
      code: 'const hello = (val) => "Hello " + val;\nconsole.log(hello("Universe"));\n\nconst add = (a, b) => a + b;\nconsole.log("Sum:", add(5, 7));',
      explanation: 'Arrow functions allow a shorter syntax for writing function expressions, without binding their own this.\n\nExpected Output:\nHello Universe\nSum: 12',
      syntax: ['const fn = (param1, param2) => expression;']
    };
  }
  if (/function/.test(t)) {
    return {
      title: 'JavaScript Functions',
      language: 'javascript',
      code: 'function myFunction(p1, p2) {\n  return p1 * p2;\n}\n\nlet result = myFunction(4, 3);\nconsole.log("Product:", result);',
      explanation: 'A JavaScript function is a block of code designed to perform a particular task. It is executed when "invoked".\n\nExpected Output:\nProduct: 12',
      syntax: ['function name(param1, param2) { return result; }']
    };
  }
  if (/object/.test(t)) {
    return {
      title: 'JavaScript Objects & Methods',
      language: 'javascript',
      code: 'const person = {\n  firstName: "John",\n  lastName: "Doe",\n  age: 50,\n  fullName: function() {\n    return this.firstName + " " + this.lastName;\n  }\n};\nconsole.log(person.fullName());\nconsole.log("Age:", person.age);',
      explanation: 'Objects are variables that can contain many values, represented as name:value pairs.\n\nExpected Output:\nJohn Doe\nAge: 50',
      syntax: ['const obj = { key: value, method() { ... } };']
    };
  }
  if (/string/.test(t)) {
    return {
      title: 'JavaScript String Methods',
      language: 'javascript',
      code: 'let text = "Apple, Banana, Kiwi";\nlet part = text.slice(7, 13);\nconsole.log("Slice:", part);\nconsole.log("Upper:", text.toUpperCase());\nconsole.log("Length:", text.length);',
      explanation: 'Basic string methods: slice() extracts a part of a string, toUpperCase() converts text to uppercase, length counts characters.\n\nExpected Output:\nSlice: Banana\nUpper: APPLE, BANANA, KIWI\nLength: 19',
      syntax: ['str.slice(start, end)', 'str.toUpperCase()', 'str.length']
    };
  }
  if (/template/.test(t)) {
    return {
      title: 'JavaScript Template Literals',
      language: 'javascript',
      code: 'let firstName = "John";\nlet lastName = "Doe";\nlet price = 10;\nlet tax = 0.25;\n\nconsole.log(`Welcome ${firstName}, ${lastName}!`);\nconsole.log(`Total: ${(price * (1 + tax)).toFixed(2)}`);',
      explanation: 'Template literals use backticks (`) instead of quotes to define a string and allow interpolation with ${...}.\n\nExpected Output:\nWelcome John, Doe!\nTotal: 12.50',
      syntax: ['`Text with ${variable}`']
    };
  }
  if (/if|else|switch|conditional/.test(t)) {
    return {
      title: 'JavaScript Conditional Statements',
      language: 'javascript',
      code: 'let hour = 14;\nif (hour < 12) {\n  console.log("Good morning");\n} else if (hour < 18) {\n  console.log("Good afternoon");\n} else {\n  console.log("Good evening");\n}',
      explanation: 'Conditional statements are used to perform different actions based on different conditions.\n\nExpected Output:\nGood afternoon',
      syntax: ['if (condition) { ... } else if (condition) { ... } else { ... }']
    };
  }
  if (/for loop|while|loop/.test(t)) {
    return {
      title: 'JavaScript Loops',
      language: 'javascript',
      code: 'const cars = ["BMW", "Volvo", "Saab", "Ford"];\nfor (let i = 0; i < cars.length; i++) {\n  console.log("Car " + i + ": " + cars[i]);\n}',
      explanation: 'Loops can execute a block of code a number of times, which is handy if you want to run the same code over and over.\n\nExpected Output:\nCar 0: BMW\nCar 1: Volvo\nCar 2: Saab\nCar 3: Ford',
      syntax: ['for (let i = 0; i < n; i++) { ... }']
    };
  }
  if (/array method|map|filter|reduce/.test(t)) {
    return {
      title: 'JavaScript Array Iteration (filter and map)',
      language: 'javascript',
      code: 'const numbers = [45, 4, 9, 16, 25];\nconst over18 = numbers.filter(value => value > 18);\nconst doubled = numbers.map(value => value * 2);\n\nconsole.log("Over 18:", over18);\nconsole.log("Doubled:", doubled);',
      explanation: 'Array iteration methods operate on every array item. filter() creates a new array with elements that pass a test.\n\nExpected Output:\nOver 18: [45, 25]\nDoubled: [90, 8, 18, 32, 50]',
      syntax: ['arr.filter(item => condition)', 'arr.map(item => transform)']
    };
  }
  if (/array/.test(t)) {
    return {
      title: 'JavaScript Arrays',
      language: 'javascript',
      code: 'const cars = ["Saab", "Volvo", "BMW"];\ncars.push("Audi");\nconsole.log("First:", cars[0]);\nconsole.log("Total:", cars.length);\nconsole.log("All cars:", cars);',
      explanation: 'An array is a special variable, which can hold more than one value. Arrays use numbered indexes.\n\nExpected Output:\nFirst: Saab\nTotal: 4\nAll cars: [\'Saab\', \'Volvo\', \'BMW\', \'Audi\']',
      syntax: ['const arr = [item1, item2];', 'arr.push(new_item);']
    };
  }
  if (/promise|async|await/.test(t)) {
    return {
      title: 'JavaScript Async / Await and Promises',
      language: 'javascript',
      code: 'function fetchMockUser() {\n  return new Promise((resolve) => {\n    setTimeout(() => resolve({ id: 1, name: "Leanne Graham" }), 200);\n  });\n}\n\nasync function main() {\n  console.log("Fetching user...");\n  const user = await fetchMockUser();\n  console.log("Loaded user:", user.name);\n}\n\nmain();',
      explanation: '"async and await make promises easier to write". async makes a function return a Promise, await makes a function wait for a Promise.\n\nExpected Output:\nFetching user...\nLoaded user: Leanne Graham',
      syntax: ['async function name() { const result = await promise; }']
    };
  }
  if (/class/.test(t)) {
    return {
      title: 'JavaScript Classes',
      language: 'javascript',
      code: 'class Car {\n  constructor(name, year) {\n    this.name = name;\n    this.year = year;\n  }\n  age() {\n    return 2026 - this.year;\n  }\n}\n\nconst myCar = new Car("Ford", 2014);\nconsole.log(myCar.name + " is " + myCar.age() + " years old.");',
      explanation: 'JavaScript Classes are templates for JavaScript Objects. Use the keyword class to create a class.\n\nExpected Output:\nFord is 12 years old.',
      syntax: ['class ClassName { constructor(...) { ... } method() { ... } }']
    };
  }
  if (/json/.test(t)) {
    return {
      title: 'JavaScript JSON Parse & Stringify',
      language: 'javascript',
      code: 'const text = \'{"name":"John", "age":30, "city":"New York"}\';\nconst obj = JSON.parse(text);\nconsole.log("Parsed name:", obj.name);\n\nconst jsonString = JSON.stringify(obj);\nconsole.log("Serialized JSON:", jsonString);',
      explanation: 'JSON is a format for storing and transporting data. JSON.parse() converts JSON text into a JavaScript object.\n\nExpected Output:\nParsed name: John\nSerialized JSON: {"name":"John","age":30,"city":"New York"}',
      syntax: ['JSON.parse(string)', 'JSON.stringify(object)']
    };
  }
  if (/dom|select|element/.test(t)) {
    return {
      title: 'JavaScript HTML DOM Selection',
      language: 'javascript',
      code: 'const heading = document.querySelector("h1");\nif (heading) {\n  heading.style.color = "blue";\n  heading.textContent = "Updated via DOM API";\n}\nconsole.log("DOM manipulation applied");',
      explanation: 'With the HTML DOM, JavaScript can access and change all the elements of an HTML document.\n\nExpected Output:\nDOM manipulation applied',
      syntax: ['document.querySelector(selector)', 'element.textContent = text']
    };
  }
  if (/event/.test(t)) {
    return {
      title: 'JavaScript Event Listeners',
      language: 'javascript',
      code: 'const button = document.getElementById("myBtn");\nif (button) {\n  button.addEventListener("click", function() {\n    alert("Hello World!");\n  });\n}\nconsole.log("Event listener attached successfully");',
      explanation: 'The addEventListener() method attaches an event handler to the specified element without overwriting existing event handlers.\n\nExpected Output:\nEvent listener attached successfully',
      syntax: ['element.addEventListener(event, function);']
    };
  }

  return {
    title: 'JavaScript Code Example',
    language: 'javascript',
    code: 'const message = "JavaScript is running";\nconsole.log(message);',
    explanation: 'Demonstrates declaration and execution of standard JavaScript.\n\nExpected Output:\nJavaScript is running',
    syntax: ['console.log(value);']
  };
}

function getHtmlExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/table/.test(t)) {
    return {
      title: 'HTML Table Structure',
      language: 'html',
      code: '<table>\n  <tr>\n    <th>Company</th>\n    <th>Contact</th>\n    <th>Country</th>\n  </tr>\n  <tr>\n    <td>Alfreds Futterkiste</td>\n    <td>Maria Anders</td>\n    <td>Germany</td>\n  </tr>\n  <tr>\n    <td>Centro comercial Moctezuma</td>\n    <td>Francisco Chang</td>\n    <td>Mexico</td>\n  </tr>\n</table>',
      explanation: 'An HTML table is defined with the <table> tag. Each table row is defined with a <tr> tag. A table header is defined with a <th> tag.\n\nExpected Output:\n[Rendered Table with 2 data rows and 3 columns]',
      syntax: ['<table><tr><th>Header</th></tr><tr><td>Data</td></tr></table>']
    };
  }
  if (/form|input/.test(t)) {
    return {
      title: 'HTML Form and Inputs',
      language: 'html',
      code: '<form action="/action_page.php">\n  <label for="fname">First name:</label><br>\n  <input type="text" id="fname" name="fname" value="John"><br>\n  <label for="lname">Last name:</label><br>\n  <input type="text" id="lname" name="lname" value="Doe"><br><br>\n  <input type="submit" value="Submit">\n</form>',
      explanation: 'An HTML form is used to collect user input. The user input is most often sent to a server for processing.\n\nExpected Output:\n[Rendered Form with First Name, Last Name, and Submit button]',
      syntax: ['<form action="url"><input type="text" /></form>']
    };
  }
  if (/list/.test(t)) {
    return {
      title: 'HTML Unordered and Ordered Lists',
      language: 'html',
      code: '<h2>Unordered List</h2>\n<ul>\n  <li>Coffee</li>\n  <li>Tea</li>\n  <li>Milk</li>\n</ul>\n\n<h2>Ordered List</h2>\n<ol>\n  <li>First item</li>\n  <li>Second item</li>\n</ol>',
      explanation: 'HTML lists allow web developers to group a set of related items in lists (unordered <ul> or ordered <ol>).\n\nExpected Output:\n[Bullet list of beverages followed by numbered list]',
      syntax: ['<ul><li>Item</li></ul>', '<ol><li>Item</li></ol>']
    };
  }
  if (/link/.test(t)) {
    return {
      title: 'HTML Hyperlinks',
      language: 'html',
      code: '<a href="https://www.w3schools.com/" target="_blank">Visit W3Schools.com!</a>',
      explanation: 'HTML links are hyperlinks. You can click on a link and jump to another document using the <a> tag.\n\nExpected Output:\n[Clickable link text navigating to W3Schools.com]',
      syntax: ['<a href="url">link text</a>']
    };
  }
  if (/image/.test(t)) {
    return {
      title: 'HTML Images',
      language: 'html',
      code: '<img src="img_girl.jpg" alt="Girl in a jacket" width="500" height="600">',
      explanation: 'The HTML <img> tag is used to embed an image in an HTML page with src and alt attributes.\n\nExpected Output:\n[Rendered image with alt fallback text]',
      syntax: ['<img src="url" alt="description" width="w" height="h">']
    };
  }
  if (/heading/.test(t)) {
    return {
      title: 'HTML Headings',
      language: 'html',
      code: '<h1>Heading 1</h1>\n<h2>Heading 2</h2>\n<h3>Heading 3</h3>\n<h4>Heading 4</h4>\n<h5>Heading 5</h5>\n<h6>Heading 6</h6>',
      explanation: 'HTML headings are titles or subtitles that you want to display on a webpage, defined from <h1> to <h6>.\n\nExpected Output:\n[Headings rendered in decreasing sizes from 1 to 6]',
      syntax: ['<h1>Heading</h1>', '<h2>Subheading</h2>']
    };
  }

  return {
    title: 'HTML Document Structure',
    language: 'html',
    code: '<!DOCTYPE html>\n<html>\n<head>\n  <title>W3Schools Tutorial</title>\n</head>\n<body>\n  <h1>My First Heading</h1>\n  <p>My first paragraph in HTML.</p>\n</body>\n</html>',
    explanation: 'All HTML documents must start with a document type declaration: <!DOCTYPE html>. The visible part is between <body> and </body>.\n\nExpected Output:\n[HTML page with H1 heading and paragraph]',
    syntax: ['<!DOCTYPE html>', '<html><head></head><body></body></html>']
  };
}

function getCssExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/flexbox|flex/.test(t)) {
    return {
      title: 'CSS Flexbox Container & Items',
      language: 'css',
      code: '.flex-container {\n  display: flex;\n  justify-content: space-around;\n  align-items: center;\n  background-color: DodgerBlue;\n  padding: 10px;\n}\n\n.flex-container > div {\n  background-color: #f1f1f1;\n  margin: 10px;\n  padding: 20px;\n  font-size: 24px;\n}',
      explanation: 'The Flexible Box Layout Module makes it easier to design flexible responsive layout structure without float or positioning.\n\nExpected Output:\n[Horizontal row of flexible evenly spaced boxes]',
      syntax: ['display: flex;', 'justify-content: center;', 'align-items: center;']
    };
  }
  if (/grid/.test(t)) {
    return {
      title: 'CSS Grid Container',
      language: 'css',
      code: '.grid-container {\n  display: grid;\n  grid-template-columns: auto auto auto;\n  gap: 10px;\n  background-color: #2196F3;\n  padding: 10px;\n}\n\n.grid-item {\n  background-color: rgba(255, 255, 255, 0.8);\n  border: 1px solid rgba(0, 0, 0, 0.8);\n  padding: 20px;\n  font-size: 20px;\n  text-align: center;\n}',
      explanation: 'The CSS Grid Layout Module offers a grid-based layout system, with rows and columns, making it easier to design web pages.\n\nExpected Output:\n[3-column responsive grid layout with gaps]',
      syntax: ['display: grid;', 'grid-template-columns: repeat(3, 1fr);', 'gap: 10px;']
    };
  }
  if (/responsive|media quer/.test(t)) {
    return {
      title: 'CSS Media Queries',
      language: 'css',
      code: 'body {\n  background-color: lightgreen;\n}\n\n@media only screen and (max-width: 600px) {\n  body {\n    background-color: lightblue;\n  }\n  .column {\n    width: 100%;\n  }\n}',
      explanation: 'Media queries allow you to apply CSS styles depending on device general type (such as print vs. screen) or characteristics (such as screen resolution or browser viewport width).\n\nExpected Output:\n[Light green background on desktop, turns light blue on screens <= 600px]',
      syntax: ['@media only screen and (max-width: 600px) { ... }']
    };
  }
  if (/box model|margin|padding|border/.test(t)) {
    return {
      title: 'CSS Box Model',
      language: 'css',
      code: 'div {\n  width: 300px;\n  padding: 25px;\n  border: 5px solid navy;\n  margin: 25px;\n  box-sizing: border-box;\n}',
      explanation: 'All HTML elements can be considered as boxes. In CSS, the term "box model" is used when talking about design and layout: Content, Padding, Border, Margin.\n\nExpected Output:\n[300px width element with inner padding, solid border, and outer margin]',
      syntax: ['margin: 20px;', 'padding: 15px;', 'border: 1px solid #ccc;']
    };
  }
  if (/transition|animation|transform/.test(t)) {
    return {
      title: 'CSS Transitions and Transforms',
      language: 'css',
      code: '.button {\n  background-color: #04AA6D;\n  color: white;\n  padding: 14px 20px;\n  border: none;\n  border-radius: 4px;\n  transition: transform 0.3s ease, background-color 0.3s;\n}\n\n.button:hover {\n  background-color: #059862;\n  transform: translateY(-2px);\n}',
      explanation: 'CSS transitions allow you to change property values smoothly, over a given duration.\n\nExpected Output:\n[Button smoothly lifts up 2px and darkens when hovered]',
      syntax: ['transition: property duration timing-function;', 'transform: scale(1.1);']
    };
  }

  return {
    title: 'CSS Syntax and Selectors',
    language: 'css',
    code: 'body {\n  background-color: lightblue;\n}\n\nh1 {\n  color: white;\n  text-align: center;\n}\n\np {\n  font-family: verdana;\n  font-size: 20px;\n}',
    explanation: 'A CSS rule consists of a selector and a declaration block. The selector points to the HTML element you want to style.\n\nExpected Output:\n[Light blue background, centered white H1, and 20px Verdana paragraphs]',
    syntax: ['selector { property: value; }']
  };
}

function getJavaExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/home|syntax|output/.test(t)) {
    return {
      title: 'Java Output & Syntax',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World");\n  }\n}',
      explanation: 'Every line of code that runs in Java must be inside a class. The main() method is required and you will see it in every Java program.\n\nExpected Output:\nHello World',
      syntax: ['public class Main { public static void main(String[] args) { System.out.println(...); } }']
    };
  }
  if (/variable|data type/.test(t)) {
    return {
      title: 'Java Variables & Types',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    String name = "John";\n    int myNum = 15;\n    float myFloatNum = 5.99f;\n    char myLetter = \'D\';\n    boolean myBool = true;\n    System.out.println(name + " is " + myNum + " years old.");\n  }\n}',
      explanation: 'Variables in Java are containers for storing data values. In Java, there are different types of variables (String, int, float, char, boolean).\n\nExpected Output:\nJohn is 15 years old.',
      syntax: ['type variableName = value;']
    };
  }
  if (/type casting|casting/.test(t)) {
    return {
      title: 'Java Type Casting',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    double myDouble = 9.78d;\n    int myInt = (int) myDouble; // Manual casting: double to int\n\n    System.out.println("Double: " + myDouble);\n    System.out.println("Int: " + myInt);\n  }\n}',
      explanation: 'Type casting is when you assign a value of one primitive data type to another type (Widening or Narrowing casting).\n\nExpected Output:\nDouble: 9.78\nInt: 9',
      syntax: ['int myInt = (int) myDouble;']
    };
  }
  if (/string/.test(t)) {
    return {
      title: 'Java Strings & Methods',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    String txt = "Hello World";\n    System.out.println("Length: " + txt.length());\n    System.out.println("Uppercase: " + txt.toUpperCase());\n    System.out.println("Index of W: " + txt.indexOf("W"));\n  }\n}',
      explanation: 'A String in Java is actually an object, which contain methods that can perform certain operations on strings.\n\nExpected Output:\nLength: 11\nUppercase: HELLO WORLD\nIndex of W: 6',
      syntax: ['str.length()', 'str.toUpperCase()', 'str.indexOf(sub)']
    };
  }
  if (/math/.test(t)) {
    return {
      title: 'Java Math Class',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Max: " + Math.max(5, 10));\n    System.out.println("Sqrt: " + Math.sqrt(64));\n    System.out.println("Abs: " + Math.abs(-4.7));\n  }\n}',
      explanation: 'The Java Math class has many methods that allows you to perform mathematical tasks on numbers.\n\nExpected Output:\nMax: 10\nSqrt: 8.0\nAbs: 4.7',
      syntax: ['Math.max(x, y)', 'Math.sqrt(x)', 'Math.abs(x)']
    };
  }
  if (/if|else|switch/.test(t)) {
    return {
      title: 'Java If...Else Conditionals',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    int time = 20;\n    if (time < 18) {\n      System.out.println("Good day.");\n    } else {\n      System.out.println("Good evening.");\n    }\n  }\n}',
      explanation: 'Java conditions and If-Else statements execute different blocks of code depending on logical conditions.\n\nExpected Output:\nGood evening.',
      syntax: ['if (condition) { ... } else { ... }']
    };
  }
  if (/while|for loop|loop/.test(t)) {
    return {
      title: 'Java Loops (For and While)',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    for (int i = 0; i < 5; i++) {\n      System.out.println("Index: " + i);\n    }\n  }\n}',
      explanation: 'Loops can execute a block of code as long as a specified condition is reached.\n\nExpected Output:\nIndex: 0\nIndex: 1\nIndex: 2\nIndex: 3\nIndex: 4',
      syntax: ['for (statement 1; statement 2; statement 3) { ... }']
    };
  }
  if (/array/.test(t)) {
    return {
      title: 'Java Arrays',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    String[] cars = {"Volvo", "BMW", "Ford", "Mazda"};\n    System.out.println("First car: " + cars[0]);\n    System.out.println("Total cars: " + cars.length);\n  }\n}',
      explanation: 'Arrays are used to store multiple values in a single variable, instead of declaring separate variables for each value.\n\nExpected Output:\nFirst car: Volvo\nTotal cars: 4',
      syntax: ['String[] arrayName = {"val1", "val2"};', 'arrayName[index]']
    };
  }
  if (/method/.test(t)) {
    return {
      title: 'Java Methods & Parameters',
      language: 'java',
      code: 'public class Main {\n  static int plusMethod(int x, int y) {\n    return x + y;\n  }\n\n  public static void main(String[] args) {\n    int z = plusMethod(5, 3);\n    System.out.println("5 + 3 = " + z);\n  }\n}',
      explanation: 'A method is a block of code which only runs when it is called. You can pass parameters and return values.\n\nExpected Output:\n5 + 3 = 8',
      syntax: ['static returnType methodName(paramType param) { return val; }']
    };
  }
  if (/constructor/.test(t)) {
    return {
      title: 'Java Class Constructors',
      language: 'java',
      code: 'public class Main {\n  int modelYear;\n  String modelName;\n\n  public Main(int year, String name) {\n    modelYear = year;\n    modelName = name;\n  }\n\n  public static void main(String[] args) {\n    Main myCar = new Main(1969, "Mustang");\n    System.out.println(myCar.modelYear + " " + myCar.modelName);\n  }\n}',
      explanation: 'A constructor in Java is a special method that is used to initialize objects. The constructor is called when an object of a class is created.\n\nExpected Output:\n1969 Mustang',
      syntax: ['public ClassName(params) { ... }']
    };
  }
  if (/class|object|oop/.test(t)) {
    return {
      title: 'Java Classes and Objects',
      language: 'java',
      code: 'public class Main {\n  int x = 5;\n  public static void main(String[] args) {\n    Main myObj = new Main();\n    System.out.println("Object property x: " + myObj.x);\n  }\n}',
      explanation: 'Java is an object-oriented programming language. Everything in Java is associated with classes and objects.\n\nExpected Output:\nObject property x: 5',
      syntax: ['ClassName myObj = new ClassName();']
    };
  }
  if (/inheritance|polymorphism/.test(t)) {
    return {
      title: 'Java Inheritance (extends keyword)',
      language: 'java',
      code: 'class Vehicle {\n  protected String brand = "Ford";\n  public void honk() {\n    System.out.println("Tuut, tuut!");\n  }\n}\n\nclass Car extends Vehicle {\n  private String modelName = "Mustang";\n  public static void main(String[] args) {\n    Car myCar = new Car();\n    myCar.honk();\n    System.out.println(myCar.brand + " " + myCar.modelName);\n  }\n}',
      explanation: 'In Java, it is possible to inherit attributes and methods from one class to another with the extends keyword.\n\nExpected Output:\nTuut, tuut!\nFord Mustang',
      syntax: ['class Subclass extends Superclass { ... }']
    };
  }
  if (/interface|abstract/.test(t)) {
    return {
      title: 'Java Interfaces',
      language: 'java',
      code: 'interface Animal {\n  public void animalSound();\n  public void sleep();\n}\n\nclass Pig implements Animal {\n  public void animalSound() {\n    System.out.println("The pig says: wee wee");\n  }\n  public void sleep() {\n    System.out.println("Zzz");\n  }\n}\n\npublic class Main {\n  public static void main(String[] args) {\n    Pig myPig = new Pig();\n    myPig.animalSound();\n    myPig.sleep();\n  }\n}',
      explanation: 'An interface is a completely "abstract class" that is used to group related methods with empty bodies.\n\nExpected Output:\nThe pig says: wee wee\nZzz',
      syntax: ['interface InterfaceName { ... }', 'class Impl implements InterfaceName { ... }']
    };
  }
  if (/user input|scanner/.test(t)) {
    return {
      title: 'Java Scanner (User Input)',
      language: 'java',
      code: 'import java.util.Scanner;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner myObj = new Scanner(System.in);\n    System.out.println("Enter username");\n\n    String userName = myObj.nextLine();\n    System.out.println("Username is: " + userName);\n  }\n}',
      explanation: 'The Scanner class is used to get user input, and it is found in the java.util package.\n\nExpected Output:\nEnter username\nUsername is: (input text)',
      syntax: ['Scanner scanner = new Scanner(System.in);', 'scanner.nextLine();']
    };
  }
  if (/delete files|delete file/.test(t)) {
    return {
      title: 'Java Delete Files',
      language: 'java',
      code: 'import java.io.File;\n\npublic class Main {\n  public static void main(String[] args) {\n    File myObj = new File("filename.txt");\n    if (myObj.delete()) {\n      System.out.println("Deleted the file: " + myObj.getName());\n    } else {\n      System.out.println("Failed to delete the file.");\n    }\n  }\n}',
      explanation: 'To delete a file in Java, use the delete() method of the File class.\n\nExpected Output:\nDeleted the file: filename.txt',
      syntax: ['file.delete()']
    };
  }
  if (/file|stream|reader|writer/.test(t)) {
    return {
      title: 'Java File Operations',
      language: 'java',
      code: 'import java.io.File;\nimport java.io.FileWriter;\n\npublic class Main {\n  public static void main(String[] args) {\n    try {\n      File myObj = new File("filename.txt");\n      myObj.createNewFile();\n      FileWriter myWriter = new FileWriter("filename.txt");\n      myWriter.write("Java File handling demonstration");\n      myWriter.close();\n      System.out.println("File written successfully: " + myObj.getName());\n    } catch (Exception e) {\n      System.out.println("An error occurred: " + e.getMessage());\n    }\n  }\n}',
      explanation: 'Java handles files using the java.io.File class, along with FileReader and FileWriter streams.\n\nExpected Output:\nFile written successfully: filename.txt',
      syntax: ['File file = new File(path);', 'FileWriter writer = new FileWriter(path);']
    };
  }
  if (/iterator/.test(t)) {
    return {
      title: 'Java Iterator',
      language: 'java',
      code: 'import java.util.ArrayList;\nimport java.util.Iterator;\n\npublic class Main {\n  public static void main(String[] args) {\n    ArrayList<String> cars = new ArrayList<String>();\n    cars.add("Volvo");\n    cars.add("BMW");\n    cars.add("Ford");\n\n    Iterator<String> it = cars.iterator();\n    while (it.hasNext()) {\n      System.out.println(it.next());\n    }\n  }\n}',
      explanation: 'An Iterator is an object that can be used to loop through collections, like ArrayList and HashSet.\n\nExpected Output:\nVolvo\nBMW\nFord',
      syntax: ['Iterator<Type> it = collection.iterator();', 'it.hasNext()', 'it.next()']
    };
  }
  if (/error|exception/.test(t)) {
    return {
      title: 'Java Exceptions (try-catch)',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    try {\n      int[] myNumbers = {1, 2, 3};\n      System.out.println(myNumbers[10]);\n    } catch (Exception e) {\n      System.out.println("Exception handled safely: " + e.getMessage());\n    } finally {\n      System.out.println("The try-catch block is finished.");\n    }\n  }\n}',
      explanation: 'The try statement allows you to define a block of code to be tested for errors while it is being executed.\n\nExpected Output:\nException handled safely: Index 10 out of bounds for length 3\nThe try-catch block is finished.',
      syntax: ['try { ... } catch (Exception e) { ... } finally { ... }']
    };
  }
  if (/collection|hashmap|arraylist/.test(t)) {
    return {
      title: 'Java Collections (ArrayList & HashMap)',
      language: 'java',
      code: 'import java.util.ArrayList;\nimport java.util.HashMap;\n\npublic class Main {\n  public static void main(String[] args) {\n    ArrayList<String> cars = new ArrayList<String>();\n    cars.add("Volvo");\n    cars.add("BMW");\n    System.out.println("Cars list: " + cars);\n\n    HashMap<String, String> cities = new HashMap<String, String>();\n    cities.put("England", "London");\n    cities.put("Germany", "Berlin");\n    System.out.println("Capital of England: " + cities.get("England"));\n  }\n}',
      explanation: 'The Java Collections framework provides architecture to store and manipulate a group of objects.\n\nExpected Output:\nCars list: [Volvo, BMW]\nCapital of England: London',
      syntax: ['ArrayList<Type> list = new ArrayList<>();', 'HashMap<K, V> map = new HashMap<>();']
    };
  }

  return {
    title: 'Java Code Example',
    language: 'java',
    code: 'public class Main {\n  public static void main(String[] args) {\n    int a = 15;\n    int b = 25;\n    System.out.println("Calculated Java sum: " + (a + b));\n  }\n}',
    explanation: 'Basic Java application demonstrating the class structure, computation, and console printing.\n\nExpected Output:\nCalculated Java sum: 40',
    syntax: ['public class Main { public static void main(String[] args) { ... } }']
  };
}

function getCppExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/pointer|reference/.test(t)) {
    return {
      title: 'C++ Pointers and References',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  string food = "Pizza";\n  string &meal = food;    // Reference\n  string* ptr = &food;    // Pointer\n\n  cout << "Value: " << food << "\\n";\n  cout << "Address: " << ptr << "\\n";\n  cout << "Dereferenced: " << *ptr << "\\n";\n  return 0;\n}',
      explanation: 'A pointer is a variable that stores the memory address of another variable as its value. A reference is an alias.\n\nExpected Output:\nValue: Pizza\nAddress: 0x... (hexadecimal memory address)\nDereferenced: Pizza',
      syntax: ['type* ptr = &var;', '*ptr']
    };
  }
  if (/vector|stl|data structure/.test(t)) {
    return {
      title: 'C++ STL Vectors',
      language: 'cpp',
      code: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n  vector<string> cars = {"Volvo", "BMW", "Ford"};\n  cars.push_back("Tesla");\n\n  for (string car : cars) {\n    cout << car << "\\n";\n  }\n  return 0;\n}',
      explanation: 'A vector in C++ is a dynamic array from the Standard Template Library (STL) that resizes automatically.\n\nExpected Output:\nVolvo\nBMW\nFord\nTesla',
      syntax: ['vector<type> vec;', 'vec.push_back(val);']
    };
  }
  if (/class|object|oop/.test(t)) {
    return {
      title: 'C++ Classes and Objects',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nclass MyClass {\n  public:\n    int myNum;\n    string myString;\n};\n\nint main() {\n  MyClass myObj;\n  myObj.myNum = 15;\n  myObj.myString = "Some text";\n\n  cout << myObj.myNum << "\\n";\n  cout << myObj.myString << "\\n";\n  return 0;\n}',
      explanation: 'C++ is an object-oriented programming language. Everything in C++ is associated with classes and objects.\n\nExpected Output:\n15\nSome text',
      syntax: ['class ClassName { public: int prop; };']
    };
  }
  if (/input|cin/.test(t)) {
    return {
      title: 'C++ User Input (cin)',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  int x;\n  cout << "Type a number: ";\n  cin >> x;\n  cout << "Your number is: " << x << endl;\n  return 0;\n}',
      explanation: 'cin is a predefined variable that reads data from the keyboard with the extraction operator (>>).\n\nExpected Output:\nType a number: (input number)\nYour number is: (input number)',
      syntax: ['cin >> variable;']
    };
  }

  return {
    title: 'C++ Output (cout)',
    language: 'cpp',
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello World!" << endl;\n  return 0;\n}',
    explanation: 'cout (see-out) is an object used together with the insertion operator (<<) to output/print text.\n\nExpected Output:\nHello World!',
    syntax: ['#include <iostream>', 'std::cout << "text";']
  };
}

function getCSharpExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/method/.test(t)) {
    return {
      title: 'C# Methods & Parameters',
      language: 'csharp',
      code: 'using System;\n\nnamespace MethodsApp {\n  class Program {\n    static void MyMethod(string fname, int age) {\n      Console.WriteLine(fname + " is " + age);\n    }\n\n    static void Main(string[] args) {\n      MyMethod("Liam", 5);\n      MyMethod("Jenny", 8);\n    }\n  }\n}',
      explanation: 'A method is a block of code which only runs when it is called. You can pass data, known as parameters, into a method.\n\nExpected Output:\nLiam is 5\nJenny is 8',
      syntax: ['static void MethodName(paramType param) { ... }']
    };
  }
  if (/class|oop|object/.test(t)) {
    return {
      title: 'C# Classes and Objects',
      language: 'csharp',
      code: 'using System;\n\nnamespace OOPApp {\n  class Car {\n    string color = "red";\n    int maxSpeed = 200;\n\n    static void Main(string[] args) {\n      Car myObj = new Car();\n      Console.WriteLine(myObj.color);\n      Console.WriteLine("Max speed: " + myObj.maxSpeed);\n    }\n  }\n}',
      explanation: 'C# is an object-oriented language. A Class is like an object constructor, or a "blueprint" for creating objects.\n\nExpected Output:\nred\nMax speed: 200',
      syntax: ['class ClassName { ... }', 'ClassName obj = new ClassName();']
    };
  }
  if (/array/.test(t)) {
    return {
      title: 'C# Arrays',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    string[] cars = {"Volvo", "BMW", "Ford", "Mazda"};\n    Console.WriteLine("First car: " + cars[0]);\n    Console.WriteLine("Total cars: " + cars.Length);\n  }\n}',
      explanation: 'Arrays are used to store multiple values in a single variable, instead of declaring separate variables for each value.\n\nExpected Output:\nFirst car: Volvo\nTotal cars: 4',
      syntax: ['type[] arrayName = {"val1", "val2"};']
    };
  }

  return {
    title: 'C# Console Output',
    language: 'csharp',
    code: 'using System;\n\nnamespace HelloWorld {\n  class Program {\n    static void Main(string[] args) {\n      Console.WriteLine("Hello World!");\n    }\n  }\n}',
    explanation: 'Console.WriteLine() is a method of the Console class used to print/output text to the console.\n\nExpected Output:\nHello World!',
    syntax: ['Console.WriteLine(value);']
  };
}

function getReactExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/usestate|state/.test(t)) {
    return {
      title: 'React useState Hook',
      language: 'tsx',
      code: 'import React, { useState } from "react";\n\nexport default function FavoriteColor() {\n  const [color, setColor] = useState("red");\n\n  return (\n    <div>\n      <h1>My favorite color is {color}!</h1>\n      <button onClick={() => setColor("blue")}>Change to Blue</button>\n    </div>\n  );\n}',
      explanation: 'The React useState Hook allows us to track state in a function component.\n\nExpected Output:\n[Renders heading with "red", clicking button updates heading to "blue"]',
      syntax: ['const [state, setState] = useState(initialValue);']
    };
  }
  if (/useeffect|effect/.test(t)) {
    return {
      title: 'React useEffect Hook',
      language: 'tsx',
      code: 'import React, { useState, useEffect } from "react";\n\nexport default function Timer() {\n  const [count, setCount] = useState(0);\n\n  useEffect(() => {\n    const timer = setTimeout(() => {\n      setCount((c) => c + 1);\n    }, 1000);\n    return () => clearTimeout(timer);\n  }, []);\n\n  return <h1>Rendered count: {count}</h1>;\n}',
      explanation: 'The useEffect Hook allows you to perform side effects in your components (fetching data, setting timers, directly updating the DOM).\n\nExpected Output:\n[Counter ticks up and updates DOM after 1 second]',
      syntax: ['useEffect(() => { /* effect */ return () => /* cleanup */; }, [deps]);']
    };
  }
  if (/props/.test(t)) {
    return {
      title: 'React Props',
      language: 'tsx',
      code: 'import React from "react";\n\nfunction Car(props: { brand: string }) {\n  return <h2>I am a {props.brand}!</h2>;\n}\n\nexport default function Garage() {\n  return (\n    <>\n      <h1>Who lives in my garage?</h1>\n      <Car brand="Ford" />\n    </>\n  );\n}',
      explanation: 'Props are arguments passed into React components. Props are passed to components via HTML attributes.\n\nExpected Output:\n[Renders "Who lives in my garage?" and "I am a Ford!"]',
      syntax: ['<Component propName={value} />']
    };
  }
  if (/jsx/.test(t)) {
    return {
      title: 'React JSX Expressions',
      language: 'tsx',
      code: 'import React from "react";\n\nexport default function MyElement() {\n  const myElement = <h1>React is {5 + 5} times better with JSX</h1>;\n  return myElement;\n}',
      explanation: 'JSX stands for JavaScript XML. JSX allows us to write HTML elements in JavaScript and place them in the DOM without createElement().\n\nExpected Output:\n[Renders "React is 10 times better with JSX"]',
      syntax: ['const element = <h1>{expression}</h1>;']
    };
  }

  return {
    title: 'React Function Component',
    language: 'tsx',
    code: 'import React from "react";\n\nexport default function Welcome(props: { name: string }) {\n  return <h1>Hello, {props.name || "World"}</h1>;\n}',
    explanation: 'Components are like functions that return HTML elements. Components are independent and reusable bits of code.\n\nExpected Output:\n[Renders "Hello, World" heading in React DOM]',
    syntax: ['function Component(props) { return <JSX />; }']
  };
}

function getNodeExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/http/.test(t)) {
    return {
      title: 'Node.js HTTP Server',
      language: 'javascript',
      code: 'const http = require("http");\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { "Content-Type": "text/plain" });\n  res.end("Hello from Node.js HTTP server!");\n});\n\nserver.listen(8080, () => {\n  console.log("Server listening on port 8080");\n});',
      explanation: 'Node.js has a built-in module called HTTP, which allows Node.js to transfer data over the Hyper Text Transfer Protocol (HTTP).\n\nExpected Output:\nServer listening on port 8080',
      syntax: ['http.createServer((req, res) => { ... }).listen(port);']
    };
  }
  if (/file system|fs|path|os|url|events|stream|buffer|crypto/.test(t)) {
    return {
      title: 'Node.js Core Modules',
      language: 'javascript',
      code: 'const fs = require("fs");\nconst path = require("path");\n\nconst filePath = path.join(__dirname, "demo.txt");\nfs.writeFileSync(filePath, "Content created by Node.js fs module");\nconst readBack = fs.readFileSync(filePath, "utf8");\nconsole.log("File content:", readBack);',
      explanation: 'Node.js comes with built-in core modules including fs, path, os, events, and buffer.\n\nExpected Output:\nFile content: Content created by Node.js fs module',
      syntax: ['const fs = require("fs");', 'fs.readFileSync(path, "utf8");']
    };
  }
  if (/express|rest api|middleware|framework/.test(t)) {
    return {
      title: 'Node.js Express REST API',
      language: 'javascript',
      code: 'const express = require("express");\nconst app = express();\n\napp.use(express.json());\n\napp.get("/api/message", (req, res) => {\n  res.json({ message: "Hello from Express API" });\n});\n\napp.listen(3000, () => {\n  console.log("Express API running at http://localhost:3000");\n});',
      explanation: 'Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.\n\nExpected Output:\nExpress API running at http://localhost:3000',
      syntax: ['app.get(route, handler);', 'app.listen(port);']
    };
  }
  if (/mysql/.test(t)) {
    return {
      title: 'Node.js MySQL Query',
      language: 'javascript',
      code: 'const mysql = require("mysql2");\nconst con = mysql.createConnection({ host: "localhost", user: "root", password: "" });\n\ncon.connect((err) => {\n  if (err) throw err;\n  console.log("MySQL connection active");\n  con.query("SELECT 1 + 1 AS solution", (err, rows) => {\n    console.log("Solution:", rows[0].solution);\n  });\n});',
      explanation: 'Node.js can interface with MySQL databases using the mysql2 driver to execute queries.\n\nExpected Output:\nMySQL connection active\nSolution: 2',
      syntax: ['con.query(sqlString, callback);']
    };
  }
  if (/mongodb/.test(t)) {
    return {
      title: 'Node.js MongoDB Connection',
      language: 'javascript',
      code: 'const { MongoClient } = require("mongodb");\nconst url = "mongodb://localhost:27017";\nconst client = new MongoClient(url);\n\nasync function main() {\n  await client.connect();\n  console.log("MongoDB connection active");\n  const db = client.db("mydb");\n  const collections = await db.listCollections().toArray();\n  console.log("Collections count:", collections.length);\n}\nmain();',
      explanation: 'MongoDB driver for Node.js provides asynchronous client connections and collection querying.\n\nExpected Output:\nMongoDB connection active\nCollections count: (number of collections)',
      syntax: ['client.connect()', 'client.db(name)']
    };
  }
  if (/async|promise/.test(t)) {
    return {
      title: 'Node.js Asynchronous Execution',
      language: 'javascript',
      code: 'const util = require("util");\nconst setTimeoutPromise = util.promisify(setTimeout);\n\nasync function executeTask() {\n  console.log("Starting async task...");\n  await setTimeoutPromise(100);\n  console.log("Async task complete.");\n}\nexecuteTask();',
      explanation: 'Node.js asynchronous runtime handles non-blocking operations using event loops and promises.\n\nExpected Output:\nStarting async task...\nAsync task complete.',
      syntax: ['await asyncFunction();']
    };
  }

  return {
    title: 'Node.js Runtime & Process',
    language: 'javascript',
    code: 'const os = require("os");\nconsole.log("Node.js runtime active:", process.version);\nconsole.log("Operating system:", os.type());',
    explanation: 'Demonstrates basic server-side execution and process environment inspection in Node.js.\n\nExpected Output:\nNode.js runtime active: (version)\nOperating system: (OS name)',
    syntax: ['process.version', 'require("os")']
  };
}

function getTypeScriptExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/simple type|explicit|primitive/.test(t)) {
    return {
      title: 'TypeScript Simple & Explicit Types',
      language: 'typescript',
      code: 'let firstName: string = "Dylan";\nlet age: number = 33;\nlet isStudent: boolean = true;\n\nconsole.log(`${firstName} is ${age} years old (Student: ${isStudent})`);',
      explanation: 'TypeScript supports static types. When creating a variable, there are two main ways TypeScript assigns a type: Explicit and Inferred.\n\nExpected Output:\nDylan is 33 years old (Student: true)',
      syntax: ['let varName: type = value;']
    };
  }
  if (/interface/.test(t)) {
    return {
      title: 'TypeScript Interfaces',
      language: 'typescript',
      code: 'interface Rectangle {\n  height: number;\n  width: number;\n}\n\nconst rectangle: Rectangle = {\n  height: 20,\n  width: 10\n};\n\nconst area = rectangle.height * rectangle.width;\nconsole.log("Area:", area);',
      explanation: 'Interfaces are similar to type aliases, except they only apply to object types and can be extended.\n\nExpected Output:\nArea: 200',
      syntax: ['interface Name { prop: type; }']
    };
  }
  if (/generic/.test(t)) {
    return {
      title: 'TypeScript Generics',
      language: 'typescript',
      code: 'function createPair<S, T>(v1: S, v2: T): [S, T] {\n  return [v1, v2];\n}\n\nconst pair = createPair<string, number>("Hello", 42);\nconsole.log("Pair:", pair);',
      explanation: 'Generics allow creating "type variables" which can be used to create code classes, functions & type aliases that don\'t need to be explicitly defined with a single type.\n\nExpected Output:\nPair: [\'Hello\', 42]',
      syntax: ['function fn<T>(arg: T): T { ... }']
    };
  }
  if (/union/.test(t)) {
    return {
      title: 'TypeScript Union Types',
      language: 'typescript',
      code: 'function printStatusCode(code: string | number) {\n  console.log(`My status code is ${code}.`);\n}\n\nprintStatusCode(404);\nprintStatusCode("200 OK");',
      explanation: 'Union types are used when a value can be more than a single type. Using the | (pipe) symbol allows combining types.\n\nExpected Output:\nMy status code is 404.\nMy status code is 200 OK.',
      syntax: ['type UnionType = TypeA | TypeB;']
    };
  }
  if (/javascript projects|migration/.test(t)) {
    return {
      title: 'TypeScript in JavaScript Projects',
      language: 'typescript',
      code: '// @ts-check\n/** @type {number} */\nlet userCount = 42;\nconsole.log("Type-checked count:", userCount);',
      explanation: 'TypeScript can typecheck vanilla JavaScript files using JSDoc annotations and the @ts-check comment.\n\nExpected Output:\nType-checked count: 42',
      syntax: ['// @ts-check', '/** @type {typeName} */']
    };
  }

  return {
    title: 'TypeScript Typed Object',
    language: 'typescript',
    code: 'interface User {\n  id: number;\n  name: string;\n}\n\nconst user: User = { id: 1, name: "Ada" };\nconsole.log(`User ${user.id}: ${user.name}`);',
    explanation: 'TypeScript adds static typing to JavaScript to detect bugs and shape errors at compile-time.\n\nExpected Output:\nUser 1: Ada',
    syntax: ['const obj: TypeName = { ... };']
  };
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
