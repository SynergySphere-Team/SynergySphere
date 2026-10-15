import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, TextInput, Modal, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { CurriculumDashboard } from '@/components/curriculum/CurriculumDashboard';
import { LessonViewer } from '@/components/curriculum/LessonViewer';
import type { Challenge, LearningResource } from '@/types/api';

const ALL_LANGUAGES = ['All', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'SQL', 'HTML', 'CSS', 'React', 'Node.js'] as const;
const DIFFICULTIES = ['ALL', 'EASY', 'MEDIUM', 'HARD'] as const;

export interface BuiltinChallenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  description: string;
  language: string;
  starterCode: string;
  solution?: string;
  hint: string;
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  xpReward: number;
}

export const BUILTIN_CHALLENGES: BuiltinChallenge[] = [
  // ── JavaScript ────────────────────────────────────────────────────────
  {
    id: 'js-hello-world',
    title: 'Hello World',
    difficulty: 'EASY',
    description: 'Write a function greet() that returns the string "Hello, SynergySphere!" exactly matching punctuation and casing.',
    language: 'JavaScript',
    starterCode: 'function greet() {\n  // TODO: Return "Hello, SynergySphere!"\n  return "";\n}',
    hint: 'Return the exact string with matching capitalization: "Hello, SynergySphere!".',
    approach: 'Declare function greet() with 0 parameters and return the target string literal.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 50,
  },
  {
    id: 'js-sum-array',
    title: 'Sum of Array Elements',
    difficulty: 'EASY',
    description: 'Write a function sumArray(arr) that computes and returns the sum of all numerical elements in an array.',
    language: 'JavaScript',
    starterCode: 'function sumArray(arr) {\n  // TODO: Return sum of array numbers\n  return 0;\n}',
    hint: 'GeeksforGeeks Technique: Use array.reduce((acc, curr) => acc + curr, 0) or a standard for...of loop.',
    approach: 'Initialize accumulator to 0. Iterate through array elements and add each element. Return accumulator.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    xpReward: 50,
  },
  {
    id: 'js-palindrome',
    title: 'Palindrome Check',
    difficulty: 'EASY',
    description: 'Write isPalindrome(str) returning true if the string reads the same forwards and backwards, false otherwise.',
    language: 'JavaScript',
    starterCode: 'function isPalindrome(str) {\n  // TODO: Return true if str is palindrome\n  return false;\n}',
    hint: 'Compare str with str.split("").reverse().join(""), or use two pointers from both ends moving inward.',
    approach: 'Two Pointer Approach: Set left = 0, right = str.length - 1. While left < right, if str[left] !== str[right] return false. Increment left, decrement right. Return true.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    xpReward: 55,
  },
  {
    id: 'js-two-sum',
    title: 'Two Sum (Hash Map Optimal)',
    difficulty: 'MEDIUM',
    description: 'Given an array nums and target integer, return the indices [index1, index2] of two numbers that add up to target in O(N) time.',
    language: 'JavaScript',
    starterCode: 'function twoSum(nums, target) {\n  // TODO: Return indices [i, j] in O(N) time\n  return [];\n}',
    hint: 'GeeksforGeeks Optimal Approach: Store visited values in a Map (Map<number, number>). Check if map.has(target - nums[i]).',
    approach: 'One-Pass Hash Map: Iterate through nums. For each index i, compute complement = target - nums[i]. If complement in map, return [map.get(complement), i]. Else map.set(nums[i], i).',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 75,
  },
  {
    id: 'js-fizzbuzz',
    title: 'FizzBuzz',
    difficulty: 'MEDIUM',
    description: 'Write fizzBuzz(n). Return "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both 3 and 5, else return n.',
    language: 'JavaScript',
    starterCode: 'function fizzBuzz(n) {\n  // TODO: Return "Fizz", "Buzz", "FizzBuzz", or n\n  return n;\n}',
    hint: 'Check divisibility by 15 (both 3 and 5) first, then 3, then 5.',
    approach: 'Evaluate modulo operators: if (n % 15 === 0) return "FizzBuzz"; else if (n % 3 === 0) return "Fizz"; else if (n % 5 === 0) return "Buzz"; else return n.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 75,
  },
  {
    id: 'js-valid-parentheses',
    title: 'Valid Parentheses (Stack)',
    difficulty: 'HARD',
    description: 'Given a string containing "(", ")", "{", "}", "[", "]", determine if the input string is valid using a Stack data structure.',
    language: 'JavaScript',
    starterCode: 'function isValid(s) {\n  // TODO: Validate bracket pairs using a stack\n  return false;\n}',
    hint: 'GeeksforGeeks Stack Pattern: Push opening brackets onto array stack. When closing bracket appears, check stack.pop() matches.',
    approach: 'Push open brackets into stack. On close bracket, return false if stack empty or popped top does not match matching pair. After loop, return stack.length === 0.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 100,
  },
  {
    id: 'js-binary-search',
    title: 'Binary Search',
    difficulty: 'HARD',
    description: 'Implement binarySearch(arr, target) on a sorted array. Return target index or -1 in logarithmic O(log N) time.',
    language: 'JavaScript',
    starterCode: 'function binarySearch(arr, target) {\n  // TODO: Implement O(log N) binary search\n  return -1;\n}',
    hint: 'Calculate mid = low + Math.floor((high - low) / 2) to prevent potential 32-bit integer overflow.',
    approach: 'Set low = 0, high = arr.length - 1. While low <= high: mid = low + Math.floor((high - low) / 2). If arr[mid] === target return mid; if arr[mid] < target low = mid + 1; else high = mid - 1. Return -1 if not found.',
    timeComplexity: 'O(log N)',
    spaceComplexity: 'O(1)',
    xpReward: 100,
  },

  // ── TypeScript ────────────────────────────────────────────────────────
  {
    id: 'ts-typed-sum',
    title: 'Typed Array Sum',
    difficulty: 'EASY',
    description: 'Write a TypeScript function sumNumbers(nums: number[]): number that computes the sum of numerical items.',
    language: 'TypeScript',
    starterCode: 'function sumNumbers(nums: number[]): number {\n  // TODO: Return sum of nums array\n  return 0;\n}',
    hint: 'Specify return type : number and use nums.reduce((acc, n) => acc + n, 0).',
    approach: 'Loop through array using typed parameter nums: number[]. Return accumulated total with return type number.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    xpReward: 50,
  },
  {
    id: 'ts-filter-active',
    title: 'Filter Active Users',
    difficulty: 'EASY',
    description: 'Given interface User { id: number; name: string; isActive: boolean; }, implement getActiveUsers(users: User[]): User[].',
    language: 'TypeScript',
    starterCode: 'interface User {\n  id: number;\n  name: string;\n  isActive: boolean;\n}\n\nfunction getActiveUsers(users: User[]): User[] {\n  // TODO: Return only users where isActive is true\n  return [];\n}',
    hint: 'Use users.filter((u) => u.isActive) to produce a type-safe filtered list.',
    approach: 'Filter array matching predicate u.isActive === true.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 55,
  },
  {
    id: 'ts-two-sum',
    title: 'Type-Safe Two Sum',
    difficulty: 'MEDIUM',
    description: 'Write a type-safe function twoSum(nums: number[], target: number): [number, number] | null using Map<number, number>.',
    language: 'TypeScript',
    starterCode: 'function twoSum(nums: number[], target: number): [number, number] | null {\n  // TODO: Return tuple [index1, index2] or null\n  return null;\n}',
    hint: 'Use const map = new Map<number, number>(); to store value-to-index mappings.',
    approach: 'Instantiate Map<number, number>. Check map.has(target - nums[i]) before inserting into map.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 75,
  },
  {
    id: 'ts-event-emitter',
    title: 'Type-Safe Event Emitter',
    difficulty: 'HARD',
    description: 'Implement a generic TypedEventEmitter<TEvents extends Record<string, any>> supporting strictly-typed on() and emit() methods.',
    language: 'TypeScript',
    starterCode: 'class TypedEventEmitter<TEvents extends Record<string, any>> {\n  private listeners = new Map<keyof TEvents, Set<(data: any) => void>>();\n\n  on<K extends keyof TEvents>(event: K, listener: (data: TEvents[K]) => void): void {\n    // TODO: Register listener\n  }\n\n  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {\n    // TODO: Execute listeners\n  }\n}',
    hint: 'GeeksforGeeks Generics: Map keyof TEvents to typed callbacks taking TEvents[K].',
    approach: 'Store listeners in a Map with Set collections for each event key. On emit, iterate listeners for that event and invoke with payload.',
    timeComplexity: 'O(1) on, O(K) emit',
    spaceComplexity: 'O(E + L)',
    xpReward: 100,
  },

  // ── Python ────────────────────────────────────────────────────────────
  {
    id: 'py-reverse-string',
    title: 'Reverse a String in Python',
    difficulty: 'EASY',
    description: 'Write reverse_string(s: str) -> str that returns the reversed string using Python slicing or iteration.',
    language: 'Python',
    starterCode: 'def reverse_string(s: str) -> str:\n    # TODO: Return reversed string\n    return ""',
    hint: 'GeeksforGeeks Slicing: Python supports s[::-1] which creates a reversed string in O(N) time.',
    approach: 'Return slice s[::-1] or "".join(reversed(s)).',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 50,
  },
  {
    id: 'py-list-sum',
    title: 'Sum of Elements in List',
    difficulty: 'EASY',
    description: 'Write sum_list(numbers: list) -> int that computes the sum of all integers in numbers without using the built-in sum() function.',
    language: 'Python',
    starterCode: 'def sum_list(numbers: list) -> int:\n    # TODO: Return sum of all numbers in list\n    return 0',
    hint: 'Initialize total = 0 and accumulate each element with a for loop.',
    approach: 'Set total = 0. For each num in numbers: total += num. Return total.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    xpReward: 50,
  },
  {
    id: 'py-palindrome',
    title: 'Palindrome String',
    difficulty: 'EASY',
    description: 'Write is_palindrome(s: str) -> bool returning True if string s reads the same forwards and backwards.',
    language: 'Python',
    starterCode: 'def is_palindrome(s: str) -> bool:\n    # TODO: Return True if s is a palindrome\n    return False',
    hint: 'Compare s == s[::-1] or use two index pointers left and right.',
    approach: 'Check if s is identical to its reversed representation.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    xpReward: 55,
  },
  {
    id: 'py-two-sum',
    title: 'Two Sum (Python Dictionary)',
    difficulty: 'MEDIUM',
    description: 'Write two_sum(nums: list, target: int) -> list returning indices [i, j] adding to target using a dictionary lookup.',
    language: 'Python',
    starterCode: 'def two_sum(nums: list, target: int) -> list:\n    # TODO: Return indices [i, j] adding up to target\n    return []',
    hint: 'GeeksforGeeks Dictionary Lookup: Store seen[num] = index. For each element, check if (target - num) in seen.',
    approach: 'Initialize seen = {}. For i, num in enumerate(nums): complement = target - num. If complement in seen: return [seen[complement], i]. seen[num] = i. Return [].',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 75,
  },
  {
    id: 'py-missing-number',
    title: 'Find Missing Number in Array',
    difficulty: 'MEDIUM',
    description: 'Given an array of size n-1 containing distinct integers in range [1, n], find the missing number using Gauss summation formula.',
    language: 'Python',
    starterCode: 'def find_missing_number(arr: list, n: int) -> int:\n    # TODO: Return missing integer from 1 to n\n    return 0',
    hint: 'Expected sum of 1..n is n * (n + 1) // 2. The missing number is expected_sum - sum(arr).',
    approach: 'Calculate expected_total = n * (n + 1) // 2. Calculate actual_total = sum(arr). Return expected_total - actual_total.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    xpReward: 75,
  },
  {
    id: 'py-binary-search',
    title: 'Binary Search in Python',
    difficulty: 'HARD',
    description: 'Implement binary_search(arr: list, target: int) -> int on a sorted array returning target index or -1 in O(log N).',
    language: 'Python',
    starterCode: 'def binary_search(arr: list, target: int) -> int:\n    # TODO: Return target index or -1\n    return -1',
    hint: 'Calculate mid = low + (high - low) // 2 to avoid overflow.',
    approach: 'low, high = 0, len(arr) - 1. While low <= high: mid = (low + high) // 2. If arr[mid] == target return mid. If arr[mid] < target low = mid + 1 else high = mid - 1. Return -1.',
    timeComplexity: 'O(log N)',
    spaceComplexity: 'O(1)',
    xpReward: 100,
  },

  // ── Java ──────────────────────────────────────────────────────────────
  {
    id: 'java-reverse-array',
    title: 'Reverse an Array',
    difficulty: 'EASY',
    description: 'Write reverseArray(int[] arr) in class Solution that reverses the array in-place and returns it.',
    language: 'Java',
    starterCode: 'public class Solution {\n  public int[] reverseArray(int[] arr) {\n    // TODO: Reverse array elements in-place\n    return arr;\n  }\n}',
    hint: 'Use two pointers: left = 0 and right = arr.length - 1. Swap elements until left >= right.',
    approach: 'Initialize left = 0, right = arr.length - 1. While left < right, swap arr[left] and arr[right], then left++, right--. Return arr.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    xpReward: 50,
  },
  {
    id: 'java-check-prime',
    title: 'Check for Prime Number',
    difficulty: 'EASY',
    description: 'Write isPrime(int n) in class Solution returning true if n is prime, false if n <= 1 or divisible by any integer up to sqrt(n).',
    language: 'Java',
    starterCode: 'public class Solution {\n  public boolean isPrime(int n) {\n    // TODO: Return true if n is prime\n    return false;\n  }\n}',
    hint: 'If n <= 1 return false. Check divisibility up to i * i <= n.',
    approach: 'If n <= 1 return false. If n <= 3 return true. If n % 2 == 0 || n % 3 == 0 return false. Iterate for i = 5; i * i <= n; i += 6: if n % i == 0 || n % (i + 2) == 0 return false. Return true.',
    timeComplexity: 'O(sqrt(N))',
    spaceComplexity: 'O(1)',
    xpReward: 55,
  },
  {
    id: 'java-two-sum',
    title: 'Two Sum with HashMap',
    difficulty: 'MEDIUM',
    description: 'Write twoSum(int[] nums, int target) in class Solution returning indices as int[] in O(N) time using HashMap.',
    language: 'Java',
    starterCode: 'import java.util.HashMap;\n\npublic class Solution {\n  public int[] twoSum(int[] nums, int target) {\n    // TODO: Return new int[]{i, j}\n    return new int[]{};\n  }\n}',
    hint: 'HashMap<Integer, Integer> map = new HashMap<>(); Check map.containsKey(target - nums[i]).',
    approach: 'Instantiate HashMap<Integer, Integer>. Loop i from 0 to nums.length - 1: complement = target - nums[i]. If map contains complement, return new int[]{map.get(complement), i}. Put nums[i], i into map. Return empty array if not found.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 75,
  },
  {
    id: 'java-binary-search',
    title: 'Binary Search',
    difficulty: 'HARD',
    description: 'Implement binarySearch(int[] arr, int target) returning target index or -1, preventing 32-bit integer overflow.',
    language: 'Java',
    starterCode: 'public class Solution {\n  public int binarySearch(int[] arr, int target) {\n    // TODO: Return target index or -1\n    return -1;\n  }\n}',
    hint: 'Avoid integer overflow when computing mid with low + (high - low) / 2.',
    approach: 'Set low = 0, high = arr.length - 1. While low <= high: mid = low + (high - low) / 2. If arr[mid] == target return mid; if arr[mid] < target low = mid + 1; else high = mid - 1. Return -1.',
    timeComplexity: 'O(log N)',
    spaceComplexity: 'O(1)',
    xpReward: 100,
  },

  // ── C++ ───────────────────────────────────────────────────────────────
  {
    id: 'cpp-min-max',
    title: 'Find Minimum and Maximum in Array',
    difficulty: 'EASY',
    description: 'Write getMinMax(const vector<int>& arr) returning pair<int, int> containing the minimum and maximum elements.',
    language: 'C++',
    starterCode: '#include <vector>\n#include <utility>\nusing namespace std;\n\npair<int, int> getMinMax(const vector<int>& arr) {\n  // TODO: Return {min_val, max_val}\n  return {0, 0};\n}',
    hint: 'Initialize min_val and max_val to arr[0]. Iterate through array updating min and max.',
    approach: 'Traverse array from index 1. Compare each element with current min and max. Return pair {min_val, max_val}.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    xpReward: 50,
  },
  {
    id: 'cpp-kadane',
    title: 'Maximum Subarray Sum (Kadane\'s)',
    difficulty: 'MEDIUM',
    description: 'Implement maxSubarraySum(const vector<int>& nums) that finds the maximum sum of a contiguous subarray in O(N) time.',
    language: 'C++',
    starterCode: '#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint maxSubarraySum(const vector<int>& nums) {\n  // TODO: Implement Kadane\'s algorithm in O(N)\n  return 0;\n}',
    hint: 'GeeksforGeeks Kadane: Maintain max_so_far and curr_max. curr_max = max(x, curr_max + x); max_so_far = max(max_so_far, curr_max).',
    approach: 'Set max_so_far = nums[0], curr_max = nums[0]. For i from 1 to nums.size() - 1: curr_max = max(nums[i], curr_max + nums[i]); max_so_far = max(max_so_far, curr_max). Return max_so_far.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    xpReward: 80,
  },
  {
    id: 'cpp-binary-search',
    title: 'Binary Search in C++',
    difficulty: 'HARD',
    description: 'Implement binarySearch(const vector<int>& arr, int target) returning index or -1 using iterative divide-and-conquer.',
    language: 'C++',
    starterCode: '#include <vector>\nusing namespace std;\n\nint binarySearch(const vector<int>& arr, int target) {\n  // TODO: Return target index or -1\n  return -1;\n}',
    hint: 'Calculate mid = low + (high - low) / 2.',
    approach: 'low = 0, high = arr.size() - 1. While low <= high: mid = low + (high - low) / 2. If arr[mid] == target return mid; if arr[mid] < target low = mid + 1; else high = mid - 1. Return -1.',
    timeComplexity: 'O(log N)',
    spaceComplexity: 'O(1)',
    xpReward: 100,
  },

  // ── C# ────────────────────────────────────────────────────────────────
  {
    id: 'cs-reverse-string',
    title: 'Reverse a String in C#',
    difficulty: 'EASY',
    description: 'Write ReverseString(string s) in class Solution that returns the reversed string using char array or iteration.',
    language: 'C#',
    starterCode: 'public class Solution {\n  public string ReverseString(string s) {\n    // TODO: Return reversed string\n    return "";\n  }\n}',
    hint: 'Convert string to char[] using s.ToCharArray(), swap in-place with two pointers, and return new string(chars).',
    approach: 'char[] arr = s.ToCharArray(); Array.Reverse(arr); return new string(arr);',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 50,
  },
  {
    id: 'cs-two-sum',
    title: 'Two Sum in C#',
    difficulty: 'MEDIUM',
    description: 'Write TwoSum(int[] nums, int target) returning int[] indices using Dictionary<int, int> in O(N) time.',
    language: 'C#',
    starterCode: 'using System.Collections.Generic;\n\npublic class Solution {\n  public int[] TwoSum(int[] nums, int target) {\n    // TODO: Return new int[]{i, j}\n    return new int[0];\n  }\n}',
    hint: 'Use Dictionary<int, int> dict = new Dictionary<int, int>(); and check dict.ContainsKey(target - nums[i]).',
    approach: 'Iterate nums. Compute complement = target - nums[i]. If dict contains complement, return new int[]{dict[complement], i}. dict[nums[i]] = i.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 75,
  },
  {
    id: 'cs-balanced-brackets',
    title: 'Balanced Brackets using Stack',
    difficulty: 'HARD',
    description: 'Write IsBalanced(string s) returning true if all bracket pairs in s are balanced, using Stack<char>.',
    language: 'C#',
    starterCode: 'using System.Collections.Generic;\n\npublic class Solution {\n  public bool IsBalanced(string s) {\n    // TODO: Validate bracket pairs using Stack<char>\n    return false;\n  }\n}',
    hint: 'Stack<char> stack = new Stack<char>(); Push openers, pop and compare closers.',
    approach: 'Traverse string. Push (, {, [ into stack. When seeing matching closer, if stack empty or popped char doesn\'t match, return false. Return stack.Count == 0.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 100,
  },

  // ── SQL ───────────────────────────────────────────────────────────────
  {
    id: 'sql-top-students',
    title: 'Filter High GPA Students',
    difficulty: 'EASY',
    description: 'Query the students table to find students with GPA > 3.5, ordered by name.',
    language: 'SQL',
    starterCode: '-- Table: students(id, name, gpa)\nSELECT name, gpa\nFROM students\nWHERE gpa > 3.5\nORDER BY name;',
    hint: 'Use WHERE gpa > 3.5 and ORDER BY name.',
    approach: 'Filter rows using WHERE clause and sort output with ORDER BY.',
    timeComplexity: 'O(N log N)',
    spaceComplexity: 'O(N)',
    xpReward: 50,
  },
  {
    id: 'sql-customers',
    title: 'Active Customers Count',
    difficulty: 'MEDIUM',
    description: 'Write a SQL query to count active customers grouped by country having more than 5 users.',
    language: 'SQL',
    starterCode: '-- Table: users(id, name, country, status)\nSELECT country, COUNT(*) AS active_users\nFROM users\nWHERE status = \'active\'\nGROUP BY country\nHAVING COUNT(*) > 5;',
    hint: 'Filter on status before GROUP BY and filter aggregated count using HAVING.',
    approach: 'Filter records with WHERE status = "active". Group records with GROUP BY country. Filter aggregate groups with HAVING COUNT(*) > 5.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(K)',
    xpReward: 80,
  },
  {
    id: 'sql-second-highest',
    title: 'Second Highest Salary',
    difficulty: 'HARD',
    description: 'Find the second highest salary from employees table using a subquery.',
    language: 'SQL',
    starterCode: '-- Table: employees(id, name, department, salary)\nSELECT MAX(salary) AS SecondHighestSalary\nFROM employees\nWHERE salary < (SELECT MAX(salary) FROM employees);',
    hint: 'Find the MAX(salary) strictly less than the overall MAX(salary).',
    approach: 'Nested query: Outer query selects MAX(salary) where salary < (SELECT MAX(salary) FROM employees).',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(1)',
    xpReward: 90,
  },

  // ── HTML ──────────────────────────────────────────────────────────────
  {
    id: 'html-semantic-form',
    title: 'Semantic Registration Form',
    difficulty: 'EASY',
    description: 'Write semantic HTML5 form markup with action="/register", method="POST", required email input, and submit button.',
    language: 'HTML',
    starterCode: '<!-- Create an accessible registration form -->\n<form action="/register" method="POST">\n  <label for="email">Email Address:</label>\n  <input type="email" id="email" name="email" required />\n  <button type="submit">Register</button>\n</form>',
    hint: 'Ensure input has type="email" and the required attribute.',
    approach: 'Use semantic <form> container, pair <label for="id"> with <input id="id"> for screen reader accessibility.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 50,
  },
  {
    id: 'html-accessible-dialog',
    title: 'Accessible Modal Dialog',
    difficulty: 'MEDIUM',
    description: 'Build an accessible HTML5 <dialog> element with aria-labelledby and autofocus dismiss button.',
    language: 'HTML',
    starterCode: '<dialog id="confirm-modal" aria-labelledby="dialog-title">\n  <h2 id="dialog-title">Confirm Action</h2>\n  <p>Are you sure you wish to proceed?</p>\n  <button type="button" autofocus>Cancel</button>\n</dialog>',
    hint: 'Use the native <dialog> element and link aria-labelledby to the modal title ID.',
    approach: 'HTML5 native dialog provides built-in accessibility and focus trapping when opened via showModal().',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 70,
  },
  {
    id: 'html-responsive-picture',
    title: 'Responsive Picture Element',
    difficulty: 'HARD',
    description: 'Write a responsive <picture> element supporting WebP for desktop (min-width: 1024px) and mobile fallbacks.',
    language: 'HTML',
    starterCode: '<picture>\n  <source media="(min-width: 1024px)" srcset="hero-large.webp" type="image/webp">\n  <source media="(max-width: 1023px)" srcset="hero-mobile.webp" type="image/webp">\n  <img src="hero-fallback.jpg" alt="Hero banner" loading="lazy" />\n</picture>',
    hint: 'Order <source> elements from most specific to least specific and include a fallback <img> element.',
    approach: 'Browser evaluates <source> media queries from top to bottom and selects the optimal format, reducing network payload.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 85,
  },

  // ── CSS ───────────────────────────────────────────────────────────────
  {
    id: 'css-center-flexbox',
    title: 'Center Element with Flexbox',
    difficulty: 'EASY',
    description: 'Write CSS to perfectly center child items horizontally and vertically inside a container using Flexbox.',
    language: 'CSS',
    starterCode: '.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n}',
    hint: 'GeeksforGeeks Flexbox: Use justify-content: center for main axis and align-items: center for cross axis.',
    approach: 'Set display: flex on container. Align items along both axes with justify-content and align-items.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 50,
  },
  {
    id: 'css-grid-responsive',
    title: 'Responsive Grid with Auto-Fit',
    difficulty: 'MEDIUM',
    description: 'Create a responsive card grid using CSS Grid repeat(), auto-fit, and minmax() without media queries.',
    language: 'CSS',
    starterCode: '.card-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 20px;\n}',
    hint: 'repeat(auto-fit, minmax(280px, 1fr)) automatically creates as many columns as fit in the container.',
    approach: 'auto-fit collapses empty tracks while minmax ensures minimum card width is preserved across viewports.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 70,
  },
  {
    id: 'css-pure-tooltip',
    title: 'Pure CSS Animated Tooltip',
    difficulty: 'HARD',
    description: 'Implement a pure CSS tooltip using ::after pseudo-element, data-tooltip attribute, and transform transition.',
    language: 'CSS',
    starterCode: '.tooltip-trigger {\n  position: relative;\n  display: inline-block;\n}\n.tooltip-trigger:hover::after {\n  content: attr(data-tooltip);\n  position: absolute;\n  bottom: 125%;\n  left: 50%;\n  transform: translateX(-50%);\n  opacity: 1;\n}',
    hint: 'Use attr(data-tooltip) to dynamically pull the tooltip text from the HTML attribute without JavaScript.',
    approach: 'Position tooltip absolutely relative to parent trigger. Transition opacity and transform on :hover.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 85,
  },

  // ── React ─────────────────────────────────────────────────────────────
  {
    id: 'react-counter',
    title: 'Bounded Counter Component',
    difficulty: 'EASY',
    description: 'Write a React Counter component with useState clamping value between min and max bounds.',
    language: 'React',
    starterCode: 'import React, { useState } from \'react\';\n\nexport function Counter({ min = 0, max = 10 }) {\n  const [count, setCount] = useState(min);\n\n  const increment = () => setCount((c) => Math.min(max, c + 1));\n  const decrement = () => setCount((c) => Math.max(min, c - 1));\n\n  return (\n    <div>\n      <button onClick={decrement}>-</button>\n      <span>{count}</span>\n      <button onClick={increment}>+</button>\n    </div>\n  );\n}',
    hint: 'Use updater functions (c) => Math.min(max, c + 1) to ensure clamp bounds.',
    approach: 'State is managed with useState. Handlers use Math.min and Math.max to enforce bounds on state updates.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 50,
  },
  {
    id: 'react-todo-filter',
    title: 'Todo List with Status Filter',
    difficulty: 'MEDIUM',
    description: 'Build a TodoApp component that filters tasks based on "ALL", "ACTIVE", and "COMPLETED" status.',
    language: 'React',
    starterCode: 'import React, { useState } from \'react\';\n\nexport function TodoApp() {\n  const [todos, setTodos] = useState([\n    { id: 1, text: \'Study DSA\', completed: true },\n    { id: 2, text: \'Solve Challenge\', completed: false }\n  ]);\n  const [filter, setFilter] = useState(\'ALL\');\n\n  const filtered = todos.filter((t) => {\n    if (filter === \'ACTIVE\') return !t.completed;\n    if (filter === \'COMPLETED\') return t.completed;\n    return true;\n  });\n\n  return <div>{/* Render filtered todos */}</div>;\n}',
    hint: 'Compute derived filtered state during render rather than keeping duplicate state.',
    approach: 'Maintain single source of truth for items. Filter list reactively based on filter state.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 75,
  },
  {
    id: 'react-custom-usefetch',
    title: 'Custom useFetch Hook with AbortController',
    difficulty: 'HARD',
    description: 'Implement custom useFetch(url) hook that handles data, loading, error, and aborts in-flight fetch upon unmount.',
    language: 'React',
    starterCode: 'import { useState, useEffect } from \'react\';\n\nexport function useFetch(url: string) {\n  const [data, setData] = useState<any>(null);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState<string | null>(null);\n\n  useEffect(() => {\n    const controller = new AbortController();\n    setLoading(true);\n    fetch(url, { signal: controller.signal })\n      .then((res) => res.json())\n      .then((json) => { setData(json); setLoading(false); })\n      .catch((err) => { if (err.name !== \'AbortError\') { setError(err.message); setLoading(false); } });\n    return () => controller.abort();\n  }, [url]);\n\n  return { data, loading, error };\n}',
    hint: 'Return a cleanup function from useEffect that invokes controller.abort().',
    approach: 'Instantiate AbortController. Attach controller.signal to fetch request. Call abort() in useEffect cleanup to prevent race conditions.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 100,
  },

  // ── Node.js ───────────────────────────────────────────────────────────
  {
    id: 'node-read-json',
    title: 'Safe JSON File Parser',
    difficulty: 'EASY',
    description: 'Write a Node.js function parseConfig(filePath) that reads a UTF-8 file and returns parsed JSON or null if syntax error occurs.',
    language: 'Node.js',
    starterCode: 'const fs = require(\'fs\');\n\nfunction parseConfig(filePath) {\n  try {\n    const raw = fs.readFileSync(filePath, \'utf-8\');\n    return JSON.parse(raw);\n  } catch {\n    return null;\n  }\n}',
    hint: 'Wrap fs.readFileSync and JSON.parse in a try...catch block to guard against corrupted JSON.',
    approach: 'Read file buffer as string. Try parsing with JSON.parse. Catch SyntaxError or ENOENT and return null.',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    xpReward: 50,
  },
  {
    id: 'node-auth-middleware',
    title: 'Express Bearer Auth Middleware',
    difficulty: 'MEDIUM',
    description: 'Implement Express middleware authMiddleware(req, res, next) checking Authorization header for valid Bearer token.',
    language: 'Node.js',
    starterCode: 'function authMiddleware(req, res, next) {\n  const authHeader = req.headers[\'authorization\'];\n  if (!authHeader || !authHeader.startsWith(\'Bearer \')) {\n    return res.status(401).json({ error: \'Unauthorized: Missing Bearer token\' });\n  }\n  const token = authHeader.substring(7).trim();\n  if (!token) {\n    return res.status(401).json({ error: \'Unauthorized: Empty token\' });\n  }\n  req.token = token;\n  next();\n}',
    hint: 'Verify header begins with "Bearer " and extract substring(7).trim().',
    approach: 'Inspect req.headers["authorization"]. If invalid format, return HTTP 401. If valid, set req.token and invoke next().',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    xpReward: 75,
  },
  {
    id: 'node-concurrency-queue',
    title: 'Async Task Queue with Concurrency Limit',
    difficulty: 'HARD',
    description: 'Implement async function pLimit(tasks, limit) that runs tasks with maximum concurrency limit N, returning results.',
    language: 'Node.js',
    starterCode: 'async function pLimit(tasks, limit = 2) {\n  const results = [];\n  let index = 0;\n  \n  async function worker() {\n    while (index < tasks.length) {\n      const i = index++;\n      results[i] = await tasks[i]();\n    }\n  }\n\n  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());\n  await Promise.all(workers);\n  return results;\n}',
    hint: 'Spawn N concurrent worker loops that pull the next task index from a shared counter until all tasks are consumed.',
    approach: 'Create workers up to concurrency limit. Each worker sequentially awaits tasks until queue is empty. Await Promise.all(workers).',
    timeComplexity: 'O(T)',
    spaceComplexity: 'O(T)',
    xpReward: 100,
  },
];

