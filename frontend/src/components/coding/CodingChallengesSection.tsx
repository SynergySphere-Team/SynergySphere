'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Code2,
  Filter,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Terminal,
  Trophy,
  X,
} from 'lucide-react';

/* ─────────────────────────── types ─────────────────────────── */

export interface Challenge {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  language: string | null;
  starterCode: string | null;
  xpReward: number;
}

interface TestCase {
  label: string;
  args: unknown[];
  expected: unknown;
}

interface TestResult {
  label: string;
  passed: boolean;
  expected: unknown;
  got: unknown;
  error?: string;
}

/* ─────────────────────────── language config ─────────────────────────── */

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300',
  TypeScript: 'border-blue-400/40 bg-blue-400/10 text-blue-300',
  Python: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  Java: 'border-orange-400/40 bg-orange-400/10 text-orange-300',
  'C++': 'border-purple-400/40 bg-purple-400/10 text-purple-300',
  'C#': 'border-violet-400/40 bg-violet-400/10 text-violet-300',
  SQL: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  HTML: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
  CSS: 'border-pink-400/40 bg-pink-400/10 text-pink-300',
  React: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
  'Node.js': 'border-green-400/40 bg-green-400/10 text-green-300',
};

const ALL_LANGUAGES = ['All', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'SQL', 'HTML', 'CSS', 'React', 'Node.js'];

/* ─────────────────────────── challenge data ─────────────────────────── */

