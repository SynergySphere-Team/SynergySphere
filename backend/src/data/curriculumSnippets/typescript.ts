import type { ExampleSnippet } from './types.js';

export function getTypeScriptExample(title: string): ExampleSnippet {
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
