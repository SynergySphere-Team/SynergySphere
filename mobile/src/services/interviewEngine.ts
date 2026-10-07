import type {
  FAANGScorecard,
  HiringRecommendation,
  InterviewSessionState,
  InterviewStageQuestion,
  InterviewerPersona,
  InterviewerPersonaId,
} from '@/types/interview';

export const INTERVIEWER_PERSONAS: Record<InterviewerPersonaId, InterviewerPersona> = {
  strict: {
    id: 'strict',
    name: 'Marcus Vance',
    title: 'Principal Bar Raiser',
    badge: 'STRICT EVALUATOR',
    avatarIcon: 'shield-checkmark',
    accentColor: '#dc2626',
    toneDescription: 'Probing, zero-tolerance for hand-waving, hyper-focused on boundary conditions & edge cases.',
    evaluationFocus: 'Robustness under adverse conditions, algorithmic constraints, edge-case coverage.',
    greetingMessage:
      'Good day. I evaluate engineering rigor. I expect precise trade-offs, concrete Big-O analysis, and zero hand-waving. Let us begin.',
    affirmativePhrases: [
      'Noted. Proceed.',
      'That constraint is satisfied. Move to implementation.',
      'Sufficient. Let us see the edge cases.',
    ],
    probingPhrases: [
      'What happens when that input is null or exceeds allocated buffers?',
      'Can you optimize that memory allocation? Heap fragmentation is unacceptable here.',
      'Explain the worst-case failure mode under a network partition.',
    ],
    dynamicProbes: [
      {
        id: 'probe_strict_concurrency',
        triggerKeywords: ['async', 'thread', 'concurrent', 'lock', 'parallel'],
        minWordCount: 15,
        question:
          'BAR RAISER FOLLOW-UP: How do you prevent thread starvation or deadlocks under sustained high concurrency in that design?',
        expectedConcept: 'Mutex timeouts, semaphore limits, non-blocking lock-free primitives',
      },
      {
        id: 'probe_strict_memory',
        triggerKeywords: ['cache', 'buffer', 'array', 'map', 'heap'],
        minWordCount: 20,
        question:
          'BAR RAISER FOLLOW-UP: What is your cache eviction policy when memory pressure hits 95%, and how do you prevent cascading cache stampedes?',
        expectedConcept: 'LRU/LFU eviction, probabilistic early expiration, mutex locking on missed keys',
      },
    ],
  },
  supportive: {
    id: 'supportive',
    name: 'Elena Rostova',
    title: 'Senior Engineering Mentor',
    badge: 'COLLABORATIVE LEAD',
    avatarIcon: 'heart-circle',
    accentColor: '#059669',
    toneDescription: 'Collaborative, encouraging, helps candidates unpack concepts with scaffolded hints.',
    evaluationFocus: 'Thought process, adaptability, structured problem breakdown, collaborative communication.',
    greetingMessage:
      'Welcome! Remember, this is a peer dialogue. Think out loud, bounce ideas, and do not worry about making mistakes as we iterate.',
    affirmativePhrases: [
      'Great instinct! That is a very clean mental model.',
      'I like how you structured that. Let us develop that further.',
      'Solid start! Take your time to write down the reasoning.',
    ],
    probingPhrases: [
      'That is promising! What would happen if we tweaked the data structure slightly?',
      'How might you communicate this decision to non-technical stakeholders?',
      'Would a helper function help keep this logic maintainable for your team?',
    ],
    dynamicProbes: [
      {
        id: 'probe_supportive_clarity',
        triggerKeywords: ['refactor', 'clean', 'structure', 'modular', 'component'],
        minWordCount: 15,
        question:
          'MENTOR NUDGE: You are thinking about maintainability! How would you test this component to give your teammates confidence?',
        expectedConcept: 'Unit tests, mock boundaries, regression safeguards',
      },
      {
        id: 'probe_supportive_scale',
        triggerKeywords: ['database', 'api', 'query', 'service'],
        minWordCount: 20,
        question:
          'MENTOR NUDGE: Nice architectural layout! If our daily active users doubled tomorrow, what metric would you monitor first?',
        expectedConcept: 'P99 latency, error rate, CPU/memory saturation',
      },
    ],
  },
  distributed_systems: {
    id: 'distributed_systems',
    name: 'Dr. Aris Thorne',
    title: 'Staff Distributed Systems Architect',
    badge: 'SYSTEMS SPECIALIST',
    avatarIcon: 'git-network',
    accentColor: '#2563eb',
    toneDescription: 'Deep dives into CAP theorem, eventual consistency, backpressure, idempotency & replication lag.',
    evaluationFocus: 'Distributed consensus, fault tolerance, horizontal scalability, telemetry & observability.',
    greetingMessage:
      'Welcome. In large-scale systems, networks fail and clocks drift. We will focus on latency SLAs, fault tolerance, and consensus.',
    affirmativePhrases: [
      'Sound partitioning strategy.',
      'Good identification of the single point of failure.',
      'The consistency trade-off is justified here.',
    ],
    probingPhrases: [
      'How does your service maintain idempotency during duplicate webhook delivery?',
      'What happens when the leader node drops out during a two-phase commit?',
      'How do you handle clock skew and message reordering in this event stream?',
    ],
    dynamicProbes: [
      {
        id: 'probe_dist_cap',
        triggerKeywords: ['replicate', 'cluster', 'consistency', 'kafka', 'distributed'],
        minWordCount: 15,
        question:
          'ARCHITECT FOLLOW-UP: When a split-brain network partition occurs between your availability zones, do you favor consistency or availability (CAP theorem)? Explain why.',
        expectedConcept: 'AP vs CP trade-off, quorum reads/writes, reconciliation mechanisms',
      },
      {
        id: 'probe_dist_idempotency',
        triggerKeywords: ['payment', 'transaction', 'order', 'checkout', 'stripe'],
        minWordCount: 20,
        question:
          'ARCHITECT FOLLOW-UP: If the network drops right after the database commits, how do you prevent the client from charging twice on retry?',
        expectedConcept: 'Idempotency keys, atomic distributed locks, deduplication table',
      },
    ],
  },
};

