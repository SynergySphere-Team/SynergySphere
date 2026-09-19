import type { ExampleSnippet } from './types.js';

export function getReactExample(title: string): ExampleSnippet {
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
