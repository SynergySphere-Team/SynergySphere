import { newId, query, queryOne } from '../lib/db.js';
import { technologiesCatalog, w3schoolsProgrammingDomain } from '../data/w3schoolsCurriculumData.js';
import { accessTokenForUser, githubRequest } from './github.js';

export interface HubSkillSignal {
  id: string;
  name: string;
  category: string;
  icon: string;
  completedLessons: number;
  totalLessons: number;
  percent: number; // 0-100
  unlocked: boolean;
}

export interface ManualSkillSignal {
  [key: string]: unknown;
  id: string;
  name: string;
  level: number;
  source: string;
  category: string | null;
}

export interface ProfileSignalData {
  hubSkills: HubSkillSignal[];
  manualSkills: ManualSkillSignal[];
  profile: {
    githubUrl: string | null;
    linkedinUrl: string | null;
    headline: string | null;
    about: string | null;
    location: string | null;
    targetRole: string | null;
  };
  bestInterviewScores: Array<{ topic: string; bestScore: number; attempts: number }>;
  interviewScores: Record<string, number>;
  challenges: {
    passedCount: number;
    byLanguage: Record<string, number>;
    byDifficulty: Record<string, number>;
    passedList: Array<{ id: string; title: string; language: string | null; difficulty: string }>;
  };
  weeklyActivity: {
    days: Array<{ day: string; count: number; height: number }>;
    totalEvents: number;
  };
  tasksSummary: {
    completedThisWeek: number;
    upcoming: Array<{
      id: string;
      title: string;
      description: string | null;
      dueDate: string | null;
      status: string;
    }>;
  };
  offerReadiness: {
    role: string;
    score: number;
    checklist: Array<{ label: string; met: boolean; current: string }>;
  };
  nextActions: {
    lesson: { id: string; title: string; subjectId: string; subjectName: string } | null;
    challenge: { id: string; title: string; language: string | null; difficulty: string } | null;
    interviewTopic: { id: string; name: string; reason: string } | null;
  };
  starBullets: Array<{ id: string; title: string; bullet: string; source: string; createdAt: Date }>;
  joinedProjects: Array<{
    id: string;
    title: string;
    role: string;
    status: string;
    category?: string;
  }>;
  featuredProjects: Array<{
    id: string;
    title: string;
    description: string;
    projectLink?: string;
    githubLink?: string;
  }>;
  stats: {
    totalCompletedLessons: number;
    hasRealProgress: boolean;
  };
}

/**
 * Timezone-safe consecutive day streak calculation using Intl.DateTimeFormat('en-CA').
 * Returns 0 if no activity occurred today or yesterday in the specified timezone.
 */
export function computeConsecutiveStreak(dates: Array<Date | string>, timeZone = 'UTC'): number {
  if (!dates || dates.length === 0) return 0;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  const toDateStr = (d: Date | string): string => {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
      return d.trim();
    }
    const parsed = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatter.format(parsed);
  };

  const activeSet = new Set<string>();
  for (const d of dates) {
    const str = toDateStr(d);
    if (str) activeSet.add(str);
  }
  if (activeSet.size === 0) return 0;

  const now = new Date();
  const todayStr = formatter.format(now);
  const yesterdayStr = formatter.format(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  let cursorStr = activeSet.has(todayStr) ? todayStr : activeSet.has(yesterdayStr) ? yesterdayStr : null;
  if (!cursorStr) return 0;

  let streak = 0;
  let cursorUtcMs = Date.parse(`${cursorStr}T12:00:00Z`);
  while (true) {
    const dayKey = new Date(cursorUtcMs).toISOString().slice(0, 10);
    if (activeSet.has(dayKey)) {
      streak++;
      cursorUtcMs -= 24 * 60 * 60 * 1000;
    } else {
      break;
    }
  }

  return streak;
}