export function generate4StageInterview(
  role: string,
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Staff',
  language: string = 'TypeScript'
): InterviewStageQuestion[] {
  return [
    {
      stage: 'BEHAVIORAL',
      title: 'Phase 1: Production Incident & Ownership (STAR)',
      category: 'Behavioral & Leadership',
      timeLimitSeconds: 360, // 6 minutes
      prompt:
        'Walk through a critical production incident or contentious architectural disagreement you faced. Detail the Situation, your specific Task, the exact Actions you took under pressure, and the measurable Result.',
      scenarioContext:
        'Context: A primary payment gateway outage caused 12% of checkout requests to hang and drop during peak Friday traffic. The team was divided between rolling back the release or hotfixing the connection pool.',
      rubric: [
        'Structured response using the STAR framework (Situation, Task, Action, Result)',
        'Clear ownership without shifting blame to teammates or third-party vendors',
        'Data-driven root cause analysis (metrics, logs, traces)',
        'Measurable business result & preventative safeguards (post-mortem, alerts)',
      ],
      expectedConcepts: ['STAR Method', 'Root Cause Analysis', 'Post-Mortem', 'Observability', 'Team Alignment'],
      hints: [
        'Explicitly label Situation, Task, Action, and Result in your explanation.',
        'Focus on what YOU personally decided and implemented, not just the group.',
        'Mention concrete telemetry: P99 latency, error rates, or alert thresholds.',
      ],
    },
    {
      stage: 'SYSTEM_DESIGN',
      title: 'Phase 2: High-Throughput Service Architecture',
      category: 'Distributed Systems & Architecture',
      timeLimitSeconds: 540, // 9 minutes
      prompt:
        'Design a resilient real-time rate limiter and notification ingestion service capable of handling 50,000 requests per second. Explain your data layer, caching strategy, failure mitigation, and concurrency controls.',
      scenarioContext:
        'Requirements: Multi-tenant API gateway where each tenant has tiered rate limits (e.g. 100 req/sec for Free, 2000 req/sec for Enterprise). Ingestion latency must remain under 15ms.',
      constraints: [
        'Throughput: 50,000 peak requests per second',
        'Latency budget: P99 < 15ms',
        'High availability: 99.99% uptime across multi-region deployment',
        'No single point of failure (SPOF)',
      ],
      rubric: [
        'Algorithm selection: Token Bucket vs Leaky Bucket vs Sliding Window Log',
        'Distributed state: In-memory store (Redis cluster) with atomic Lua scripting',
        'Failure modes: Graceful degradation / bypass when rate-limiter cluster degrades',
        'Security & Tenant isolation: Rate limit keys incorporating API key + IP hash',
      ],
      expectedConcepts: ['Token Bucket', 'Redis Lua Scripts', 'Sliding Window', 'Circuit Breaker', 'Eventual Consistency'],
      hints: [
        'Think about race conditions between parallel requests checking the same limit.',
        'Consider using Redis with Lua scripts for atomic token consumption.',
        'Explain how you handle cache cluster node failover.',
      ],
    },
    {
      stage: 'CODING',
      title: 'Phase 3: Algorithmic Implementation & Test Execution',
      category: 'Live Coding & Data Structures',
      timeLimitSeconds: 720, // 12 minutes
      prompt:
        'Implement an efficient function `findLongestSubarrayWithSum(nums: number[], targetSum: number): number` that returns the length of the longest contiguous subarray whose elements sum to `targetSum`. If none exists, return 0.',
      scenarioContext:
        'Constraint: The array can contain both positive and negative integers as well as zeros. Time complexity must be strictly O(N).',
      constraints: [
        'Time Complexity: Strict O(N)',
        'Space Complexity: O(N) auxiliary space using prefix sums',
        'Array length: 1 <= nums.length <= 10^5',
        'Elements: -10^4 <= nums[i] <= 10^4',
      ],
      rubric: [
        'Optimal prefix sum computation combined with a Hash Map storing first-seen indices',
        'Handles negative integers and zero sum transitions correctly',
        'Time complexity O(N) verified (single-pass linear scan)',
        'Passes all edge cases including single element, all negatives, and no matching sum',
      ],
      expectedConcepts: ['Prefix Sum', 'Hash Map', 'O(N) Time', 'Edge Case Handling'],
      starterCode: `function findLongestSubarrayWithSum(nums: number[], targetSum: number): number {\n  // prefixSum -> earliest index\n  const prefixMap = new Map<number, number>();\n  prefixMap.set(0, -1);\n  let currentSum = 0;\n  let maxLength = 0;\n\n  for (let i = 0; i < nums.length; i++) {\n    currentSum += nums[i];\n    const complement = currentSum - targetSum;\n\n    if (prefixMap.has(complement)) {\n      maxLength = Math.max(maxLength, i - prefixMap.get(complement)!);\n    }\n\n    if (!prefixMap.has(currentSum)) {\n      prefixMap.set(currentSum, i);\n    }\n  }\n\n  return maxLength;\n}`,
      language,
      testCases: [
        {
          id: 'tc_1',
          inputDescription: 'Standard positive array',
          input: 'nums = [1, 2, 3, 1, 1, 1], targetSum = 3',
          expectedOutput: '3',
          isHidden: false,
        },
        {
          id: 'tc_2',
          inputDescription: 'Array with negative numbers',
          input: 'nums = [1, -1, 5, -2, 3], targetSum = 3',
          expectedOutput: '4',
          isHidden: false,
        },
        {
          id: 'tc_3',
          inputDescription: 'No valid subarray matches target',
          input: 'nums = [2, 4, 6], targetSum = 5',
          expectedOutput: '0',
          isHidden: true,
        },
        {
          id: 'tc_4',
          inputDescription: 'Single element matches target',
          input: 'nums = [5], targetSum = 5',
          expectedOutput: '1',
          isHidden: true,
        },
      ],
      hints: [
        'Notice that nums contains negative values, so a two-pointer sliding window will NOT work.',
        'Use the equation: currentPrefixSum - previousPrefixSum = targetSum.',
        'Store the EARLIEST index of each prefix sum to maximize the length.',
      ],
    },
    {
      stage: 'DEBRIEF',
      title: 'Phase 4: Candidate Q&A & Production Verification',
      category: 'Debrief & Telemetry',
      timeLimitSeconds: 300, // 5 minutes
      prompt:
        'Reflect on the solution you constructed today. How would you instrument telemetry (metrics, logs, traces) for this in production, and what would you improve if given 3 additional months?',
      scenarioContext:
        'Engineering lead debrief: Candidates are evaluated on technical self-awareness, trade-off honesty, and production maturity.',
      rubric: [
        'Identifies real bottlenecks (memory growth under long executions, thread pool contention)',
        'Specifies meaningful telemetry (OpenTelemetry, Prometheus counters, distributed tracing)',
        'Articulates thoughtful questions about team engineering practices or system challenges',
      ],
      expectedConcepts: ['OpenTelemetry', 'Prometheus', 'Chaos Engineering', 'Continuous Profiling'],
      hints: [
        'Mention golden signals: Latency, Traffic, Errors, Saturation.',
        'Demonstrate curiosity about high-load edge cases.',
      ],
    },
  ];
}