export const BUILTIN_RESOURCES: LearningResource[] = [
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
    explanation: 'According to GeeksforGeeks, Big-O notation defines an upper bound of an algorithm: f(n) <= c * g(n) for all n >= n0. It guarantees that the algorithm will not take longer than this upper bound in the worst-case scenario.',

    completed: false
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
    explanation: 'Binary Search halves the search space at each iteration (N -> N/2 -> N/4 -> ... -> 1). The number of divisions needed to reach 1 is log2(N), giving an optimal worst-case time complexity of O(log N).',

    completed: false
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
    explanation: 'As explained on GeeksforGeeks, arrays require contiguous memory slots, enabling O(1) direct index addressing. In contrast, linked list nodes can reside at scattered heap addresses linked together by reference pointers, requiring sequential traversal.',

    completed: false
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
    explanation: 'The CPU call stack uses the LIFO property to manage nested function calls. Each function invocation pushes an activation frame (parameters, local variables, return address). Upon return, the frame is popped, restoring the caller context.',

    completed: false
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
    explanation: 'In Separate Chaining, each cell of the hash table acts as a head pointer to a linked list. When a collision occurs, the new key-value pair is appended to the linked list at that bucket, resolving conflicts without resizing the table immediately.',

    completed: false
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
    explanation: 'On GeeksforGeeks, Memoization is described as Top-Down because it starts with the overall problem and breaks it down recursively, storing answers in a lookup table. Tabulation is Bottom-Up because it starts with base cases and iteratively builds the solution table without recursion.',

    completed: false
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
    explanation: 'GeeksforGeeks details that after the synchronous Call Stack empties, the Event Loop prioritizes the Microtask Queue (Promise handlers, queueMicrotask). Only once all microtasks have executed does it process the next macrotask (such as setTimeout).',

    completed: false
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
    explanation: 'Promise.allSettled resolves only when all input promises have either fulfilled or rejected, returning an array of outcome objects. Promise.all rejects immediately upon encountering the first rejection.',

    completed: false
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
    explanation: 'A closure preserves the reference to the lexical scope in which it was declared, preventing garbage collection of referenced variables while the inner function exists.',

    completed: false
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
    explanation: 'When property resolution reaches the end of the prototype chain (Object.prototype.__proto__ which is null) without finding the property, JavaScript evaluates the expression to undefined.',

    completed: false
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
    explanation: 'The constraint `K extends keyof T` guarantees compile-time validation that argument K is strictly a known key of type T, providing full autocomplete and type safety.',

    completed: false
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
    explanation: 'Discriminated unions enable flow-sensitive type narrowing. By checking the shared literal property (tag), TypeScript knows exactly which union member is being accessed.',

    completed: false
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
    explanation: 'Pick<T, K> constructs a type by extracting the specified properties K from type T, while Omit<T, K> removes specified properties.',

    completed: false
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
    explanation: 'The `infer` keyword enables type deduction inside a conditional type clause, allowing developers to extract inner types such as Promise payload types or function return types.',

    completed: false
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
    explanation: 'In Python, tuples, strings, integers, and floats are immutable. Once instantiated, their elements cannot be reassigned or mutated in place. Lists, dictionaries, and sets are mutable collections.',

    completed: false
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
    explanation: 'Generators compute and produce values on demand (lazy evaluation). Only one element exists in memory at any given time, providing O(1) space complexity regardless of stream length.',

    completed: false
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
    explanation: 'Without `@functools.wraps`, the decorated function\'s name and docstring are overwritten by the generic wrapper function name, making debugging and introspection difficult.',

    completed: false
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
    explanation: 'The context management protocol requires implementing `__enter__` (called before entering the with block) and `__exit__` (called when exiting the block, even if an exception occurs).',

    completed: false
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
    explanation: 'According to GeeksforGeeks, Isolation ensures that concurrent execution of transactions results in a system state that would be obtained if transactions were executed serially one after another, preventing phenomena like dirty reads and phantom reads.',

    completed: false
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
    explanation: 'Indexes accelerate SELECT search operations via B-Tree lookups, but every write operation (INSERT/UPDATE/DELETE) must also update the index tree, adding write latency.',

    completed: false
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
    explanation: 'When two or more rows tie, RANK leaves a gap in rank numbering (e.g., 1, 2, 2, 4). DENSE_RANK produces consecutive numbers without gaps (e.g., 1, 2, 2, 3).',

    completed: false
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
    explanation: 'A LEFT JOIN preserves every row from the left table; whenever a row has no corresponding match in the right table, all right table attributes are populated with NULL.',

    completed: false
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
    explanation: 'Method Overriding occurs when a child class implements a method that is already defined in its parent superclass with the exact same name, return type, and parameters. This is the cornerstone of runtime (dynamic) polymorphism.',

    completed: false
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
    explanation: 'In the JVM, all class object instances and arrays are allocated on the Heap. The Java Garbage Collector monitors and deallocates heap objects that are no longer reachable from GC roots.',

    completed: false
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
    explanation: 'In Java 8, when a bucket in a HashMap reaches TREEIFY_THRESHOLD (8 entries) and table capacity >= 64, it converts the linked list into a balanced Red-Black tree to guarantee O(log N) lookup instead of O(N) worst-case.',

    completed: false
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
    explanation: 'The `volatile` keyword guarantees that any thread reading the variable sees the most recent write made by any other thread, preventing stale CPU cache reads, though it does not provide lock atomicity.',

    completed: false
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
    explanation: 'RAII ensures that resource management is tied to object lifetime: resources are acquired during construction and released in the destructor when the object leaves its lexical scope, preventing resource leaks even during exceptions.',

    completed: false
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
    explanation: 'When a std::vector exceeds its allocated capacity during push_back or insert, it allocates a larger memory buffer and moves all elements, invalidating all preexisting iterators, pointers, and references.',

    completed: false
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
    explanation: 'Deleting a derived object through a base pointer without a virtual destructor results in undefined behavior because only the base destructor runs, leaking derived class resources.',

    completed: false
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
    explanation: '`std::move` does not move any bytes at runtime; it is a compile-time cast that converts an lvalue expression into an rvalue reference (T&&), signaling to functions that the resource can be moved rather than copied.',

    completed: false
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
    explanation: 'Deferred execution means the query variable itself does not hold results; it stores query instructions. The actual filtering and projection execute when enumerating through the dataset.',

    completed: false
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
    explanation: 'When an incomplete task is awaited, control yields back to the caller. The calling thread is not blocked; when the task finishes, the rest of the method resumes execution via the synchronization context or thread pool.',

    completed: false
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
    explanation: 'In C#, records automatically synthesize equality operators that compare the values of all properties, whereas classes default to reference equality comparing heap memory addresses.',

    completed: false
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
    explanation: 'Scoped services are created once per HTTP client request scope and are disposed when the HTTP request completes. Entity Framework DbContext is a classic example of a Scoped service.',

    completed: false
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
    explanation: 'Semantic elements provide meaningful information about the role of page regions to browsers, assistive technologies (screen readers), and search engine indexing bots.',

    completed: false
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
    explanation: 'Uploading binary file data requires `enctype="multipart/form-data"`. Otherwise, only the file name as text would be sent rather than the file payload.',

    completed: false
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
    explanation: '`rel="preload"` forces the browser to request high-priority resources (such as hero images, critical fonts, and stylesheets) early in the rendering lifecycle.',

    completed: false
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
    explanation: 'IndexedDB is an asynchronous, transactional client-side database designed to store significant amounts of structured data (including files/blobs) without blocking the UI thread.',

    completed: false
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
    explanation: 'Flexbox is designed for one-dimensional layouts (dealing with either a row or a column at a time), whereas CSS Grid is designed for two-dimensional layouts handling both rows and columns simultaneously.',

    completed: false
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
    explanation: 'An ID selector (#nav) has a specificity weight of (0,1,0,0), overriding any number of class selectors (0,0,1,0) and element selectors (0,0,0,1).',

    completed: false
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
    explanation: 'With `border-box`, declared widths and heights account for padding and borders, eliminating unintuitive size calculations where adding padding would widen an element.',

    completed: false
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
    explanation: 'Modifying `transform` and `opacity` does not affect geometry or trigger layout recalculation (Reflow). The browser offloads compositing directly to the GPU for silky smooth 60fps performance.',

    completed: false
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
    explanation: 'The cleanup function returned by useEffect runs when the component unmounts and also immediately before re-running the effect on subsequent renders when dependencies change.',

    completed: false
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
    explanation: 'Keys give React an identifier for list elements across renders. Without stable keys, React must re-render and mutate all list nodes rather than reordering or mutating only changed elements.',

    completed: false
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
    explanation: '`useMemo` returns a memoized value by executing the supplied factory function. `useCallback` returns a memoized callback function definition with a stable memory reference.',

    completed: false
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
    explanation: 'React Context does not have built-in selector subscriptions: when the provider value updates, every consumer component triggers a re-render regardless of whether the specific sub-property it uses changed.',

    completed: false
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
    explanation: 'Libuv provides a multi-threaded pool (UV_THREADPOOL_SIZE, default 4 threads) to offload synchronous file system operations, compression, and cryptographic functions away from the single-threaded event loop.',

    completed: false
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
    explanation: 'Backpressure is the bottleneck where incoming data buffer overflows because the consumer (writable stream) is slower than the producer (readable stream). Proper stream pipelines pause the producer until the consumer is ready.',

    completed: false
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
    explanation: 'Worker threads are ideal for offloading CPU-intensive algorithmic operations without the memory overhead of separate forked processes, while cluster is meant for scale-out network server processes.',

    completed: false
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
    explanation: 'The default threshold of 10 listeners is a built-in safety diagnostic in Node.js to alert developers to unintended listener accumulation and memory leaks.',

    completed: false
  }
];

