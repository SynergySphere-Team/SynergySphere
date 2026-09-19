import type { ExampleSnippet } from './types.js';

export function getJavaScriptExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  // Temporal API
  if (/temporal/.test(t)) {
    if (/duration/.test(t)) {
      return {
        title: 'JavaScript Temporal Duration',
        language: 'javascript',
        code: 'const duration = Temporal.Duration.from({ hours: 1, minutes: 45 });\nconst totalMinutes = duration.total({ unit: "minute" });\nconsole.log("Total minutes:", totalMinutes);\nconsole.log("ISO duration:", duration.toString());',
        explanation: 'The Temporal.Duration represents a duration of time, such as 1 hour and 45 minutes, without reference to a specific calendar date.\n\nExpected Output:\nTotal minutes: 105\nISO duration: PT1H45M',
        syntax: ['Temporal.Duration.from({ hours: 1, minutes: 30 })', 'duration.total({ unit: "minute" })']
      };
    }
    if (/instant/.test(t)) {
      return {
        title: 'JavaScript Temporal Instant',
        language: 'javascript',
        code: 'const instant = Temporal.Instant.from("2026-09-19T12:00:00Z");\nconsole.log("Epoch nanoseconds:", instant.epochNanoseconds);\nconsole.log("UTC String:", instant.toString());',
        explanation: 'A Temporal.Instant represents a fixed point in time, independent of any time zone or calendar.\n\nExpected Output:\nEpoch nanoseconds: 1789819200000000000n\nUTC String: 2026-09-19T12:00:00Z',
        syntax: ['Temporal.Instant.from(isoString)', 'instant.epochNanoseconds']
      };
    }
    if (/plainmonthday|plaintime|plaindate/.test(t)) {
      return {
        title: 'JavaScript Temporal Plain Types',
        language: 'javascript',
        code: 'const time = Temporal.PlainTime.from("14:35:00");\nconst date = Temporal.PlainDate.from("2026-09-19");\nconsole.log("Time hour:", time.hour);\nconsole.log("Date ISO:", date.toString());',
        explanation: 'Temporal Plain types represent calendar dates and wall-clock times that do not depend on any time zone.\n\nExpected Output:\nTime hour: 14\nDate ISO: 2026-09-19',
        syntax: ['Temporal.PlainTime.from("14:35:00")', 'Temporal.PlainDate.from("2026-09-19")']
      };
    }
    return {
      title: 'JavaScript Modern Temporal API',
      language: 'javascript',
      code: 'const now = Temporal.Now.instant();\nconst today = Temporal.Now.plainDateISO();\nconsole.log("Today is:", today.toString());\nconsole.log("Timestamp:", now.toString());',
      explanation: 'The modern ECMAScript Temporal API provides full support for time zones, calendars, and accurate date arithmetic.\n\nExpected Output:\nToday is: 2026-09-19\nTimestamp: 2026-09-19T12:00:00Z',
      syntax: ['Temporal.Now.instant()', 'Temporal.Now.plainDateISO()']
    };
  }

  // BOM: Window, Screen, Location, History, Navigator, Cookie
  if (/cookie/.test(t)) {
    return {
      title: 'JavaScript Cookies',
      language: 'javascript',
      code: 'document.cookie = "username=John Doe; expires=Fri, 31 Dec 2026 23:59:59 GMT; path=/";\nconsole.log("Saved cookie:", document.cookie);',
      explanation: 'JavaScript can create, read, and delete cookies with the document.cookie property.\n\nExpected Output:\nSaved cookie: username=John Doe',
      syntax: ['document.cookie = "name=value; path=/";', 'let cookies = document.cookie;']
    };
  }
  if (/screen/.test(t)) {
    return {
      title: 'JavaScript Window Screen',
      language: 'javascript',
      code: 'console.log("Screen width:", window.screen.width);\nconsole.log("Screen height:", window.screen.height);\nconsole.log("Color depth:", window.screen.colorDepth);',
      explanation: 'The window.screen object contains information about the visitor screen dimensions and color depth.\n\nExpected Output:\nScreen width: 1920\nScreen height: 1080\nColor depth: 24',
      syntax: ['window.screen.width', 'window.screen.height']
    };
  }
  if (/location/.test(t)) {
    return {
      title: 'JavaScript Window Location',
      language: 'javascript',
      code: 'console.log("Location href:", window.location.href);\nconsole.log("Location hostname:", window.location.hostname);\nconsole.log("Location pathname:", window.location.pathname);\nconsole.log("Location protocol:", window.location.protocol);',
      explanation: 'The window.location object can be used to get the current page address (URL) and to redirect the browser to a new page.\n\nExpected Output:\nLocation href: https://www.w3schools.com/js/default.asp\nLocation hostname: www.w3schools.com\nLocation pathname: /js/default.asp\nLocation protocol: https:',
      syntax: ['window.location.href', 'window.location.hostname', 'window.location.assign(url)']
    };
  }
  if (/history/.test(t)) {
    return {
      title: 'JavaScript Window History',
      language: 'javascript',
      code: 'console.log("History length:", window.history.length);\n// window.history.back(); // Equivalent to clicking the browser back button\n// window.history.forward();',
      explanation: 'The window.history object contains the browsers history URLs list.\n\nExpected Output:\nHistory length: 3',
      syntax: ['window.history.back()', 'window.history.forward()', 'window.history.go(-1)']
    };
  }
  if (/navigator/.test(t)) {
    return {
      title: 'JavaScript Window Navigator',
      language: 'javascript',
      code: 'console.log("Navigator language:", navigator.language);\nconsole.log("Online status:", navigator.onLine);\nconsole.log("Platform:", navigator.platform);',
      explanation: 'The window.navigator object contains information about the visitor browser name, version, and platform.\n\nExpected Output:\nNavigator language: en-US\nOnline status: true\nPlatform: Win32',
      syntax: ['navigator.language', 'navigator.onLine', 'navigator.cookieEnabled']
    };
  }
  if (/popup|alert|prompt/.test(t)) {
    return {
      title: 'JavaScript Popup Boxes',
      language: 'javascript',
      code: 'window.alert("Hello! I am an alert box!");\nlet person = window.prompt("Please enter your name", "Harry Potter");\nlet confirmed = window.confirm("Press a button!");\nconsole.log("User:", person, "Confirmed:", confirmed);',
      explanation: 'JavaScript has three kinds of popup boxes: Alert box, Confirm box, and Prompt box.\n\nExpected Output:\nUser: Harry Potter Confirmed: true',
      syntax: ['window.alert(message)', 'window.confirm(message)', 'window.prompt(text, defaultText)']
    };
  }
  if (/timing/.test(t)) {
    return {
      title: 'JavaScript Timing Events',
      language: 'javascript',
      code: 'const timeoutId = setTimeout(() => {\n  console.log("Executed after 2000 milliseconds");\n}, 2000);\n\nclearTimeout(timeoutId);\nconsole.log("Timer scheduled and cancelled.");',
      explanation: 'The window object allows execution of code at specified time intervals using setTimeout and setInterval.\n\nExpected Output:\nTimer scheduled and cancelled.',
      syntax: ['setTimeout(function, milliseconds)', 'clearTimeout(id)', 'setInterval(function, milliseconds)']
    };
  }
  if (/window\b/.test(t)) {
    return {
      title: 'JavaScript Browser Window (BOM)',
      language: 'javascript',
      code: 'let w = window.innerWidth;\nlet h = window.innerHeight;\nconsole.log("Browser viewport width:", w, "height:", h);',
      explanation: 'The Browser Object Model (BOM) allows JavaScript to talk to the browser. The window object represents the browser window.\n\nExpected Output:\nBrowser viewport width: 1024 height: 768',
      syntax: ['window.innerWidth', 'window.innerHeight', 'window.open()', 'window.close()']
    };
  }

  // Web APIs
  if (/geolocation/.test(t)) {
    return {
      title: 'JavaScript Geolocation API',
      language: 'javascript',
      code: 'if (navigator.geolocation) {\n  navigator.geolocation.getCurrentPosition(\n    (position) => {\n      console.log("Latitude:", position.coords.latitude);\n      console.log("Longitude:", position.coords.longitude);\n    },\n    (err) => console.log("Geolocation error:", err.message)\n  );\n} else {\n  console.log("Geolocation is not supported by this browser.");\n}',
      explanation: 'The HTML Geolocation API is used to locate a user position. Since this can compromise privacy, the position is not available unless the user approves.\n\nExpected Output:\nLatitude: 40.7128\nLongitude: -74.006',
      syntax: ['navigator.geolocation.getCurrentPosition(successCallback, errorCallback)']
    };
  }
  if (/storage|localstorage|sessionstorage/.test(t)) {
    return {
      title: 'JavaScript Web Storage API',
      language: 'javascript',
      code: 'localStorage.setItem("lastname", "Smith");\nconst user = localStorage.getItem("lastname");\nconsole.log("Stored user:", user);\n\nsessionStorage.setItem("token", "xyz123");\nconsole.log("Session token:", sessionStorage.getItem("token"));',
      explanation: 'The Web Storage API is a simple syntax for storing and retrieving data in the browser (localStorage persists; sessionStorage expires on tab close).\n\nExpected Output:\nStored user: Smith\nSession token: xyz123',
      syntax: ['localStorage.setItem(key, value)', 'localStorage.getItem(key)', 'sessionStorage.setItem(key, value)']
    };
  }
  if (/worker/.test(t)) {
    return {
      title: 'JavaScript Web Workers API',
      language: 'javascript',
      code: '// Web Worker running in a background thread\nconst w = new Worker("demo_workers.js");\nw.onmessage = function(event) {\n  console.log("Worker posted message:", event.data);\n};\nw.postMessage("start");',
      explanation: 'A web worker is a JavaScript that runs in the background, independently of other scripts, without affecting the performance of the page.\n\nExpected Output:\nWorker posted message: Task completed',
      syntax: ['const w = new Worker("worker.js");', 'w.postMessage(data);', 'w.terminate();']
    };
  }
  if (/xmlhttp|ajax/.test(t)) {
    return {
      title: 'JavaScript AJAX and XMLHttpRequest',
      language: 'javascript',
      code: 'const xhttp = new XMLHttpRequest();\nxhttp.onload = function() {\n  console.log("AJAX status:", this.status);\n  console.log("Response text:", this.responseText.slice(0, 30));\n};\nxhttp.open("GET", "demo_info.txt", true);\nxhttp.send();',
      explanation: 'AJAX is a developers dream, because you can read data from a web server and update a web page without reloading.\n\nExpected Output:\nAJAX status: 200\nResponse text: Welcome to W3Schools AJAX Demo',
      syntax: ['const xhttp = new XMLHttpRequest();', 'xhttp.open("GET", url, true);', 'xhttp.send();']
    };
  }
  if (/fetch api/.test(t)) {
    return {
      title: 'JavaScript Fetch API',
      language: 'javascript',
      code: 'fetch("https://jsonplaceholder.typicode.com/todos/1")\n  .then(response => response.json())\n  .then(json => console.log("Fetched item:", json.title))\n  .catch(err => console.log("Fetch error:", err));',
      explanation: 'The Fetch API interface allows web browsers to make HTTP requests to web servers using clean, Promise-based syntax.\n\nExpected Output:\nFetched item: delectus aut autem',
      syntax: ['fetch(url).then(res => res.json()).then(data => ...);']
    };
  }

  // Iterators, Generators, Iterables
  if (/generator/.test(t)) {
    return {
      title: 'JavaScript Generator Functions',
      language: 'javascript',
      code: 'function* idGenerator() {\n  let id = 1;\n  while (id <= 3) {\n    yield id++;\n  }\n}\n\nconst gen = idGenerator();\nconsole.log(gen.next().value);\nconsole.log(gen.next().value);\nconsole.log(gen.next().value);',
      explanation: 'Generator functions are written using the function* syntax and yield values lazily over time.\n\nExpected Output:\n1\n2\n3',
      syntax: ['function* genName() { yield value; }', 'gen.next()']
    };
  }
  if (/iterable|iterator/.test(t)) {
    return {
      title: 'JavaScript Iterables and Iterators',
      language: 'javascript',
      code: 'const myNumbers = {};\nmyNumbers[Symbol.iterator] = function() {\n  let n = 0;\n  return {\n    next() {\n      n += 10;\n      return { value: n, done: n > 30 };\n    }\n  };\n};\n\nfor (const num of myNumbers) {\n  console.log("Iterator yield:", num);\n}',
      explanation: 'The iterable protocol allows JavaScript objects to define or customize their iteration behavior in for...of loops.\n\nExpected Output:\nIterator yield: 10\nIterator yield: 20\nIterator yield: 30',
      syntax: ['obj[Symbol.iterator] = function() { return { next() { ... } }; }']
    };
  }

  // Destructuring
  if (/destructuring/.test(t)) {
    return {
      title: 'JavaScript Destructuring Assignment',
      language: 'javascript',
      code: 'const person = { firstName: "John", lastName: "Doe", age: 50 };\nconst { firstName, age } = person;\nconsole.log(firstName + " is " + age + " years old.");\n\nconst rgb = [255, 200, 0];\nconst [red, green, blue] = rgb;\nconsole.log("Colors:", red, green, blue);',
      explanation: 'The destructuring assignment syntax is a JavaScript expression that makes it possible to unpack values from arrays, or properties from objects, into distinct variables.\n\nExpected Output:\nJohn is 50 years old.\nColors: 255 200 0',
      syntax: ['const { prop1, prop2 } = object;', 'const [a, b] = array;']
    };
  }

  // Meta: Proxy & Reflect
  if (/meta|proxy|reflect/.test(t)) {
    return {
      title: 'JavaScript Proxy and Reflect',
      language: 'javascript',
      code: 'const target = { message: "Hello", count: 10 };\nconst handler = {\n  get(obj, prop) {\n    return prop in obj ? Reflect.get(obj, prop) : "default";\n  }\n};\n\nconst proxy = new Proxy(target, handler);\nconsole.log(proxy.message);\nconsole.log(proxy.unknown);',
      explanation: 'The Proxy object enables you to create a proxy for another object, which can intercept and redefine fundamental operations for that object.\n\nExpected Output:\nHello\ndefault',
      syntax: ['new Proxy(target, handler)', 'Reflect.get(target, property)']
    };
  }

  // Typed Arrays & DataView & Atomics
  if (/typed|dataview|atomics|array buffer/.test(t)) {
    return {
      title: 'JavaScript Typed Arrays and ArrayBuffer',
      language: 'javascript',
      code: 'const buffer = new ArrayBuffer(16);\nconst int32View = new Int32Array(buffer);\nint32View[0] = 42;\nint32View[1] = 84;\n\nconsole.log("Byte length:", buffer.byteLength);\nconsole.log("First integer:", int32View[0]);\nconsole.log("Second integer:", int32View[1]);',
      explanation: 'JavaScript typed arrays are array-like objects and provide a mechanism for reading and writing raw binary data in memory buffers.\n\nExpected Output:\nByte length: 16\nFirst integer: 42\nSecond integer: 84',
      syntax: ['new ArrayBuffer(bytes)', 'new Int32Array(buffer)']
    };
  }

  // Symbols & Primitives & NaN & Undefined & Coercion
  if (/symbol|primitive|nan|undefined|coercion|tostring/.test(t)) {
    return {
      title: 'JavaScript Primitive Types and Symbols',
      language: 'javascript',
      code: 'const sym1 = Symbol("id");\nconst sym2 = Symbol("id");\nconsole.log("Symbols unique:", sym1 === sym2);\n\nlet notANumber = 0 / 0;\nconsole.log("Is NaN?", Number.isNaN(notANumber));\n\nlet coerced = "5" + 2;\nconsole.log("Coerced result:", coerced);',
      explanation: 'JavaScript primitives are immutable and compared by value. Symbols are unique identifiers. Type coercion converts values implicitly.\n\nExpected Output:\nSymbols unique: false\nIs NaN? true\nCoerced result: 52',
      syntax: ['Symbol("desc")', 'Number.isNaN(val)', 'String(val)']
    };
  }

  // Modules: Export, Import, Namespace, Dynamic
  if (/module/.test(t)) {
    return {
      title: 'JavaScript Modules (ESM)',
      language: 'javascript',
      code: '// In message.js:\n// export const name = "Jesse";\n// export const age = 40;\n\n// In app.js:\n// import { name, age } from "./message.js";\nconsole.log("Module system ready with ES6 import/export syntax.");',
      explanation: 'JavaScript modules allow you to break up your code into separate files. This makes it easier to maintain a code-base.\n\nExpected Output:\nModule system ready with ES6 import/export syntax.',
      syntax: ['export const name = value;', 'import { name } from "./module.js";']
    };
  }

  // jQuery
  if (/jquery/.test(t)) {
    return {
      title: 'jQuery DOM Manipulation and Selectors',
      language: 'javascript',
      code: '// Using jQuery library:\n// $(document).ready(function(){\n//   $("button").click(function(){\n//     $("p").hide();\n//   });\n// });\nconsole.log("jQuery selector $(\\"#demo\\") finds element by ID.");',
      explanation: 'jQuery is a lightweight, "write less, do more", JavaScript library that simplifies HTML document traversing, event handling, and Ajax.\n\nExpected Output:\njQuery selector $("#demo") finds element by ID.',
      syntax: ['$(document).ready(handler)', '$("selector").action()']
    };
  }

  // Canvas / Graphics / Charts
  if (/canvas|graphic|chart|plotly|google charts|d3/.test(t)) {
    return {
      title: 'JavaScript HTML Canvas and Charts',
      language: 'javascript',
      code: 'const canvas = document.getElementById("myCanvas");\nif (canvas) {\n  const ctx = canvas.getContext("2d");\n  ctx.fillStyle = "#FF0000";\n  ctx.fillRect(20, 20, 150, 100);\n}\nconsole.log("2D Canvas graphic rendered successfully.");',
      explanation: 'The HTML <canvas> element is used to draw graphics on a web page via JavaScript.\n\nExpected Output:\n2D Canvas graphic rendered successfully.',
      syntax: ['canvas.getContext("2d")', 'ctx.fillRect(x, y, w, h)']
    };
  }

  // Projects, Practice, Exercises, Syllabus, Study Plan
  if (/counter|to-do|project|website projects|practice|syllabus|study plan|interview|challenge|exercise|quiz/.test(t)) {
    return {
      title: 'JavaScript Interactive Project Example',
      language: 'javascript',
      code: 'class Counter {\n  constructor(initialValue = 0) {\n    this.count = initialValue;\n  }\n  increment() {\n    this.count += 1;\n    return this.count;\n  }\n  decrement() {\n    this.count -= 1;\n    return this.count;\n  }\n}\n\nconst counter = new Counter(10);\nconsole.log("Incremented:", counter.increment());\nconsole.log("Incremented:", counter.increment());\nconsole.log("Decremented:", counter.decrement());',
      explanation: 'Practical JavaScript applications combine classes, state management, and functions to power dynamic UI logic.\n\nExpected Output:\nIncremented: 11\nIncremented: 12\nDecremented: 11',
      syntax: ['class Component { constructor() { ... } }']
    };
  }

  // Form Validation
  if (/form validation|validation api/.test(t)) {
    return {
      title: 'JavaScript Form Validation',
      language: 'javascript',
      code: 'function validateForm(name) {\n  if (!name || name.trim() === "") {\n    console.log("Name must be filled out");\n    return false;\n  }\n  console.log("Form valid for:", name);\n  return true;\n}\n\nvalidateForm("");\nvalidateForm("Alice");',
      explanation: 'JavaScript can be used to validate input data in HTML forms before sending to the server.\n\nExpected Output:\nName must be filled out\nForm valid for: Alice',
      syntax: ['if (input.value == "") { return false; }']
    };
  }

  // Loops (General)
  if (/loop/.test(t)) {
    return {
      title: 'JavaScript Loop Iteration',
      language: 'javascript',
      code: 'const fruits = ["Apple", "Banana", "Cherry"];\nfor (let i = 0; i < fruits.length; i++) {\n  console.log("Fruit " + i + ": " + fruits[i]);\n}',
      explanation: 'Loops are handy, if you want to run the same code over and over again, each time with a different value.\n\nExpected Output:\nFruit 0: Apple\nFruit 1: Banana\nFruit 2: Cherry',
      syntax: ['for (let i = 0; i < arr.length; i++) { ... }']
    };
  }

  // Sets & WeakSet
  if (/weakset/.test(t)) {
    return {
      title: 'JavaScript WeakSet',
      language: 'javascript',
      code: 'const ws = new WeakSet();\nconst user = { name: "Alice" };\nws.add(user);\nconsole.log("WeakSet has user:", ws.has(user));',
      explanation: 'A WeakSet is a collection of garbage-collectable values, including objects and non-registered symbols.\n\nExpected Output:\nWeakSet has user: true',
      syntax: ['new WeakSet()', 'ws.add(obj)', 'ws.has(obj)']
    };
  }
  if (/set\b/.test(t)) {
    return {
      title: 'JavaScript Sets',
      language: 'javascript',
      code: 'const letters = new Set(["a", "b", "c"]);\nletters.add("d");\nletters.add("a"); // Duplicate ignored\nconsole.log("Set size:", letters.size);\nconsole.log("Has \'b\'?", letters.has("b"));',
      explanation: 'A JavaScript Set is a collection of unique values. Each value can only occur once in a Set.\n\nExpected Output:\nSet size: 4\nHas \'b\'? true',
      syntax: ['new Set([iterable])', 'set.add(val)', 'set.has(val)']
    };
  }

  // Maps & WeakMap
  if (/weakmap/.test(t)) {
    return {
      title: 'JavaScript WeakMap',
      language: 'javascript',
      code: 'const wm = new WeakMap();\nconst keyObj = { id: 101 };\nwm.set(keyObj, "SessionActive");\nconsole.log("WeakMap status:", wm.get(keyObj));',
      explanation: 'A WeakMap is a collection of key/value pairs whose keys must be objects or non-registered symbols, with values of any arbitrary JavaScript type.\n\nExpected Output:\nWeakMap status: SessionActive',
      syntax: ['new WeakMap()', 'wm.set(key, val)', 'wm.get(key)']
    };
  }
  if (/map\b/.test(t)) {
    return {
      title: 'JavaScript Maps',
      language: 'javascript',
      code: 'const fruits = new Map([\n  ["apples", 500],\n  ["bananas", 300],\n  ["oranges", 200]\n]);\nfruits.set("apples", 550);\nconsole.log("Apples count:", fruits.get("apples"));\nconsole.log("Map size:", fruits.size);',
      explanation: 'A Map holds key-value pairs where the keys can be any datatype. A Map remembers the original insertion order of the keys.\n\nExpected Output:\nApples count: 550\nMap size: 3',
      syntax: ['new Map()', 'map.set(key, val)', 'map.get(key)']
    };
  }

  // Strings
  if (/string search/.test(t)) {
    return {
      title: 'JavaScript String Search Methods',
      language: 'javascript',
      code: 'let text = "Please locate where \'locate\' occurs!";\nconsole.log("indexOf:", text.indexOf("locate"));\nconsole.log("lastIndexOf:", text.lastIndexOf("locate"));\nconsole.log("search:", text.search("locate"));\nconsole.log("includes:", text.includes("locate"));',
      explanation: 'JavaScript search methods: indexOf() returns first index, lastIndexOf() returns last index, search() supports regex, includes() returns true/false.\n\nExpected Output:\nindexOf: 7\nlastIndexOf: 21\nsearch: 7\nincludes: true',
      syntax: ['str.indexOf(sub)', 'str.search(sub)', 'str.includes(sub)']
    };
  }
  if (/string method|string reference/.test(t)) {
    return {
      title: 'JavaScript String Methods',
      language: 'javascript',
      code: 'let text = "Apple, Banana, Kiwi";\nconsole.log("Slice:", text.slice(7, 13));\nconsole.log("Substring:", text.substring(7, 13));\nconsole.log("Replace:", text.replace("Kiwi", "Orange"));\nconsole.log("Upper:", text.toUpperCase());',
      explanation: 'Basic string methods: slice(), substring(), replace(), toUpperCase(), toLowerCase(), trim(), split().\n\nExpected Output:\nSlice: Banana\nSubstring: Banana\nReplace: Apple, Banana, Orange\nUpper: APPLE, BANANA, KIWI',
      syntax: ['str.slice(start, end)', 'str.replace(target, replacement)']
    };
  }

  // Objects: Get/Set, Prototypes, Protection
  if (/get \/ set|getter|setter/.test(t)) {
    return {
      title: 'JavaScript Getters and Setters',
      language: 'javascript',
      code: 'const person = {\n  firstName: "John",\n  lastName: "Doe",\n  language: "en",\n  get lang() {\n    return this.language.toUpperCase();\n  },\n  set lang(lang) {\n    this.language = lang;\n  }\n};\nconsole.log("Uppercase lang:", person.lang);',
      explanation: 'JavaScript accessors (getters and setters) allow you to define Object Accessors (Computed Properties).\n\nExpected Output:\nUppercase lang: EN',
      syntax: ['get prop() { ... }', 'set prop(val) { ... }']
    };
  }
  if (/protection|seal|freeze/.test(t)) {
    return {
      title: 'JavaScript Object Protection (freeze & seal)',
      language: 'javascript',
      code: 'const car = { brand: "Ford", model: "Mustang" };\nObject.freeze(car);\nconsole.log("Is frozen?", Object.isFrozen(car));\n// car.model = "Focus"; // Throws error in strict mode',
      explanation: 'Object.freeze() prevents extensions and makes existing properties non-writable and non-configurable.\n\nExpected Output:\nIs frozen? true',
      syntax: ['Object.freeze(obj)', 'Object.seal(obj)', 'Object.isFrozen(obj)']
    };
  }
  if (/prototype/.test(t)) {
    return {
      title: 'JavaScript Object Prototypes',
      language: 'javascript',
      code: 'function Person(first, last, age) {\n  this.firstName = first;\n  this.lastName = last;\n  this.age = age;\n}\n\nPerson.prototype.nationality = "English";\nconst myFather = new Person("John", "Doe", 50);\nconsole.log(myFather.firstName + " is " + myFather.nationality);',
      explanation: 'All JavaScript objects inherit properties and methods from a prototype. Use prototype to add new properties to constructor functions.\n\nExpected Output:\nJohn is English',
      syntax: ['ConstructorFunction.prototype.newProperty = value;']
    };
  }

  // Functions: Parameters & Expressions
  if (/function parameters|function arguments/.test(t)) {
    return {
      title: 'JavaScript Function Parameters and Rest Operator',
      language: 'javascript',
      code: 'function sumAll(...args) {\n  let sum = 0;\n  for (let arg of args) sum += arg;\n  return sum;\n}\n\nconsole.log("Sum result:", sumAll(1, 123, 500, 115, 44, 88));',
      explanation: 'The rest parameter (...) allows a function to treat an indefinite number of arguments as an array.\n\nExpected Output:\nSum result: 871',
      syntax: ['function name(...restParams) { ... }']
    };
  }
  if (/function expression/.test(t)) {
    return {
      title: 'JavaScript Function Expressions',
      language: 'javascript',
      code: 'const multiply = function(a, b) {\n  return a * b;\n};\n\nlet z = multiply(4, 3);\nconsole.log("Function expression result:", z);',
      explanation: 'A JavaScript function can also be defined using an expression. A function expression can be stored in a variable.\n\nExpected Output:\nFunction expression result: 12',
      syntax: ['const fn = function(a, b) { return a * b; };']
    };
  }

  // Existing standard branches
  if (/statement/.test(t)) {
    return {
      title: 'JavaScript Statements',
      language: 'javascript',
      code: 'let x, y, z;\nx = 5;\ny = 6;\nz = x + y;\nconsole.log("Statement result:", z);',
      explanation: 'A computer program is a list of "instructions" to be executed by a computer. In JavaScript, each statement ends with a semicolon.\n\nExpected Output:\nStatement result: 11',
      syntax: ['let x = 5;', 'console.log(value);']
    };
  }
  if (/syntax/.test(t)) {
    return {
      title: 'JavaScript Syntax Rules',
      language: 'javascript',
      code: '// How to create variables:\nvar x;\nlet y;\n\n// How to use variables:\nx = 5;\ny = 6;\nlet z = x + y;\nconsole.log("Computed z:", z);',
      explanation: 'JavaScript syntax defines two types of values: Fixed values (literals) and Variable values (variables).\n\nExpected Output:\nComputed z: 11',
      syntax: ['let variableName = expression;']
    };
  }
  if (/comment/.test(t)) {
    return {
      title: 'JavaScript Comments',
      language: 'javascript',
      code: '// Change heading:\ndocument.getElementById("myH").innerHTML = "My First Page";\n\n// Change paragraph:\ndocument.getElementById("myP").innerHTML = "My first paragraph.";\n\n/* Multiline comment\n   spanning multiple lines */',
      explanation: 'JavaScript comments can be used to explain JavaScript code, and to make it more readable.\n\nExpected Output:\n[Heading and paragraph text updated with comments ignored]',
      syntax: ['// Single-line comment', '/* Multi-line comment */']
    };
  }
  if (/let|const|variable|code blocks/.test(t)) {
    return {
      title: 'JavaScript let and const Keywords',
      language: 'javascript',
      code: 'let x = "John Doe";\nconst PI = 3.141592653589793;\n\n{ // Block scope\n  let x = 2;\n  console.log("Inside block x:", x);\n}\nconsole.log("Outside block x:", x);\nconsole.log("Constant PI:", PI);',
      explanation: 'Variables declared with let have block scope and can be reassigned. Variables declared with const cannot be reassigned.\n\nExpected Output:\nInside block x: 2\nOutside block x: John Doe\nConstant PI: 3.141592653589793',
      syntax: ['let name = value;', 'const NAME = value;']
    };
  }
  if (/operator|arithmetic|assignment/.test(t)) {
    return {
      title: 'JavaScript Operators',
      language: 'javascript',
      code: 'let a = 3;\nlet x = (100 + 50) * a;\nlet y = 10;\ny += 5; // y = y + 5\nconsole.log("x =", x, "y =", y);',
      explanation: 'Arithmetic operators perform arithmetic on numbers. Assignment operators assign values to variables.\n\nExpected Output:\nx = 450 y = 15',
      syntax: ['x = a + b;', 'y += 5;']
    };
  }
  if (/data type/.test(t)) {
    return {
      title: 'JavaScript Data Types',
      language: 'javascript',
      code: 'let length = 16;                               // Number\nlet lastName = "Johnson";                      // String\nlet isStudent = true;                          // Boolean\nlet person = {firstName: "John", lastName: "Doe"}; // Object\nlet colors = ["Red", "Green", "Blue"];         // Array\n\nconsole.log(typeof length, typeof lastName, typeof isStudent, typeof person, typeof colors);',
      explanation: 'JavaScript has 8 Datatypes: String, Number, Bigint, Boolean, Undefined, Null, Symbol, Object.\n\nExpected Output:\nnumber string boolean object object',
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
      explanation: 'A JavaScript function is a block of code designed to perform a particular task, executed when "invoked".\n\nExpected Output:\nProduct: 12',
      syntax: ['function name(param1, param2) { return result; }']
    };
  }
  if (/object/.test(t)) {
    return {
      title: 'JavaScript Objects & Methods',
      language: 'javascript',
      code: 'const person = {\n  firstName: "John",\n  lastName: "Doe",\n  age: 50,\n  fullName: function() {\n    return this.firstName + " " + this.lastName;\n  }\n};\nconsole.log("Full name:", person.fullName());\nconsole.log("Age:", person.age);',
      explanation: 'Objects are variables too. But objects can contain many values, written as name:value pairs.\n\nExpected Output:\nFull name: John Doe\nAge: 50',
      syntax: ['const obj = { key: value, method() { ... } };']
    };
  }
  if (/event/.test(t)) {
    return {
      title: 'JavaScript HTML Events & Listeners',
      language: 'javascript',
      code: 'const button = document.getElementById("myBtn");\nif (button) {\n  button.addEventListener("click", function() {\n    console.log("Button clicked!");\n  });\n}\nconsole.log("Event listener attached successfully.");',
      explanation: 'HTML events are "things" that happen to HTML elements. JavaScript can "react" on these events with addEventListener().\n\nExpected Output:\nEvent listener attached successfully.',
      syntax: ['element.addEventListener("click", handler);']
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
  if (/bigint/.test(t)) {
    return {
      title: 'JavaScript BigInt',
      language: 'javascript',
      code: 'let x = 9999999999999999;\nlet y = 9999999999999999n;\nconsole.log("Number precision limit:", x);\nconsole.log("BigInt exact representation:", y);\nconsole.log("Type of y:", typeof y);',
      explanation: 'JavaScript BigInt variables are used to store large integer values that are too big to be represented by a normal JavaScript Number.\n\nExpected Output:\nNumber precision limit: 10000000000000000\nBigInt exact representation: 9999999999999999n\nType of y: bigint',
      syntax: ['let x = 9999999999999999n;']
    };
  }
  if (/number method|tofixed|toprecision/.test(t)) {
    return {
      title: 'JavaScript Number Methods',
      language: 'javascript',
      code: 'let x = 9.656;\nconsole.log("toExponential(2):", x.toExponential(2));\nconsole.log("toFixed(2):", x.toFixed(2));\nconsole.log("toPrecision(2):", x.toPrecision(2));\nconsole.log("Number(\\"10\\"):", Number("10"));',
      explanation: 'Number methods help you work with numbers: toFixed() returns string with specified decimals, toPrecision() returns specified length.\n\nExpected Output:\ntoExponential(2): 9.66e+0\ntoFixed(2): 9.66\ntoPrecision(2): 9.7\nNumber("10"): 10',
      syntax: ['num.toFixed(digits)', 'num.toPrecision(digits)']
    };
  }
  if (/number/.test(t)) {
    return {
      title: 'JavaScript Numbers',
      language: 'javascript',
      code: 'let x = 3.14;    // A number with decimals\nlet y = 3;       // A number without decimals\nlet z = 123e5;   // 12300000\nlet w = 123e-5;  // 0.00123\nconsole.log(x, y, z, w);',
      explanation: 'JavaScript has only one type of number: double precision floating point numbers.\n\nExpected Output:\n3.14 3 12300000 0.00123',
      syntax: ['let x = 123e5;']
    };
  }
  if (/array iteration|filter|reduce/.test(t)) {
    return {
      title: 'JavaScript Array Iteration (map, filter, reduce)',
      language: 'javascript',
      code: 'const numbers = [45, 4, 9, 16, 25];\nconst over18 = numbers.filter(val => val > 18);\nconst doubled = numbers.map(val => val * 2);\nconst sum = numbers.reduce((total, val) => total + val, 0);\n\nconsole.log("Over 18:", over18);\nconsole.log("Doubled:", doubled);\nconsole.log("Sum:", sum);',
      explanation: 'Array iteration methods operate on every array item: filter() tests items, map() transforms items, reduce() aggregates to a single value.\n\nExpected Output:\nOver 18: [ 45, 25 ]\nDoubled: [ 90, 8, 18, 32, 50 ]\nSum: 99',
      syntax: ['arr.filter(fn)', 'arr.map(fn)', 'arr.reduce(fn, init)']
    };
  }
  if (/array sort/.test(t)) {
    return {
      title: 'JavaScript Array Sort',
      language: 'javascript',
      code: 'const fruits = ["Banana", "Orange", "Apple", "Mango"];\nfruits.sort();\nconsole.log("Alphabetical:", fruits);\n\nconst points = [40, 100, 1, 5, 25, 10];\npoints.sort((a, b) => a - b);\nconsole.log("Numeric ascending:", points);',
      explanation: 'sort() sorts an array alphabetically. To sort numerically, supply a compare function (a, b) => a - b.\n\nExpected Output:\nAlphabetical: [ \'Apple\', \'Banana\', \'Mango\', \'Orange\' ]\nNumeric ascending: [ 1, 5, 10, 25, 40, 100 ]',
      syntax: ['arr.sort()', 'arr.sort((a, b) => a - b)']
    };
  }
  if (/array method|push|pop|shift/.test(t)) {
    return {
      title: 'JavaScript Array Methods',
      language: 'javascript',
      code: 'const fruits = ["Banana", "Orange", "Apple", "Mango"];\nfruits.push("Kiwi");\nconst popped = fruits.pop();\nconsole.log("Popped:", popped);\nconsole.log("Joined:", fruits.join(" * "));',
      explanation: 'Array methods include push() (add to end), pop() (remove from end), shift(), unshift(), join(), concat().\n\nExpected Output:\nPopped: Kiwi\nJoined: Banana * Orange * Apple * Mango',
      syntax: ['arr.push(val)', 'arr.pop()', 'arr.join(sep)']
    };
  }
  if (/array/.test(t)) {
    return {
      title: 'JavaScript Arrays',
      language: 'javascript',
      code: 'const cars = ["Saab", "Volvo", "BMW"];\nconsole.log("First:", cars[0]);\ncars[0] = "Opel";\nconsole.log("Updated first:", cars[0]);\nconsole.log("Length:", cars.length);',
      explanation: 'An array is a special variable, which can hold more than one value at a time.\n\nExpected Output:\nFirst: Saab\nUpdated first: Opel\nLength: 3',
      syntax: ['const arr = ["item1", "item2"];', 'arr[0]']
    };
  }
  if (/date/.test(t)) {
    return {
      title: 'JavaScript Date Objects',
      language: 'javascript',
      code: 'const d = new Date();\nconsole.log("Year:", d.getFullYear());\nconsole.log("Month (0-11):", d.getMonth());\nconsole.log("Date:", d.getDate());\nconsole.log("ISO String:", d.toISOString().split("T")[0]);',
      explanation: 'Date objects are created with the new Date() constructor, providing getters and setters for time.\n\nExpected Output:\nYear: (current year)\nMonth (0-11): (current month)\nDate: (current day)\nISO String: (YYYY-MM-DD)',
      syntax: ['new Date()', 'd.getFullYear()', 'd.getMonth()']
    };
  }
  if (/math|random/.test(t)) {
    return {
      title: 'JavaScript Math & Random',
      language: 'javascript',
      code: 'console.log("PI:", Math.PI);\nconsole.log("Round 4.6:", Math.round(4.6));\nconsole.log("Power 8^2:", Math.pow(8, 2));\nconsole.log("Sqrt 64:", Math.sqrt(64));\n// Random integer between 0 and 9:\nconsole.log("Random int (0-9):", Math.floor(Math.random() * 10));',
      explanation: 'The JavaScript Math object allows you to perform mathematical tasks on numbers. Math.random() returns a number between 0 and 1.\n\nExpected Output:\nPI: 3.141592653589793\nRound 4.6: 5\nPower 8^2: 64\nSqrt 64: 8\nRandom int (0-9): (0 to 9)',
      syntax: ['Math.random()', 'Math.floor(x)', 'Math.round(x)']
    };
  }
  if (/if else|conditional|if \.\.\. else/.test(t)) {
    return {
      title: 'JavaScript If...Else Conditions',
      language: 'javascript',
      code: 'let hour = 14;\nif (hour < 12) {\n  console.log("Good morning");\n} else if (hour < 18) {\n  console.log("Good afternoon");\n} else {\n  console.log("Good evening");\n}',
      explanation: 'Conditional statements are used to perform different actions based on different conditions.\n\nExpected Output:\nGood afternoon',
      syntax: ['if (condition) { ... } else if (condition) { ... } else { ... }']
    };
  }
  if (/switch/.test(t)) {
    return {
      title: 'JavaScript Switch Statement',
      language: 'javascript',
      code: 'let day;\nswitch (new Date().getDay()) {\n  case 0: day = "Sunday"; break;\n  case 6: day = "Saturday"; break;\n  default: day = "Weekday"; break;\n}\nconsole.log("Today is:", day);',
      explanation: 'The switch statement is used to perform different actions based on different conditions.\n\nExpected Output:\nToday is: (Weekday or Saturday or Sunday)',
      syntax: ['switch(expression) { case x: ... break; default: ... break; }']
    };
  }
  if (/for in/.test(t)) {
    return {
      title: 'JavaScript For...In Loop',
      language: 'javascript',
      code: 'const person = {fname: "John", lname: "Doe", age: 25};\nfor (let x in person) {\n  console.log(x + ": " + person[x]);\n}',
      explanation: 'The JavaScript for in statement loops through the properties of an Object.\n\nExpected Output:\nfname: John\nlname: Doe\nage: 25',
      syntax: ['for (key in object) { ... }']
    };
  }
  if (/for of/.test(t)) {
    return {
      title: 'JavaScript For...Of Loop',
      language: 'javascript',
      code: 'const cars = ["BMW", "Volvo", "Mini"];\nfor (let x of cars) {\n  console.log("Car:", x);\n}',
      explanation: 'The JavaScript for of statement loops through the values of an iterable object (Arrays, Strings, Maps, Sets).\n\nExpected Output:\nCar: BMW\nCar: Volvo\nCar: Mini',
      syntax: ['for (variable of iterable) { ... }']
    };
  }
  if (/while/.test(t)) {
    return {
      title: 'JavaScript While Loop',
      language: 'javascript',
      code: 'let i = 0;\nwhile (i < 5) {\n  console.log("The number is " + i);\n  i++;\n}',
      explanation: 'The while loop loops through a block of code as long as a specified condition is true.\n\nExpected Output:\nThe number is 0\nThe number is 1\nThe number is 2\nThe number is 3\nThe number is 4',
      syntax: ['while (condition) { ... i++; }']
    };
  }
  if (/for loop|for\b/.test(t)) {
    return {
      title: 'JavaScript For Loop',
      language: 'javascript',
      code: 'for (let i = 0; i < 5; i++) {\n  console.log("Count:", i);\n}',
      explanation: 'Loops can execute a block of code a number of times. Use let i = 0 in loop header.\n\nExpected Output:\nCount: 0\nCount: 1\nCount: 2\nCount: 3\nCount: 4',
      syntax: ['for (let i = 0; i < n; i++) { ... }']
    };
  }
  if (/break|continue/.test(t)) {
    return {
      title: 'JavaScript Break and Continue',
      language: 'javascript',
      code: 'for (let i = 0; i < 10; i++) {\n  if (i === 3) continue; // Skip 3\n  if (i === 6) break;    // Terminate at 6\n  console.log("i =", i);\n}',
      explanation: 'The break statement "jumps out" of a loop. The continue statement "jumps over" one iteration in the loop.\n\nExpected Output:\ni = 0\ni = 1\ni = 2\ni = 4\ni = 5',
      syntax: ['if (cond) break;', 'if (cond) continue;']
    };
  }
  if (/typeof|type conversion/.test(t)) {
    return {
      title: 'JavaScript Type Conversion',
      language: 'javascript',
      code: 'console.log(String(123));     // "123"\nconsole.log(Number("3.14"));  // 3.14\nconsole.log(Boolean("Hello")); // true\nconsole.log(Number(false));   // 0\nconsole.log(Number("99 88")); // NaN',
      explanation: 'JavaScript variables can be converted to a new variable and another data type: either by the use of a JavaScript function, or automatically by JavaScript itself.\n\nExpected Output:\n123\n3.14\ntrue\n0\nNaN',
      syntax: ['String(val)', 'Number(val)', 'Boolean(val)']
    };
  }
  if (/bitwise/.test(t)) {
    return {
      title: 'JavaScript Bitwise Operations',
      language: 'javascript',
      code: 'let x = 5 & 1; // AND: 0101 & 0001 = 0001 (1)\nlet y = 5 | 1; // OR:  0101 | 0001 = 0101 (5)\nlet z = 5 ^ 1; // XOR: 0101 ^ 0001 = 0100 (4)\nlet w = 5 << 1; // Zero fill left shift: 10\nconsole.log(x, y, z, w);',
      explanation: 'JavaScript stores numbers as 64 bits floating point numbers, but all bitwise operations are performed on 32 bits binary numbers.\n\nExpected Output:\n1 5 4 10',
      syntax: ['a & b', 'a | b', 'a ^ b', 'a << 1']
    };
  }
  if (/regex|regexp/.test(t)) {
    return {
      title: 'JavaScript Regular Expressions (RegExp)',
      language: 'javascript',
      code: 'let text = "Visit W3Schools!";\nlet n = text.search(/w3schools/i);\nlet replaced = text.replace(/Microsoft/i, "W3Schools");\nconsole.log("Pattern found at index:", n);\nconsole.log(/e/.test("The best things in life are free!"));',
      explanation: 'A regular expression is a sequence of characters that forms a search pattern. The /i modifier does case-insensitive matching.\n\nExpected Output:\nPattern found at index: 6\ntrue',
      syntax: ['/pattern/modifiers', 'str.search(/pattern/i)', 'pattern.test(str)']
    };
  }
  if (/error|try|catch/.test(t)) {
    return {
      title: 'JavaScript Errors and Try...Catch',
      language: 'javascript',
      code: 'try {\n  nonExistentFunction();\n} catch (err) {\n  console.log("Error Name:", err.name);\n  console.log("Error Message:", err.message);\n} finally {\n  console.log("Cleanup executed in finally block.");\n}',
      explanation: 'The try statement allows you to test a block of code for errors. The catch statement handles the error. The finally statement runs code after try and catch.\n\nExpected Output:\nError Name: ReferenceError\nError Message: nonExistentFunction is not defined\nCleanup executed in finally block.',
      syntax: ['try { ... } catch (err) { ... } finally { ... }']
    };
  }
  if (/scope|hoisting/.test(t)) {
    return {
      title: 'JavaScript Scope & Hoisting',
      language: 'javascript',
      code: '// Hoisting: declarations are moved to the top of the scope\nx = 5;\nconsole.log("Hoisted x value:", x);\nvar x;\n\n// Block scope\n{ let blockScoped = 10; var funcScoped = 20; }\nconsole.log("funcScoped accessible:", funcScoped);',
      explanation: "Hoisting is JavaScript's default behavior of moving declarations to the top. Variables defined with let and const are not hoisted like var.\n\nExpected Output:\nHoisted x value: 5\nfuncScoped accessible: 20",
      syntax: ['var x; // Hoisted', 'let y; // Block scoped']
    };
  }
  if (/strict mode/.test(t)) {
    return {
      title: 'JavaScript Strict Mode ("use strict")',
      language: 'javascript',
      code: '"use strict";\ntry {\n  undeclaredVar = 3.14; // Throws error in strict mode\n} catch (e) {\n  console.log("Caught strict mode error:", e.message);\n}',
      explanation: 'Strict mode makes it easier to write "secure" JavaScript. Strict mode changes previously accepted "bad syntax" into real errors.\n\nExpected Output:\nCaught strict mode error: undeclaredVar is not defined',
      syntax: ['"use strict";']
    };
  }
  if (/this keyword/.test(t)) {
    return {
      title: 'JavaScript this Keyword',
      language: 'javascript',
      code: 'const person = {\n  firstName: "John",\n  lastName: "Doe",\n  fullName: function() {\n    return this.firstName + " " + this.lastName;\n  }\n};\nconsole.log("Full name:", person.fullName());',
      explanation: 'In JavaScript, the this keyword refers to an object. In an object method, this refers to the object itself.\n\nExpected Output:\nFull name: John Doe',
      syntax: ['this.propertyName']
    };
  }
  if (/class/.test(t)) {
    return {
      title: 'JavaScript Classes',
      language: 'javascript',
      code: 'class Car {\n  constructor(name, year) {\n    this.name = name;\n    this.year = year;\n  }\n  age() {\n    return 2026 - this.year;\n  }\n}\n\nconst myCar = new Car("Ford", 2014);\nconsole.log(myCar.name + " is " + myCar.age() + " years old.");',
      explanation: 'JavaScript Classes are templates for JavaScript Objects. Use the keyword class to create a class with constructor.\n\nExpected Output:\nFord is 12 years old.',
      syntax: ['class ClassName { constructor(props) { ... } }']
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
  if (/json/.test(t)) {
    return {
      title: 'JavaScript JSON Parse & Stringify',
      language: 'javascript',
      code: 'const text = \'{"name":"John", "age":30, "city":"New York"}\';\nconst obj = JSON.parse(text);\nconsole.log("Parsed name:", obj.name);\n\nconst jsonString = JSON.stringify(obj);\nconsole.log("Serialized JSON:", jsonString);',
      explanation: 'JSON is a format for storing and transporting data. JSON.parse() converts JSON text into a JavaScript object.\n\nExpected Output:\nParsed name: John\nSerialized JSON: {"name":"John","age":30,"city":"New York"}',
      syntax: ['JSON.parse(string)', 'JSON.stringify(object)']
    };
  }
  if (/dom|element|selector/.test(t)) {
    return {
      title: 'JavaScript HTML DOM Selection',
      language: 'javascript',
      code: 'const heading = document.querySelector("h1");\nif (heading) {\n  heading.style.color = "blue";\n  heading.textContent = "Updated via DOM API";\n}\nconsole.log("DOM manipulation applied successfully.");',
      explanation: 'With the HTML DOM, JavaScript can access and change all the elements of an HTML document.\n\nExpected Output:\nDOM manipulation applied successfully.',
      syntax: ['document.querySelector(selector)', 'element.textContent = text']
    };
  }

  return {
    title: 'JavaScript Interactive Output',
    language: 'javascript',
    code: 'document.getElementById("demo").innerHTML = "Hello JavaScript";',
    explanation: 'One of many JavaScript HTML methods. This example uses getElementById() to find an HTML element and change its inner HTML.\n\nExpected Output:\nElement with id="demo" content updated to "Hello JavaScript"',
    syntax: ['document.getElementById(id).innerHTML = content;']
  };
}