export async function getProfileSignals(userId: string): Promise<ProfileSignalData> {
  const completedRows = await query<{ lessonId: string }>(
    `SELECT "lessonId" FROM "LectureLessonProgress" WHERE "userId" = $1`,
    [userId],
  ).catch(() => []);

  const completedSet = new Set(completedRows.map((r) => r.lessonId));
  // Map every lessonId in curriculum to its subjectId
  const lessonToSubjectMap = new Map<string, string>();
  for (const subject of w3schoolsProgrammingDomain.subjects) {
    for (const mod of subject.modules) {
      for (const lesson of mod.lessons) {
        lessonToSubjectMap.set(lesson.id, subject.id);
      }
    }
  }

  // Count completions per technology
  const completionCounts: Record<string, number> = {};
  for (const lessonId of completedSet) {
    const subjectId = lessonToSubjectMap.get(lessonId);
    if (subjectId) {
      completionCounts[subjectId] = (completionCounts[subjectId] || 0) + 1;
    }
  }

  const hubSkills: HubSkillSignal[] = technologiesCatalog.map((tech) => {
    const completed = completionCounts[tech.id] || 0;
    const percent = Math.min(100, Math.round((completed / Math.max(tech.totalLessons, 1)) * 100));
    return {
      id: tech.id,
      name: tech.name,
      category: tech.category,
      icon: tech.icon,
      completedLessons: completed,
      totalLessons: tech.totalLessons,
      percent,
      unlocked: completed > 0,
    };
  });

  const manualSkills = await query<ManualSkillSignal>(
    `SELECT "id", "name", "level", "source", "category"
     FROM "PortfolioSkill"
     WHERE "userId" = $1
     ORDER BY "level" DESC`,
    [userId],
  ).catch(() => []);

  const profileRow = await queryOne<{
    githubUrl: string | null;
    linkedinUrl: string | null;
    headline: string | null;
    about: string | null;
    location: string | null;
    targetRole: string | null;
  }>(
    `SELECT "githubUrl", "linkedinUrl", "headline", "about", "location", "targetRole"
     FROM "PortfolioProfile"
     WHERE "userId" = $1`,
    [userId],
  ).catch(() => null);

  const scoreRows = await query<{ topic: string; bestScore: number; attempts: number }>(
    `SELECT "topic", MAX("score") as "bestScore", COUNT("id")::int as "attempts"
     FROM "Interview"
     WHERE "userId" = $1 AND "score" IS NOT NULL
     GROUP BY "topic"
     ORDER BY "bestScore" DESC`,
    [userId],
  ).catch(() => []);

  const joinedProjects = await query<{
    id: string;
    title: string;
    role: string;
    status: string;
    category?: string;
  }>(
    `SELECT p."id", p."title", 'Contributor' as "role", pa."status", p."category"
     FROM "ProjectApplication" pa
     JOIN "Project" p ON p."id" = pa."projectId"
     WHERE pa."userId" = $1`,
    [userId],
  ).catch(() => []);

  const featuredProjects = await query<{
    id: string;
    title: string;
    description: string;
    projectLink?: string;
    githubLink?: string;
  }>(
    `SELECT "id", "title", "description", "projectLink", "githubLink"
     FROM "Portfolio"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC`,
    [userId],
  ).catch(() => []);

  const passedChallengeRows = await query<{
    challengeId: string;
    title: string;
    language: string | null;
    difficulty: string;
  }>(
    `SELECT DISTINCT ON (c."id") c."id" as "challengeId", c."title", c."language", c."difficulty"
     FROM "ChallengeAttempt" ca
     JOIN "Challenge" c ON c."id" = ca."challengeId"
     WHERE ca."userId" = $1 AND ca."passed" = true
     ORDER BY c."id", ca."createdAt" DESC`,
    [userId],
  ).catch(() => []);

  const challengesByLang: Record<string, number> = {};
  const challengesByDiff: Record<string, number> = {};
  for (const c of passedChallengeRows) {
    const l = c.language || 'Other';
    challengesByLang[l] = (challengesByLang[l] || 0) + 1;
    challengesByDiff[c.difficulty] = (challengesByDiff[c.difficulty] || 0) + 1;
  }

  const activityRows = await query<{ day_num: number; cnt: number }>(
    `SELECT EXTRACT(ISODOW FROM occurred)::int AS day_num, COUNT(*)::int AS cnt
     FROM (
       SELECT "createdAt" AS occurred FROM "ChallengeAttempt" WHERE "userId" = $1 AND "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
       UNION ALL
       SELECT "updatedAt" AS occurred FROM "Task" WHERE "userId" = $1 AND "status" = 'DONE' AND "updatedAt" >= CURRENT_DATE - INTERVAL '6 days'
       UNION ALL
       SELECT "date" AS occurred FROM "Wellness" WHERE "userId" = $1 AND "date" >= CURRENT_DATE - INTERVAL '6 days'
       UNION ALL
       SELECT "createdAt" AS occurred FROM "InterviewAttempt" WHERE "userId" = $1 AND "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
     ) act
     GROUP BY day_num`,
    [userId],
  ).catch(() => []);

  const dayMap = new Map(activityRows.map((r) => [r.day_num, r.cnt]));
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let maxCount = 1;
  const days = dayNames.map((name, i) => {
    const count = dayMap.get(i + 1) || 0;
    if (count > maxCount) maxCount = count;
    return { day: name, count, height: 0 };
  });
  days.forEach((d) => {
    d.height = d.count > 0 ? Math.max(20, Math.round((d.count / maxCount) * 100)) : 8;
  });
  const totalEvents = days.reduce((sum, d) => sum + d.count, 0);

  const doneThisWeek = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS "count"
     FROM "Task"
     WHERE "userId" = $1 AND "status" = 'DONE' AND "updatedAt" >= CURRENT_DATE - INTERVAL '7 days'`,
    [userId],
  ).catch(() => ({ count: 0 }));

  const upcomingRows = await query<{
    id: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    status: string;
  }>(
    `SELECT "id", "title", "description", "dueDate", "status"
     FROM "Task"
     WHERE "userId" = $1 AND "status" != 'DONE'
     ORDER BY "dueDate" ASC NULLS LAST, "createdAt" DESC
     LIMIT 5`,
    [userId],
  ).catch(() => []);

  const starBullets = await query<{
    id: string;
    title: string;
    bullet: string;
    source: string;
    createdAt: Date;
  }>(
    `SELECT "id", "title", "bullet", "source", "createdAt"
     FROM "PortfolioBullet"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC`,
    [userId],
  ).catch(() => []);

  const interviewScores: Record<string, number> = {};
  for (const r of scoreRows) {
    if (r.topic) {
      interviewScores[r.topic] = Number(r.bestScore) || 0;
    }
  }

  const javaHub = hubSkills.find((h) => h.id === 'java')?.percent || 0;
  const sqlHub = hubSkills.find((h) => h.id === 'sql')?.percent || 0;
  const javaOrSqlScore = Math.max(interviewScores['java'] || 0, interviewScores['sql'] || 0);

  const checklist = [
    { label: 'Java or SQL Track Progress >= 30%', met: javaHub >= 30 || sqlHub >= 30, current: `${Math.max(javaHub, sqlHub)}%` },
    { label: 'Pass at least 3 Challenges', met: passedChallengeRows.length >= 3, current: `${passedChallengeRows.length}/3` },
    { label: 'Technical Interview Score >= 70%', met: javaOrSqlScore >= 70, current: `${javaOrSqlScore}%` },
    { label: 'Join 1 Open Source Project', met: joinedProjects.length >= 1, current: `${joinedProjects.length}/1` },
  ];
  const readinessScore = Math.round((checklist.filter((c) => c.met).length / checklist.length) * 100);

  let nextLesson: { id: string; title: string; subjectId: string; subjectName: string } | null = null;
  for (const subject of w3schoolsProgrammingDomain.subjects) {
    for (const mod of subject.modules) {
      for (const lesson of mod.lessons) {
        if (!completedSet.has(lesson.id)) {
          nextLesson = {
            id: lesson.id,
            title: lesson.title,
            subjectId: subject.id,
            subjectName: subject.name,
          };
          break;
        }
      }
      if (nextLesson) break;
    }
    if (nextLesson) break;
  }

  const passedIds = new Set(passedChallengeRows.map((c) => c.challengeId));
  const uncompletedChallenge = await queryOne<{
    id: string;
    title: string;
    language: string | null;
    difficulty: string;
  }>(
    `SELECT "id", "title", "language", "difficulty"
     FROM "Challenge"
     WHERE "id" != ALL($1::text[])
     ORDER BY CASE "difficulty" WHEN 'EASY' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END
     LIMIT 1`,
    [Array.from(passedIds)],
  ).catch(() => null);

  const nextInterviewTopic = {
    id: 'java',
    name: 'Java Backend',
    reason: javaOrSqlScore < 70 ? 'Strengthen core backend fundamentals' : 'Keep interview sharpness high',
  };

  const totalCompletedLessons = completedSet.size;

  return {
    hubSkills,
    manualSkills,
    profile: {
      githubUrl: profileRow?.githubUrl || null,
      linkedinUrl: profileRow?.linkedinUrl || null,
      headline: profileRow?.headline || null,
      about: profileRow?.about || null,
      location: profileRow?.location || null,
      targetRole: profileRow?.targetRole || null,
    },
    bestInterviewScores: scoreRows.map((r) => ({
      topic: r.topic,
      bestScore: Number(r.bestScore) || 0,
      attempts: Number(r.attempts) || 0,
    })),
    interviewScores,
    challenges: {
      passedCount: passedChallengeRows.length,
      byLanguage: challengesByLang,
      byDifficulty: challengesByDiff,
      passedList: passedChallengeRows.map((c) => ({
        id: c.challengeId,
        title: c.title,
        language: c.language,
        difficulty: c.difficulty,
      })),
    },
    weeklyActivity: {
      days,
      totalEvents,
    },
    tasksSummary: {
      completedThisWeek: doneThisWeek?.count || 0,
      upcoming: upcomingRows.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
        status: t.status,
      })),
    },
    offerReadiness: {
      role: profileRow?.targetRole || 'Junior Backend Developer',
      score: readinessScore,
      checklist,
    },
    nextActions: {
      lesson: nextLesson,
      challenge: uncompletedChallenge,
      interviewTopic: nextInterviewTopic,
    },
    starBullets,
    joinedProjects,
    featuredProjects,
    stats: {
      totalCompletedLessons,
      hasRealProgress: totalCompletedLessons > 0,
    },
  };
}

export async function upsertPortfolioProfile(
  userId: string,
  data: {
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    headline?: string | null;
    about?: string | null;
    location?: string | null;
    targetRole?: string | null;
  },
) {
  return queryOne(
    `INSERT INTO "PortfolioProfile" (
       "id", "userId", "githubUrl", "linkedinUrl", "headline", "about", "location", "targetRole", "updatedAt"
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
     ON CONFLICT ("userId")
     DO UPDATE SET
       "githubUrl" = COALESCE(EXCLUDED."githubUrl", "PortfolioProfile"."githubUrl"),
       "linkedinUrl" = COALESCE(EXCLUDED."linkedinUrl", "PortfolioProfile"."linkedinUrl"),
       "headline" = COALESCE(EXCLUDED."headline", "PortfolioProfile"."headline"),
       "about" = COALESCE(EXCLUDED."about", "PortfolioProfile"."about"),
       "location" = COALESCE(EXCLUDED."location", "PortfolioProfile"."location"),
       "targetRole" = COALESCE(EXCLUDED."targetRole", "PortfolioProfile"."targetRole"),
       "updatedAt" = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      newId(),
      userId,
      data.githubUrl || null,
      data.linkedinUrl || null,
      data.headline || null,
      data.about || null,
      data.location || null,
      data.targetRole || null,
    ],
  );
}

