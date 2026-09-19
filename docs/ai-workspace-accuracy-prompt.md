# Prompt: Make the AI Workspace Give Accurate, Curriculum-Grounded Answers

> Copy everything below the line into a coding assistant (or hand it to a developer). It is a complete, self-contained implementation brief.

---

## Goal

Make SynergySphere **AI Workspace** return **accurate, lesson-specific answers** instead of generic textbook advice.

Ground every `/ai/chat` reply in:

1. **LectureToLife → Programming Academy** (W3Schools-structured curriculum already in the repo).
2. The signed-in user's **LectureToLife study packs** (`LectureUpload`: summary, flashcards, quiz, mini-projects, coding exercises) when the question is about their notes.

Do **not** invent a new curriculum. Reuse the data and routes that already exist.

## Product context

LectureToLife has two modes:

- **Programming Academy** — static W3Schools-based tracks: Java, Python, JavaScript, HTML, CSS, SQL, C++, C#, React, Node.js, TypeScript. Lessons live in `backend/src/data/curriculum/*.ts`, assembled in `backend/src/data/w3schoolsCurriculumData.ts`, and served by `backend/src/routes/curriculum.ts`.
- **Personal notes** — user uploads converted by `POST /ai/lecture-to-life` into summary / flashcards / quiz / mini-projects / coding exercises, stored in `"LectureUpload"`.

AI Workspace is a **separate screen** today:

- Web: `frontend/src/app/ai-assistant/page.tsx`
- Mobile: `mobile/src/app/(tabs)/ai-assistant.tsx`
- Backend: `POST /api/ai/chat` in `backend/src/routes/ai.ts` → `generateAiResponse()` in `backend/src/services/ai.ts`

Those two surfaces are not connected. The academy never sends a `lessonId` into chat, and chat never searches the academy.

## Current state (why answers are generic)

1. **Chat system prompt is 3 generic lines.** `POST /chat` only says: help students debug, explain, suggest improvements. No academy content is injected.
2. **The only extra field is pasted code.** `chatSchema` is `{ message, context? }`. Web/mobile put the code editor / notes into `context`. That is not a lesson.
3. **Each call is one-shot.** `generateAiResponse(systemPrompt, userMessage)` sends a single user turn. Follow-ups forget the conversation. History is never sent.
4. **Fallbacks are canned, not curriculum.**
   - Backend `fallbackResponse()` returns stock debug/optimize/test text plus “add GEMINI_API_KEY”.
   - Web `generateLocalResponse()` does the same if the API fails.
   - Web **Live Analysis** is regex (`for`/`while`/`var`) on the starter Java snippet — unrelated to Programming Academy.
5. **The data needed for accuracy already exists**, unused by chat:
   - Lesson fields: `title`, `overview`, `difficulty`, `learningObjectives`, `content.explanation`, `content.keyConcepts[]`, `content.syntax[]`, `content.examples[]` (code + explanation), `content.rules`, `content.commonMistakes`, `content.exercise`, `content.quiz`, `content.challenge`, `sources`.
   - Materializer: `materializeLesson()` in `backend/src/data/curriculumLessonMaterial.ts` (same as `GET /curriculum/lessons/:lessonId`).
   - Search already implemented: `GET /curriculum/search?q=` matches **title, overview, subject name, keyConcepts, syntax** (not a dummy search).
   - Progress: `LectureLessonProgress` via `GET/POST /curriculum/lessons/:id/progress`.
   - User packs: `GET /ai/lecture-to-life`.

## Required implementation

### 1. New retrieval service — `backend/src/services/aiContext.ts`

Export something like `buildChatGrounding({ userId, message, lessonId?, uploadId? })` that returns a **short grounding bundle** (target ≤ ~8 000 characters of lesson body).

Resolution order:

1. If `lessonId` is set → load that lesson the same way `GET /curriculum/lessons/:lessonId` does (`getAllFlatLessons` + `materializeLesson`). Include: subject/module/title, difficulty, learningObjectives, explanation, keyConcepts, syntax, up to 2 examples (code + expected explanation), rules, commonMistakes, quiz/exercise if present, primary W3Schools source URL.
2. Else if `uploadId` is set → load that user's `LectureUpload` (summary + up to 10 flashcards + quiz prompts).
3. Else → reuse **the same matching logic as `GET /curriculum/search`** on the user message. Take top 3 hits. For the best hit, include a truncated explanation + keyConcepts; for the other two, title + overview + module only.
4. Always attach, when the user is authenticated: recent `LectureUpload` summaries (2–3) and a compact list of completed vs in-progress academy lessons (from `LectureLessonProgress`) so the assistant can say “you already completed Java Loops”.

Reuse existing helpers. Do not duplicate the curriculum TS files.

### 2. Extend `POST /ai/chat`

In `backend/src/routes/ai.ts`, change `chatSchema` to:

```ts
{
  message: z.string().min(1).max(4000),
  context: z.string().max(12000).optional(),       // pasted code (keep)
  lessonId: z.string().optional(),
  uploadId: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).max(20).optional(),
}
```

Replace the 3-line system prompt with:

