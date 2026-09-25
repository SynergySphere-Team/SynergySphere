// testGemini.js
import 'dotenv/config';
import { generateAiResponse } from './src/services/ai.js';

(async () => {
  const systemPrompt = 'You are a helpful assistant.';
  const userMessage = 'Explain binary search in one sentence.';
  try {
    const response = await generateAiResponse(systemPrompt, userMessage);
    console.log('Gemini response:', response);
  } catch (e) {
    console.error('Error calling Gemini:', e);
  }
})();