export async function upsertPortfolioSkill(
  userId: string,
  data: { name: string; level?: number; category?: string },
) {
  return queryOne(
    `INSERT INTO "PortfolioSkill" ("id", "userId", "name", "level", "source", "category", "updatedAt")
     VALUES ($1, $2, $3, $4, 'MANUAL', $5, CURRENT_TIMESTAMP)
     ON CONFLICT ("userId", "name")
     DO UPDATE SET
       "level" = EXCLUDED."level",
       "category" = EXCLUDED."category",
       "updatedAt" = CURRENT_TIMESTAMP
     RETURNING *`,
    [newId(), userId, data.name.trim(), data.level ?? 50, data.category || 'General'],
  );
}

export async function deletePortfolioSkill(userId: string, skillId: string) {
  return queryOne(
    `DELETE FROM "PortfolioSkill" WHERE "id" = $1 AND "userId" = $2 RETURNING "id"`,
    [skillId, userId],
  );
}

export interface PublicGithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  url: string;
  updatedAt: string;
}

export async function fetchGithubReposForUser(userId: string, explicitGithubUrl?: string | null): Promise<PublicGithubRepo[]> {
  try {
    try {
      const auth = await accessTokenForUser(userId);
      if (auth?.token) {
        const repos = await githubRequest<Array<{
          name: string;
          description: string | null;
          language: string | null;
          stargazers_count: number;
          html_url: string;
          updated_at: string;
          fork: boolean;
        }>>('/user/repos?sort=updated&per_page=6&type=owner', auth.token);

        if (Array.isArray(repos)) {
          return repos.filter((r) => !r.fork).map((r) => ({
            name: r.name,
            description: r.description,
            language: r.language,
            stars: r.stargazers_count,
            url: r.html_url,
            updatedAt: r.updated_at,
          }));
        }
      }
    } catch {}

    const profile = await queryOne<{ githubUrl: string | null }>(
      `SELECT "githubUrl" FROM "PortfolioProfile" WHERE "userId" = $1`,
      [userId],
    ).catch(() => null);

    const url = explicitGithubUrl || profile?.githubUrl;
    if (url) {
      const match = url.match(/github\.com\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const username = match[1];
        const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`, {
          headers: {
            'User-Agent': 'SynergySphere-Portfolio',
            Accept: 'application/vnd.github+json',
          },
        });
        if (res.ok) {
          const repos = await res.json() as Array<{
            name: string;
            description: string | null;
            language: string | null;
            stargazers_count: number;
            html_url: string;
            updated_at: string;
            fork: boolean;
          }>;
          if (Array.isArray(repos)) {
            return repos.filter((r) => !r.fork).map((r) => ({
              name: r.name,
              description: r.description,
              language: r.language,
              stars: r.stargazers_count,
              url: r.html_url,
              updatedAt: r.updated_at,
            }));
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error fetching GitHub repos:', err);
  }
  return [];
}

// ── Job Recommendation & Caching (Free Multi-Source Hybrid Engine) ──

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  postedAt: string;
  salary?: string;
  url: string;
  matchPercent: number;
  matchingSkills: string[];
  missingSkills: string[];
}

interface JobCacheEntry {
  expiresAt: number;
  data: {
    configured: boolean;
    source: string;
    jobs: JobListing[];
    emptyStateMessage?: string;
    deepLinks: {
      googleJobs: string;
      indeed: string;
      linkedIn: string;
      linkedin?: string;
      offerZen?: string;
      pnet?: string;
    };
    searchLinks: {
      googleJobs: string;
      indeed: string;
      linkedIn: string;
      linkedin?: string;
      offerZen?: string;
      pnet?: string;
    };
  };
}

const jobCache = new Map<string, JobCacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CuratedJobTemplate {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  url: string;
  description: string;
  skills: string[];
}

const CURATED_TECH_JOBS: CuratedJobTemplate[] = [
  {
    id: 'curated-takealot-grad',
    title: 'Junior Full-Stack Software Engineer',
    company: 'Takealot Group',
    location: 'Cape Town / Remote (South Africa)',
    salary: 'R35,000 - R48,000 / month',
    url: 'https://www.takealot.com/careers',
    description: 'Work with high-scale e-commerce platforms. Core focus: React, TypeScript, Java, Node.js, PostgreSQL, REST APIs, Git, and automated testing.',
    skills: ['React', 'JavaScript', 'TypeScript', 'Java', 'SQL', 'PostgreSQL', 'Git'],
  },
  {
    id: 'curated-entelect-bootcamp',
    title: 'Graduate Software Engineer (2025/2026)',
    company: 'Entelect',
    location: 'Johannesburg / Pretoria / Cape Town',
    salary: 'R32,000 - R44,000 / month',
    url: 'https://culture.entelect.co.za/graduates',
    description: 'Join Entelect fast-track graduate bootcamp. Build enterprise architectures across Java, Spring Boot, SQL, C#, and React with mentorship from industry leaders.',
    skills: ['Java', 'SQL', 'Spring Boot', 'Python', 'React', 'Git', 'Algorithms'],
  },
  {
    id: 'curated-capitec-backend',
    title: 'Junior Backend Developer (Java & Spring Boot)',
    company: 'Capitec Bank',
    location: 'Stellenbosch, Western Cape',
    salary: 'R36,000 - R52,000 / month',
    url: 'https://www.capitecbank.co.za/about-us/careers/',
    description: 'Build mission-critical digital banking services for over 21M clients. Proficient in Java, Spring Boot, PostgreSQL, Docker, microservices, and secure APIs.',
    skills: ['Java', 'SQL', 'PostgreSQL', 'Docker', 'REST APIs', 'Spring Boot'],
  },
  {
    id: 'curated-discovery-cloud',
    title: 'Junior Software Engineer (Cloud & Full-Stack)',
    company: 'Discovery Limited',
    location: 'Sandton, Johannesburg',
    salary: 'R38,000 - R54,000 / month',
    url: 'https://www.discovery.co.za/corporate/careers',
    description: 'Innovate within Discovery Vitality and Health digital platforms. Develop features using Python, JavaScript, React, SQL, AWS, and modern CI/CD pipelines.',
    skills: ['Python', 'JavaScript', 'React', 'SQL', 'AWS', 'Git', 'HTML'],
  },
  {
    id: 'curated-yoco-frontend',
    title: 'Junior Frontend Developer (React & TypeScript)',
    company: 'Yoco Payments',
    location: 'Cape Town / Remote (South Africa)',
    salary: 'R34,000 - R48,000 / month',
    url: 'https://www.yoco.com/za/careers/',
    description: 'Empower African small businesses by building fast, accessible web interfaces in React, TypeScript, Tailwind CSS, and REST/GraphQL services.',
    skills: ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Git'],
  },
  {
    id: 'curated-aws-cape-town',
    title: 'Graduate Cloud Support Associate / Developer',
    company: 'Amazon Web Services (AWS)',
    location: 'Cape Town Development Centre',
    salary: 'R42,000 - R58,000 / month',
    url: 'https://www.amazon.jobs/en/locations/cape-town-south-africa',
    description: 'Work at the AWS Development Centre in Cape Town where EC2 was born. Focus on Python, Java, Linux, cloud networking, distributed systems, and scalable services.',
    skills: ['Python', 'Java', 'Linux', 'SQL', 'Cloud', 'Git'],
  },
  {
    id: 'curated-mukuru-fintech',
    title: 'Junior Fintech Software Developer',
    company: 'Mukuru Money Transfer',
    location: 'Cape Town / Remote (South Africa)',
    salary: 'R32,000 - R46,000 / month',
    url: 'https://mukuru.com/careers/',
    description: 'Build resilient payment processing rails across emerging markets. Seeking junior developers with experience in TypeScript, Node.js, SQL databases, and secure APIs.',
    skills: ['TypeScript', 'JavaScript', 'SQL', 'Node.js', 'PostgreSQL', 'Git'],
  },
  {
    id: 'curated-sovtech-fullstack',
    title: 'Junior Software Engineer (Web & Mobile)',
    company: 'SovTech',
    location: 'Johannesburg / Remote',
    salary: 'R30,000 - R45,000 / month',
    url: 'https://www.sovtech.com/careers',
    description: 'Build custom software products for global enterprises and startups using React, React Native, TypeScript, Python, and cloud services.',
    skills: ['React', 'TypeScript', 'JavaScript', 'Python', 'SQL', 'Git'],
  },
];

export async function fetchRecommendedJobs(params: {
  role?: string;
  location?: string;
  userSkills?: string[];
}): Promise<JobCacheEntry['data']> {
  const targetRole = params.role || 'Junior Full-Stack Developer';
  const targetLocation = params.location || 'South Africa';
  const skills = params.userSkills || ['Java', 'SQL', 'React', 'JavaScript', 'Python'];

  const cacheKey = `${targetRole.toLowerCase()}:${targetLocation.toLowerCase()}:${skills.sort().join(',')}`;
  const cached = jobCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Deep search query strings for 1-click exploration
  const searchQuery = encodeURIComponent(`${targetRole} ${skills.slice(0, 3).join(' ')}`);
  const locQuery = encodeURIComponent(targetLocation);
  const deepLinks = {
    googleJobs: `https://www.google.com/search?q=${searchQuery}+jobs+in+${locQuery}&ibp=htl;jobs`,
    indeed: `https://za.indeed.com/jobs?q=${searchQuery}&l=${locQuery}`,
    linkedIn: `https://www.linkedin.com/jobs/search/?keywords=${searchQuery}&location=${locQuery}`,
    linkedin: `https://www.linkedin.com/jobs/search/?keywords=${searchQuery}&location=${locQuery}`,
    offerZen: 'https://www.offerzen.com/candidate/signup',
    pnet: `https://www.pnet.co.za/jobs/${encodeURIComponent(targetRole)}-in-South-Africa.html`,
  };

  const rawJobList: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    postedAt: string;
    salary?: string;
    url: string;
    description: string;
    tags?: string[];
  }> = [];

  // 1. Fetch from 100% free Remotive Developer API (zero API key, zero cost)
  try {
    const remotiveUrl = 'https://remotive.com/api/remote-jobs?category=software-dev&limit=20';
    const remotiveRes = await fetch(remotiveUrl, {
      headers: {
        'User-Agent': 'SynergySphere-CareerHub/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (remotiveRes.ok) {
      const remotiveData = (await remotiveRes.json()) as {
        jobs?: Array<{
          id: number;
          url: string;
          title: string;
          company_name: string;
          candidate_required_location?: string;
          publication_date?: string;
          salary?: string;
          description?: string;
          tags?: string[];
        }>;
      };

      if (Array.isArray(remotiveData.jobs)) {
        for (const rj of remotiveData.jobs) {
          rawJobList.push({
            id: `remotive-${rj.id}`,
            title: rj.title.replace(/<\/?[^>]+(>|$)/g, ''),
            company: rj.company_name || 'Tech Innovator',
            location: rj.candidate_required_location || 'Remote (Global)',
            postedAt: rj.publication_date ? new Date(rj.publication_date).toLocaleDateString() : 'Recent',
            salary: rj.salary || undefined,
            url: rj.url,
            description: (rj.description || '') + ' ' + (rj.tags?.join(' ') || ''),
            tags: rj.tags,
          });
        }
      }
    }
  } catch (err) {
    // Non-blocking: will fall back seamlessly to curated positions
    console.warn('Remotive free job feed note (using curated fallback):', (err as Error).message);
  }

  // 2. Fetch from optional Adzuna API if keys are provided by user
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY || 'za';
  if (appId && appKey) {
    try {
      const whatQuery = encodeURIComponent(targetRole);
      const whereQuery = encodeURIComponent(targetLocation);
      const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=12&what=${whatQuery}&where=${whereQuery}&content-type=application/json`;
      const res = await fetch(adzunaUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{
            id?: string;
            title: string;
            company?: { display_name: string };
            location?: { display_name: string };
            created: string;
            salary_min?: number;
            salary_max?: number;
            redirect_url: string;
            description: string;
          }>;
        };
        for (const aj of data.results || []) {
          let sal: string | undefined;
          if (aj.salary_min && aj.salary_max) {
            sal = `R${Math.round(aj.salary_min).toLocaleString()} - R${Math.round(aj.salary_max).toLocaleString()}`;
          }
          rawJobList.push({
            id: `adzuna-${aj.id || Math.random().toString(36).slice(2)}`,
            title: aj.title.replace(/<\/?[^>]+(>|$)/g, ''),
            company: aj.company?.display_name || 'Hiring Tech Employer',
            location: aj.location?.display_name || targetLocation,
            postedAt: aj.created ? new Date(aj.created).toLocaleDateString() : 'Recent',
            salary: sal,
            url: aj.redirect_url,
            description: aj.description,
          });
        }
      }
    } catch {
      // Continue with Remotive and Curated
    }
  }

  // 3. Always merge Curated South African Junior & Graduate Openings
  for (const cj of CURATED_TECH_JOBS) {
    rawJobList.push({
      id: cj.id,
      title: cj.title,
      company: cj.company,
      location: cj.location,
      postedAt: 'Active Opening',
      salary: cj.salary,
      url: cj.url,
      description: cj.description + ' ' + cj.skills.join(' '),
      tags: cj.skills,
    });
  }

  // 4. Calculate skill matching and ranking
  const seenKeys = new Set<string>();
  const jobs: JobListing[] = [];

  for (const job of rawJobList) {
    const dedupeKey = `${job.title.toLowerCase().trim()}:${job.company.toLowerCase().trim()}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const descLower = (job.description || '').toLowerCase() + ' ' + (job.title || '').toLowerCase();
    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of skills) {
      if (descLower.includes(skill.toLowerCase())) {
        matchingSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    const baseScore = skills.length > 0 ? Math.round((matchingSkills.length / skills.length) * 100) : 60;
    // Boost score if title directly matches candidate role
    const titleMatchBoost = job.title.toLowerCase().includes(targetRole.toLowerCase().split(' ')[0] || '') ? 15 : 0;
    const matchPercent = Math.min(98, Math.max(45, baseScore + titleMatchBoost));

    jobs.push({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      postedAt: job.postedAt,
      salary: job.salary,
      url: job.url,
      matchPercent,
      matchingSkills,
      missingSkills: missingSkills.slice(0, 3),
    });
  }

  // Sort by highest match percentage descending
  jobs.sort((a, b) => b.matchPercent - a.matchPercent);

  const result = {
    configured: true,
    source: rawJobList.some((j) => j.id.startsWith('remotive'))
      ? 'remotive-and-curated'
      : 'curated-and-market',
    jobs: jobs.slice(0, 24),
    deepLinks,
    searchLinks: deepLinks,
  };

  jobCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
  return result;
}