const fallbackChallenges: Challenge[] = [
  // ── JavaScript (11) ──────────────────────────────────────────────────
  {
    id: 'js-hello-world',
    title: 'Hello World',
    difficulty: 'EASY',
    description: 'Write a function greet() that returns the string "Hello, SynergySphere!"',
    language: 'JavaScript',
    starterCode: 'function greet() {\n  // Your code here\n}',
    xpReward: 50,
  },
  {
    id: 'js-sum-array',
    title: 'Sum Array',
    difficulty: 'EASY',
    description: 'Write a function sumArray(arr) that returns the sum of all numbers in an array.',
    language: 'JavaScript',
    starterCode: 'function sumArray(arr) {\n  // Your code here\n}',
    xpReward: 50,
  },
  {
    id: 'js-fizzbuzz',
    title: 'FizzBuzz',
    difficulty: 'MEDIUM',
    description: 'Write fizzBuzz(n). Return "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for both, otherwise return n.',
    language: 'JavaScript',
    starterCode: 'function fizzBuzz(n) {\n  // Your code here\n}',
    xpReward: 75,
  },
  {
    id: 'js-binary-search',
    title: 'Binary Search',
    difficulty: 'HARD',
    description: 'Implement binarySearch(arr, target) on a sorted array. Return the index of target, or -1 if not found.',
    language: 'JavaScript',
    starterCode: 'function binarySearch(arr, target) {\n  // Your code here\n}',
    xpReward: 100,
  },
  {
    id: 'js-two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    description: 'Given an array and a target, return the indices of two numbers that add up to target.',
    language: 'JavaScript',
    starterCode: 'function twoSum(nums, target) {\n  // Your code here\n}',
    xpReward: 60,
  },
  {
    id: 'js-valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'EASY',
    description: 'Given a string of (, ), {, }, [, ], return true if brackets are properly matched and closed.',
    language: 'JavaScript',
    starterCode: 'function isValid(s) {\n  // Your code here\n}',
    xpReward: 60,
  },
  {
    id: 'js-longest-substring',
    title: 'Longest Substring',
    difficulty: 'MEDIUM',
    description: 'Find the length of the longest substring without repeating characters.',
    language: 'JavaScript',
    starterCode: 'function lengthOfLongestSubstring(s) {\n  // Your code here\n}',
    xpReward: 120,
  },
  {
    id: 'js-fibonacci',
    title: 'Fibonacci Number',
    difficulty: 'EASY',
    description: 'Calculate F(n): F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2). Use an iterative approach.',
    language: 'JavaScript',
    starterCode: 'function fib(n) {\n  // Your code here\n}',
    xpReward: 40,
  },
  {
    id: 'js-merge-sorted',
    title: 'Merge Sorted Arrays',
    difficulty: 'MEDIUM',
    description: 'Merge two sorted arrays and return a single sorted array.',
    language: 'JavaScript',
    starterCode: 'function merge(nums1, nums2) {\n  // Your code here\n}',
    xpReward: 100,
  },
  {
    id: 'js-max-depth',
    title: 'Maximum Array Depth',
    difficulty: 'MEDIUM',
    description: 'Given a nested array, return the maximum depth. E.g. [1,[2,[3]]] has depth 3.',
    language: 'JavaScript',
    starterCode: 'function maxDepth(arr) {\n  // Your code here\n}',
    xpReward: 90,
  },
  {
    id: 'js-flatten',
    title: 'Flatten Array',
    difficulty: 'MEDIUM',
    description: 'Write flatten(arr) that recursively flattens a nested array into a single-level array.',
    language: 'JavaScript',
    starterCode: 'function flatten(arr) {\n  // Your code here\n}',
    xpReward: 85,
  },

  // ── TypeScript (5) ───────────────────────────────────────────────────
  {
    id: 'ts-typed-greet',
    title: 'Typed Greeting',
    difficulty: 'EASY',
    description: 'Write a typed function greet(name: string): string that returns "Hello, {name}! Welcome to SynergySphere."',
    language: 'TypeScript',
    starterCode: 'function greet(name: string): string {\n  // Your code here\n}',
    xpReward: 55,
  },
  {
    id: 'ts-generic-identity',
    title: 'Generic Identity',
    difficulty: 'EASY',
    description: 'Write a generic function identity<T>(value: T): T that returns whatever is passed to it.',
    language: 'TypeScript',
    starterCode: 'function identity<T>(value: T): T {\n  // Your code here\n}',
    xpReward: 60,
  },
  {
    id: 'ts-interface-area',
    title: 'Shape Interface',
    difficulty: 'MEDIUM',
    description: 'Define an interface Shape with a method area(): number. Implement a Rectangle class with width and height.',
    language: 'TypeScript',
    starterCode: 'interface Shape {\n  area(): number;\n}\n\nclass Rectangle implements Shape {\n  constructor(public width: number, public height: number) {}\n\n  area(): number {\n    // Your code here\n  }\n}',
    xpReward: 80,
  },
  {
    id: 'ts-union-types',
    title: 'Union Types Handler',
    difficulty: 'MEDIUM',
    description: 'Write format(value: string | number): string. If number, prepend "$". If string, return it uppercased.',
    language: 'TypeScript',
    starterCode: 'function format(value: string | number): string {\n  // Your code here\n}',
    xpReward: 75,
  },
  {
    id: 'ts-tuple-swap',
    title: 'Tuple Swap',
    difficulty: 'MEDIUM',
    description: 'Write swap<A, B>(tuple: [A, B]): [B, A] that returns the tuple with its elements swapped.',
    language: 'TypeScript',
    starterCode: 'function swap<A, B>(tuple: [A, B]): [B, A] {\n  // Your code here\n}',
    xpReward: 70,
  },

  // ── Python (5) ───────────────────────────────────────────────────────
  {
    id: 'py-hello-world',
    title: 'Hello SynergySphere',
    difficulty: 'EASY',
    description: 'Write a function greet() that returns the string "Hello, SynergySphere!"',
    language: 'Python',
    starterCode: 'def greet():\n    # Your code here\n    pass',
    xpReward: 50,
  },
  {
    id: 'py-list-sum',
    title: 'List Sum',
    difficulty: 'EASY',
    description: 'Write sum_list(numbers) that returns the sum of all numbers in the list without using Python\'s built-in sum().',
    language: 'Python',
    starterCode: 'def sum_list(numbers):\n    # Your code here\n    pass',
    xpReward: 50,
  },
  {
    id: 'py-fizzbuzz',
    title: 'FizzBuzz (Python)',
    difficulty: 'MEDIUM',
    description: 'Write fizzbuzz(n). Return "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for both, else return n as a string.',
    language: 'Python',
    starterCode: 'def fizzbuzz(n):\n    # Your code here\n    pass',
    xpReward: 75,
  },
  {
    id: 'py-palindrome',
    title: 'Palindrome Check',
    difficulty: 'EASY',
    description: 'Write is_palindrome(s) that returns True if s is a palindrome (reads the same forwards and backwards), ignoring case.',
    language: 'Python',
    starterCode: 'def is_palindrome(s):\n    # Your code here\n    pass',
    xpReward: 60,
  },
  {
    id: 'py-count-vowels',
    title: 'Count Vowels',
    difficulty: 'EASY',
    description: 'Write count_vowels(s) that counts the number of vowels (a, e, i, o, u) in the string, case-insensitive.',
    language: 'Python',
    starterCode: 'def count_vowels(s):\n    # Your code here\n    pass',
    xpReward: 55,
  },

  // ── Java (5) ─────────────────────────────────────────────────────────
  {
    id: 'java-hello-world',
    title: 'Hello World (Java)',
    difficulty: 'EASY',
    description: 'Write a method greet() in a class Solution that returns the String "Hello, SynergySphere!"',
    language: 'Java',
    starterCode: 'public class Solution {\n    public String greet() {\n        // Your code here\n        return "";\n    }\n}',
    xpReward: 50,
  },
  {
    id: 'java-factorial',
    title: 'Factorial',
    difficulty: 'EASY',
    description: 'Write factorial(int n) in a Solution class. Return n! using iteration (not recursion). factorial(0)=1.',
    language: 'Java',
    starterCode: 'public class Solution {\n    public long factorial(int n) {\n        // Your code here\n        return 0;\n    }\n}',
    xpReward: 60,
  },
  {
    id: 'java-reverse-string',
    title: 'Reverse String',
    difficulty: 'EASY',
    description: 'Write reverseString(String s) that returns the string reversed. Do not use StringBuilder.reverse().',
    language: 'Java',
    starterCode: 'public class Solution {\n    public String reverseString(String s) {\n        // Your code here\n        return "";\n    }\n}',
    xpReward: 60,
  },
  {
    id: 'java-is-prime',
    title: 'Is Prime',
    difficulty: 'MEDIUM',
    description: 'Write isPrime(int n) that returns true if n is a prime number, false otherwise. Handle edge cases n < 2.',
    language: 'Java',
    starterCode: 'public class Solution {\n    public boolean isPrime(int n) {\n        // Your code here\n        return false;\n    }\n}',
    xpReward: 75,
  },
  {
    id: 'java-fizzbuzz',
    title: 'FizzBuzz (Java)',
    difficulty: 'MEDIUM',
    description: 'Write fizzBuzz(int n). Return "Fizz" for multiples of 3, "Buzz" for 5, "FizzBuzz" for both, else return String.valueOf(n).',
    language: 'Java',
    starterCode: 'public class Solution {\n    public String fizzBuzz(int n) {\n        // Your code here\n        return "";\n    }\n}',
    xpReward: 75,
  },

  // ── C++ (5) ──────────────────────────────────────────────────────────
  {
    id: 'cpp-hello-world',
    title: 'Hello World (C++)',
    difficulty: 'EASY',
    description: 'Write a function greet() that returns the std::string "Hello, SynergySphere!"',
    language: 'C++',
    starterCode: '#include <string>\nusing namespace std;\n\nstring greet() {\n    // Your code here\n    return "";\n}',
    xpReward: 50,
  },
  {
    id: 'cpp-factorial',
    title: 'Factorial (C++)',
    difficulty: 'EASY',
    description: 'Write long long factorial(int n) that computes n! iteratively. factorial(0) = 1.',
    language: 'C++',
    starterCode: 'long long factorial(int n) {\n    // Your code here\n    return 0;\n}',
    xpReward: 60,
  },
  {
    id: 'cpp-max-element',
    title: 'Array Maximum',
    difficulty: 'EASY',
    description: 'Write int maxElement(vector<int>& nums) that returns the largest element in the array without using std::max_element.',
    language: 'C++',
    starterCode: '#include <vector>\nusing namespace std;\n\nint maxElement(vector<int>& nums) {\n    // Your code here\n    return 0;\n}',
    xpReward: 55,
  },
  {
    id: 'cpp-is-palindrome',
    title: 'Palindrome (C++)',
    difficulty: 'MEDIUM',
    description: 'Write bool isPalindrome(string s) that returns true if the string reads the same forwards and backwards.',
    language: 'C++',
    starterCode: '#include <string>\nusing namespace std;\n\nbool isPalindrome(string s) {\n    // Your code here\n    return false;\n}',
    xpReward: 70,
  },
  {
    id: 'cpp-bubble-sort',
    title: 'Bubble Sort',
    difficulty: 'MEDIUM',
    description: 'Implement bubbleSort(vector<int>& arr) that sorts the array in ascending order in-place using bubble sort.',
    language: 'C++',
    starterCode: '#include <vector>\nusing namespace std;\n\nvoid bubbleSort(vector<int>& arr) {\n    // Your code here\n}',
    xpReward: 80,
  },

  // ── C# (5) ───────────────────────────────────────────────────────────
  {
    id: 'cs-hello-world',
    title: 'Hello World (C#)',
    difficulty: 'EASY',
    description: 'Write a method Greet() in a Solution class that returns the string "Hello, SynergySphere!"',
    language: 'C#',
    starterCode: 'public class Solution {\n    public string Greet() {\n        // Your code here\n        return "";\n    }\n}',
    xpReward: 50,
  },
  {
    id: 'cs-fibonacci',
    title: 'Fibonacci (C#)',
    difficulty: 'EASY',
    description: 'Write int Fibonacci(int n) in Solution. F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2). Use iteration.',
    language: 'C#',
    starterCode: 'public class Solution {\n    public int Fibonacci(int n) {\n        // Your code here\n        return 0;\n    }\n}',
    xpReward: 60,
  },
  {
    id: 'cs-reverse-string',
    title: 'Reverse String (C#)',
    difficulty: 'EASY',
    description: 'Write string ReverseString(string s) in Solution. Return the string reversed without using Array.Reverse.',
    language: 'C#',
    starterCode: 'public class Solution {\n    public string ReverseString(string s) {\n        // Your code here\n        return "";\n    }\n}',
    xpReward: 60,
  },
  {
    id: 'cs-count-words',
    title: 'Word Count',
    difficulty: 'MEDIUM',
    description: 'Write int CountWords(string s) that counts the number of words in the string (split by spaces, ignore extra spaces).',
    language: 'C#',
    starterCode: 'public class Solution {\n    public int CountWords(string s) {\n        // Your code here\n        return 0;\n    }\n}',
    xpReward: 75,
  },
  {
    id: 'cs-is-anagram',
    title: 'Is Anagram (C#)',
    difficulty: 'MEDIUM',
    description: 'Write bool IsAnagram(string s, string t) that returns true if s and t are anagrams of each other (same characters, different order).',
    language: 'C#',
    starterCode: 'public class Solution {\n    public bool IsAnagram(string s, string t) {\n        // Your code here\n        return false;\n    }\n}',
    xpReward: 75,
  },

  // ── SQL (6) ──────────────────────────────────────────────────────────
  {
    id: 'sql-top-students',
    title: 'Top Students',
    difficulty: 'EASY',
    description: 'Query the students table to find all students with GPA greater than 3.5. Return all columns.',
    language: 'SQL',
    starterCode: '-- Table: students(id, name, gpa, major)\nSELECT * FROM students\nWHERE -- your condition here',
    xpReward: 60,
  },
  {
    id: 'sql-count-records',
    title: 'Count All Users',
    difficulty: 'EASY',
    description: 'Write a query to count the total number of users in the users table. Return the result as "total_users".',
    language: 'SQL',
    starterCode: '-- Table: users(id, name, email, created_at)\nSELECT -- your query here',
    xpReward: 50,
  },
  {
    id: 'sql-average-salary',
    title: 'Average Salary by Dept',
    difficulty: 'MEDIUM',
    description: 'Write a query to get the average salary per department from the employees table. Only include departments with average salary > 50000.',
    language: 'SQL',
    starterCode: '-- Table: employees(id, name, department, salary)\nSELECT department, AVG(salary) AS avg_salary\nFROM employees\nGROUP BY department\nHAVING -- your condition here',
    xpReward: 80,
  },
  {
    id: 'sql-join-orders',
    title: 'Join Orders and Customers',
    difficulty: 'MEDIUM',
    description: 'Join the orders and customers tables to get each order\'s id, customer name, and total_amount. Only include orders where total_amount > 100.',
    language: 'SQL',
    starterCode: '-- orders(id, customer_id, total_amount, created_at)\n-- customers(id, name, email)\nSELECT o.id, c.name, o.total_amount\nFROM orders o\n-- Your JOIN and WHERE here',
    xpReward: 90,
  },
  {
    id: 'sql-top-n',
    title: 'Top 5 Highest Salaries',
    difficulty: 'MEDIUM',
    description: 'Write a query to find the top 5 employees with the highest salaries. Return name and salary, ordered highest to lowest.',
    language: 'SQL',
    starterCode: '-- Table: employees(id, name, department, salary)\nSELECT name, salary\nFROM employees\n-- Your ORDER BY and LIMIT here',
    xpReward: 75,
  },
  {
    id: 'sql-duplicate-emails',
    title: 'Find Duplicate Emails',
    difficulty: 'HARD',
    description: 'Write a query to find all emails that appear more than once in the users table. Return just the email column.',
    language: 'SQL',
    starterCode: '-- Table: users(id, name, email)\nSELECT email\nFROM users\nGROUP BY email\nHAVING -- your condition here',
    xpReward: 100,
  },

  // ── HTML (4) ─────────────────────────────────────────────────────────
  {
    id: 'html-heading-paragraph',
    title: 'Heading and Paragraph',
    difficulty: 'EASY',
    description: 'Create an h1 with text "SynergySphere" and a p tag below it with text "Learn. Build. Impact." Use correct semantic HTML.',
    language: 'HTML',
    starterCode: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>SynergySphere</title>\n</head>\n<body>\n  <!-- Your HTML here -->\n</body>\n</html>',
    xpReward: 40,
  },
  {
    id: 'html-form',
    title: 'Login Form',
    difficulty: 'MEDIUM',
    description: 'Build a login form with: an email input (type="email", required), a password input (type="password", required), and a submit button that says "Log In".',
    language: 'HTML',
    starterCode: '<form action="/login" method="POST">\n  <!-- Your form fields here -->\n</form>',
    xpReward: 70,
  },
  {
    id: 'html-nav',
    title: 'Navigation Bar',
    difficulty: 'MEDIUM',
    description: 'Create a <nav> element with an unordered list containing links: Home (/), About (/about), and Contact (/contact).',
    language: 'HTML',
    starterCode: '<!-- Build your nav here -->\n<nav>\n  <!-- Your code here -->\n</nav>',
    xpReward: 65,
  },
  {
    id: 'html-table',
    title: 'Data Table',
    difficulty: 'MEDIUM',
    description: 'Create an HTML table with headers: Name, Language, XP. Add 3 rows of sample data for learners.',
    language: 'HTML',
    starterCode: '<table>\n  <!-- Your table headers and rows here -->\n</table>',
    xpReward: 70,
  },

  // ── CSS (4) ──────────────────────────────────────────────────────────
  {
    id: 'css-center-div',
    title: 'Center a Div',
    difficulty: 'EASY',
    description: 'Using Flexbox, center a .box element both horizontally and vertically inside a .container that is 400px × 400px.',
    language: 'CSS',
    starterCode: '.container {\n  width: 400px;\n  height: 400px;\n  /* Your centering code here */\n}\n\n.box {\n  width: 100px;\n  height: 100px;\n  background-color: #4ade80;\n}',
    xpReward: 50,
  },
  {
    id: 'css-style-button',
    title: 'Style a Button',
    difficulty: 'EASY',
    description: 'Style a .btn class: green background (#16a34a), white text, 12px 24px padding, 6px border-radius, no border, pointer cursor, and a darker green on hover (#15803d).',
    language: 'CSS',
    starterCode: '.btn {\n  /* Your button styles here */\n}\n\n.btn:hover {\n  /* Hover state */\n}',
    xpReward: 50,
  },
  {
    id: 'css-grid-layout',
    title: 'CSS Grid Layout',
    difficulty: 'MEDIUM',
    description: 'Create a .grid container with 3 equal columns, a 16px gap, and make items inside have a light grey (#f3f4f6) background and 16px padding.',
    language: 'CSS',
    starterCode: '.grid {\n  /* Your grid container styles */\n}\n\n.grid-item {\n  /* Your grid item styles */\n}',
    xpReward: 70,
  },
  {
    id: 'css-card',
    title: 'Card Component',
    difficulty: 'MEDIUM',
    description: 'Style a .card: white background, 8px border-radius, a subtle box shadow (0 2px 8px rgba(0,0,0,0.1)), 24px padding, and a smooth box-shadow transition on hover (0 8px 24px rgba(0,0,0,0.15)).',
    language: 'CSS',
    starterCode: '.card {\n  /* Your card styles here */\n}\n\n.card:hover {\n  /* Hover enhancement */\n}',
    xpReward: 75,
  },

  // ── React (5) ────────────────────────────────────────────────────────
  {
    id: 'react-hello-component',
    title: 'Hello Component',
    difficulty: 'EASY',
    description: 'Create a functional component Greeting that accepts a name prop and renders <h1>Hello, {name}!</h1>',
    language: 'React',
    starterCode: "import React from 'react';\n\nfunction Greeting({ name }) {\n  // Your code here\n}\n\nexport default Greeting;",
    xpReward: 55,
  },
  {
    id: 'react-counter',
    title: 'Counter with useState',
    difficulty: 'MEDIUM',
    description: 'Build a Counter component using useState. Show the current count and two buttons: "Increment" and "Decrement". Start at 0.',
    language: 'React',
    starterCode: "import React, { useState } from 'react';\n\nfunction Counter() {\n  // Your code here\n}\n\nexport default Counter;",
    xpReward: 80,
  },
  {
    id: 'react-list-render',
    title: 'Render a List',
    difficulty: 'MEDIUM',
    description: 'Create a component TodoList that accepts an array of strings as items and renders them as an <ul> with <li> elements. Each li must have a unique key.',
    language: 'React',
    starterCode: "import React from 'react';\n\nfunction TodoList({ items }) {\n  // Your code here\n}\n\nexport default TodoList;",
    xpReward: 75,
  },
  {
    id: 'react-toggle',
    title: 'Toggle Component',
    difficulty: 'MEDIUM',
    description: 'Build a Toggle component that shows either "ON" or "OFF" text and a button that switches between states when clicked.',
    language: 'React',
    starterCode: "import React, { useState } from 'react';\n\nfunction Toggle() {\n  // Your code here\n}\n\nexport default Toggle;",
    xpReward: 80,
  },
  {
    id: 'react-fetch-data',
    title: 'Fetch and Display Data',
    difficulty: 'HARD',
    description: 'Build a component UserCard that fetches user data from "https://jsonplaceholder.typicode.com/users/1" using useEffect and displays the user name and email.',
    language: 'React',
    starterCode: "import React, { useState, useEffect } from 'react';\n\nfunction UserCard() {\n  // Your code here\n}\n\nexport default UserCard;",
    xpReward: 110,
  },

  // ── Node.js (5) ──────────────────────────────────────────────────────
  {
    id: 'node-http-server',
    title: 'HTTP Hello Server',
    difficulty: 'EASY',
    description: 'Create an HTTP server using Node\'s built-in http module that responds with "Hello from SynergySphere!" and status 200 on any request.',
    language: 'Node.js',
    starterCode: "const http = require('http');\n\nconst server = http.createServer((req, res) => {\n  // Your code here\n});\n\nserver.listen(3000);\nmodule.exports = server;",
    xpReward: 60,
  },
  {
    id: 'node-read-json',
    title: 'Parse JSON Data',
    difficulty: 'EASY',
    description: 'Write a function parseData(jsonString) that parses a JSON string and returns the object. If parsing fails, return null.',
    language: 'Node.js',
    starterCode: 'function parseData(jsonString) {\n  // Your code here\n}\n\nmodule.exports = parseData;',
    xpReward: 55,
  },
  {
    id: 'node-async-await',
    title: 'Async File Reader',
    difficulty: 'MEDIUM',
    description: 'Write an async function readConfig() that reads "config.json" using fs.promises.readFile, parses it, and returns the parsed object. Return null on any error.',
    language: 'Node.js',
    starterCode: "const fs = require('fs');\n\nasync function readConfig() {\n  // Your code here\n}\n\nmodule.exports = readConfig;",
    xpReward: 80,
  },
  {
    id: 'node-filter-users',
    title: 'Filter Active Users',
    difficulty: 'MEDIUM',
    description: 'Write filterActiveUsers(users) that takes an array of user objects {name, active} and returns only the users where active === true.',
    language: 'Node.js',
    starterCode: 'function filterActiveUsers(users) {\n  // Your code here\n}\n\nmodule.exports = filterActiveUsers;',
    xpReward: 65,
  },
  {
    id: 'node-event-emitter',
    title: 'Event Emitter',
    difficulty: 'HARD',
    description: 'Create a class EventBus extending EventEmitter. Add a method publish(event, data) that emits the event with data, and subscribe(event, handler) that registers a listener.',
    language: 'Node.js',
    starterCode: "const { EventEmitter } = require('events');\n\nclass EventBus extends EventEmitter {\n  publish(event, data) {\n    // Your code here\n  }\n\n  subscribe(event, handler) {\n    // Your code here\n  }\n}\n\nmodule.exports = EventBus;",
    xpReward: 110,
  },
];

