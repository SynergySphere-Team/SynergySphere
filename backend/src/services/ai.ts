/**
 * AI service abstraction layer.
 *
 * Priority order:
 *  1. Google Gemini (GEMINI_API_KEY) – free tier available at aistudio.google.com
 *  2. OpenAI (OPENAI_API_KEY)
 *  3. Rule-based fallback (always works, no API key required)
 */

const AI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 25000;

/* ─────────────────────────── main export ─────────────────────────── */

export async function generateAiResponse(systemPrompt: string, userMessage: string): Promise<string> {
  // 1. Try Gemini first (free)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const result = await callGemini(geminiKey, systemPrompt, userMessage);
      if (result) return result;
    } catch (err) {
      console.error('Gemini API error:', err);
    }
  }

  // 2. Try OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const result = await callOpenAI(openaiKey, systemPrompt, userMessage);
      if (result) return result;
    } catch (err) {
      console.error('OpenAI API error:', err);
    }
  }

  // 3. Intelligent fallback
  return fallbackResponse(systemPrompt, userMessage);
}

/* ─────────────────────────── Gemini ─────────────────────────── */

async function callGemini(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini request failed ${response.status}: ${errBody}`);
    }

    const data = await response.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } finally {
    clearTimeout(timeout);
  }
}

/* ─────────────────────────── OpenAI ─────────────────────────── */

async function callOpenAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI request failed with status ' + response.status);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}

/* ─────────────────────────── rule-based fallback ─────────────────────────── */

function fallbackResponse(systemPrompt: string, message: string): string {
  const lower = message.toLowerCase();
  const isInterviewer = systemPrompt.toLowerCase().includes('interview');
  const isTransformer = systemPrompt.toLowerCase().includes('transformer');
  const isEvaluator = systemPrompt.toLowerCase().includes('evaluator');

  // ── Interview questions ──
  if (isInterviewer || (lower.includes('interview') && lower.includes('question'))) {
    const topic = extractTopic(message);
    return JSON.stringify(getInterviewQuestions(topic));
  }

  // ── Interview evaluation ──
  if (isEvaluator || (lower.includes('evaluate') && lower.includes('answers'))) {
    return JSON.stringify({
      score: 75,
      feedback:
        'Solid understanding demonstrated. Work on providing concrete examples and consider time/space complexity in your answers.',
      weakAreas: ['System design depth', 'Big-O complexity analysis'],
    });
  }

  // ── Lecture / flashcards ──
  if (isTransformer || (!isInterviewer && !isEvaluator && (lower.includes('flashcard') || lower.includes('lecture')))) {
    return JSON.stringify({
      summary:
        'This content covers fundamental programming concepts including data structures, algorithms, and software design principles.',
      flashcards: [
        { front: 'What is Big-O notation?', back: 'A way to describe algorithm time/space complexity as input size grows.' },
        { front: 'What is a stack?', back: 'A LIFO (Last In, First Out) data structure.' },
        { front: 'What is memoization?', back: 'Caching function results to avoid redundant computation.' },
        { front: 'What is a closure?', back: 'A function that retains access to its outer scope after the outer function has returned.' },
      ],
      quiz: [
        {
          question: 'Which data structure uses LIFO ordering?',
          options: ['Queue', 'Stack', 'Array', 'Tree'],
          answer: 1,
        },
        {
          question: 'What is the time complexity of binary search?',
          options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
          answer: 2,
        },
      ],
    });
  }

  // ── Code explanation ──
  if (lower.includes('explain')) {
    return buildCodeResponse('explain', message);
  }

  // ── Debugging ──
  if (lower.includes('debug') || lower.includes('error') || lower.includes('bug') || lower.includes('fix')) {
    return buildCodeResponse('debug', message);
  }

  // ── Optimization ──
  if (lower.includes('optim') || lower.includes('improve') || lower.includes('refactor')) {
    return buildCodeResponse('optimize', message);
  }

  // ── Test generation ──
  if (lower.includes('test') || lower.includes('unit test')) {
    return buildCodeResponse('test', message);
  }

  // ── Hint request ──
  if (lower.includes('hint') || lower.includes('stuck') || lower.includes('help me')) {
    return '💡 Think about what data structure gives you O(1) lookups. A hash map (Map/dict/HashMap) is often the key to reducing nested loops to a single pass. Try iterating once and storing what you\'ve seen.\n\n⚡ To enable full AI-powered hints, add GEMINI_API_KEY to backend/.env (free at aistudio.google.com).';
  }

  // ── General greeting / fallback ──
  return (
    "I'm the SynergySphere AI Coding Assistant running in demo mode.\n\n" +
    'I can help with:\n' +
    '• Explaining code concepts\n' +
    '• Debugging errors\n' +
    '• Optimizing algorithms\n' +
    '• Generating test cases\n' +
    '• Mock interview questions\n\n' +
    '⚡ For full AI capabilities, add to backend/.env:\n' +
    '   GEMINI_API_KEY="your-key"  ← free at aistudio.google.com\n' +
    '   OPENAI_API_KEY="sk-..."    ← or use OpenAI'
  );
}

function extractTopic(message: string): string {
  const topics = ['Java', 'Python', 'JavaScript', 'SQL', 'Web Development', 'React', 'Node.js'];
  for (const t of topics) {
    if (message.toLowerCase().includes(t.toLowerCase())) return t;
  }
  return 'General Programming';
}

function getInterviewQuestions(topic: string) {
  const base = [
    { question: `Explain the difference between == and === in ${topic === 'JavaScript' ? 'JavaScript' : 'your primary language'}.`, difficulty: 'easy' },
    { question: 'What is the difference between a stack and a queue? When would you use each?', difficulty: 'easy' },
    { question: 'Explain Big-O notation and give an example of O(n²) vs O(n log n) algorithms.', difficulty: 'medium' },
    { question: 'What is a closure / lambda and how does it capture variables?', difficulty: 'medium' },
    { question: `Design a rate-limiting system for a ${topic} API that handles 1M requests/day.`, difficulty: 'hard' },
  ];

  if (topic === 'Java') {
    base[0] = { question: 'Explain the difference between == and .equals() in Java, and when would you use each?', difficulty: 'easy' };
    base[3] = { question: 'What are the differences between an interface and an abstract class in Java?', difficulty: 'medium' };
  } else if (topic === 'SQL') {
    base[0] = { question: 'What is the difference between INNER JOIN and LEFT JOIN?', difficulty: 'easy' };
    base[1] = { question: 'Explain the difference between WHERE and HAVING clauses.', difficulty: 'easy' };
    base[2] = { question: 'What is a database index and how does it improve query performance?', difficulty: 'medium' };
    base[3] = { question: 'Explain database normalization and when you might denormalize.', difficulty: 'medium' };
    base[4] = { question: 'Design a schema for a social media platform (users, posts, likes, follows).', difficulty: 'hard' };
  }

  return base;
}

function buildCodeResponse(type: string, message: string): string {
  const hasCode = message.includes('```') || message.includes('{') || message.includes('function') || message.includes('class');

  const responses: Record<string, string> = {
    explain:
      hasCode
        ? 'Here\'s what this code does:\n\n1. It defines the core logic in a function/method.\n2. It iterates or processes the input data.\n3. It returns a result based on the computation.\n\n💡 Look at the control flow (if/else, loops) to understand the decision-making.\n\n⚡ For detailed line-by-line explanations, add GEMINI_API_KEY to backend/.env.'
        : 'To explain code, paste your code in the Code Context panel and click "Explain", or include it in your message.\n\n⚡ Add GEMINI_API_KEY to backend/.env for full AI explanations.',

    debug:
      'Common bugs to check in your code:\n\n1. 🔴 Off-by-one errors in loops (use `< length` not `<= length`)\n2. 🔴 Null/undefined reference – add null checks before accessing properties\n3. 🔴 Wrong data type – ensure you\'re comparing numbers to numbers, strings to strings\n4. 🔴 Mutation of shared state – avoid modifying input arrays/objects directly\n5. 🔴 Async/await missing – ensure async functions are properly awaited\n\n⚡ Add GEMINI_API_KEY to backend/.env for AI-powered debugging.',

    optimize:
      'Optimization strategies:\n\n1. ⚡ Replace O(n²) nested loops with a hash map for O(n) lookups\n2. ⚡ Cache repeated calculations (memoization)\n3. ⚡ Use appropriate data structures (Set for uniqueness, Map for key-value)\n4. ⚡ Avoid unnecessary re-renders / re-allocations\n5. ⚡ Use early returns to reduce nesting\n\n⚡ Add GEMINI_API_KEY to backend/.env for AI-powered optimization.',

    test:
      'Unit test cases to write:\n\n✅ Happy path – typical valid inputs\n📭 Empty input – empty string, [], null\n🔢 Edge values – 0, -1, very large numbers\n🔁 Duplicate values\n🃏 Single element\n❌ Invalid types – what happens with wrong input?\n\nExample (JavaScript):\n```js\ndescribe("myFunction", () => {\n  it("handles normal input", () => {\n    expect(myFunction([1,2,3])).toBe(expectedValue);\n  });\n  it("handles empty array", () => {\n    expect(myFunction([])).toBe(0);\n  });\n});\n```\n\n⚡ Add GEMINI_API_KEY to backend/.env for AI-generated tests.',
  };

  return responses[type] || responses['explain'];
}
