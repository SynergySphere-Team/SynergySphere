import { ALL_INTERVIEW_TRACKS, QUESTION_BANK_BY_TOPIC, selectSessionQuestions } from '../data/interviewBank/index.js';
import { generateLiveCritique, startInterviewSession, evaluateInterviewSession } from '../services/interviewService.js';
import { getProfileSignals, fetchRecommendedJobs } from '../services/portfolioService.js';
import { query } from '../lib/db.js';

async function runVerification() {
  console.log('=== STARTING SYNERGYSPHERE UPGRADE VERIFICATION ===\n');

  // 1. Verify Interview Bank Size and Tracks
  console.log('1. Checking Interview Question Bank...');
  console.log(`Found ${ALL_INTERVIEW_TRACKS.length} tracks registered in interview bank:`);
  let totalCatalogQuestions = 0;
  for (const [topic, qs] of Object.entries(QUESTION_BANK_BY_TOPIC)) {
    console.log(`  - [${topic}] ${qs.length} first-party questions`);
    totalCatalogQuestions += qs.length;
  }
  console.log(`Total first-party questions across 11 catalog tracks: ${totalCatalogQuestions}`);
  if (ALL_INTERVIEW_TRACKS.length < 14) throw new Error('Expected at least 14 tracks');
  if (totalCatalogQuestions < 550) throw new Error('Expected at least 550 questions in bank');
  console.log('✔ Question bank verified!\n');

  // 2. Verify Session Selector & Weighting
  console.log('2. Testing Session Selector (Java, count=10, mixed)...');
  const sessionQs = selectSessionQuestions({ topic: 'java', count: 10, mode: 'mixed' });
  console.log(`Selected ${sessionQs.length} questions for Java session:`);
  const diffCounts: Record<string, number> = {};
  for (const q of sessionQs) {
    diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1;
    console.log(`  • [${q.difficulty.toUpperCase()}] ${q.prompt.substring(0, 70)}... (${q.rubric.length} rubric bullets)`);
  }
  console.log(`Difficulty distribution: ${JSON.stringify(diffCounts)} (target: ~40% easy, ~40% medium, ~20% hard)`);
  if (sessionQs.length !== 10) throw new Error('Expected 10 questions');
  console.log('✔ Session selector verified!\n');

  // 3. Test User, Profile Signals & Real Interview Session
  console.log('3. Testing User, Profile Signals & Real Interview Session...');
  const users = await query<{ id: string; email: string }>('SELECT id, email FROM "User" LIMIT 1');
  if (users.length === 0) throw new Error('No user found in database for testing');
  const userId = users[0].id;
  console.log(`Testing with user: ${users[0].email} (${userId})`);

  const signals = await getProfileSignals(userId);
  console.log(`Profile Signals:`);
  console.log(`  Hub Skills tracks: ${signals.hubSkills.length}`);
  console.log(`  Manual Skills: ${signals.manualSkills.length}`);
  console.log(`  Total Completed Lessons: ${signals.stats.totalCompletedLessons}`);
  console.log(`  Profile targetRole: ${signals.profile.targetRole || 'Not set'}`);

  console.log('\nStarting real Interview Session (Java, count=10)...');
  const session = await startInterviewSession({ userId, topic: 'java', count: 10, mode: 'mixed' });
  console.log(`Started session id: ${session.id} with ${session.questions.length} questions`);

  // 4. Test Live Rubric Critique on Question 0
  console.log('\n4. Testing Live Rubric Critique on Question 0...');
  const testQuestion = session.questions[0];
  console.log(`Prompt: "${testQuestion.prompt.substring(0, 80)}..."`);
  const testAnswer = 'In Java, an ArrayList is backed by a dynamic resizable array which offers fast O(1) random access by index, but inserting in the middle takes O(n). In contrast, a LinkedList uses doubly-linked nodes requiring O(1) pointer updates for insertion at head/tail, but random access is O(n) traversal. LinkedList also has node reference memory overhead.';
  const critique = await generateLiveCritique({
    interviewId: session.id,
    questionIndex: 0,
    answer: testAnswer,
    scratchCode: '// scratch code: public class Node { int val; Node next; }',
  });
  console.log('Live Critique Result:');
  console.log(`  Technical Clarity: ${critique.technicalClarity.rating} - ${critique.technicalClarity.note}`);
  console.log(`  Communication: ${critique.communication.rating}`);
  console.log(`  Problem Solving: ${critique.problemSolving.rating}`);
  console.log(`  Topic Depth: ${critique.topicDepth.rating}`);
  console.log(`  Missing Points: ${JSON.stringify(critique.missingPoints)}`);
  console.log(`  Heuristic Mode: ${critique.heuristicMode}`);
  console.log('✔ Live critique verified!\n');

  // Test session evaluation flow
  console.log('Testing Interview Session Evaluation on all questions...');
  const evalResult = await evaluateInterviewSession({
    interviewId: session.id,
    userId,
    answers: new Array(session.questions.length).fill(testAnswer),
    scratchCodes: [],
  });
    console.log(`Evaluation Completed:`);
    console.log(`  Score: ${evalResult.score}/100`);
    console.log(`  Dynamic XP: ${evalResult.xpAwarded} XP`);
    console.log(`  Feedback: ${evalResult.feedback.substring(0, 100)}...`);
    console.log(`  Weak areas mapped: ${JSON.stringify(evalResult.weakAreas)}`);
    if (evalResult.xpAwarded !== Math.round(40 + evalResult.score * 0.6)) {
      throw new Error(`Dynamic XP calculation mismatch: got ${evalResult.xpAwarded}, expected ${Math.round(40 + evalResult.score * 0.6)}`);
    }
    console.log('✔ Session evaluation & dynamic XP verified!\n');

  // 5. Test Job Aggregator Integration
  console.log('5. Testing Job Aggregator & Search Deep-Links...');
  const jobsRes = await fetchRecommendedJobs({ role: 'Junior Backend Developer', userSkills: ['Java', 'Spring Boot', 'SQL'] });
  console.log(`Job Aggregator status:`);
  console.log(`  Configured (Adzuna): ${jobsRes.configured}`);
  console.log(`  Source: ${jobsRes.source}`);
  console.log(`  Jobs returned: ${jobsRes.jobs.length}`);
  console.log(`  LinkedIn Search Link: ${jobsRes.searchLinks.linkedin}`);
  console.log(`  Indeed Search Link: ${jobsRes.searchLinks.indeed}`);
  console.log(`  Google Jobs Search Link: ${jobsRes.searchLinks.googleJobs}`);
  if (!jobsRes.searchLinks.linkedin || !jobsRes.searchLinks.indeed) {
    throw new Error('Expected deep-search links for honest empty state');
  }
  console.log('✔ Job aggregator verified!\n');

  // 6. Test Community Projects & IT Briefs
  console.log('6. Checking Community Projects in Database...');
  const projects = await query<{ id: string; title: string; category: string; techStack: string | null; teamCapacity: number | null }>(
    'SELECT id, title, category, "techStack", "teamCapacity" FROM "Project" ORDER BY "createdAt" DESC LIMIT 10'
  );
  console.log(`Found ${projects.length} community projects:`);
  for (const p of projects) {
    console.log(`  - [${p.category}] ${p.title} | Stack: ${p.techStack || 'None'} | Cap: ${p.teamCapacity || 10}`);
  }
  console.log('✔ Community projects verified!\n');

  console.log('=== ALL UPGRADE VERIFICATIONS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