/* ─────────────────────────── per-challenge test cases (JS only runs locally) ─── */

const challengeTests: Record<string, { fn: string; cases: TestCase[] }> = {
  'js-hello-world': {
    fn: 'greet',
    cases: [{ label: 'greet()', args: [], expected: 'Hello, SynergySphere!' }],
  },
  'js-sum-array': {
    fn: 'sumArray',
    cases: [
      { label: 'sumArray([1,2,3])', args: [[1, 2, 3]], expected: 6 },
      { label: 'sumArray([10,-2,5])', args: [[10, -2, 5]], expected: 13 },
      { label: 'sumArray([])', args: [[]], expected: 0 },
    ],
  },
  'js-fizzbuzz': {
    fn: 'fizzBuzz',
    cases: [
      { label: 'fizzBuzz(3)', args: [3], expected: 'Fizz' },
      { label: 'fizzBuzz(5)', args: [5], expected: 'Buzz' },
      { label: 'fizzBuzz(15)', args: [15], expected: 'FizzBuzz' },
      { label: 'fizzBuzz(7)', args: [7], expected: 7 },
      { label: 'fizzBuzz(1)', args: [1], expected: 1 },
    ],
  },
  'js-binary-search': {
    fn: 'binarySearch',
    cases: [
      { label: 'binarySearch([1,2,3,4,5],3)', args: [[1, 2, 3, 4, 5], 3], expected: 2 },
      { label: 'binarySearch([1,2,3,4,5],6)', args: [[1, 2, 3, 4, 5], 6], expected: -1 },
      { label: 'binarySearch([1,3,5,7,9],1)', args: [[1, 3, 5, 7, 9], 1], expected: 0 },
      { label: 'binarySearch([1,3,5,7,9],9)', args: [[1, 3, 5, 7, 9], 9], expected: 4 },
    ],
  },
  'js-two-sum': {
    fn: 'twoSum',
    cases: [
      { label: 'twoSum([2,7,11,15],9)', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { label: 'twoSum([3,2,4],6)', args: [[3, 2, 4], 6], expected: [1, 2] },
      { label: 'twoSum([3,3],6)', args: [[3, 3], 6], expected: [0, 1] },
    ],
  },
  'js-valid-parentheses': {
    fn: 'isValid',
    cases: [
      { label: 'isValid("()")', args: ['()'], expected: true },
      { label: 'isValid("()[]{}")', args: ['()[]{}'], expected: true },
      { label: 'isValid("(]")', args: ['(]'], expected: false },
      { label: 'isValid("{[]}")', args: ['{[]}'], expected: true },
    ],
  },
  'js-longest-substring': {
    fn: 'lengthOfLongestSubstring',
    cases: [
      { label: 'lengthOfLongestSubstring("abcabcbb")', args: ['abcabcbb'], expected: 3 },
      { label: 'lengthOfLongestSubstring("bbbbb")', args: ['bbbbb'], expected: 1 },
      { label: 'lengthOfLongestSubstring("pwwkew")', args: ['pwwkew'], expected: 3 },
      { label: 'lengthOfLongestSubstring("")', args: [''], expected: 0 },
    ],
  },
  'js-fibonacci': {
    fn: 'fib',
    cases: [
      { label: 'fib(0)', args: [0], expected: 0 },
      { label: 'fib(1)', args: [1], expected: 1 },
      { label: 'fib(4)', args: [4], expected: 3 },
      { label: 'fib(10)', args: [10], expected: 55 },
    ],
  },
  'js-merge-sorted': {
    fn: 'merge',
    cases: [
      { label: 'merge([1,3,5],[2,4,6])', args: [[1, 3, 5], [2, 4, 6]], expected: [1, 2, 3, 4, 5, 6] },
      { label: 'merge([1],[2])', args: [[1], [2]], expected: [1, 2] },
      { label: 'merge([],[1])', args: [[], [1]], expected: [1] },
    ],
  },
  'js-max-depth': {
    fn: 'maxDepth',
    cases: [
      { label: 'maxDepth([1,2,3])', args: [[1, 2, 3]], expected: 1 },
      { label: 'maxDepth([1,[2]])', args: [[1, [2]]], expected: 2 },
      { label: 'maxDepth([1,[2,[3]]])', args: [[1, [2, [3]]]], expected: 3 },
    ],
  },
  'js-flatten': {
    fn: 'flatten',
    cases: [
      { label: 'flatten([1,[2,3]])', args: [[1, [2, 3]]], expected: [1, 2, 3] },
      { label: 'flatten([1,[2,[3,[4]]]])', args: [[1, [2, [3, [4]]]]], expected: [1, 2, 3, 4] },
      { label: 'flatten([1,2,3])', args: [[1, 2, 3]], expected: [1, 2, 3] },
    ],
  },
  'ts-typed-greet': {
    fn: 'greet',
    cases: [
      { label: 'greet("Alice")', args: ['Alice'], expected: 'Hello, Alice! Welcome to SynergySphere.' },
      { label: 'greet("World")', args: ['World'], expected: 'Hello, World! Welcome to SynergySphere.' },
    ],
  },
  'ts-generic-identity': {
    fn: 'identity',
    cases: [
      { label: 'identity(42)', args: [42], expected: 42 },
      { label: 'identity("hello")', args: ['hello'], expected: 'hello' },
      { label: 'identity(true)', args: [true], expected: true },
    ],
  },
  'ts-union-types': {
    fn: 'format',
    cases: [
      { label: 'format(99)', args: [99], expected: '$99' },
      { label: 'format("hello")', args: ['hello'], expected: 'HELLO' },
      { label: 'format(0)', args: [0], expected: '$0' },
    ],
  },
  'ts-tuple-swap': {
    fn: 'swap',
    cases: [
      { label: 'swap([1,"a"])', args: [[1, 'a']], expected: ['a', 1] },
      { label: 'swap([true, 42])', args: [[true, 42]], expected: [42, true] },
    ],
  },
};

/* ─────────────────────────── AI hints ─────────────────────────── */

const challengeHints: Record<string, string[]> = {
  'js-hello-world': ['💡 Return the exact string with correct spelling and punctuation.'],
  'js-sum-array': ['💡 Use a for loop or Array.reduce() to accumulate the total.', '💡 Handle the empty array case — it should return 0.'],
  'js-fizzbuzz': ['💡 Check the combined condition (n % 3 === 0 && n % 5 === 0) FIRST before checking separately.', '💡 Use the modulo operator % to check divisibility.'],
  'js-binary-search': ['💡 Use two pointers: low = 0, high = arr.length - 1.', '💡 mid = Math.floor((low + high) / 2). Narrow the range each iteration.', '💡 Return -1 when low > high.'],
  'js-two-sum': ['💡 Use a Map: key = number, value = its index.', '💡 For each number check if (target - nums[i]) is already in the map.'],
  'js-valid-parentheses': ['💡 Use a stack. Push opening brackets, pop for closing.', '💡 Map closing → expected opening: ) → (, ] → [, } → {.', '💡 At the end the stack must be empty.'],
  'js-longest-substring': ['💡 Sliding window with two pointers (left, right).', '💡 Use a Map to track the last index of each character.'],
  'js-fibonacci': ['💡 Use two variables a=0, b=1 and swap them iteratively.', '💡 Handle base cases: fib(0)=0, fib(1)=1.'],
  'js-merge-sorted': ['💡 Concatenate both arrays then sort, or use a two-pointer merge.'],
  'js-max-depth': ['💡 Check if each element is an array. Recurse if so, track the max depth.'],
  'js-flatten': ['💡 Recurse: for each element, if it\'s an array call flatten(element), otherwise push it.'],
  'ts-typed-greet': ['💡 Use template literals: `Hello, ${name}! Welcome to SynergySphere.`'],
  'ts-generic-identity': ['💡 Simply return the value — the type parameter T handles the typing.'],
  'ts-interface-area': ['💡 For Rectangle, area = width * height.'],
  'ts-union-types': ['💡 Use typeof value === "number" to branch between the two types.', '💡 For string use toUpperCase(), for number prepend "$".'],
  'ts-tuple-swap': ['💡 Destructure the tuple: const [a, b] = tuple; then return [b, a].'],
  'py-hello-world': ['💡 return "Hello, SynergySphere!" — note the exact capitalisation.'],
  'py-list-sum': ['💡 Initialise total=0, loop through numbers, add each. Return total.'],
  'py-fizzbuzz': ['💡 Check n % 3 == 0 and n % 5 == 0 together first.', '💡 Use str(n) to convert the number for the else case.'],
  'py-palindrome': ['💡 Compare s.lower() == s.lower()[::-1] using slicing.'],
  'py-count-vowels': ['💡 Create a set of vowels, iterate the string, count matches.'],
  'java-hello-world': ['💡 return "Hello, SynergySphere!"; — include the semicolon in Java.'],
  'java-factorial': ['💡 Initialise result=1L, loop from 2 to n, multiply result *= i.'],
  'java-reverse-string': ['💡 Loop from end to start: char[] chars = s.toCharArray(); reverse manually.'],
  'java-is-prime': ['💡 n < 2 is not prime. Check divisors from 2 to Math.sqrt(n).'],
  'java-fizzbuzz': ['💡 Chain if / else if checks. Return String.valueOf(n) at the end.'],
  'cpp-hello-world': ['💡 return "Hello, SynergySphere!"; — note exact spelling.'],
  'cpp-factorial': ['💡 long long result = 1; for(int i=2;i<=n;i++) result *= i; return result;'],
  'cpp-max-element': ['💡 Initialise max to nums[0], then iterate comparing each element.'],
  'cpp-is-palindrome': ['💡 Use two pointers: one from start, one from end, compare inward.'],
  'cpp-bubble-sort': ['💡 Nested loops: outer n-1 passes, inner compares adjacent and swaps if out of order.'],
  'cs-hello-world': ['💡 return "Hello, SynergySphere!"; — note capitalisation.'],
  'cs-fibonacci': ['💡 if(n<=1) return n; Use int a=0, b=1; swap in a loop.'],
  'cs-reverse-string': ['💡 Convert to char array, use two pointers to swap from outside in.'],
  'cs-count-words': ['💡 Use s.Trim().Split(new char[]{\' \'}, StringSplitOptions.RemoveEmptyEntries).Length'],
  'cs-is-anagram': ['💡 Sort both strings as char arrays and compare, or use a frequency dictionary.'],
  'sql-top-students': ['💡 Use WHERE gpa > 3.5 — GPA is a floating-point field.'],
  'sql-count-records': ['💡 Use COUNT(*) to count all rows. Alias with AS total_users.'],
  'sql-average-salary': ['💡 GROUP BY department, then HAVING AVG(salary) > 50000.'],
  'sql-join-orders': ['💡 INNER JOIN customers c ON o.customer_id = c.id, then WHERE o.total_amount > 100.'],
  'sql-top-n': ['💡 ORDER BY salary DESC LIMIT 5 — DESC for highest first.'],
  'sql-duplicate-emails': ['💡 GROUP BY email HAVING COUNT(*) > 1.'],
  'html-heading-paragraph': ['💡 <h1>SynergySphere</h1> followed by <p>Learn. Build. Impact.</p>'],
  'html-form': ['💡 Use <input type="email" required> and <input type="password" required> inside the <form>.'],
  'html-nav': ['💡 <ul> inside <nav>, each link in an <li><a href="...">...</a></li>.'],
  'html-table': ['💡 Use <thead><tr><th> for headers and <tbody><tr><td> for data rows.'],
  'css-center-div': ['💡 On .container: display:flex; justify-content:center; align-items:center;'],
  'css-style-button': ['💡 Don\'t forget cursor:pointer; and the :hover rule for the darker shade.'],
  'css-grid-layout': ['💡 display:grid; grid-template-columns: repeat(3,1fr); gap:16px;'],
  'css-card': ['💡 box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: box-shadow 0.2s ease;'],
  'react-hello-component': ['💡 Destructure the prop: function Greeting({ name }) { return <h1>Hello, {name}!</h1>; }'],
  'react-counter': ['💡 const [count, setCount] = useState(0); buttons call setCount(c => c+1) and setCount(c => c-1).'],
  'react-list-render': ['💡 Use items.map((item, i) => <li key={i}>{item}</li>); inside a <ul>.'],
  'react-toggle': ['💡 const [on, setOn] = useState(false); <button onClick={() => setOn(v => !v)}> renders "ON"/"OFF".'],
  'react-fetch-data': ['💡 useEffect(() => { fetch(url).then(r => r.json()).then(setUser); }, []); show loading state.'],
  'node-http-server': ['💡 res.writeHead(200); res.end("Hello from SynergySphere!");'],
  'node-read-json': ['💡 Wrap JSON.parse in try/catch and return null in the catch block.'],
  'node-async-await': ['💡 try { const data = await fs.promises.readFile(path, "utf8"); return JSON.parse(data); } catch { return null; }'],
  'node-filter-users': ['💡 return users.filter(u => u.active === true);'],
  'node-event-emitter': ['💡 publish: this.emit(event, data); subscribe: this.on(event, handler);'],
};

/* ─────────────────────────── helpers ─────────────────────────── */

function getChallengeKey(id: string): string {
  return id;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function runLocalTests(code: string, challengeId: string): TestResult[] {
  const spec = challengeTests[challengeId];
  if (!spec) return [];

  let fn: (...args: unknown[]) => unknown;
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function(`${code}; return ${spec.fn};`);
    fn = factory();
    if (typeof fn !== 'function') throw new Error(`${spec.fn} is not a function`);
  } catch (e) {
    return spec.cases.map((c) => ({
      label: c.label,
      passed: false,
      expected: c.expected,
      got: undefined,
      error: (e as Error).message,
    }));
  }

  return spec.cases.map((tc) => {
    try {
      const got = fn(...(tc.args as unknown[]));
      const passed = deepEqual(got, tc.expected);
      return { label: tc.label, passed, expected: tc.expected, got };
    } catch (e) {
      return { label: tc.label, passed: false, expected: tc.expected, got: undefined, error: (e as Error).message };
    }
  });
}

const difficultyColor: Record<string, string> = {
  EASY: 'border-green-400/30 bg-green-400/10 text-green-300',
  MEDIUM: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  HARD: 'border-red-400/30 bg-red-400/10 text-red-300',
};

function isLocallyRunnable(challenge: Challenge): boolean {
  return !!challengeTests[challenge.id] && (challenge.language === 'JavaScript' || challenge.language === 'TypeScript');
}

/* ─────────────────────────── component ─────────────────────────── */

interface CodingChallengesSectionProps {
  showHeading?: boolean;
}

export function CodingChallengesSection({ showHeading = true }: CodingChallengesSectionProps) {
  const [challenges, setChallenges] = useState<Challenge[]>(fallbackChallenges);
  const [selected, setSelected] = useState<Challenge>(fallbackChallenges[0]);
  const [code, setCode] = useState(fallbackChallenges[0].starterCode || '');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [submitResult, setSubmitResult] = useState<{ passed: boolean; xpEarned: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');

  // Filters
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [languageFilter, setLanguageFilter] = useState('All');

  // AI hints
  const [hintIndex, setHintIndex] = useState(0);
  const [aiHint, setAiHint] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api<Challenge[]>('/challenges')
      .then((items) => {
        if (items.length) {
          setChallenges([...items, ...fallbackChallenges.filter(f => !items.find(i => i.id === f.id))]);
        }
      })
      .catch(() => {
        setPageError('Running offline — showing all built-in challenges. JavaScript challenges run fully in-browser.');
      });
  }, []);

  function selectChallenge(challenge: Challenge) {
    setSelected(challenge);
    setCode(challenge.starterCode || '');
    setTestResults([]);
    setSubmitResult(null);
    setHintIndex(0);
    setAiHint('');
    setShowHints(false);
  }

  async function handleRun() {
    setRunning(true);
    setSubmitResult(null);
    setTestResults([]);

    if (isLocallyRunnable(selected)) {
      setTimeout(() => {
        const results = runLocalTests(code, selected.id);
        setTestResults(results);
        setRunning(false);
      }, 50);
      return;
    }

    // Backend execution for non-JS / non-TS languages
    try {
      const res = await api<{ passed: boolean; output: string; error?: string }>(
        `/challenges/${selected.id}/test`,
        { method: 'POST', body: JSON.stringify({ code, language: selected.language }) }
      );
      setTestResults([{
        label: `${selected.language} — Run Verification`,
        passed: res.passed,
        expected: 'Correct output',
        got: res.output || (res.passed ? 'Success' : 'Incorrect output'),
        error: res.error,
      }]);
    } catch {
      // Graceful offline mode for non-JS languages
      setTestResults([{
        label: `${selected.language} — Backend required`,
        passed: false,
        expected: 'Server execution',
        got: 'Not connected',
        error: `${selected.language} code needs the backend server to run. Make sure the backend is online and try again, or click Submit to validate.`,
      }]);
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitResult(null);

    let localResults: TestResult[] = [];
    let allLocallyPassed = false;

    if (isLocallyRunnable(selected)) {
      localResults = runLocalTests(code, selected.id);
      setTestResults(localResults);
      allLocallyPassed = localResults.length > 0 && localResults.every((r) => r.passed);
    }

    try {
      const res = await api<{
        passed: boolean;
        xpEarned: number;
        testResults?: Array<{ label: string; passed: boolean; error?: string; expected?: any; got?: any }>;
        output?: string;
      }>(
        `/challenges/${selected.id}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            code,
            language: selected.language,
          }),
        }
      );

      if (res.testResults && res.testResults.length > 0) {
        setTestResults(
          res.testResults.map((r) => ({
            label: r.label,
            passed: r.passed,
            expected: r.expected,
            got: r.got,
            error: r.error,
          }))
        );
      } else if (!isLocallyRunnable(selected)) {
        setTestResults([
          {
            label: `${selected.language} — Server Judge`,
            passed: res.passed,
            expected: 'All server tests pass',
            got: res.output || (res.passed ? 'Accepted ✓' : 'Failed test verification'),
          },
        ]);
      }

      setSubmitResult({ passed: res.passed, xpEarned: res.xpEarned });
    } catch (err: any) {
      setSubmitResult({ passed: false, xpEarned: 0 });
      setPageError(err?.message || 'Submission failed. The server judge could not be contacted.');
    } finally {
      setSubmitting(false);
    }
  }

  async function getAiHint() {
    setHintLoading(true);
    setShowHints(true);
    const staticHints = challengeHints[selected.id] || [];
    try {
      const prompt = `I am working on this ${selected.language} coding challenge — "${selected.title}": ${selected.description}\n\nMy current code:\n${code}\n\nGive me ONE specific hint (1-2 sentences) without giving the full solution.`;
      const res = await api<{ response: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: prompt }),
      });
      setAiHint(res.response);
    } catch {
      const hint = staticHints[hintIndex % (staticHints.length || 1)] || 'Think about the algorithm complexity and whether a built-in data structure could help.';
      setAiHint(hint);
      setHintIndex((prev) => prev + 1);
    } finally {
      setHintLoading(false);
    }
  }

  function resetCode() {
    setCode(selected.starterCode || '');
    setTestResults([]);
    setSubmitResult(null);
  }

  // Combined filter: language + difficulty
  const filteredChallenges = challenges.filter((c) => {
    const langMatch = languageFilter === 'All' || c.language === languageFilter;
    const diffMatch = difficultyFilter === 'All' || c.difficulty === difficultyFilter.toUpperCase();
    return langMatch && diffMatch;
  });

  // Counts per language for badges
  const langCounts = ALL_LANGUAGES.reduce<Record<string, number>>((acc, lang) => {
    acc[lang] = lang === 'All' ? challenges.length : challenges.filter((c) => c.language === lang).length;
    return acc;
  }, {});

  const allPassed = testResults.length > 0 && testResults.every((r) => r.passed);
  const passedCount = testResults.filter((r) => r.passed).length;
  const localTestCases = challengeTests[selected.id]?.cases || [];
  const langColor = LANGUAGE_COLORS[selected.language || ''] || 'border-white/[0.08] bg-secondary/50 text-muted-foreground';
  const canRunLocally = isLocallyRunnable(selected);

  return (
    <div>
      {/* ── Header & Filters ── */}
      {showHeading && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Coding Challenges</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Interactive Coding Practice</h1>
          <p className="text-sm text-muted-foreground">
            Practice across all 11 Learning Hub languages. JavaScript &amp; TypeScript run in your browser — all others verified server-side.
          </p>
        </div>
      )}

      {/* Language tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {ALL_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguageFilter(lang)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              languageFilter === lang
                ? (LANGUAGE_COLORS[lang] || 'border-primary/50 bg-primary/15 text-primary')
                : 'border-white/[0.07] bg-secondary/40 text-muted-foreground hover:text-white'
            }`}
          >
            {lang}
            <span className="rounded bg-white/10 px-1 text-[10px]">{langCounts[lang]}</span>
          </button>
        ))}
      </div>

      {/* Difficulty filter */}
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Difficulty:</span>
        {['All', 'Easy', 'Medium', 'Hard'].map((f) => (
          <button
            key={f}
            onClick={() => setDifficultyFilter(f)}
            className={`rounded-md border px-2.5 py-1 text-xs transition ${
              difficultyFilter === f
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-white/[0.07] bg-secondary/40 text-muted-foreground hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {pageError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {pageError}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr_0.8fr]">
        {/* ── Challenge list ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Challenges
              </span>
              <span className="text-xs font-normal text-muted-foreground">{filteredChallenges.length} shown</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
            {filteredChallenges.map((challenge) => (
              <button
                key={challenge.id}
                onClick={() => selectChallenge(challenge)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selected.id === challenge.id
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-white/[0.07] bg-secondary/35 hover:border-primary/25'
                }`}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white leading-tight">{challenge.title}</p>
                  <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${difficultyColor[challenge.difficulty]}`}>
                    {challenge.difficulty}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{challenge.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${LANGUAGE_COLORS[challenge.language || ''] || 'text-muted-foreground'}`}>
                    {challenge.language}
                  </span>
                  <span className="text-[11px] text-primary">+{challenge.xpReward} XP</span>
                </div>
              </button>
            ))}
            {filteredChallenges.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No challenges match these filters.</p>
            )}
          </CardContent>
        </Card>

        {/* ── Code editor ── */}
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
            <div className="min-w-0">
              <CardTitle className="text-base">{selected.title}</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{selected.description}</p>
            </div>
            <div className="ml-3 flex shrink-0 flex-col items-end gap-1.5">
              <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${langColor}`}>
                {selected.language || 'JavaScript'}
              </span>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${difficultyColor[selected.difficulty]}`}>
                {selected.difficulty}
              </span>
              {canRunLocally && (
                <span className="rounded bg-green-400/10 px-1.5 py-0.5 text-[10px] text-green-400">⚡ In-browser</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-[300px] w-full resize-none rounded-lg border border-white/[0.08] bg-[#050a0d] p-4 font-mono text-sm leading-6 text-green-100 outline-none focus:ring-2 focus:ring-primary/30"
                spellCheck={false}
                placeholder={`Write your ${selected.language || 'code'} here…`}
              />
              <button
                onClick={resetCode}
                title="Reset to starter code"
                className="absolute right-3 top-3 rounded-md border border-white/[0.08] bg-secondary/60 p-1.5 text-muted-foreground transition hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleRun} disabled={running || submitting} className="gap-2">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? 'Running…' : canRunLocally ? 'Run Tests' : 'Test (Backend)'}
              </Button>
              <Button onClick={handleSubmit} disabled={running || submitting} variant="secondary" className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? 'Submitting…' : 'Submit'}
              </Button>
              {submitResult && (
                <div className={`flex items-center gap-2 text-sm ${submitResult.passed ? 'text-green-300' : 'text-red-300'}`}>
                  {submitResult.passed ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {submitResult.passed
                    ? `All tests passed! +${submitResult.xpEarned} XP earned`
                    : 'Incorrect — keep trying!'}
                </div>
              )}
            </div>

            {/* Test results */}
            {testResults.length > 0 && (
              <div className="rounded-lg border border-white/[0.08] bg-[#050a0d] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white">
                    Test Results:{' '}
                    <span className={allPassed ? 'text-green-300' : 'text-amber-300'}>
                      {passedCount}/{testResults.length} passed
                    </span>
                  </p>
                  {allPassed && <CheckCircle className="h-4 w-4 text-green-400" />}
                </div>
                {testResults.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded-md border p-2.5 font-mono text-xs ${
                      r.passed
                        ? 'border-green-400/20 bg-green-400/5 text-green-300'
                        : 'border-red-400/20 bg-red-400/5 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r.passed ? '✓' : '✗'}
                      <span className="font-semibold">{r.label}</span>
                    </div>
                    {!r.passed && (
                      <div className="mt-1 pl-4 font-sans text-muted-foreground">
                        {r.error ? (
                          <span className="text-red-400 text-[11px]">{r.error}</span>
                        ) : (
                          <>
                            <div className="text-[11px]">Expected: <span className="text-white">{JSON.stringify(r.expected)}</span></div>
                            <div className="text-[11px]">Got: <span className="text-white">{JSON.stringify(r.got)}</span></div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Progress bar */}
            {testResults.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className={allPassed ? 'text-green-300' : 'text-amber-300'}>{passedCount} / {testResults.length}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${allPassed ? 'bg-green-400' : 'bg-primary'}`}
                    style={{ width: `${testResults.length ? (passedCount / testResults.length) * 100 : 0}%` }}
                  />
                </div>
                {allPassed && (
                  <p className="text-xs text-green-300 font-semibold text-center">
                    🎉 All tests pass! Press Submit to claim +{selected.xpReward} XP.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right panel ── */}
        <div className="space-y-4">
          {/* Test cases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Test Cases
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canRunLocally && localTestCases.length > 0 ? (
                localTestCases.map((tc, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-2.5 font-mono text-xs ${
                      testResults[i]?.passed === true
                        ? 'border-green-400/25 bg-green-400/5 text-green-300'
                        : testResults[i]?.passed === false
                        ? 'border-red-400/25 bg-red-400/5 text-red-300'
                        : 'border-white/[0.07] bg-secondary/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {testResults[i]?.passed === true ? '✓ ' : testResults[i]?.passed === false ? '✗ ' : '○ '}
                      <span>{tc.label}</span>
                    </div>
                    <div className="mt-1 pl-4 text-[10px] opacity-70">→ {JSON.stringify(tc.expected)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-white/[0.07] bg-secondary/30 p-3">
                  <p className="text-xs font-semibold text-white mb-1">{selected.language} challenge</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {canRunLocally
                      ? 'Click "Run Tests" to execute locally in your browser.'
                      : 'This challenge is verified server-side. Click "Test (Backend)" to check your solution, or click Submit to submit.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Hints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                AI Hints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-5 text-muted-foreground">
                Stuck? Get a {selected.language}-specific hint without spoiling the answer.
              </p>
              <Button variant="secondary" size="sm" className="w-full gap-2" onClick={getAiHint} disabled={hintLoading}>
                {hintLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
                {hintLoading ? 'Getting hint…' : 'Get AI Hint'}
              </Button>

              {showHints && aiHint && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground font-sans">
                  {aiHint}
                </div>
              )}

              <div className="pt-1">
                <button
                  onClick={() => setShowHints((v) => !v)}
                  className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-white transition"
                >
                  <span>Quick tips for this challenge</span>
                  {showHints ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showHints && (
                  <div className="mt-2 space-y-2">
                    {(challengeHints[selected.id] || ['💡 Break the problem into smaller steps and tackle each one individually.']).map((hint, i) => (
                      <p key={i} className="text-xs leading-5 text-muted-foreground">{hint}</p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Language info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Language Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${langColor}`}>
                {selected.language}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {canRunLocally
                  ? '⚡ Runs instantly in-browser — no server needed.'
                  : '🖥️ Requires backend for execution. Make sure the backend is running.'}
              </p>
              <p className="text-xs text-muted-foreground">
                {challenges.filter((c) => c.language === selected.language).length} challenges available in {selected.language}.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