export function evaluateDynamicFollowUp(
  persona: InterviewerPersona,
  stageIndex: number,
  answerText: string
): { question: string; parentTriggerId: string } | null {
  const normalized = answerText.toLowerCase();
  const wordCount = answerText.trim().split(/\s+/).length;

  for (const probe of persona.dynamicProbes) {
    const minWords = probe.minWordCount || 10;
    if (wordCount >= minWords) {
      const hasKeyword = probe.triggerKeywords.some((kw) => normalized.includes(kw.toLowerCase()));
      if (hasKeyword) {
        return {
          question: probe.question,
          parentTriggerId: probe.id,
        };
      }
    }
  }

  // Generic fallback probe if long answer provided
  if (wordCount > 35) {
    const probingPhrase =
      persona.probingPhrases[Math.floor(Math.random() * persona.probingPhrases.length)];
    return {
      question: `${persona.name.toUpperCase()} PROBE: ${probingPhrase}`,
      parentTriggerId: 'generic_depth_probe',
    };
  }

  return null;
}

export function generateFAANGScorecard(session: InterviewSessionState): FAANGScorecard {
  const persona = INTERVIEWER_PERSONAS[session.personaId] || INTERVIEWER_PERSONAS.strict;
  const stages = session.stages;

  // Compute individual stage metrics
  let totalPoints = 0;
  const stageBreakdown = stages.map((st, idx) => {
    const textAns = session.answers[idx] || '';
    const codeAns = session.codeDrafts[idx] || '';
    const combinedLength = (textAns + codeAns).trim().length;

    // Base score by participation and depth
    let stageScore = 50;
    if (combinedLength > 60) stageScore += 20;
    if (combinedLength > 150) stageScore += 15;
    if (combinedLength > 250) stageScore += 10;

    // Check expected concepts
    const foundConcepts = st.expectedConcepts.filter((c) =>
      (textAns + codeAns).toLowerCase().includes(c.toLowerCase())
    ).length;
    stageScore += Math.min(10, foundConcepts * 4);

    // Test cases for coding stage
    if (st.stage === 'CODING' && session.testReports?.[idx]) {
      const report = session.testReports[idx];
      const testAccuracy = report.total > 0 ? report.passed / report.total : 0.8;
      stageScore = Math.round(stageScore * 0.4 + testAccuracy * 100 * 0.6);
    }

    stageScore = Math.min(98, Math.max(45, stageScore));
    totalPoints += stageScore;

    return {
      stage: st.stage,
      title: st.title,
      score: stageScore,
      timeSpentSeconds: Math.max(20, st.timeLimitSeconds - (session.stageTimesRemaining[idx] ?? 0)),
      keyObservation:
        stageScore >= 80
          ? `Strong depth on ${st.expectedConcepts[0] || 'core concepts'} with clean articulation.`
          : `Demonstrated fundamental awareness, but could dive deeper into edge-case constraints.`,
    };
  });

  const overallScore = Math.round(totalPoints / stages.length);

  // Calibrate hiring recommendation
  let recommendation: HiringRecommendation = 'LEANING_HIRE';
  if (overallScore >= 88) recommendation = 'STRONG_HIRE';
  else if (overallScore >= 76) recommendation = 'HIRE';
  else if (overallScore >= 64) recommendation = 'LEANING_HIRE';
  else if (overallScore >= 50) recommendation = 'LEANING_NO_HIRE';
  else recommendation = 'NO_HIRE';

  const verdictMap: Record<HiringRecommendation, string> = {
    STRONG_HIRE:
      'Exceptional candidate. Demonstrated deep architectural maturity, flawless Big-O reasoning, and structured STAR delivery.',
    HIRE:
      'Exceeds the engineering hiring bar. Solid problem breakdown, clear technical communication, and sound algorithmic mechanics.',
    LEANING_HIRE:
      'Meets baseline requirements with strong potential. Recommended for on-target roles with junior-to-mid guidance on distributed scale.',
    LEANING_NO_HIRE:
      'Mixed signals. Candidate grasped high-level concepts but struggled with failure boundary conditions and edge cases.',
    NO_HIRE:
      'Does not meet current engineering hiring threshold. Needs further hands-on practice in algorithm analysis and structured communication.',
  };

  return {
    sessionId: session.sessionId,
    role: session.candidateRole,
    difficulty: session.difficulty,
    personaName: persona.name,
    completedAt: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    overallScore,
    recommendation,
    summaryVerdict: verdictMap[recommendation],
    stageBreakdown,
    competencies: {
      problemSolving: {
        name: 'Problem Solving & Algorithmic Rigor',
        score: Math.min(100, Math.round(overallScore * 0.98 + 4)),
        weight: 0.25,
        rating: overallScore >= 85 ? 'Exceptional' : overallScore >= 70 ? 'Strong' : 'Adequate',
        feedback:
          'Methodical decomposition of problems from high-level constraints down to data structures.',
      },
      technicalDepth: {
        name: 'Technical Depth & Fundamentals',
        score: Math.min(100, Math.round(overallScore * 0.95 + 3)),
        weight: 0.25,
        rating: overallScore >= 85 ? 'Exceptional' : overallScore >= 70 ? 'Strong' : 'Adequate',
        feedback: 'Demonstrated solid grasp of language runtime behavior and memory allocations.',
      },
      systemArchitecture: {
        name: 'System Architecture & Scalability',
        score: Math.min(100, Math.round(overallScore * 0.92 + 5)),
        weight: 0.2,
        rating: overallScore >= 80 ? 'Strong' : 'Adequate',
        feedback: 'Clear awareness of caching tiers, rate limits, and failure mitigation patterns.',
      },
      communicationStar: {
        name: 'Communication & STAR Articulation',
        score: Math.min(100, Math.round(overallScore * 1.02 - 1)),
        weight: 0.15,
        rating: overallScore >= 85 ? 'Exceptional' : overallScore >= 75 ? 'Strong' : 'Adequate',
        feedback: 'Maintained structured explanations and addressed trade-offs directly without hedging.',
      },
      productionReadiness: {
        name: 'Production Readiness & Observability',
        score: Math.min(100, Math.round(overallScore * 0.9 + 6)),
        weight: 0.15,
        rating: overallScore >= 78 ? 'Strong' : 'Adequate',
        feedback: 'Highlighted telemetry metrics, distributed tracing, and resilience against cascading failures.',
      },
    },
    strengths: [
      'Structured technical communication adhering to the STAR method',
      'Accurate Big-O time and space complexity quantification',
      'Awareness of concurrency bottlenecks and cache stampede risks',
    ],
    areasForGrowth: [
      'Proactively state input validation and negative integer constraints before writing code',
      'Detail distributed consensus mechanisms (Raft, Paxos) during multi-region failovers',
    ],
    hiringCommitteeNotes: `Evaluated under ${persona.name} (${persona.title}). Candidate demonstrated strong foundational competence in ${session.candidateRole}. The interview consensus recommendation is ${recommendation.replace('_', ' ')}.`,
  };
}
