import type { ExampleSnippet } from './types.js';

export function getReactExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/usestate|state/.test(t)) {
    return {
      title: 'React useState Hook',
      language: 'tsx',
      code: `import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: 16 }}>
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(0)} style={{ marginLeft: 8 }}>Reset</button>
    </div>
  );
}`,
      explanation: 'The useState Hook allows functional components to maintain and update local state.\n\nExpected Output:\n[Renders Count: 0, clicking Increment increases the displayed number]',
      syntax: [
        'const [state, setState] = useState(initialValue);',
        'setState(newValue);',
        'setState((prev) => prev + 1);',
      ],
      rules: [
        'Never mutate state directly (e.g. state = newValue); always call the state setter function.',
        'Use the updater callback (prev => prev + 1) when new state depends on previous state.',
        'Only call Hooks at the top level of function components, never inside loops or conditions.',
      ],
      commonMistakes: [
        'Directly mutating state variables instead of calling the setState function.',
        'Expecting state to update synchronously immediately on the line after calling setState.',
        'Calling useState conditionally inside an if statement or loop.',
      ],
    };
  }

  if (/useeffect|effect/.test(t)) {
    return {
      title: 'React useEffect Hook',
      language: 'tsx',
      code: `import React, { useState, useEffect } from 'react';

export default function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    // Cleanup function runs on unmount or before effect re-runs
    return () => clearInterval(interval);
  }, []); // Empty array ensures effect runs only once on mount

  return <h3>Seconds elapsed: {seconds}</h3>;
}`,
      explanation: 'useEffect handles side effects such as data fetching, timers, subscriptions, and DOM updates.\n\nExpected Output:\n[Counter ticks up by 1 every second]',
      syntax: [
        'useEffect(() => { /* side effect */ return () => /* cleanup */; }, [dependencies]);',
      ],
      rules: [
        'Always include all reactive values (props, state) used inside the effect in the dependency array.',
        'Return a cleanup function to cancel network requests, timers, or event listeners on unmount.',
        'Avoid triggering state updates without dependencies to prevent infinite render loops.',
      ],
      commonMistakes: [
        'Omitting dependencies from the dependency array, causing stale closure values.',
        'Forgetting the cleanup function, leading to memory leaks and duplicate timer intervals.',
        'Updating state without dependency control, triggering an infinite re-render loop.',
      ],
    };
  }

  if (/usecontext|context/.test(t)) {
    return {
      title: 'React useContext Hook',
      language: 'tsx',
      code: `import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  return (
    <ThemeContext.Provider value={theme}>
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Toolbar() {
  const currentTheme = useContext(ThemeContext);
  return <div style={{ background: currentTheme === 'dark' ? '#222' : '#fff', color: currentTheme === 'dark' ? '#fff' : '#000', padding: 12 }}>Active theme: {currentTheme}</div>;
}`,
      explanation: 'useContext provides access to shared data throughout a component tree without prop drilling.\n\nExpected Output:\n[Displays active theme: dark within the styled container]',
      syntax: [
        'const MyContext = createContext(defaultValue);',
        '<MyContext.Provider value={currentValue}>{children}</MyContext.Provider>',
        'const value = useContext(MyContext);',
      ],
    };
  }

  if (/useref|ref\b/.test(t)) {
    return {
      title: 'React useRef Hook',
      language: 'tsx',
      code: `import React, { useRef } from 'react';

export default function TextInputWithFocusButton() {
  const inputEl = useRef<HTMLInputElement>(null);

  const onButtonClick = () => {
    inputEl.current?.focus();
  };

  return (
    <div>
      <input ref={inputEl} type="text" placeholder="Click button to focus me" />
      <button onClick={onButtonClick}>Focus the input</button>
    </div>
  );
}`,
      explanation: 'useRef creates a mutable reference object that persists across renders without causing a re-render.\n\nExpected Output:\n[Clicking the button immediately sets cursor focus into the text input]',
      syntax: [
        'const refContainer = useRef(initialValue);',
        'refContainer.current = newValue;',
        '<input ref={refContainer} />',
      ],
    };
  }

  if (/usereducer|reducer/.test(t)) {
    return {
      title: 'React useReducer Hook',
      language: 'tsx',
      code: `import React, { useReducer } from 'react';

type State = { count: number };
type Action = { type: 'increment' } | { type: 'decrement' } | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': return { count: state.count + 1 };
    case 'decrement': return { count: state.count - 1 };
    case 'reset': return { count: 0 };
    default: return state;
  }
}

export default function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
    </div>
  );
}`,
      explanation: 'useReducer manages complex state logic through predictable action dispatches and pure reducer functions.\n\nExpected Output:\n[Renders count with + and - buttons to dispatch state transitions]',
      syntax: [
        'const [state, dispatch] = useReducer(reducer, initialState);',
        'dispatch({ type: "ACTION_NAME", payload: value });',
      ],
    };
  }

  if (/usecallback|memoize callback/.test(t)) {
    return {
      title: 'React useCallback Hook',
      language: 'tsx',
      code: `import React, { useState, useCallback } from 'react';

export default function ProductList() {
  const [count, setCount] = useState(0);

  const handleItemClick = useCallback((id: number) => {
    console.log('Selected product:', id);
  }, []); // Function reference remains stable across renders

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Re-render count: {count}</button>
      <ItemButton id={101} onClick={handleItemClick} />
    </div>
  );
}

const ItemButton = React.memo(({ id, onClick }: { id: number; onClick: (id: number) => void }) => {
  return <button onClick={() => onClick(id)}>Product #{id}</button>;
});`,
      explanation: 'useCallback caches a function instance between re-renders to prevent unnecessary child re-renders.\n\nExpected Output:\n[Maintains stable callback reference when parent re-renders]',
      syntax: [
        'const cachedFn = useCallback(() => { doSomething(a, b); }, [a, b]);',
      ],
    };
  }

  if (/usememo|memo\b/.test(t)) {
    return {
      title: 'React useMemo Hook',
      language: 'tsx',
      code: `import React, { useState, useMemo } from 'react';

export default function ExpensiveComputation() {
  const [number, setNumber] = useState(25);
  const [dark, setDark] = useState(false);

  // Expensive calculation cached until number changes
  const squared = useMemo(() => {
    return number * number;
  }, [number]);

  return (
    <div>
      <p>{number} squared is: {squared}</p>
      <button onClick={() => setNumber(n => n + 1)}>Increment Number</button>
      <button onClick={() => setDark(d => !d)}>Toggle Theme</button>
    </div>
  );
}`,
      explanation: 'useMemo caches the result of a computationally expensive calculation between renders.\n\nExpected Output:\n[Displays cached calculation, avoiding re-calculation on theme toggle]',
      syntax: [
        'const cachedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);',
      ],
    };
  }

  if (/custom hook/.test(t)) {
    return {
      title: 'React Custom Hooks',
      language: 'tsx',
      code: `import { useState, useEffect } from 'react';

// Custom Hook starts with "use"
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

export default function ResponsiveComponent() {
  const width = useWindowWidth();
  return <p>Current browser viewport width: {width}px</p>;
}`,
      explanation: 'Custom Hooks allow you to extract and reuse component stateful logic across multiple components.\n\nExpected Output:\n[Displays live browser viewport width and updates on resize]',
      syntax: [
        'function useFeatureName() { /* useState, useEffect */ return data; }',
      ],
    };
  }

  if (/props/.test(t)) {
    return {
      title: 'React Props & Destructuring',
      language: 'tsx',
      code: `import React from 'react';

interface UserCardProps {
  name: string;
  role: string;
  isOnline?: boolean;
}

export function UserCard({ name, role, isOnline = false }: UserCardProps) {
  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
      <h3>{name}</h3>
      <p>Role: {role}</p>
      <span style={{ color: isOnline ? 'green' : 'gray' }}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}

export default function App() {
  return <UserCard name="Sarah Connor" role="Lead Engineer" isOnline={true} />;
}`,
      explanation: 'Props pass read-only data from parent components to child components via attributes.\n\nExpected Output:\n[Renders Sarah Connor, Role: Lead Engineer, Online]',
      syntax: [
        '<Component propName={value} />',
        'function Component({ propA, propB }: Props) { return ...; }',
      ],
    };
  }

  if (/jsx/.test(t)) {
    return {
      title: 'React JSX Expressions & Rules',
      language: 'tsx',
      code: `import React from 'react';

export default function Greeting() {
  const user = { firstName: 'Alex', lastName: 'Mercer' };
  const isLoggedIn = true;

  return (
    <div className="container">
      <h1>Hello, {user.firstName} {user.lastName}!</h1>
      <p>Status: {isLoggedIn ? 'Active Member' : 'Guest'}</p>
      <p>Result of 2 + 2 = {2 + 2}</p>
    </div>
  );
}`,
      explanation: 'JSX allows writing HTML-like markup inside JavaScript files, compiling to React.createElement calls.\n\nExpected Output:\n[Renders Hello, Alex Mercer! Status: Active Member, Result of 2 + 2 = 4]',
      syntax: [
        'const element = <h1>{javascriptExpression}</h1>;',
        '<div className="class-name">{content}</div>',
      ],
    };
  }

  if (/component/.test(t)) {
    return {
      title: 'React Functional Components',
      language: 'tsx',
      code: `import React from 'react';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return <header style={{ background: '#0284c7', color: '#fff', padding: 16 }}><h1>{title}</h1></header>;
}

export default function App() {
  return (
    <div>
      <Header title="SynergySphere Academy" />
      <main style={{ padding: 16 }}><p>Welcome to learning React.</p></main>
    </div>
  );
}`,
      explanation: 'Components are reusable, modular UI building blocks that accept props and return JSX.\n\nExpected Output:\n[Renders styled header with SynergySphere Academy and welcome body]',
      syntax: [
        'function ComponentName(props: Props) { return <JSX />; }',
        'export default ComponentName;',
      ],
    };
  }

  if (/event/.test(t)) {
    return {
      title: 'React Event Handling',
      language: 'tsx',
      code: `import React from 'react';

export default function ButtonClicker() {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    alert('Button clicked safely with synthetic event!');
  };

  return (
    <button onClick={handleClick} style={{ padding: '8px 16px', background: '#22c55e', color: '#fff' }}>
      Click Me
    </button>
  );
}`,
      explanation: 'React events use camelCase (onClick, onSubmit) and pass synthetic cross-browser event wrappers.\n\nExpected Output:\n[Renders green button that shows alert dialog when clicked]',
      syntax: [
        '<button onClick={(event) => handleClick(event)}>Click</button>',
        'function handleClick(event: React.MouseEvent) { ... }',
      ],
    };
  }

  if (/form|input/.test(t)) {
    return {
      title: 'React Controlled Forms',
      language: 'tsx',
      code: `import React, { useState } from 'react';

export default function LoginForm() {
  const [formData, setFormData] = useState({ username: '', email: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(\`Submitted: \${formData.username} (\${formData.email})\`);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
      <input name="username" value={formData.username} onChange={handleChange} placeholder="Username" />
      <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
      <button type="submit">Submit</button>
    </form>
  );
}`,
      explanation: 'Controlled components bind input value directly to React state and update state on every change event.\n\nExpected Output:\n[Controlled form capturing username and email with state validation]',
      syntax: [
        '<input value={stateValue} onChange={(e) => setStateValue(e.target.value)} />',
        'const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); };',
      ],
    };
  }

  if (/list|map/.test(t)) {
    return {
      title: 'React Lists & Keys',
      language: 'tsx',
      code: `import React from 'react';

interface Course {
  id: number;
  title: string;
}

export default function CourseList() {
  const courses: Course[] = [
    { id: 1, title: 'JavaScript Fundamentals' },
    { id: 2, title: 'React Modern Web Apps' },
    { id: 3, title: 'TypeScript Deep Dive' },
  ];

  return (
    <ul>
      {courses.map((course) => (
        <li key={course.id}>
          <strong>#{course.id}</strong>: {course.title}
        </li>
      ))}
    </ul>
  );
}`,
      explanation: 'Render collections using array map() and provide a unique key prop to every root list element.\n\nExpected Output:\n[Renders 3 list items with bold IDs and course titles]',
      syntax: [
        '{items.map(item => <li key={item.id}>{item.name}</li>)}',
      ],
    };
  }

  if (/router|navigation/.test(t)) {
    return {
      title: 'React Router Setup',
      language: 'tsx',
      code: `import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function Home() { return <h2>Home Page</h2>; }
function About() { return <h2>About Page</h2>; }

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: 'flex', gap: 12 }}>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}`,
      explanation: 'React Router handles client-side routing, updating the view without full browser page reloads.\n\nExpected Output:\n[Renders navigation links switching between Home and About views]',
      syntax: [
        '<BrowserRouter><Routes><Route path="/url" element={<Component />} /></Routes></BrowserRouter>',
      ],
    };
  }

  if (/home|intro|get started/.test(t)) {
    return {
      title: 'React Application Entry Point',
      language: 'tsx',
      code: `import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Welcome to React!</h1>
      <p>Building interactive single-page user interfaces with components.</p>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}`,
      explanation: 'React initializes in HTML by mounting the root component into a DOM element using createRoot.\n\nExpected Output:\n[Renders Welcome to React! application heading inside DOM root element]',
      syntax: [
        'const root = createRoot(document.getElementById("root")!);',
        'root.render(<App />);',
      ],
    };
  }

  return {
    title: 'React Functional Component',
    language: 'tsx',
    code: `import React, { useState } from 'react';

export default function ${title.replace(/[^a-zA-Z0-9]/g, '') || 'InteractiveModule'}() {
  const [active, setActive] = useState(false);

  return (
    <div style={{ padding: 16, border: '1px solid #334155', borderRadius: 8 }}>
      <h2>${title} in React</h2>
      <p>Status: {active ? 'Enabled' : 'Disabled'}</p>
      <button onClick={() => setActive(!active)}>
        Toggle Status
      </button>
    </div>
  );
}`,
    explanation: `Demonstrates ${title} using modern React hooks, declarative JSX markup, and interactive state.\n\nExpected Output:\n[Renders ${title} component with interactive toggle button]`,
    syntax: [
      'function Component() { return <div />; }',
      'const [state, setState] = useState(initial);',
    ],
  };
}
