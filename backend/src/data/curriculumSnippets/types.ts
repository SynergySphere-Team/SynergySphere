export type ExampleSnippet = {
  title: string;
  language: string;
  code: string;
  explanation: string;
  syntax?: string[];
  overview?: string;
  detailedExplanation?: string;
  keyConcepts?: Array<{ title: string; definition: string; purpose?: string }>;
  rules?: string[];
  commonMistakes?: string[];
  exercise?: { prompt: string; successCriteria: string };
  quiz?: { question: string; answer: string };
  challenge?: { prompt: string; successCriteria: string };
};
