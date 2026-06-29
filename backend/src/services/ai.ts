/**
 * AI service abstraction layer.
 * Supports OpenAI, with fallback to rule-based responses when no API key is set.
 */

export async function generateAiResponse(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        return data.choices[0]?.message?.content || fallbackResponse(userMessage);
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
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
      summary: 'This lecture covers fundamental programming concepts including variables, control flow, functions, and data structures. Key takeaways include understanding how to break problems into smaller parts and applying iterative development practices.',
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
    return 'I can help debug your code! Common issues to check:\n\n1. **Syntax errors** - Missing semicolons, brackets, or quotes\n2. **Type mismatches** - Comparing strings to numbers\n3. **Undefined variables** - Check variable scope\n4. **Off-by-one errors** - In loops and array indexing\n\nShare your code and error message for specific help. (Set OPENAI_API_KEY for full AI assistance)';
  }

  return `I'm the SynergySphere AI Assistant. I can help with:

- **Coding**: Debug, explain, and improve your code
- **Interviews**: Practice technical questions
- **Study**: Convert lectures to flashcards and quizzes
- **Wellness**: Study schedule recommendations

*Note: Running in demo mode. Set \`OPENAI_API_KEY\` in your .env for full AI capabilities.*

Your question: "${message.slice(0, 200)}"

For coding help, try pasting your code with the error message. For study help, upload your lecture notes in LectureToLife.`;
}