export function isResourceMatchingLanguage(resource: LearningResource, selectedLanguage: string): boolean {
  if (selectedLanguage === 'All') return true;
  const sel = selectedLanguage.toLowerCase();
  
  if (resource.language) {
    if (resource.language.toLowerCase() === sel) return true;
  }
  
  const topic = (resource.topic || '').toLowerCase();
  const title = (resource.title || '').toLowerCase();
  const id = (resource.id || '').toLowerCase();

  if (sel === 'javascript') {
    return topic === 'javascript' || id.startsWith('js-') || id.startsWith('javascript-') || title.includes('javascript');
  }
  if (sel === 'typescript') {
    return topic === 'typescript' || id.startsWith('ts-') || id.startsWith('typescript-') || title.includes('typescript');
  }
  if (sel === 'python') {
    return topic === 'python' || id.startsWith('py-') || id.startsWith('python-') || title.includes('python');
  }
  if (sel === 'sql') {
    return topic === 'sql' || id.startsWith('sql-') || title.includes('sql');
  }
  if (sel === 'java') {
    return topic === 'java' || id.startsWith('java-') || title.includes('java');
  }
  if (sel === 'c++') {
    return topic === 'c++' || id.startsWith('cpp-') || id.startsWith('c++-') || title.includes('c++');
  }
  if (sel === 'c#') {
    return topic === 'c#' || id.startsWith('cs-') || id.startsWith('csharp-') || title.includes('c#');
  }
  if (sel === 'html') {
    return topic === 'html' || id.startsWith('html-') || title.includes('html');
  }
  if (sel === 'css') {
    return topic === 'css' || id.startsWith('css-') || title.includes('css');
  }
  if (sel === 'react') {
    return topic === 'react' || id.startsWith('react-') || title.includes('react');
  }
  if (sel === 'node.js') {
    return topic === 'node.js' || topic === 'node' || id.startsWith('node-') || title.includes('node');
  }

  return topic === sel;
}

export interface RealtimeHintAnalysis {
  statusBadge: string;
  badgeTone: 'info' | 'warning' | 'success';
  message: string;
  approachStep: string;
  checks: Array<{ label: string; passed: boolean }>;
}