```
You are the SynergySphere AI Coding Assistant for LectureToLife
Programming Academy (W3Schools-based lessons) and the student's
own LectureToLife study packs.

GROUNDED CONTEXT:
{GROUNDING}

Rules:
- Prefer GROUNDED CONTEXT over general internet knowledge.
- Name the exact lesson as Subject › Module › Title when you use it.
- When showing syntax or examples, use the ones in GROUNDED CONTEXT
  (same identifiers, same expected behaviour). Do not replace them
  with unrelated textbook samples.
- If the context has a quiz/exercise, use those exact items when
  the student asks to practice. Do not invent a different quiz.
- Match the lesson difficulty (Beginner / Intermediate / Advanced).
- If nothing in GROUNDED CONTEXT applies, say so in one sentence,
  then answer from general programming knowledge.
- Be concise, educational, encouraging. Use markdown code fences.
- Credit W3Schools as the academy source when citing a lesson.
```

Pass `history` into Gemini/OpenAI as prior turns (not stuffed into one user string). Keep pasted `context` as a labeled “Student code” block.

Extend `generateAiResponse` so it can accept `{ system, history, user }` instead of only two strings.

Response JSON should include grounding metadata, e.g.:

```json
{
  "response": "...",
  "grounding": {
    "source": "curriculum" | "upload" | "general",
    "lessonId": "...",
    "lessonTitle": "JavaScript Closures",
    "subjectName": "JavaScript",
    "moduleName": "..."
  }
}
```

Keep existing `/ai/interview/*` and `/ai/lecture-to-life*` unchanged.

### 3. Accurate no-key fallback (required, not optional)

When Gemini/OpenAI are missing or fail **and** a lesson/upload bundle was built, **synthesize from the bundle**:

- 2–4 sentence explanation quoted/paraphrased from `content.explanation`
- keyConcepts as a short definition list
- first syntax lines + first example (code fence)
- one common mistake from the lesson
- pointer: “Open this in Programming Academy: {title}”

Only use the current canned “add GEMINI_API_KEY / hash maps / off-by-one” copy when **no** lesson or upload matched.

Do the same on the web client: if `/ai/chat` succeeds with grounding, never replace it with `generateLocalResponse()`. Keep `generateLocalResponse` only for total network failure, and even then prefer a message that says the academy data lives on the backend.

### 4. Wire Programming Academy → AI Workspace

**Web** (`frontend/src/components/curriculum/WebCurriculumSection.tsx`):

- On the open lesson, add **Ask AI about this lesson**.
- Navigate to `/ai-assistant?lesson=<lessonId>` (or open a slide-over that posts `{ message, lessonId }`).

**Web AI Workspace** (`frontend/src/app/ai-assistant/page.tsx`):

- Read `lesson` (and optional `upload`) query params.
- If `lesson` is set, `GET /curriculum/lessons/:id` and show a pinned chip: `Grounded in: {subjectName} › {moduleName} › {title}`.
- Send `lessonId` and last 20 turns as `history` on every `POST /ai/chat`.
- Under assistant bubbles, show `Based on: {lessonTitle}` when `grounding.source !== "general"`.
- Default code-context editor: if a lesson is pinned, prefill with that lesson’s first example code instead of the generic Java nested-loop starter.

**Mobile** (`mobile/src/components/curriculum/LessonViewer.tsx` + `mobile/src/app/(tabs)/ai-assistant.tsx`):

- Same `lessonId` + `history` contract. Expo Router query param is enough (`/ai-assistant?lesson=`).
- Pin the same “Grounded in …” chip.

### 5. Out of scope for v1 (do not block)

- Vector/pgvector embeddings
- Regenerating academy lesson bodies
- Changing interview endpoints
- Scraping live W3Schools at chat time (`POST /curriculum/sync` already exists separately)

## Acceptance criteria

1. From Programming Academy, open a JS closures (or equivalent) lesson → Ask AI → “what is a closure?” names that SynergySphere lesson, uses **its** example/syntax, and matches its difficulty — not a generic Wikipedia definition.
2. Same question with **no** `GEMINI_API_KEY` / `OPENAI_API_KEY` still returns explanation/keyConcepts/example from the stored lesson, not the canned API-key blurb.
3. `/ai-assistant?lesson=<id>` shows the grounded chip; follow-ups keep history.
4. Asking about a converted lecture pack with `uploadId` cites that pack’s summary/flashcards.
5. Unrelated questions (“what is a REST API?” with no match) briefly say they are outside the pinned lesson, then answer generally.
6. `/ai/interview/*`, `/ai/lecture-to-life`, `/curriculum/*` still work.
7. Backend + frontend TypeScript build passes.

## Key files

| Area | Path |
|---|---|
| Chat route + schema | `backend/src/routes/ai.ts` |
| Provider chain + fallback | `backend/src/services/ai.ts` |
| New retrieval | `backend/src/services/aiContext.ts` (create) |
| Academy catalogue | `backend/src/data/w3schoolsCurriculumData.ts` |
| Lesson bodies | `backend/src/data/curriculum/*.ts` |
| Lesson types | `backend/src/data/lectureCurriculumTypes.ts` |
| Materializer | `backend/src/data/curriculumLessonMaterial.ts` |
| Search / lesson GET | `backend/src/routes/curriculum.ts` |
| Personal packs | `POST/GET /ai/lecture-to-life` in `backend/src/routes/ai.ts` |
| Web AI UI | `frontend/src/app/ai-assistant/page.tsx` |
| Web academy UI | `frontend/src/components/curriculum/WebCurriculumSection.tsx` |
| Web LectureToLife shell | `frontend/src/app/lecture-to-life/page.tsx` |
| Mobile AI UI | `mobile/src/app/(tabs)/ai-assistant.tsx` |
| Mobile lesson UI | `mobile/src/components/curriculum/LessonViewer.tsx` |
| Mobile academy | `mobile/src/components/curriculum/CurriculumDashboard.tsx` |
