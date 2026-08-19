export interface LectureMaterials {
  summary: string;
  flashcards: Array<{ front: string; back: string }>;
  quiz: Array<{ question: string; options: string[]; answer: number }>;
  miniProjects: Array<{ title: string; description: string; steps: string[] }>;
  codingExercises: Array<{ title: string; description: string; hint: string }>;
}

export function extractLectureContent(message: string): string {
  const markers = [
    /LECTURE CONTENT:\s*([\s\S]+)/i,
    /Content:\s*([\s\S]+)/i,
    /slides\/notes into study materials\.\s*([\s\S]+)/i,
  ];
  for (const marker of markers) {
    const match = message.match(marker);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return message.trim();
}

export function parseLectureJson(raw: string): LectureMaterials | null {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<LectureMaterials>;
    if (!parsed.summary) return null;
    return {
      summary: String(parsed.summary),
      flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
      quiz: Array.isArray(parsed.quiz) ? parsed.quiz : [],
      miniProjects: Array.isArray(parsed.miniProjects) ? parsed.miniProjects : [],
      codingExercises: Array.isArray(parsed.codingExercises) ? parsed.codingExercises : [],
    };
  } catch {
    return null;
  }
}

function uniqueLines(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-\d.)]+/, '').trim())
    .filter((line) => line.length > 12);
  return [...new Set(lines)];
}

function sentences(text: string): string[] {
  return [...new Set(
    text
      .split(/[.!?]+/)
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter((s) => s.length > 20 && s.length < 280),
  )];
}

function titleFromContent(content: string, fileName?: string): string {
  const firstLine = content.split('\n').find((l) => l.trim().length > 3)?.trim();
  if (firstLine && firstLine.length < 80) return firstLine;
  if (fileName) return fileName.replace(/\.[^.]+$/, '');
  return 'this lecture';
}

export function buildLectureMaterialsFromContent(content: string, fileName?: string): LectureMaterials {
  const topic = titleFromContent(content, fileName);
  const lines = uniqueLines(content);
  const sents = sentences(content);
  const bullets = lines.slice(0, 12);

  const summaryParts = sents.length >= 2
    ? sents.slice(0, 4)
    : bullets.length >= 2
      ? bullets.slice(0, 4)
      : [content.slice(0, 500)];

  const summary = `This study pack is based on "${topic}". ${summaryParts.join(' ')}`.slice(0, 2000);

  const flashcardSource = bullets.length >= 3 ? bullets : sents;
  const flashcards = flashcardSource.slice(0, 8).map((line, i) => {
    const words = line.split(/\s+/);
    const term = words.slice(0, Math.min(4, words.length)).join(' ');
    const back = line.length > 120 ? line.slice(0, 117) + '...' : line;
    return {
      front: `From "${topic}": What is important about ${term}?`,
      back,
    };
  });

  if (flashcards.length === 0) {
    flashcards.push(
      { front: `What is the main topic of ${topic}?`, back: summaryParts[0] || 'Review your uploaded lecture notes.' },
      { front: 'Name one key concept from this lecture.', back: 'Refer to your lecture slides for the specific concept.' },
    );
  }

  const quizSource = sents.length >= 3 ? sents : bullets;
  const quiz = quizSource.slice(0, 5).map((fact, i) => {
    const words = fact.split(/\s+/).filter((w) => w.length > 4);
    const keyword = words[i % Math.max(words.length, 1)] || 'concept';
    const distractors = ['Unrelated topic', 'Opposite idea', 'General background'];
    const options = [keyword, ...distractors.slice(0, 3)];
    return {
      question: `Which term is most relevant to: "${fact.slice(0, 80)}..."?`,
      options,
      answer: 0,
    };
  });

  if (quiz.length === 0) {
    quiz.push({
      question: `What is the primary subject of ${topic}?`,
      options: [topic, 'Unrelated field', 'General knowledge', 'None of the above'],
      answer: 0,
    });
  }

  const miniProjects = [
    {
      title: `${topic} Concept Map`,
      description: `Create a visual map connecting the main ideas from "${topic}".`,
      steps: [
        'List 5–8 key terms from your lecture notes.',
        'Draw connections between related concepts.',
        'Write one sentence explaining each connection.',
        'Present the map to a peer and get feedback.',
      ],
    },
    {
      title: `${topic} Teaching Summary`,
      description: 'Explain the lecture content as if teaching a classmate who missed the session.',
      steps: [
        'Write a 1-page summary in your own words.',
        'Include at least 3 examples from the slides.',
        'Record a 3-minute explanation or present live.',
      ],
    },
  ];

  const isTechnical = /\b(code|function|class|algorithm|database|sql|java|python|api|program)\b/i.test(content);
  const codingExercises = isTechnical
    ? [
        {
          title: `${topic} Practice Problem`,
          description: `Implement a small program that demonstrates a concept from "${topic}".`,
          hint: 'Start with the simplest example from the lecture, then add one extra feature.',
        },
        {
          title: 'Concept Quiz Code',
          description: 'Write code that outputs the 3 most important terms from the lecture.',
          hint: 'Use an array or map to store terms and print them with explanations.',
        },
      ]
    : [
        {
          title: `${topic} Application Exercise`,
          description: 'Apply one lecture concept to a real-world scenario from your field.',
          hint: 'Pick a concrete example and explain how the lecture idea solves a problem.',
        },
      ];

  return { summary, flashcards, quiz, miniProjects, codingExercises };
}

export function buildLecturePrompt(content: string, fileName: string): string {
  const excerpt = content.slice(0, 12000);
  return [
    'Convert the lecture content below into personalized study materials.',
    'STRICT RULES:',
    '- Base EVERY item ONLY on the lecture text — use specific terms, names, and examples from it.',
    '- Do NOT invent generic programming content unless the lecture is about programming.',
    '- Return ONLY valid JSON with no markdown fences or extra text.',
    '',
    'JSON shape:',
    '{"summary":"...","flashcards":[{"front":"...","back":"..."}],"quiz":[{"question":"...","options":["a","b","c","d"],"answer":0}],"miniProjects":[{"title":"...","description":"...","steps":["..."]}],"codingExercises":[{"title":"...","description":"...","hint":"..."}]}',
    '',
    'Requirements:',
    '- summary: 2–4 paragraphs',
    '- flashcards: 6–10 cards from lecture facts',
    '- quiz: 5 multiple-choice questions with answer index 0–3',
    '- miniProjects: 2–3 hands-on projects tied to the lecture',
    '- codingExercises: 2–3 exercises if technical, otherwise practical application tasks',
    '',
    `Lecture title: ${fileName}`,
    'LECTURE CONTENT:',
    excerpt,
  ].join('\n');
}
