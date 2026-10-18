/**
 * Offline verification for the AI Workspace grounding bundle.
 * Run: cd backend && npx tsx src/scripts/verifyAiContext.ts
 * No DB or API key required.
 */
import { buildGroundingBundle, buildGroundedFallback } from '../services/aiContext.js';

async function main() {
  let failures = 0;
  const check = (name: string, ok: boolean, detail?: string) => {
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  };

  const pinned = await buildGroundingBundle({
    userId: 'offline-test-user',
    message: 'What is a closure?',
    lessonId: 'javascript-javascript-scope-javascript-scope',
  });
  const pinnedAnswer = buildGroundedFallback('What is a closure?', pinned);
  check(
    'pinned lesson is used as grounding source',
    pinned.source === 'lesson' && pinned.reference.lessonTitle === 'JavaScript Scope',
    `source=${pinned.source} title=${pinned.reference.lessonTitle ?? 'none'}`,
  );
  check(
    'offline answer cites the lesson (with or without API key)',
    pinnedAnswer.includes('JavaScript › JAVASCRIPT SCOPE › JavaScript Scope'),
    pinnedAnswer.split('\n')[0],
  );
  check(
    'offline answer reuses the lesson example',
    /Example from the lesson/i.test(pinnedAnswer) && /const|function|console/.test(pinnedAnswer),
  );
  check(
    'offline answer includes closure general answer since outside lesson',
    /closure is a function that remembers/i.test(pinnedAnswer),
  );
  check('grounding bundle ≤ 8k chars', pinned.contextBlock.length <= 8000, `${pinned.contextBlock.length} chars`);

  const forLoop = await buildGroundingBundle({ userId: 'offline-test-user', message: 'how does a for loop work?' });
  check(
    'for-loop question matches a JavaScript loops lesson',
    forLoop.source === 'search' &&
      (forLoop.reference.lessonTitle === 'JavaScript For Loop' || forLoop.reference.lessonTitle === 'JavaScript Loops'),
    `title=${forLoop.reference.lessonTitle ?? 'none'}`,
  );

  const joins = await buildGroundingBundle({ userId: 'offline-test-user', message: 'how do INNER JOIN and LEFT JOIN differ?' });
  check(
    'SQL join question matches SQL INNER JOIN lesson',
    joins.source === 'search' && joins.reference.lessonTitle === 'SQL INNER JOIN',
    `title=${joins.reference.lessonTitle ?? 'none'}`,
  );

  const pythonLoop = await buildGroundingBundle({ userId: 'offline-test-user', message: 'how does a for loop work in python?' });
  check(
    'Python for-loop question matches Python track specifically',
    pythonLoop.source === 'search' && pythonLoop.reference.subjectName === 'Python',
    `title=${pythonLoop.reference.lessonTitle ?? 'none'} subject=${pythonLoop.reference.subjectName ?? 'none'}`,
  );

  const fizzbuzz = await buildGroundingBundle({ userId: 'offline-test-user', message: 'how do I solve the fizzbuzz challenge?' });
  check(
    'Challenge question matches Learning Hub Coding Challenge',
    fizzbuzz.source === 'challenge' && fizzbuzz.reference.challengeTitle === 'FizzBuzz',
    `source=${fizzbuzz.source} challenge=${fizzbuzz.reference.challengeTitle ?? 'none'}`,
  );

  const typoTest = await buildGroundingBundle({ userId: 'offline-test-user', message: 'pyton loop' });
  check(
    'Typo query ("pyton") recognizes Python language track',
    typoTest.source === 'search' && typoTest.reference.subjectName === 'Python',
    `subject=${typoTest.reference.subjectName ?? 'none'}`,
  );

  const outside = await buildGroundingBundle({ userId: 'offline-test-user', message: 'Who wrote Hamlet?' });
  const outsideAnswer = buildGroundedFallback('Who wrote Hamlet?', outside);
  check(
    'unrelated question admits no context (no lesson pinned)',
    !outside.hasContext && outside.source === 'none',
  );
  check(
    'fallback answer is clean and never displays API key errors',
    !outsideAnswer.includes('GEMINI_API_KEY') && !outsideAnswer.includes('OPENAI_API_KEY') && outsideAnswer.length > 50,
  );

  check(
    'starter code taken from the lesson example',
    Boolean(pinned.starterCode) && !pinned.starterCode!.includes('public class Main'),
    (pinned.starterCode ?? 'none').split('\n')[0],
  );

  if (failures > 0) {
    process.exitCode = 1;
  } else {
    console.log('\nAll AI Workspace grounding checks passed.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
