/**
 * AI service abstraction layer.
 * Supports OpenAI, with fallback to rule-based responses when no API key is set.
 */

const AI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 20000;

export async function generateAiResponse(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
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
          max_tokens: 1200,
        }),
      });

      if (!response.ok) {
        throw new Error('OpenAI request failed with status ' + response.status);
      }

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      return data.choices[0]?.message?.content || fallbackResponse(userMessage);
    } catch (error) {
      console.error('OpenAI API error:', error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return fallbackResponse(userMessage);
}

function fallbackResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('interview') || lower.includes('question')) {
    return JSON.stringify([
      { question: 'Explain the difference between == and === in JavaScript.', difficulty: 'easy' },
      { question: 'What is a closure and how does it work?', difficulty: 'medium' },
      { question: 'Describe the event loop in Node.js.', difficulty: 'medium' },
      { question: 'How would you optimize a slow database query?', difficulty: 'hard' },
      { question: 'Design a URL shortener service.', difficulty: 'hard' },
    ]);
  }

  if (lower.includes('evaluate') || lower.includes('answers')) {
    return JSON.stringify({
      score: 75,
      feedback: 'Solid understanding demonstrated. Focus on providing more detailed examples in your answers.',
      weakAreas: ['System design', 'Time complexity analysis'],
    });
  }

  if (lower.includes('flashcard') || lower.includes('lecture') || lower.includes('summary')) {
    return JSON.stringify({
      summary: 'This lecture covers fundamental programming concepts including variables, control flow, functions, and data structures.',
      flashcards: [
        { front: 'What is a variable?', back: 'A named storage location for data in memory.' },
        { front: 'What is a function?', back: 'A reusable block of code that performs a specific task.' },
        { front: 'What is an array?', back: 'An ordered collection of elements accessible by index.' },
      ],
      quiz: [
        {
          question: 'Which data structure uses LIFO ordering?',
          options: ['Queue', 'Stack', 'Array', 'Tree'],
          answer: 1,
        },
        {
          question: 'What keyword declares a constant in JavaScript?',
          options: ['var', 'let', 'const', 'static'],
          answer: 2,
        },
      ],
    });
  }

  if (lower.includes('debug') || lower.includes('error')) {
    return 'I can help debug your code. Share the code and exact error message so I can give a specific answer. Demo mode is active unless OPENAI_API_KEY is set.';
  }

  return 'I am the SynergySphere AI Assistant. I can help with coding, interviews, study material, and wellness planning. Demo mode is active unless OPENAI_API_KEY is set.';
}