export function getRealtimeHint(currentCode: string, challenge: BuiltinChallenge | Challenge | null): RealtimeHintAnalysis | null {
  if (!challenge) return null;
  const raw = currentCode.trim();
  const lower = raw.toLowerCase();
  const isStarter = !raw || raw === (challenge.starterCode || '').trim();

  const title = challenge.title.toLowerCase();
  const lang = (challenge.language || '').toLowerCase();
  const hasFunction = /function|def |class |=>|\bSELECT\b/i.test(raw);
  const hasReturn = /\breturn\b|\bSELECT\b/i.test(raw);

  let hintMsg = '';
  let logicPassed = false;

  if (lang.includes('sql') || title.includes('sql') || title.includes('query')) {
    const hasSelect = /\bselect\b/i.test(raw);
    const hasFrom = /\bfrom\b/i.test(raw);
    const hasWhere = /\bwhere\b/i.test(raw);
    const hasGroupBy = /\bgroup by\b/i.test(raw);
    const hasHaving = /\bhaving\b/i.test(raw);

    if (!hasSelect || !hasFrom) {
      hintMsg = '💡 SQL Syntax: Start with SELECT desired columns FROM target_table.';
    } else if (title.includes('active') || title.includes('count')) {
      if (!hasGroupBy) {
        hintMsg = '💡 GeeksforGeeks SQL Tip: Use GROUP BY country to aggregate active users by country.';
      } else if (!hasHaving) {
        hintMsg = '💡 GeeksforGeeks SQL Rule: Filter aggregated groups using HAVING COUNT(*) > 5.';
      } else {
        hintMsg = '✓ Optimal SQL Query structure detected! Ready to test.';
        logicPassed = true;
      }
    } else {
      hintMsg = hasWhere ? '✓ Filter condition detected! Ready to test query.' : '💡 Add a WHERE clause to filter required rows.';
      logicPassed = hasWhere;
    }
  } else if (title.includes('two sum')) {
    const hasMap = /map|dict|\{\}/i.test(raw);
    const hasNestedLoop = /(for|while)[\s\S]+(for|while)/i.test(raw);
    if (hasNestedLoop) {
      hintMsg = '💡 GeeksforGeeks Optimization Tip: A nested loop runs in O(N²) time. You can optimize to O(N) by using a Map/Dictionary to store seen complements!';
    } else if (hasMap || /complement|target\s*-\s*/i.test(raw)) {
      hintMsg = '✓ Hash Map complement approach detected! Verify you return the indices [index1, index2].';
      logicPassed = true;
    } else {
      hintMsg = '💡 GeeksforGeeks Hint: Calculate complement = target - num for each element and check if it was seen before.';
    }
  } else if (title.includes('binary search')) {
    const hasLowHigh = /low|high|left|right/i.test(raw);
    const hasMid = /mid/i.test(raw);
    if (!hasLowHigh) {
      hintMsg = '💡 GeeksforGeeks Invariant: Initialize two pointers low = 0 and high = length - 1.';
    } else if (!hasMid) {
      hintMsg = '💡 Midpoint Formula: Compute mid = low + Math.floor((high - low) / 2) inside your while (low <= high) loop.';
    } else {
      hintMsg = '✓ Binary Search invariant detected! Adjust low = mid + 1 when target is greater, high = mid - 1 when target is smaller.';
      logicPassed = true;
    }
  } else if (title.includes('palindrome')) {
    const hasReverse = /reverse|split|::/i.test(raw);
    const hasPointers = /left|right|while/i.test(raw);
    if (hasReverse || hasPointers) {
      hintMsg = '✓ Palindrome verification approach detected! Ensure clean boolean return.';
      logicPassed = true;
    } else {
      hintMsg = '💡 GeeksforGeeks Hint: Check if characters from the outside inward match, or reverse the string and compare equality.';
    }
  } else if (title.includes('reverse')) {
    if (/reverse|split|pop|join|::/i.test(raw) || /(for|while)/i.test(raw)) {
      hintMsg = '✓ String reversal logic detected! Verify your return statement.';
      logicPassed = true;
    } else {
      hintMsg = '💡 GeeksforGeeks Hint: Reverse by swapping with two pointers or slicing/reversing array elements.';
    }
  } else if (title.includes('fizzbuzz')) {
    const hasModulo = /%/i.test(raw);
    const has15 = /15/i.test(raw) || (/% 3/i.test(raw) && /% 5/i.test(raw));
    if (!hasModulo) {
      hintMsg = '💡 GeeksforGeeks Hint: Use the modulo operator (%) to test divisibility by 3, 5, and 15.';
    } else if (!has15) {
      hintMsg = '⚠️ Precedence Rule: Check divisibility by both 3 and 5 (or 15) FIRST before checking 3 or 5 individually.';
    } else {
      hintMsg = '✓ Modulo divisibility branches detected! Ready to test.';
      logicPassed = true;
    }
  } else if (title.includes('parentheses') || title.includes('bracket')) {
    const hasStack = /stack|push|pop/i.test(raw);
    if (!hasStack) {
      hintMsg = '💡 GeeksforGeeks Stack Pattern: Use a stack to push opening brackets and pop when matched.';
    } else {
      hintMsg = '✓ Stack matching approach detected! Remember to check if stack is empty at the end.';
      logicPassed = true;
    }
  } else {
    hintMsg = hasReturn ? '✓ Return statement detected! Run tests to verify correctness.' : '💡 Implement the function logic and ensure it returns the computed result.';
    logicPassed = hasReturn;
  }

  const checks = [
    { label: 'Function signature defined', passed: hasFunction },
    { label: 'Return / Output present', passed: hasReturn },
    { label: 'Algorithmic logic matching criteria', passed: logicPassed },
  ];

  const allPassed = checks.every((c) => c.passed);

  if (isStarter) {
    return {
      statusBadge: 'Getting Started',
      badgeTone: 'info',
      message: '💡 Step 1: Read the problem constraints and write your solution inside the function stub.',
      approachStep: challenge.approach || 'Deconstruct the problem into parameters, boundary checks, and expected output.',
      checks,
    };
  }

  return {
    statusBadge: allPassed ? 'Ready to Test' : hasFunction ? 'Logic in Progress' : 'Drafting Code',
    badgeTone: allPassed ? 'success' : 'info',
    message: hintMsg,
    approachStep: challenge.approach || challenge.hint || 'Satisfy all unit test assertions.',
    checks,
  };
}

export interface RolePathLesson {
  id: string;
  title: string;
  phase: string;
  description: string;
  completed?: boolean;
}

export interface RolePathChallenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  xpReward: number;
  passed?: boolean;
}

export interface RolePath {
  id: string;
  title: string;
  targetRole: string;
  tagline: string;
  subjectIds: string[];
  curatedLessonIds?: string[];
  syllabus: RolePathLesson[];
  totalLessons: number;
  completedLessons: number;
  percent: number;
  recommendedChallenges: RolePathChallenge[];
  interviewTags: string[];
}

const BACKEND_INTERN_SYLLABUS: RolePathLesson[] = [
  { id: 'java-java-tutorial-java-introduction', title: 'Java Environment & JVM Architecture', phase: 'Phase 1: Language Syntax', description: 'Understanding bytecode, JDK, and running your first Java program.' },
  { id: 'java-java-tutorial-java-syntax', title: 'Syntax, Variables & Data Types', phase: 'Phase 1: Language Syntax', description: 'Primitive types, variables, and type casting rules in Java.' },
  { id: 'java-java-tutorial-java-operators', title: 'Operators, Logic & Expressions', phase: 'Phase 1: Language Syntax', description: 'Mathematical and boolean conditional evaluations.' },
  { id: 'java-java-tutorial-java-if-else', title: 'Control Flow & Branching', phase: 'Phase 1: Language Syntax', description: 'If-else statements, switch expressions, and loops.' },
  { id: 'java-java-methods-java-methods', title: 'Methods & Parameter Passing', phase: 'Phase 1: Language Syntax', description: 'Method signatures, return types, and overloading.' },
  { id: 'java-java-classes-java-oop', title: 'Object-Oriented Programming (OOP)', phase: 'Phase 2: Core Engineering', description: 'Classes, objects, attributes, and instantiation.' },
  { id: 'java-java-classes-java-encapsulation', title: 'Encapsulation & Access Modifiers', phase: 'Phase 2: Core Engineering', description: 'Public/private scope, getters, setters, and data hiding.' },
  { id: 'java-java-classes-java-inheritance', title: 'Inheritance & Method Overriding', phase: 'Phase 2: Core Engineering', description: 'Extending classes, super keyword, and polymorphism.' },
  { id: 'java-java-classes-java-interface', title: 'Interfaces & Abstract Classes', phase: 'Phase 2: Core Engineering', description: 'Decoupling software contracts and multiple implementation.' },
  { id: 'java-java-collections-and-built-in-classes-java-hashmap', title: 'Collections: HashMap & ArrayList', phase: 'Phase 2: Core Engineering', description: 'Key-value maps, lists, and time complexity in memory.' },
  { id: 'sql-sql-fundamentals-sql-introduction', title: 'SQL & Relational Databases', phase: 'Phase 3: Database & Persistence', description: 'RDBMS concepts, tables, primary keys, and schemas.' },
  { id: 'sql-sql-fundamentals-sql-select', title: 'SELECT Queries & Filters', phase: 'Phase 3: Database & Persistence', description: 'Filtering records with WHERE, ORDER BY, and LIMIT.' },
  { id: 'sql-sql-joins-sql-joins', title: 'Relational Joins (INNER, LEFT, RIGHT)', phase: 'Phase 3: Database & Persistence', description: 'Combining data across normalized relational tables.' },
  { id: 'sql-sql-grouping-and-conditions-sql-group-by', title: 'Aggregations & GROUP BY', phase: 'Phase 3: Database & Persistence', description: 'COUNT, SUM, AVG, and filtering grouped results with HAVING.' },
];

const FRONTEND_INTERN_SYLLABUS: RolePathLesson[] = [
  { id: 'html-html-tutorial-html-introduction', title: 'Semantic HTML5 Fundamentals', phase: 'Phase 1: Web Foundations', description: 'Document structure, accessibility, and modern tags.' },
  { id: 'html-html-forms-html-forms', title: 'Forms, Inputs & Validation', phase: 'Phase 1: Web Foundations', description: 'Building accessible client-side form controls.' },
  { id: 'css-css-fundamentals-css-box-model', title: 'CSS Box Model & Margin Collapsing', phase: 'Phase 1: Web Foundations', description: 'Content, padding, border, and margin calculations.' },
  { id: 'css-css-responsive-design-css-flexbox', title: 'Flexbox Layouts & Responsive Design', phase: 'Phase 1: Web Foundations', description: 'Flexible 1D box arrangements, alignment, and wrapping.' },
  { id: 'css-css-responsive-design-css-grid', title: 'CSS Grid 2D Systems', phase: 'Phase 1: Web Foundations', description: 'Rows, columns, areas, and responsive grid templates.' },
  { id: 'javascript-javascript-fundamentals-javascript-variables', title: 'Modern JavaScript (ES6+) Scope', phase: 'Phase 2: Modern JavaScript', description: 'Let, const, arrow functions, and lexical scope.' },
  { id: 'javascript-javascript-arrays-javascript-arrays', title: 'Array Iteration & Map/Filter/Reduce', phase: 'Phase 2: Modern JavaScript', description: 'Functional array manipulation and transformation.' },
  { id: 'javascript-javascript-asynchronous-programming-async-await', title: 'Async/Await & Fetch API', phase: 'Phase 2: Modern JavaScript', description: 'Handling asynchronous REST requests and error states.' },
  { id: 'react-react-fundamentals-react-introduction', title: 'React Component Architecture', phase: 'Phase 3: Reactive Frontend', description: 'Component lifecycles, JSX, and unidirectional data flow.' },
  { id: 'react-react-components-react-props', title: 'React Props & Composition', phase: 'Phase 3: Reactive Frontend', description: 'Passing data, callbacks, and component reusability.' },
  { id: 'react-react-hooks-usestate', title: 'State Management with useState', phase: 'Phase 3: Reactive Frontend', description: 'Reactive local state, updater functions, and re-renders.' },
  { id: 'react-react-hooks-useeffect', title: 'Side Effects with useEffect', phase: 'Phase 3: Reactive Frontend', description: 'API fetching, subscriptions, cleanup, and dependency arrays.' },
];

const FULLSTACK_SYLLABUS: RolePathLesson[] = [
  { id: 'nodejs-node-js-fundamentals-node-introduction', title: 'Node.js Runtime & Event Loop', phase: 'Phase 1: Backend Services', description: 'Non-blocking asynchronous I/O and module systems.' },
  { id: 'nodejs-node-js-core-modules-http-module', title: 'HTTP Servers & RESTful APIs', phase: 'Phase 1: Backend Services', description: 'Handling requests, status codes, and JSON responses.' },
  { id: 'typescript-typescript-fundamentals-typescript-introduction', title: 'TypeScript Types & Inference', phase: 'Phase 2: Full-Stack Type Safety', description: 'Primitive types, type assertions, and compilation.' },
  { id: 'typescript-typescript-fundamentals-typescript-interfaces', title: 'Interfaces & Data Contracts', phase: 'Phase 2: Full-Stack Type Safety', description: 'Defining shared API contracts and object models.' },
  { id: 'react-react-fundamentals-react-introduction', title: 'React Single-Page Client', phase: 'Phase 3: End-to-End Integration', description: 'Connecting UI frontend to backend REST endpoints.' },
  { id: 'sql-sql-fundamentals-sql-introduction', title: 'Relational Database Schema Design', phase: 'Phase 3: End-to-End Integration', description: 'Normalization, foreign keys, and indexes.' },
  { id: 'sql-sql-joins-sql-joins', title: 'Multi-Table Relational Queries', phase: 'Phase 3: End-to-End Integration', description: 'Optimizing joins and aggregations for APIs.' },
];

const BUILTIN_ROLE_PATHS: RolePath[] = [
  {
    id: 'backend-intern',
    title: 'Backend Intern (Java & SQL)',
    tagline: 'From syntax to database persistence, query optimization, and REST API microservices.',
    targetRole: 'Junior Backend Developer',
    subjectIds: ['java', 'sql'],
    curatedLessonIds: [
      'java-java-tutorial-java-introduction',
      'java-java-tutorial-java-syntax',
      'java-java-classes-java-oop',
      'sql-sql-fundamentals-sql-introduction',
      'sql-sql-joins-sql-joins',
    ],
    syllabus: BACKEND_INTERN_SYLLABUS,
    totalLessons: 63,
    completedLessons: 0,
    percent: 0,
    recommendedChallenges: [
      { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50, passed: false },
      { id: 'js-sum-array', title: 'Sum Array', difficulty: 'EASY', xpReward: 50, passed: false },
      { id: 'js-fizzbuzz', title: 'FizzBuzz', difficulty: 'MEDIUM', xpReward: 75, passed: false },
      { id: 'sql-customers', title: 'Active Customers Count', difficulty: 'MEDIUM', xpReward: 80, passed: false },
      { id: 'java-binary-search', title: 'Binary Search', difficulty: 'HARD', xpReward: 100, passed: false },
    ],
    interviewTags: ['Java', 'SQL', 'Spring Boot', 'Concurrency', 'Transactions'],
  },
  {
    id: 'frontend-intern',
    title: 'Frontend Intern (HTML, CSS, JS & React)',
    tagline: 'Modern accessible UI components, reactive state, DOM events, and client performance.',
    targetRole: 'Junior Frontend Developer',
    subjectIds: ['html', 'css', 'javascript', 'react'],
    curatedLessonIds: [
      'html-html-tutorial-html-introduction',
      'css-css-fundamentals-css-box-model',
      'javascript-javascript-functions-function-introduction',
      'react-react-fundamentals-react-introduction',
    ],
    syllabus: FRONTEND_INTERN_SYLLABUS,
    totalLessons: 42,
    completedLessons: 0,
    percent: 0,
    recommendedChallenges: [
      { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50, passed: false },
      { id: 'js-sum-array', title: 'Sum Array', difficulty: 'EASY', xpReward: 50, passed: false },
      { id: 'js-two-sum', title: 'Two Sum', difficulty: 'EASY', xpReward: 60, passed: false },
    ],
    interviewTags: ['JavaScript', 'React', 'CSS Box Model', 'HTML5', 'State Management'],
  },
  {
    id: 'fullstack-engineer',
    title: 'Full-Stack Developer (Node, React & SQL)',
    tagline: 'End-to-end applications: REST/WebSocket APIs, relational data models, and reactive frontend.',
    targetRole: 'Junior Full-Stack Engineer',
    subjectIds: ['nodejs', 'react', 'sql', 'typescript'],
    curatedLessonIds: [
      'nodejs-node-js-fundamentals-node-introduction',
      'typescript-typescript-fundamentals-typescript-introduction',
      'react-react-fundamentals-react-introduction',
      'sql-sql-fundamentals-sql-introduction',
    ],
    syllabus: FULLSTACK_SYLLABUS,
    totalLessons: 58,
    completedLessons: 0,
    percent: 0,
    recommendedChallenges: [
      { id: 'js-hello-world', title: 'Hello World', difficulty: 'EASY', xpReward: 50, passed: false },
      { id: 'sql-customers', title: 'Active Customers Count', difficulty: 'MEDIUM', xpReward: 80, passed: false },
      { id: 'java-binary-search', title: 'Binary Search', difficulty: 'HARD', xpReward: 100, passed: false },
    ],
    interviewTags: ['Node.js', 'React', 'SQL Joins', 'TypeScript', 'REST APIs'],
  },
];

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function formatTrackName(track: string): string {
  const names: Record<string, string> = {
    nodejs: 'Node.js',
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    csharp: 'C#',
    cpp: 'C++',
    react: 'React',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
  };
  return names[track.toLowerCase()] ?? `${track.charAt(0).toUpperCase()}${track.slice(1)}`;
}

