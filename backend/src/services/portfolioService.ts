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

export async function getProfileSignals(userId: string): Promise<ProfileSignalData> {
  // 1. Fetch completed lessons from LectureLessonProgress
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

  // Build Hub skills array
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

  // 2. Fetch manual skills from PortfolioSkill
  const manualSkills = await query<ManualSkillSignal>(
    `SELECT "id", "name", "level", "source", "category"
     FROM "PortfolioSkill"
     WHERE "userId" = $1
     ORDER BY "level" DESC`,
    [userId],
  ).catch(() => []);

  // 3. Fetch PortfolioProfile
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

  // 4. Fetch best interview scores
  const scoreRows = await query<{ topic: string; bestScore: number; attempts: number }>(
    `SELECT "topic", MAX("score") as "bestScore", COUNT("id")::int as "attempts"
     FROM "Interview"
     WHERE "userId" = $1 AND "score" IS NOT NULL
     GROUP BY "topic"
     ORDER BY "bestScore" DESC`,
    [userId],
  ).catch(() => []);

  // 5. Fetch joined community projects
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

  // 6. Fetch portfolio projects
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

  const interviewScores: Record<string, number> = {};
  for (const r of scoreRows) {
    if (r.topic) {
      interviewScores[r.topic] = Number(r.bestScore) || 0;
    }
  }

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
    // 1. Try authenticated connection
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

    // 2. Try public github url parsing
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

// ── Job Recommendation & Caching ──

export interface JobListing {
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
    source?: string;
    jobs: JobListing[];
    emptyStateMessage?: string;
    deepLinks: {
      googleJobs: string;
      indeed: string;
      linkedIn: string;
      linkedin?: string;
    };
    searchLinks: {
      googleJobs: string;
      indeed: string;
      linkedIn: string;
      linkedin?: string;
    };
  };
}

const jobCache = new Map<string, JobCacheEntry>();
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes

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

  // Deep search query strings
  const searchQuery = encodeURIComponent(`${targetRole} ${skills.slice(0, 3).join(' ')}`);
  const locQuery = encodeURIComponent(targetLocation);
  const deepLinks = {
    googleJobs: `https://www.google.com/search?q=${searchQuery}+jobs+in+${locQuery}&ibp=htl;jobs`,
    indeed: `https://www.indeed.com/jobs?q=${searchQuery}&l=${locQuery}`,
    linkedIn: `https://www.linkedin.com/jobs/search/?keywords=${searchQuery}&location=${locQuery}`,
    linkedin: `https://www.linkedin.com/jobs/search/?keywords=${searchQuery}&location=${locQuery}`,
  };

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY || 'za';

  if (!appId || !appKey) {
    const result = {
      configured: false,
      source: 'deep-links',
      jobs: [],
      emptyStateMessage:
        'Live job aggregation requires ADZUNA_APP_ID and ADZUNA_APP_KEY in backend/.env. Use the deep links below to explore matching openings directly.',
      deepLinks,
      searchLinks: deepLinks,
    };
    jobCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
    return result;
  }

  try {
    const whatQuery = encodeURIComponent(targetRole);
    const whereQuery = encodeURIComponent(targetLocation);
    const apiUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=15&what=${whatQuery}&where=${whereQuery}&content-type=application/json`;

    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error(`Adzuna API returned status ${res.status}`);
    }

    const data = await res.json() as {
      results?: Array<{
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

    const rawList = data.results || [];
    const jobs: JobListing[] = rawList.map((job) => {
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

      const matchPercent = skills.length > 0
        ? Math.round((matchingSkills.length / skills.length) * 100)
        : 65;

      let salary: string | undefined;
      if (job.salary_min && job.salary_max) {
        salary = `R${Math.round(job.salary_min).toLocaleString()} - R${Math.round(job.salary_max).toLocaleString()}`;
      } else if (job.salary_min) {
        salary = `From R${Math.round(job.salary_min).toLocaleString()}`;
      }

      return {
        title: job.title.replace(/<\/?[^>]+(>|$)/g, ''),
        company: job.company?.display_name || 'Hiring Tech Employer',
        location: job.location?.display_name || targetLocation,
        postedAt: job.created ? new Date(job.created).toLocaleDateString() : 'Recent',
        salary,
        url: job.redirect_url,
        matchPercent: Math.max(matchPercent, 35),
        matchingSkills,
        missingSkills: missingSkills.slice(0, 3),
      };
    });

    // Sort by match percentage descending
    jobs.sort((a, b) => b.matchPercent - a.matchPercent);

    const result = {
      configured: true,
      source: 'adzuna',
      jobs,
      deepLinks,
      searchLinks: deepLinks,
    };

    jobCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
    return result;
  } catch (err) {
    console.error('Error fetching jobs from Adzuna:', err);
    return {
      configured: true,
      source: 'deep-links',
      jobs: [],
      emptyStateMessage: 'Unable to reach job aggregator at this moment. Explore live openings with the links below.',
      deepLinks,
      searchLinks: deepLinks,
    };
  }
}