function normalizeRolePath(value: unknown): RolePath | null {
  if (!value || typeof value !== 'object') return null;
  const path = value as Partial<RolePath>;
  if (typeof path.id !== 'string' || typeof path.title !== 'string') return null;

  const defaultSyllabus =
    path.id === 'backend-intern'
      ? BACKEND_INTERN_SYLLABUS
      : path.id === 'frontend-intern'
      ? FRONTEND_INTERN_SYLLABUS
      : FULLSTACK_SYLLABUS;

  const fallbackItem = BUILTIN_ROLE_PATHS.find((b) => b.id === path.id);

  const rawSyllabus = Array.isArray(path.syllabus) && path.syllabus.length > 0 ? path.syllabus : defaultSyllabus;
  const mergedSyllabus: RolePathLesson[] = rawSyllabus.map((item: any, idx: number) => {
    const fallbackLesson = defaultSyllabus[idx] || defaultSyllabus.find((d) => d.id === item?.id);
    return {
      id: typeof item?.id === 'string' ? item.id : fallbackLesson?.id || `lesson-${idx}`,
      title: typeof item?.title === 'string' ? item.title : fallbackLesson?.title || 'Lesson',
      phase: typeof item?.phase === 'string' ? item.phase : fallbackLesson?.phase || 'Phase 1: Language Syntax',
      description: typeof item?.description === 'string' ? item.description : fallbackLesson?.description || '',
      completed: Boolean(item?.completed),
    };
  });

  const totalLessons = typeof path.totalLessons === 'number' && Number.isFinite(path.totalLessons) ? path.totalLessons : mergedSyllabus.length;
  const completedLessons = typeof path.completedLessons === 'number' ? path.completedLessons : mergedSyllabus.filter((l) => l.completed).length;
  const percent = typeof path.percent === 'number' ? path.percent : Math.min(100, Math.round((completedLessons / Math.max(totalLessons, 1)) * 100));

  return {
    id: path.id,
    title: path.title,
    targetRole: typeof path.targetRole === 'string' ? path.targetRole : fallbackItem?.targetRole || 'Developer',
    tagline: typeof path.tagline === 'string' ? path.tagline : fallbackItem?.tagline || '',
    subjectIds: stringList(path.subjectIds).length > 0 ? stringList(path.subjectIds) : (fallbackItem?.subjectIds || []),
    curatedLessonIds: stringList(path.curatedLessonIds),
    syllabus: mergedSyllabus,
    totalLessons,
    completedLessons,
    percent,
    recommendedChallenges: Array.isArray(path.recommendedChallenges) && path.recommendedChallenges.length > 0
      ? path.recommendedChallenges.map((c: any) => ({
          id: typeof c?.id === 'string' ? c.id : String(c || ''),
          title: typeof c?.title === 'string' ? c.title : (typeof c?.id === 'string' ? c.id : 'Challenge'),
          difficulty: (['EASY', 'MEDIUM', 'HARD'].includes(c?.difficulty?.toUpperCase()) ? c.difficulty.toUpperCase() : 'MEDIUM') as any,
          xpReward: typeof c?.xpReward === 'number' ? c.xpReward : 50,
          passed: Boolean(c?.passed),
        })).filter((c) => c.id.length > 0)
      : (fallbackItem?.recommendedChallenges || []),
    interviewTags: stringList(path.interviewTags).length > 0
      ? stringList(path.interviewTags)
      : (fallbackItem?.interviewTags || []),
  };
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
}

export interface ChallengeEvaluation {
  action: 'test' | 'submit';
  passed: boolean;
  title: string;
  message?: string;
  xpEarned?: number;
  testResults?: Array<{ label: string; passed: boolean; expected?: unknown; got?: unknown; error?: string }>;
  output?: string;
  solution?: string | null;
}

export default function CodingScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { fontSize, largerText } = useAccessibility();

  // Mode: Academy vs Challenges vs Role Paths
  const [mode, setMode] = useState<'academy' | 'challenges' | 'rolepaths'>('academy');
  const [previousMode, setPreviousMode] = useState<'academy' | 'challenges' | 'rolepaths'>('rolepaths');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Challenges state
  const [items, setItems] = useState<Challenge[]>([]);
  const [resources, setResources] = useState<LearningResource[]>(BUILTIN_RESOURCES);
  const [selectedChallenge, setSelectedChallenge] = useState<BuiltinChallenge | Challenge | null>(BUILTIN_CHALLENGES[0]);
  const [code, setCode] = useState(BUILTIN_CHALLENGES[0].starterCode);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [showHint, setShowHint] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<ChallengeEvaluation | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Role paths and daily flashcards
  const [rolePaths, setRolePaths] = useState<RolePath[]>(BUILTIN_ROLE_PATHS);
  const [activeTrackId, setActiveTrackId] = useState<string>('backend-intern');
  const [selectedRolePathModal, setSelectedRolePathModal] = useState<RolePath | null>(null);
  const [activeRolePath, setActiveRolePath] = useState<RolePath | null>(null);
  const [enrolledToast, setEnrolledToast] = useState<string>('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardMessage, setFlashcardMessage] = useState('');

  // Tutorials quiz state
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const [refreshing, setRefreshing] = useState(false);

  // Restore active role path from SecureStore
  useEffect(() => {
    SecureStore.getItemAsync('synergysphere.active_role_path')
      .then((val) => {
        if (val) setActiveTrackId(val);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const [challengesData, learningData, rolePathsData, flashcardsData] = await Promise.allSettled([
        api.get<Challenge[]>('/challenges'),
        api.get<LearningResource[]>('/learning'),
        api.get<{ paths: RolePath[] }>('/curriculum/role-paths'),
        api.get<{ flashcards: Flashcard[]; totalDue: number }>('/curriculum/flashcards/daily-review'),
      ]);

      if (challengesData.status === 'fulfilled' && challengesData.value.length > 0) {
        setItems(challengesData.value);
      }
      if (learningData.status === 'fulfilled' && Array.isArray(learningData.value) && learningData.value.length > 0) {
        setResources(learningData.value);
      } else {
        setResources(BUILTIN_RESOURCES);
      }
      if (rolePathsData.status === 'fulfilled' && Array.isArray(rolePathsData.value?.paths) && rolePathsData.value.paths.length > 0) {
        setRolePaths(rolePathsData.value.paths.map(normalizeRolePath).filter((path): path is RolePath => path !== null));
      } else {
        setRolePaths(BUILTIN_ROLE_PATHS);
      }
      if (flashcardsData.status === 'fulfilled' && flashcardsData.value?.flashcards) {
        setFlashcards(flashcardsData.value.flashcards);
      }
    } catch {
      setResources(BUILTIN_RESOURCES);
    } finally {
      setLoaded(true);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  function handleOpenLessonFromPath(path: RolePath, lessonId?: string) {
    const nextUncompleted = path.syllabus?.find((l) => !l.completed);
    const targetId = lessonId || nextUncompleted?.id || path.curatedLessonIds?.[0] || path.syllabus?.[0]?.id || 'java-java-tutorial-java-introduction';
    setActiveRolePath(path);
    setPreviousMode('rolepaths');
    setSelectedRolePathModal(null);
    setSelectedLessonId(targetId);
  }

  function handleLaunchChallengeFromPath(ch: RolePathChallenge) {
    const match = allChallenges.find(
      (c) => c.id === ch.id || c.title.toLowerCase() === ch.title.toLowerCase()
    );
    if (match) {
      selectChallenge(match);
    } else {
      const fallbackCh: BuiltinChallenge = {
        id: ch.id,
        title: ch.title || ch.id,
        difficulty: ch.difficulty || 'MEDIUM',
        description: `Implement the algorithm or query solution for ${ch.title || ch.id} to satisfy verified unit test requirements.`,
        language: ch.id.startsWith('sql') ? 'SQL' : ch.id.startsWith('py') ? 'Python' : ch.id.startsWith('java') ? 'Java' : 'JavaScript',
        starterCode: ch.id.startsWith('sql')
          ? 'SELECT country, COUNT(*) AS count\nFROM users\nGROUP BY country;'
          : ch.id.startsWith('py')
          ? 'def solve():\n    pass\n'
          : 'function solve() {\n  // Write solution here\n}\n',
        hint: 'Deconstruct inputs and handle boundary conditions.',
        xpReward: ch.xpReward || 50,
      };
      selectChallenge(fallbackCh);
    }
    setSelectedRolePathModal(null);
    setMode('challenges');
  }

  function handleLaunchInterviewFromPath(path: RolePath) {
    setSelectedRolePathModal(null);
    router.push('/interviews' as never);
  }

  function handleSetActiveGoal(pathId: string, pathTitle: string) {
    setActiveTrackId(pathId);
    setEnrolledToast(`🎯 Set "${pathTitle}" as your active career focus goal!`);
    SecureStore.setItemAsync('synergysphere.active_role_path', pathId).catch(() => {});
    setTimeout(() => setEnrolledToast(''), 4000);
  }

  // Combine builtin and API challenges
  const allChallenges = [
    ...BUILTIN_CHALLENGES,
    ...items.filter((item) => !BUILTIN_CHALLENGES.some((b) => b.id === item.id)),
  ];

  const filteredChallenges = allChallenges.filter((ch) => {
    const langMatch = selectedLanguage === 'All' || ch.language === selectedLanguage;
    const diffMatch = selectedDifficulty === 'ALL' || ch.difficulty.toUpperCase() === selectedDifficulty;
    return langMatch && diffMatch;
  });

  const filteredResources = resources.filter((resource) =>
    isResourceMatchingLanguage(resource, selectedLanguage)
  );

  // Automatically keep selectedChallenge in sync with active language & difficulty filters
  useEffect(() => {
    if (filteredChallenges.length > 0) {
      const isSelectedStillValid = selectedChallenge && filteredChallenges.some((c) => c.id === selectedChallenge.id);
      if (!isSelectedStillValid) {
        selectChallenge(filteredChallenges[0]);
      }
    }
  }, [selectedLanguage, selectedDifficulty, allChallenges.length]);

  function handleSelectLanguage(lang: string) {
    setSelectedLanguage(lang);
    const nextFiltered = allChallenges.filter((ch) => {
      const langMatch = lang === 'All' || ch.language === lang;
      const diffMatch = selectedDifficulty === 'ALL' || ch.difficulty.toUpperCase() === selectedDifficulty;
      return langMatch && diffMatch;
    });
    if (nextFiltered.length > 0) {
      selectChallenge(nextFiltered[0]);
    }
  }

  function handleSelectDifficulty(diff: string) {
    setSelectedDifficulty(diff);
    const nextFiltered = allChallenges.filter((ch) => {
      const langMatch = selectedLanguage === 'All' || ch.language === selectedLanguage;
      const diffMatch = diff === 'ALL' || ch.difficulty.toUpperCase() === diff;
      return langMatch && diffMatch;
    });
    if (nextFiltered.length > 0) {
      selectChallenge(nextFiltered[0]);
    }
  }

  function selectChallenge(ch: BuiltinChallenge | Challenge) {
    setSelectedChallenge(ch);
    setCode(ch.starterCode || '// Write your solution here…\n');
    setShowHint(false);
    setShowBlueprint(false);
    setTestOutput(null);
    setResult('');
    setError('');
  }

  function handleResetCode() {
    if (!selectedChallenge) return;
    setCode(selectedChallenge.starterCode || '');
    setTestOutput(null);
    setResult('');
    setError('');
  }

  async function handleRunTests() {
    if (!selectedChallenge || !code.trim()) return;
    setTesting(true);
    setTestOutput(null);
    try {
      const response = await api.post<{
        passed: boolean;
        output: string;
        error?: string;
        testResults?: Array<{ label: string; passed: boolean; expected?: unknown; got?: unknown; error?: string }>;
        solution?: string;
      }>(`/challenges/${selectedChallenge.id}/test`, {
        code,
        language: selectedChallenge.language || 'JavaScript',
      });
      const statusIcon = response.passed ? '✓' : '✗';
      setTestOutput(
        `${statusIcon} Server Judge: ${response.passed ? 'PASSED' : 'FAILED'}\n${response.output || ''}${
          response.error ? `\nError: ${response.error}` : ''
        }`
      );
      setEvaluation({
        action: 'test',
        passed: response.passed,
        title: response.passed ? 'RIGHT! All Tests Passed' : 'WRONG! Some Tests Failed',
        message: response.passed
          ? 'Great job! Your code produced the expected output on all test assertions.'
          : 'Your code did not satisfy all test assertions. Review the test breakdown and error logs below.',
        output: response.output,
        testResults: response.testResults,
        solution: response.solution || (selectedChallenge as BuiltinChallenge).solution || null,
      });
    } catch (err: any) {
      setEvaluation({
        action: 'test',
        passed: false,
        title: 'WRONG! Test Execution Failed',
        message: err?.message || 'Could not verify solution with server judge.',
        solution: (selectedChallenge as BuiltinChallenge).solution || null,
      });
      setTestOutput(`✗ Execution Error: ${err?.message || 'Could not verify solution with server judge.'}`);
    } finally {
      setTesting(false);
    }
  }

  async function submitSolution() {
    if (!selectedChallenge || !code.trim()) return;
    setSubmitting(true);
    setError('');
    setResult('');
    try {
      const response = await api.post<{
        passed: boolean;
        xpEarned: number;
        output?: string;
        testResults?: Array<{ label: string; passed: boolean; expected?: unknown; got?: unknown; error?: string }>;
        solution?: string;
      }>(
        `/challenges/${selectedChallenge.id}/submit`,
        { code, language: selectedChallenge.language || 'JavaScript' },
      );

      const refSolution = response.solution || (selectedChallenge as BuiltinChallenge).solution || null;

      if (response.passed) {
        setResult(`🎉 All server tests passed! You earned +${response.xpEarned} XP.`);
        setEvaluation({
          action: 'submit',
          passed: true,
          title: 'RIGHT! Solution Accepted',
          message: `Congratulations! Your solution passed all test cases. You earned +${response.xpEarned} XP!`,
          xpEarned: response.xpEarned,
          testResults: response.testResults,
          output: response.output,
          solution: refSolution,
        });
      } else {
        const details =
          response.testResults
            ?.map((t) => `${t.passed ? '✓' : '✗'} ${t.label}${t.error ? `: ${t.error}` : ''}`)
            .join('\n') || response.output || 'Solution did not pass all hidden server tests.';
        setError(`Failed server validation:\n${details}`);
        setEvaluation({
          action: 'submit',
          passed: false,
          title: 'WRONG! Solution Rejected',
          message: 'Your submitted code failed one or more unit tests. You can review the reference solution below to see how to solve it correctly.',
          testResults: response.testResults,
          output: response.output,
          solution: refSolution,
        });
      }
    } catch (err: any) {
      const refSolution = (selectedChallenge as BuiltinChallenge).solution || null;
      setError(err?.message || 'Submission failed. The server judge could not be reached.');
      setEvaluation({
        action: 'submit',
        passed: false,
        title: 'WRONG! Submission Verification Failed',
        message: err?.message || 'Submission failed. Check network or judge server.',
        solution: refSolution,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRateFlashcard(rating: 1 | 3 | 5) {
    const card = flashcards[currentFlashcardIndex];
    if (!card) return;
    try {
      await api.post('/curriculum/flashcards/review', {
        cardId: card.id,
        rating,
      });
      setFlashcardMessage(rating === 5 ? '✓ Easy — scheduled for later' : '✓ Reviewed — queued according to SM-2');
      setTimeout(() => {
        setFlashcardMessage('');
        setIsFlipped(false);
        if (currentFlashcardIndex + 1 < flashcards.length) {
          setCurrentFlashcardIndex((prev) => prev + 1);
        } else {
          setFlashcardMessage('🎉 Daily review complete! All spaced cards mastered.');
        }
      }, 700);
    } catch {
      setIsFlipped(false);
      if (currentFlashcardIndex + 1 < flashcards.length) {
        setCurrentFlashcardIndex((prev) => prev + 1);
      }
    }
  }

  async function checkResource(resource: LearningResource) {
    const answer = answers[resource.id];
    if (answer === undefined) return;
    setChecked((current) => ({ ...current, [resource.id]: true }));
    if (answer !== resource.answer) {
      // Incorrect answer: do NOT disable options, allow retrying!
      return;
    }
    // Correct answer: mark complete, award XP!
    try {
      const response = await api.post<{ xpEarned: number }>(`/learning/${resource.id}/complete`);
      setResources((current) => current.map((item) => (item.id === resource.id ? { ...item, completed: true } : item)));
      setResult(`🎉 Correct! You earned +${response.xpEarned || resource.xpReward} XP.`);
    } catch {
      setResources((current) => current.map((item) => (item.id === resource.id ? { ...item, completed: true } : item)));
      setResult(`🎉 Correct! You earned +${resource.xpReward} XP.`);
    }
  }

  function handleRetryResource(resourceId: string) {
    setChecked((current) => ({ ...current, [resourceId]: false }));
  }

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* LEARNING HUB HEADER */}
      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <View
          style={[
            styles.learningHubLogoWrapper,
            largerText && styles.learningHubLogoWrapperLarge,
            {
              backgroundColor:
                theme === 'dark'
                  ? 'rgba(16, 33, 40, 0.7)'
                  : 'rgba(237, 243, 239, 0.85)',
              borderColor:
                theme === 'dark'
                  ? 'rgba(145, 219, 94, 0.28)'
                  : 'rgba(145, 219, 94, 0.45)',
              shadowColor: theme === 'dark' ? '#91db5e' : '#10231D',
            },
          ]}
        >
          <Image
            source={require('../../../assets/images/learning-hub-logo.png')}
            style={[
              styles.learningHubLogo,
              largerText && styles.learningHubLogoLarge,
            ]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.headerText}>
          <Text
            allowFontScaling
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontSize: fontSize(24),
              },
            ]}
          >
            Learning{'\n'}Hub
          </Text>

          <Text
            allowFontScaling
            numberOfLines={2}
            style={[
              styles.headerSubtitle,
              {
                color: colors.muted,
                fontSize: fontSize(13),
                lineHeight: fontSize(18),
              },
            ]}
          >
            Explore structured programming tracks from W3Schools and master hands-on code challenges.
          </Text>
        </View>
      </View>

      {/* Mode Switcher Tabs */}
      <View style={styles.modeTabs}>
        <Pressable
          onPress={() => setMode('academy')}
          style={({ pressed }) => [
            styles.modeTab,
            mode === 'academy'
              ? [styles.modeTabActive, { backgroundColor: primaryAccent }]
              : [styles.modeTabInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="school-outline"
            size={18}
            color={mode === 'academy' ? '#ffffff' : colors.muted}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: mode === 'academy' ? '#ffffff' : colors.text },
            ]}
            numberOfLines={2}
          >
            Programming Academy
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('challenges')}
          style={({ pressed }) => [
            styles.modeTab,
            mode === 'challenges'
              ? [styles.modeTabActive, { backgroundColor: primaryAccent }]
              : [styles.modeTabInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="trophy-outline"
            size={18}
            color={mode === 'challenges' ? '#ffffff' : colors.muted}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: mode === 'challenges' ? '#ffffff' : colors.text },
            ]}
            numberOfLines={2}
          >
            Coding Challenges
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('rolepaths')}
          style={({ pressed }) => [
            styles.modeTab,
            mode === 'rolepaths'
              ? [styles.modeTabActive, { backgroundColor: primaryAccent }]
              : [styles.modeTabInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="git-network-outline"
            size={18}
            color={mode === 'rolepaths' ? '#ffffff' : colors.muted}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: mode === 'rolepaths' ? '#ffffff' : colors.text },
            ]}
            numberOfLines={2}
          >
            Role Paths
          </Text>
        </Pressable>
      </View>

      {error ? <Notice>{error}</Notice> : null}
      {result ? <Notice tone="success">{result}</Notice> : null}

      {/* Mode: Programming Academy (W3Schools) or Active Lesson */}
      {selectedLessonId ? (
        <LessonViewer
          lessonId={selectedLessonId}
          rolePath={activeRolePath}
          onLessonCompleted={(completedLessonId) => {
            setRolePaths((prevPaths) =>
              prevPaths.map((rp) => {
                const hasLesson = rp.syllabus.some((l) => l.id === completedLessonId);
                if (!hasLesson && rp.id !== activeRolePath?.id) return rp;
                const updatedSyllabus = rp.syllabus.map((item) =>
                  item.id === completedLessonId ? { ...item, completed: true } : item
                );
                const completedCount = updatedSyllabus.filter((l) => l.completed).length;
                const percent = Math.min(100, Math.round((completedCount / Math.max(updatedSyllabus.length, 1)) * 100));
                const updated = {
                  ...rp,
                  syllabus: updatedSyllabus,
                  completedLessons: completedCount,
                  percent,
                };
                if (activeRolePath && activeRolePath.id === rp.id) {
                  setActiveRolePath(updated);
                }
                return updated;
              })
            );
          }}
          onBack={() => {
            setSelectedLessonId(null);
            if (activeRolePath) {
              setMode('rolepaths');
              // Return directly to the "Curated Step-by-Step Curriculum" roadmap page
              const targetPath = rolePaths.find((rp) => rp.id === activeRolePath.id) || activeRolePath;
              setSelectedRolePathModal(targetPath);
            }
          }}
          onNavigateLesson={(nextId) => setSelectedLessonId(nextId)}
        />
      ) : mode === 'academy' ? (
        <CurriculumDashboard
          onSelectLesson={(lessonId) => {
            setActiveRolePath(null);
            setPreviousMode('academy');
            setSelectedLessonId(lessonId);
          }}
        />
      ) : null}

      {/* Mode: Coding Challenges Studio */}
      {mode === 'challenges' && !selectedLessonId ? (
        <>
          {/* Languages Filter Scroll */}
          <Text style={[styles.section, { color: colors.text }]}>Languages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {ALL_LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => handleSelectLanguage(lang)}
                style={({ pressed }) => [
                  styles.filterChip,
                  selectedLanguage === lang
                    ? [styles.filterChipActive, { backgroundColor: primaryAccent }]
                    : [styles.filterChipInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedLanguage === lang ? '#ffffff' : colors.text },
                  ]}
                >
                  {lang}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Difficulty Filter */}
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((diff) => (
              <Pressable
                key={diff}
                onPress={() => handleSelectDifficulty(diff)}
                style={({ pressed }) => [
                  styles.diffChip,
                  selectedDifficulty === diff
                    ? [styles.diffChipActive, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', borderColor: primaryAccent }]
                    : [styles.diffChipInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.diffChipText,
                    { color: selectedDifficulty === diff ? primaryAccent : colors.muted },
                  ]}
                >
                  {diff}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Challenge Selector */}
          <Text style={[styles.section, { color: colors.text }]}>Challenges ({filteredChallenges.length})</Text>
          {filteredChallenges.length === 0 ? (
            <Card style={styles.emptyFilterCard}>
              <Ionicons name="filter-outline" size={24} color={colors.muted} />
              <Text style={[styles.emptyFilterTitle, { color: colors.text }]}>
                No {selectedDifficulty !== 'ALL' ? selectedDifficulty : ''} challenges found for {selectedLanguage}
              </Text>
              <Text style={[styles.emptyFilterSub, { color: colors.muted }]}>
                Try selecting "ALL" difficulties or another programming language.
              </Text>
              <Pressable
                onPress={() => {
                  setSelectedLanguage('All');
                  setSelectedDifficulty('ALL');
                }}
                style={[styles.resetFilterBtn, { backgroundColor: primaryAccent }]}
              >
                <Text style={styles.resetFilterBtnText}>Reset Filters</Text>
              </Pressable>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengesScroll}>
              {filteredChallenges.map((ch) => {
                const diffColor =
                  ch.difficulty.toUpperCase() === 'EASY'
                    ? '#16a34a'
                    : ch.difficulty.toUpperCase() === 'MEDIUM'
                    ? '#d97706'
                    : '#dc2626';
                return (
                  <Pressable
                    key={ch.id}
                    onPress={() => selectChallenge(ch)}
                    style={({ pressed }) => [
                      styles.challengeCard,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                      selectedChallenge?.id === ch.id && { borderColor: primaryAccent, borderWidth: 2 },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.chCardHeader}>
                      <Text style={[styles.chCardLang, { color: primaryAccent }]}>{ch.language || 'Code'}</Text>
                      <View style={[styles.chXpBadge, { backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)' }]}>
                        <Text style={[styles.chXpText, { color: primaryAccent }]}>+{ch.xpReward} XP</Text>
                      </View>
                    </View>
                    <Text style={[styles.chCardTitle, { color: colors.text }]} numberOfLines={1}>{ch.title}</Text>
                    <View style={styles.diffBadgeRow}>
                      <View style={[styles.diffIndicatorDot, { backgroundColor: diffColor }]} />
                      <Text style={[styles.chCardDiff, { color: diffColor, fontWeight: '700' }]}>{ch.difficulty}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Active Challenge Studio */}
          {selectedChallenge ? (
            <>
              <Text style={[styles.section, { color: colors.text }]}>Challenge Studio</Text>
              <Card>
                <View style={styles.studioHeader}>
                  <View style={styles.studioTitleWrap}>
                    <Text style={[styles.studioTitle, { color: colors.text }]}>{selectedChallenge.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <View
                        style={[
                          styles.diffBadgeMicro,
                          {
                            backgroundColor:
                              selectedChallenge.difficulty.toUpperCase() === 'EASY'
                                ? '#16a34a'
                                : selectedChallenge.difficulty.toUpperCase() === 'MEDIUM'
                                ? '#d97706'
                                : '#dc2626',
                          },
                        ]}
                      >
                        <Text style={styles.diffBadgeMicroText}>{selectedChallenge.difficulty}</Text>
                      </View>
                      <Text style={[styles.studioMeta, { color: primaryAccent }]}>
                        {selectedChallenge.language || 'Programming'} · +{selectedChallenge.xpReward} XP
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={handleResetCode}
                    style={({ pressed }) => [
                      styles.resetBtn,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="refresh-outline" size={14} color={colors.muted} />
                    <Text style={[styles.resetText, { color: colors.muted }]}>Reset</Text>
                  </Pressable>
                </View>

                <Text style={[styles.description, { color: colors.muted }]}>{selectedChallenge.description}</Text>

                {/* Real-Time GeeksforGeeks Live Code Hint & Progress */}
                {(() => {
                  const liveHint = getRealtimeHint(code, selectedChallenge);
                  if (!liveHint) return null;
                  return (
                    <View
                      style={[
                        styles.realtimeHintCard,
                        {
                          backgroundColor:
                            liveHint.badgeTone === 'success'
                              ? (isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.22)')
                              : (isLight ? '#EFF6FF' : 'rgba(30, 58, 138, 0.22)'),
                          borderColor:
                            liveHint.badgeTone === 'success' ? primaryAccent : (isLight ? '#93C5FD' : '#3B82F6'),
                        },
                      ]}
                    >
                      <View style={styles.realtimeHintHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons
                            name={liveHint.badgeTone === 'success' ? 'checkmark-circle' : 'bulb'}
                            size={16}
                            color={liveHint.badgeTone === 'success' ? primaryAccent : '#2563EB'}
                          />
                          <Text style={[styles.realtimeHintTitle, { color: colors.text }]}>
                            GeeksforGeeks Live Hint & Feedback
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.realtimeStatusPill,
                            {
                              backgroundColor:
                                liveHint.badgeTone === 'success'
                                  ? (isLight ? '#C8E6C9' : '#14532D')
                                  : (isLight ? '#DBEAFE' : '#1E3A8A'),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.realtimeStatusText,
                              { color: liveHint.badgeTone === 'success' ? '#166534' : '#1D4ED8' },
                            ]}
                          >
                            {liveHint.statusBadge}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.realtimeMessage, { color: colors.text }]}>
                        {liveHint.message}
                      </Text>

                      {/* Real-time Checklist */}
                      <View style={styles.realtimeChecklist}>
                        {liveHint.checks.map((chk) => (
                          <View key={chk.label} style={styles.realtimeCheckItem}>
                            <Ionicons
                              name={chk.passed ? 'checkmark-circle' : 'ellipse-outline'}
                              size={14}
                              color={chk.passed ? '#16A34A' : colors.muted}
                            />
                            <Text
                              style={[
                                styles.realtimeCheckText,
                                { color: chk.passed ? colors.text : colors.muted },
                              ]}
                            >
                              {chk.label}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Expandable Blueprint */}
                      {'approach' in selectedChallenge && selectedChallenge.approach ? (
                        <Pressable
                          onPress={() => setShowBlueprint(!showBlueprint)}
                          style={({ pressed }) => [
                            styles.blueprintToggle,
                            { borderColor: colors.border },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Ionicons name="git-network-outline" size={14} color={primaryAccent} />
                          <Text style={[styles.blueprintToggleText, { color: primaryAccent }]}>
                            {showBlueprint ? 'Hide Algorithm Blueprint' : 'GeeksforGeeks Algorithm Blueprint'}
                          </Text>
                          <Ionicons
                            name={showBlueprint ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={primaryAccent}
                          />
                        </Pressable>
                      ) : null}

                      {showBlueprint && 'approach' in selectedChallenge ? (
                        <View style={[styles.blueprintBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Text style={[styles.blueprintHeading, { color: colors.text }]}>Approach:</Text>
                          <Text style={[styles.blueprintBody, { color: colors.muted }]}>{selectedChallenge.approach}</Text>
                          <View style={styles.complexityRow}>
                            <Text style={[styles.complexityText, { color: primaryAccent }]}>
                              Time: {selectedChallenge.timeComplexity || 'O(N)'}
                            </Text>
                            <Text style={[styles.complexityText, { color: primaryAccent }]}>
                              Space: {selectedChallenge.spaceComplexity || 'O(1)'}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })()}

                {/* Hint Accordion */}
                {'hint' in selectedChallenge && selectedChallenge.hint ? (
                  <View style={styles.hintWrap}>
                    <Pressable
                      onPress={() => setShowHint(!showHint)}
                      style={({ pressed }) => [
                        styles.hintToggle,
                        { backgroundColor: isLight ? '#FFF8E1' : '#2A2410', borderColor: '#F59E0B' },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
                      <Text style={[styles.hintToggleText, { color: '#F59E0B' }]}>
                        {showHint ? 'Hide Static Hint' : 'Show Hint'}
                      </Text>
                    </Pressable>
                    {showHint ? (
                      <View style={[styles.hintBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={[styles.hintContent, { color: colors.text }]}>{selectedChallenge.hint}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Mobile Keyboard Coding Accessory Symbols Bar */}
                <View style={{ marginBottom: 8 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                    {['{', '}', '(', ')', '[', ']', ';', '=>', '=', '!=', '<', '>', ':', '"', "'", 'tab', 'return', 'function', 'def', 'const', 'let'].map((sym) => (
                      <Pressable
                        key={sym}
                        onPress={() => {
                          if (sym === 'tab') {
                            setCode((prev) => prev + '  ');
                          } else {
                            setCode((prev) => prev + sym);
                          }
                        }}
                        style={({ pressed }) => [
                          {
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: isLight ? '#E5E7EB' : '#141d24',
                            borderWidth: 1,
                            borderColor: isLight ? '#D1D5DB' : '#23303b',
                          },
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: '700', color: primaryAccent }}>
                          {sym}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Code Editor */}
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  multiline
                  style={[styles.codeEditor, { backgroundColor: isLight ? '#F5F5F5' : '#050a0d', color: primaryAccent }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Test Output */}
                {testOutput ? (
                  <View style={[styles.outputBox, { backgroundColor: isLight ? '#E8F5E9' : '#0a1a0f', borderColor: primaryAccent }]}>
                    <Text style={[styles.outputText, { color: primaryAccent }]}>{testOutput}</Text>
                  </View>
                ) : null}

                {/* Action Controls */}
                <View style={styles.studioActions}>
                  <Button
                    title={testing ? 'Testing…' : 'Run Tests'}
                    secondary
                    onPress={handleRunTests}
                    disabled={testing || submitting}
                  />
                  <Button
                    title={submitting ? 'Submitting…' : 'Submit Solution'}
                    onPress={submitSolution}
                    disabled={submitting || !code.trim()}
                  />
                </View>

                {/* Prominent Right / Wrong Submission Feedback Card */}
                {evaluation ? (
                  <View
                    style={[
                      styles.evaluationCard,
                      {
                        backgroundColor: evaluation.passed
                          ? isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.12)'
                          : isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
                        borderColor: evaluation.passed ? '#10B981' : '#EF4444',
                      },
                    ]}
                  >
                    <View style={styles.evaluationHeaderRow}>
                      <Ionicons
                        name={evaluation.passed ? 'checkmark-circle' : 'close-circle'}
                        size={24}
                        color={evaluation.passed ? '#10B981' : '#EF4444'}
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text
                          style={[
                            styles.evaluationTitle,
                            { color: evaluation.passed ? (isLight ? '#065F46' : '#34D399') : (isLight ? '#991B1B' : '#F87171') },
                          ]}
                        >
                          {evaluation.title}
                        </Text>
                        {evaluation.message ? (
                          <Text style={[styles.evaluationMessage, { color: colors.text }]}>
                            {evaluation.message}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Test Cases Breakdown */}
                    {evaluation.testResults && evaluation.testResults.length > 0 ? (
                      <View style={styles.testResultsList}>
                        <Text style={[styles.testResultsHeading, { color: colors.text }]}>Test Verification Breakdown:</Text>
                        {evaluation.testResults.map((t, idx) => (
                          <View key={idx} style={styles.testResultRow}>
                            <Ionicons
                              name={t.passed ? 'checkmark-circle' : 'close-circle'}
                              size={16}
                              color={t.passed ? '#10B981' : '#EF4444'}
                            />
                            <Text style={[styles.testResultLabel, { color: t.passed ? (isLight ? '#047857' : '#6EE7B7') : (isLight ? '#B91C1C' : '#FCA5A5') }]}>
                              {t.label} {t.passed ? '(Passed)' : '(Failed)'}
                            </Text>
                            {t.error ? <Text style={styles.testResultError}>- {t.error}</Text> : null}
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Solution Unlock & Reference Viewer */}
                <View style={{ marginTop: 12 }}>
                  <Pressable
                    onPress={() => setShowSolution((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.solutionToggleBtn,
                      {
                        backgroundColor: showSolution
                          ? (isLight ? '#E5E7EB' : '#1f2937')
                          : (isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)'),
                        borderColor: isLight ? '#10B981' : '#059669',
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name={showSolution ? 'eye-off-outline' : 'bulb'} size={18} color={primaryAccent} />
                    <Text style={[styles.solutionToggleText, { color: primaryAccent }]}>
                      {showSolution ? 'Hide Reference Solution' : '💡 View Reference Solution'}
                    </Text>
                  </Pressable>

                  {showSolution ? (
                    <View style={[styles.solutionContainer, { backgroundColor: isLight ? '#F9FAFB' : '#0b131a', borderColor: colors.border }]}>
                      <View style={styles.solutionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
                          <Text style={[styles.solutionHeaderTitle, { color: colors.text }]}>
                            Verified Reference Solution
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            const sol = evaluation?.solution || (selectedChallenge as BuiltinChallenge).solution || selectedChallenge.starterCode;
                            if (sol) {
                              setCode(sol);
                              setResult('✓ Loaded reference solution into editor!');
                              setTimeout(() => setResult(''), 3000);
                            }
                          }}
                          style={({ pressed }) => [
                            styles.loadSolutionBtn,
                            { backgroundColor: primaryAccent },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Ionicons name="code-download-outline" size={14} color="#FFF" />
                          <Text style={styles.loadSolutionBtnText}>Load into Editor</Text>
                        </Pressable>
                      </View>

                      <Text
                        selectable
                        style={[
                          styles.solutionCodeBlock,
                          {
                            backgroundColor: isLight ? '#1E293B' : '#050a0d',
                            color: '#10B981',
                          },
                        ]}
                      >
                        {evaluation?.solution || (selectedChallenge as BuiltinChallenge).solution || selectedChallenge.starterCode}
                      </Text>

                      {selectedChallenge.approach ? (
                        <View style={styles.solutionApproachBox}>
                          <Text style={[styles.solutionApproachTitle, { color: colors.text }]}>
                            Algorithmic Approach & Key Invariants:
                          </Text>
                          <Text style={[styles.solutionApproachText, { color: colors.muted }]}>
                            {selectedChallenge.approach}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.complexityRow}>
                        {selectedChallenge.timeComplexity ? (
                          <View style={[styles.complexityChip, { backgroundColor: isLight ? '#EFF6FF' : '#1e3a5f' }]}>
                            <Text style={[styles.complexityChipText, { color: '#3B82F6' }]}>
                              Time: {selectedChallenge.timeComplexity}
                            </Text>
                          </View>
                        ) : null}
                        {selectedChallenge.spaceComplexity ? (
                          <View style={[styles.complexityChip, { backgroundColor: isLight ? '#FDF2F8' : '#4c1d3d' }]}>
                            <Text style={[styles.complexityChipText, { color: '#EC4899' }]}>
                              Space: {selectedChallenge.spaceComplexity}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Ask AI Assistant Deep Link */}
                <Pressable
                  onPress={() => router.push('/ai-assistant')}
                  style={({ pressed }) => [
                    styles.aiHelpRow,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="sparkles" size={16} color={primaryAccent} />
                  <Text style={[styles.aiHelpText, { color: colors.text }]}>
                    Stuck? Ask SynergySphere AI for hints or code review
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              </Card>
            </>
          ) : null}

          {/* Curated GeeksforGeeks Tutorials & Checks */}
          <Text style={[styles.section, { color: colors.text }]}>
            Curated Tutorials & Knowledge Checks{selectedLanguage !== 'All' ? ` (${selectedLanguage})` : ''}
          </Text>
          {filteredResources.length ? (
            filteredResources.map((resource) => {
                const answer = answers[resource.id];
                const isChecked = checked[resource.id];
                const correct = answer === resource.answer;
                const isExpanded = Boolean(expandedNotes[resource.id]);
                return (
                  <Card key={resource.id}>
                    <View style={styles.chCardHeader}>
                      <Text style={[styles.tag, { color: primaryAccent }]}>
                        {resource.topic} · {resource.level} · {resource.minutes} min
                      </Text>
                      {resource.completed ? (
                        <View style={[styles.chXpBadge, { backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)' }]}>
                          <Text style={[styles.chXpText, { color: primaryAccent }]}>Completed ✓</Text>
                        </View>
                      ) : (
                        <View style={[styles.chXpBadge, { backgroundColor: isLight ? '#FEF3C7' : 'rgba(217, 119, 6, 0.2)' }]}>
                          <Text style={[styles.chXpText, { color: '#D97706' }]}>+{resource.xpReward} XP</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>{resource.title}</Text>
                    <Text style={[styles.copy, { color: colors.muted }]}>{resource.outcome}</Text>

                    {/* In-App Study Notes & Tutorial Guide */}
                    <View style={styles.tutorialNotesWrapper}>
                      <Pressable
                        onPress={() => setExpandedNotes((curr) => ({ ...curr, [resource.id]: !curr[resource.id] }))}
                        style={({ pressed }) => [
                          styles.inAppNotesBtn,
                          {
                            backgroundColor: isLight ? '#F0FDF4' : 'rgba(30, 104, 39, 0.18)',
                            borderColor: primaryAccent,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons name="book-outline" size={15} color={primaryAccent} />
                        <Text style={[styles.inAppNotesBtnText, { color: primaryAccent }]}>
                          {isExpanded ? 'Hide In-App Study Notes' : '📖 Read Tutorial Notes (In-App)'}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={15}
                          color={primaryAccent}
                        />
                      </Pressable>

                      {isExpanded && resource.notes ? (
                        <View
                          style={[
                            styles.notesBox,
                            {
                              backgroundColor: isLight ? '#FAFDF9' : colors.surfaceElevated,
                              borderColor: isLight ? '#C8E6C9' : colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.notesHeading, { color: primaryAccent }]}>
                            GeeksforGeeks Core Concept Summary:
                          </Text>
                          <Text style={[styles.notesContent, { color: colors.text }]}>
                            {resource.notes}
                          </Text>
                        </View>
                      ) : null}

                      {/* Companion External Link */}
                      <Pressable
                        onPress={() => Linking.openURL(resource.url).catch(() => setError('Could not open external tutorial.'))}
                        style={({ pressed }) => [
                          styles.externalRefLink,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons name="open-outline" size={13} color={colors.muted} />
                        <Text style={[styles.externalRefText, { color: colors.muted }]}>
                          Open full article on GeeksforGeeks.org
                        </Text>
                      </Pressable>
                    </View>

                    {/* Question & Knowledge Check */}
                    <Text style={[styles.question, { color: colors.text }]}>{resource.question}</Text>
                    {resource.options.map((option, index) => {
                      const isSelected = answer === index;
                      const isThisCorrect = isChecked && index === resource.answer;
                      const isThisWrong = isChecked && isSelected && !correct;
                      return (
                        <Pressable
                          key={option}
                          disabled={resource.completed}
                          onPress={() => {
                            setAnswers((curr) => ({ ...curr, [resource.id]: index }));
                            if (isChecked && !correct) {
                              setChecked((curr) => ({ ...curr, [resource.id]: false }));
                            }
                          }}
                          style={({ pressed }) => [
                            styles.option,
                            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                            isSelected && { borderColor: primaryAccent, borderWidth: 1.5 },
                            isThisCorrect && {
                              backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)',
                              borderColor: primaryAccent,
                            },
                            isThisWrong && {
                              backgroundColor: isLight ? '#FDE8E8' : '#421d24',
                              borderColor: colors.danger,
                            },
                            pressed && !resource.completed && styles.pressed,
                          ]}
                        >
                          <View
                            style={[
                              styles.radio,
                              { borderColor: colors.muted },
                              isSelected && { borderColor: primaryAccent },
                              isThisCorrect && { borderColor: primaryAccent },
                              isThisWrong && { borderColor: colors.danger },
                            ]}
                          >
                            {isSelected ? (
                              <View
                                style={[
                                  styles.radioDot,
                                  { backgroundColor: isThisWrong ? colors.danger : primaryAccent },
                                ]}
                              />
                            ) : null}
                          </View>
                          <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                        </Pressable>
                      );
                    })}

                    {/* Interactive Confirmation & Feedback Banners */}
                    {isChecked ? (
                      correct ? (
                        <View style={[styles.feedbackBanner, { backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)', borderColor: primaryAccent }]}>
                          <Ionicons name="checkmark-circle" size={18} color={primaryAccent} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.feedbackTitle, { color: primaryAccent }]}>
                              ✓ Correct! +{resource.xpReward} XP earned
                            </Text>
                            {resource.explanation ? (
                              <Text style={[styles.feedbackExplanation, { color: colors.text }]}>
                                {resource.explanation}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.feedbackBanner, { backgroundColor: isLight ? '#FDE8E8' : '#421d24', borderColor: colors.danger }]}>
                          <Ionicons name="close-circle" size={18} color={colors.danger} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.feedbackTitle, { color: colors.danger }]}>
                              ✗ Incorrect answer
                            </Text>
                            <Text style={[styles.feedbackExplanation, { color: colors.text }]}>
                              Review the In-App Tutorial Notes above and try again!
                            </Text>
                          </View>
                        </View>
                      )
                    ) : null}

                    {/* Action Buttons */}
                    {resource.completed ? (
                      <View style={styles.completedRow}>
                        <Ionicons name="checkmark-done" size={18} color={primaryAccent} />
                        <Text style={[styles.complete, { color: primaryAccent }]}>
                          Mastered · +{resource.xpReward} XP earned
                        </Text>
                      </View>
                    ) : isChecked && !correct ? (
                      <Button
                        title="Try Again"
                        secondary
                        onPress={() => handleRetryResource(resource.id)}
                      />
                    ) : (
                      <Button
                        title={isChecked && correct ? 'Completed ✓' : 'Check answer'}
                        onPress={() => checkResource(resource)}
                        disabled={answer === undefined || (isChecked && correct)}
                      />
                    )}
                  </Card>
                );
              })
          ) : (
            <Card style={styles.emptyFilterCard}>
              <Ionicons name="book-outline" size={28} color={colors.muted} />
              <Text style={[styles.emptyFilterTitle, { color: colors.text }]}>
                No curated tutorials found for {selectedLanguage}
              </Text>
              <Text style={[styles.emptyFilterSub, { color: colors.muted }]}>
                Switch back to "All" to browse all fundamental algorithms, data structures, and programming languages.
              </Text>
              <Pressable
                onPress={() => setSelectedLanguage('All')}
                style={({ pressed }) => [
                  styles.filterChip,
                  styles.filterChipActive,
                  { backgroundColor: primaryAccent, alignSelf: 'center', marginTop: 10 },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.filterChipText, { color: '#ffffff' }]}>
                  Show All Tutorials
                </Text>
              </Pressable>
            </Card>
          )}
        </>
      ) : null}

      {/* Mode: Role Paths & Spaced Flashcards */}
      {mode === 'rolepaths' && !selectedLessonId ? (
        <>
          {/* Explainer Guide Card */}
          <Card style={{ backgroundColor: isLight ? '#f6fbf7' : colors.surfaceElevated, borderColor: isLight ? '#c8e6c9' : colors.border, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={[styles.guideIconWrap, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)' }]}>
                <Ionicons name="compass-outline" size={22} color={primaryAccent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                  What are Role Paths?
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>
                  Curated career blueprints bridging 3 learning pillars
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 19, marginBottom: 12 }}>
              Role Paths connect foundational syntax, algorithmic problem solving, and simulated technical interviews into an end-to-end career roadmap for software engineering positions.
            </Text>

            <View style={styles.pillarsRow}>
              <View style={[styles.pillarPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="school-outline" size={15} color={primaryAccent} />
                <Text style={[styles.pillarPillTitle, { color: colors.text }]}>1. Academy</Text>
                <Text style={[styles.pillarPillSub, { color: colors.muted }]}>Curated Lessons</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.muted} />
              <View style={[styles.pillarPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="code-slash-outline" size={15} color={primaryAccent} />
                <Text style={[styles.pillarPillTitle, { color: colors.text }]}>2. Challenges</Text>
                <Text style={[styles.pillarPillSub, { color: colors.muted }]}>Verified Code</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.muted} />
              <View style={[styles.pillarPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="mic-outline" size={15} color={primaryAccent} />
                <Text style={[styles.pillarPillTitle, { color: colors.text }]}>3. Interviews</Text>
                <Text style={[styles.pillarPillSub, { color: colors.muted }]}>AI Mock Coach</Text>
              </View>
            </View>
          </Card>

          {enrolledToast ? (
            <Notice tone="success">{enrolledToast}</Notice>
          ) : null}

          {/* Daily Spaced Repetition (SM-2) */}
          <Text style={[styles.section, { color: colors.text }]}>Daily Spaced Review (SM-2)</Text>
          <Card>
            {flashcardMessage ? (
              <Notice tone="success">{flashcardMessage}</Notice>
            ) : null}

            {flashcards.length > 0 && currentFlashcardIndex < flashcards.length ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
                    Card {currentFlashcardIndex + 1} of {flashcards.length} · {flashcards[currentFlashcardIndex].topic}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Tap to flip</Text>
                </View>

                <Pressable
                  onPress={() => setIsFlipped(!isFlipped)}
                  style={{
                    minHeight: 120,
                    borderRadius: 10,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: isFlipped ? primaryAccent : colors.border,
                    backgroundColor: colors.surfaceElevated,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 4 }}>
                    {isFlipped ? 'ANSWER' : 'QUESTION'}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 22 }}>
                    {isFlipped ? flashcards[currentFlashcardIndex].back : flashcards[currentFlashcardIndex].front}
                  </Text>
                </Pressable>

                {isFlipped ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Button
                      title="Hard (1)"
                      secondary
                      onPress={() => handleRateFlashcard(1)}
                    />
                    <Button
                      title="Good (3)"
                      secondary
                      onPress={() => handleRateFlashcard(3)}
                    />
                    <Button
                      title="Easy (5)"
                      onPress={() => handleRateFlashcard(5)}
                    />
                  </View>
                ) : (
                  <Button
                    title="Reveal Answer"
                    secondary
                    onPress={() => setIsFlipped(true)}
                  />
                )}
              </View>
            ) : (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={32} color={primaryAccent} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6 }}>
                  No Reviews Due Today
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 2 }}>
                  Your spaced repetition queue is clear. Return tomorrow for your 10-minute review!
                </Text>
              </View>
            )}
          </Card>

          {/* Curated Career Role Paths */}
          <Text style={[styles.section, { color: colors.text }]}>Curated Career Role Paths</Text>
          {rolePaths.map((path) => {
            const isActive = activeTrackId === path.id;
            return (
              <View key={path.id} style={{ marginBottom: 16 }}>
                {/* Heading placed outside of the card container */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                      {path.title}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: primaryAccent, marginTop: 2 }}>
                      {path.targetRole}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', flexShrink: 0 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
                      {path.totalLessons} Lessons
                    </Text>
                  </View>
                </View>

                <Card style={isActive ? { borderColor: primaryAccent, borderWidth: 1.5 } : undefined}>
                  {/* Active Goal Ribbon */}
                  {isActive ? (
                    <View style={[styles.activeGoalBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.25)' }]}>
                      <Ionicons name="star" size={12} color={primaryAccent} />
                      <Text style={[styles.activeGoalBadgeText, { color: primaryAccent }]}>
                        ACTIVE CAREER GOAL
                      </Text>
                    </View>
                  ) : null}

                  <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: 12 }}>
                    {path.tagline}
                  </Text>

                {/* Completion Progress Bar */}
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                      Progress
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
                      {path.completedLessons || 0} of {path.totalLessons} Lessons ({path.percent || 0}%)
                    </Text>
                  </View>
                  <View style={[styles.pathProgressTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.pathProgressFill,
                        {
                          backgroundColor: primaryAccent,
                          width: `${Math.min(100, Math.max(path.percent || 0, 4))}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Pillar 1: Curriculum Tracks */}
                <View style={[styles.pathPillarBox, { backgroundColor: isLight ? '#FAFAFA' : colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="school-outline" size={14} color={primaryAccent} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                        Curriculum Syllabus ({path.syllabus?.length || path.totalLessons} Lessons)
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setSelectedRolePathModal(path)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
                        View All ↗
                      </Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {path.subjectIds.map((sub) => (
                      <View key={sub} style={[styles.subTrackPill, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                          {formatTrackName(sub)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => handleOpenLessonFromPath(path)}
                      style={({ pressed }) => [
                        styles.actionBtnPrimary,
                        { backgroundColor: primaryAccent, opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Ionicons name="play" size={12} color="#ffffff" />
                      <Text style={styles.actionBtnPrimaryText}>Start Learning</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedRolePathModal(path)}
                      style={({ pressed }) => [
                        styles.actionBtnSecondary,
                        { borderColor: colors.border, backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Ionicons name="list" size={12} color={colors.text} />
                      <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>Roadmap</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Pillar 2: Hands-on Code Challenges (Interactive) */}
                <View style={[styles.pathPillarBox, { backgroundColor: isLight ? '#FAFAFA' : colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="code-slash-outline" size={14} color={primaryAccent} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                      Verified Code Challenges (Tap to solve):
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {path.recommendedChallenges.map((ch) => (
                      <Pressable
                        key={ch.id}
                        onPress={() => handleLaunchChallengeFromPath(ch)}
                        style={({ pressed }) => [
                          styles.challengeChipBtn,
                          {
                            borderColor: primaryAccent,
                            backgroundColor: isLight ? '#F0F9F1' : 'rgba(30, 104, 39, 0.15)',
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Ionicons name="flash-outline" size={12} color={primaryAccent} />
                        <Text style={[styles.challengeChipTitle, { color: colors.text }]}>
                          {ch.title}
                        </Text>
                        <View style={[styles.diffBadgeMicro, { backgroundColor: ch.difficulty === 'EASY' ? '#388E3C' : ch.difficulty === 'HARD' ? '#D32F2F' : '#F57C00' }]}>
                          <Text style={styles.diffBadgeMicroText}>{ch.difficulty}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Pillar 3: Mock Interview Prep */}
                <View style={[styles.pathPillarBox, { backgroundColor: isLight ? '#FAFAFA' : colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="mic-outline" size={14} color={primaryAccent} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                        Technical Mock Interview Topics:
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {path.interviewTags.map((tag) => (
                      <View key={tag} style={[styles.interviewTagPill, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <Text style={{ fontSize: 11, color: colors.muted }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => handleLaunchInterviewFromPath(path)}
                    style={({ pressed }) => [
                      styles.actionBtnSecondary,
                      { borderColor: primaryAccent, backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="chatbubbles-outline" size={13} color={primaryAccent} />
                    <Text style={[styles.actionBtnSecondaryText, { color: primaryAccent }]}>
                      Practice in Interview Coach ↗
                    </Text>
                  </Pressable>
                </View>

                {/* Goal Enrollment Toggle Footer */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                  <Pressable
                    onPress={() => handleSetActiveGoal(path.id, path.title)}
                    style={({ pressed }) => [
                      styles.goalToggleBtn,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Ionicons
                      name={isActive ? 'star' : 'star-outline'}
                      size={14}
                      color={isActive ? primaryAccent : colors.muted}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isActive ? primaryAccent : colors.muted,
                      }}
                    >
                      {isActive ? 'Current Career Goal' : 'Set as Career Goal'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            </View>
          );
        })}
        </>
      ) : null}

      {/* Syllabus Roadmap Modal */}
      <Modal
        visible={Boolean(selectedRolePathModal)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRolePathModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedRolePathModal?.title}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {selectedRolePathModal?.targetRole} · {selectedRolePathModal?.totalLessons} Lessons
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedRolePathModal(null)}
                style={({ pressed }) => [
                  styles.modalCloseBtn,
                  { backgroundColor: colors.surfaceElevated, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Modal Content */}
            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 14 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Overview & Quick Launch Banner */}
              <View style={[styles.modalSummaryBox, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', borderColor: primaryAccent }]}>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 19, marginBottom: 10 }}>
                  {selectedRolePathModal?.tagline}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => selectedRolePathModal && handleOpenLessonFromPath(selectedRolePathModal)}
                    style={({ pressed }) => [
                      styles.actionBtnPrimary,
                      { flex: 1, backgroundColor: primaryAccent, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="play" size={13} color="#ffffff" />
                    <Text style={styles.actionBtnPrimaryText}>Start Learning</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => selectedRolePathModal && handleLaunchInterviewFromPath(selectedRolePathModal)}
                    style={({ pressed }) => [
                      styles.actionBtnSecondary,
                      { flex: 1, borderColor: primaryAccent, backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="mic-outline" size={13} color={primaryAccent} />
                    <Text style={[styles.actionBtnSecondaryText, { color: primaryAccent }]}>Mock Interview</Text>
                  </Pressable>
                </View>
              </View>

              {/* Phase-by-Phase Lessons Syllabus */}
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 4 }}>
                Curated Step-by-Step Curriculum
              </Text>

              {selectedRolePathModal?.syllabus?.map((lesson, idx) => (
                <View
                  key={lesson.id}
                  style={[
                    styles.syllabusLessonItem,
                    {
                      backgroundColor: lesson.completed
                        ? (isLight ? '#F0F9F1' : 'rgba(30, 104, 39, 0.12)')
                        : colors.surfaceElevated,
                      borderColor: lesson.completed ? primaryAccent : colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                      <View style={[styles.phaseTag, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)' }]}>
                        <Text style={[styles.phaseTagText, { color: primaryAccent }]}>
                          {lesson.phase}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        Lesson {idx + 1}
                      </Text>
                      {lesson.completed ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="checkmark-circle" size={13} color={primaryAccent} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>Done</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.syllabusLessonTitle, { color: colors.text }]}>
                      {lesson.title}
                    </Text>
                    <Text style={[styles.syllabusLessonDesc, { color: colors.muted }]} numberOfLines={2}>
                      {lesson.description}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => selectedRolePathModal && handleOpenLessonFromPath(selectedRolePathModal, lesson.id)}
                    style={({ pressed }) => [
                      styles.studyBtn,
                      {
                        backgroundColor: lesson.completed ? (isLight ? '#2e7d32' : '#15803d') : primaryAccent,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.studyBtnText}>
                      {lesson.completed ? 'Review ↗' : 'Study ↗'}
                    </Text>
                  </Pressable>
                </View>
              ))}

              {/* Recommended Coding Challenges */}
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 8 }}>
                Required Verified Challenges
              </Text>
              {selectedRolePathModal?.recommendedChallenges.map((ch) => (
                <View
                  key={ch.id}
                  style={[
                    styles.syllabusLessonItem,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <View style={[styles.diffBadgeMicro, { backgroundColor: ch.difficulty === 'EASY' ? '#388E3C' : ch.difficulty === 'HARD' ? '#D32F2F' : '#F57C00' }]}>
                        <Text style={styles.diffBadgeMicroText}>{ch.difficulty}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
                        +{ch.xpReward} XP
                      </Text>
                    </View>
                    <Text style={[styles.syllabusLessonTitle, { color: colors.text }]}>
                      {ch.title}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleLaunchChallengeFromPath(ch)}
                    style={({ pressed }) => [
                      styles.studyBtn,
                      { backgroundColor: primaryAccent, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={styles.studyBtnText}>Solve Code ↗</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeTabs: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 12 },
  modeTab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    minHeight: 58,
  },
  modeTabActive: { elevation: 2 },
  modeTabInactive: { borderWidth: 1 },
  modeTabText: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  pressed: { opacity: 0.7 },
  section: { fontSize: 17, fontWeight: '800', marginTop: 14, marginBottom: 6 },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterChipActive: { elevation: 2 },
  filterChipInactive: { borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  diffRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  diffChip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  diffChipActive: { borderWidth: 1.5 },
  diffChipInactive: {},
  diffChipText: { fontSize: 11, fontWeight: '700' },
  challengesScroll: { gap: 10, paddingVertical: 4 },
  challengeCard: { width: 170, padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  chCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  chCardLang: { fontSize: 11, fontWeight: '800', flex: 1, minWidth: 0 },
  chXpBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start' },
  chXpText: { fontSize: 10, fontWeight: '800' },
  chCardTitle: { fontSize: 14, fontWeight: '700' },
  chCardDiff: { fontSize: 11 },
  studioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  studioTitleWrap: { flex: 1 },
  studioTitle: { fontSize: 17, fontWeight: '800' },
  studioMeta: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  resetText: { fontSize: 11, fontWeight: '600' },
  description: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  hintWrap: { marginBottom: 10 },
  hintToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  hintToggleText: { fontSize: 12, fontWeight: '700' },
  hintBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  hintContent: { fontSize: 12, lineHeight: 18 },
  codeEditor: { minHeight: 180, padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, lineHeight: 18, textAlignVertical: 'top', marginBottom: 10 },
  outputBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  outputText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  studioActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  aiHelpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  aiHelpText: { flex: 1, fontSize: 12, fontWeight: '600' },
  tag: { fontWeight: '800', fontSize: 12 },
  title: { fontSize: 16, fontWeight: '800' },
  copy: { lineHeight: 19, fontSize: 13 },
  question: { fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 4 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
  radio: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  radioDot: { width: 6, height: 6, borderRadius: 3 },
  optionText: { flex: 1, fontSize: 13 },
  complete: { fontWeight: '800', fontSize: 13 },
  guideIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pillarsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  pillarPill: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, gap: 2 },
  pillarPillTitle: { fontSize: 11, fontWeight: '800' },
  pillarPillSub: { fontSize: 9 },
  activeGoalBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  activeGoalBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  pathProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  pathProgressFill: { height: '100%', borderRadius: 3 },
  pathPillarBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  subTrackPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  actionBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  actionBtnPrimaryText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1 },
  actionBtnSecondaryText: { fontSize: 12, fontWeight: '700' },
  challengeChipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  challengeChipTitle: { fontSize: 12, fontWeight: '700' },
  diffBadgeMicro: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  diffBadgeMicroText: { fontSize: 9, fontWeight: '800', color: '#ffffff' },
  interviewTagPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  goalToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalSummaryBox: { padding: 12, borderRadius: 10, borderWidth: 1 },
  syllabusLessonItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, gap: 10 },
  phaseTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  phaseTagText: { fontSize: 10, fontWeight: '700' },
  syllabusLessonTitle: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  syllabusLessonDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  studyBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  studyBtnText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    minHeight: 88,
    width: '100%',
  },
  headerRowLarge: {
    alignItems: 'flex-start',
  },
  learningHubLogoWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 0,
  },
  learningHubLogoWrapperLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  learningHubLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  learningHubLogoLarge: {
    borderRadius: 31,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyFilterCard: { padding: 20, alignItems: 'center', justifyContent: 'center', marginVertical: 10, borderRadius: 12, borderWidth: 1, gap: 8 },
  emptyFilterTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  emptyFilterSub: { fontSize: 12, textAlign: 'center' },
  resetFilterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: 4 },
  resetFilterBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  diffBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  diffIndicatorDot: { width: 7, height: 7, borderRadius: 4 },
  realtimeHintCard: { padding: 12, borderRadius: 10, borderWidth: 1.5, marginBottom: 12, gap: 8 },
  realtimeHintHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  realtimeHintTitle: { fontSize: 13, fontWeight: '800' },
  realtimeStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  realtimeStatusText: { fontSize: 11, fontWeight: '800' },
  realtimeMessage: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  realtimeChecklist: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  realtimeCheckItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  realtimeCheckText: { fontSize: 11, fontWeight: '600' },
  blueprintToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderTopWidth: 1, marginTop: 4 },
  blueprintToggleText: { fontSize: 11, fontWeight: '700', flex: 1 },
  blueprintBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 4, gap: 4 },
  blueprintHeading: { fontSize: 11, fontWeight: '800' },
  blueprintBody: { fontSize: 11, lineHeight: 16 },
  complexityRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  complexityText: { fontSize: 11, fontWeight: '700' },
  tutorialNotesWrapper: { marginVertical: 6, gap: 6 },
  inAppNotesBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  inAppNotesBtnText: { flex: 1, fontSize: 12, fontWeight: '700' },
  notesBox: { padding: 12, borderRadius: 8, borderWidth: 1, gap: 6 },
  notesHeading: { fontSize: 12, fontWeight: '800' },
  notesContent: { fontSize: 12, lineHeight: 18 },
  externalRefLink: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3 },
  externalRefText: { fontSize: 11, textDecorationLine: 'underline' },
  feedbackBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  feedbackTitle: { fontSize: 12, fontWeight: '800' },
  feedbackExplanation: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  evaluationCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 12,
    gap: 8,
  },
  evaluationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  evaluationTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  evaluationMessage: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  testResultsList: {
    marginTop: 8,
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  testResultsHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  testResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testResultLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  testResultError: {
    fontSize: 11,
    color: '#EF4444',
  },
  solutionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  solutionToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  solutionContainer: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  solutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  solutionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  loadSolutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  loadSolutionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  solutionCodeBlock: {
    fontFamily: 'monospace',
    fontSize: 12,
    padding: 12,
    borderRadius: 8,
    lineHeight: 18,
  },
  solutionApproachBox: {
    gap: 4,
  },
  solutionApproachTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  solutionApproachText: {
    fontSize: 12,
    lineHeight: 17,
  },
  complexityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  complexityChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
