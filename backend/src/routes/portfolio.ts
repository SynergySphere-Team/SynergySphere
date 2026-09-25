import { Router } from 'express';
import { z } from 'zod';
import { execute, newId, nullable, query, queryOne } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';
import { generateAiResponse } from '../services/ai.js';
import {
  type CareerProfileContext,
  generateResumeContent,
  generateCvContent,
  generateLinkedInContent,
  generateJobsContent,
} from '../services/careerGenerators.js';
import {
  getProfileSignals,
  upsertPortfolioProfile,
  upsertPortfolioSkill,
  deletePortfolioSkill,
  fetchGithubReposForUser,
  fetchRecommendedJobs,
} from '../services/portfolioService.js';
import { w3schoolsProgrammingDomain } from '../data/w3schoolsCurriculumData.js';

const router = Router();
router.use(authenticate);

// ── 1. Portfolio Items (CRUD) ──

const portfolioSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectLink: z.string().url().optional().or(z.literal('')),
  githubLink: z.string().url().optional().or(z.literal('')),
});

router.get('/', async (req: AuthRequest, res) => {
  const take = Math.min(Number(req.query.take) || 100, 200);
  const items = await query(
    `SELECT *
     FROM "Portfolio"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC
     LIMIT $2`,
    [req.user!.userId, take],
  );
  res.json(items);
});

router.post('/', validateBody(portfolioSchema), async (req: AuthRequest, res) => {
  const item = await queryOne(
    `INSERT INTO "Portfolio" ("id", "userId", "title", "description", "projectLink", "githubLink")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      newId(),
      req.user!.userId,
      req.body.title,
      nullable(req.body.description),
      nullable(req.body.projectLink),
      nullable(req.body.githubLink),
    ],
  );
  await awardXp(req.user!.userId, 25, 'Portfolio item added');
  res.status(201).json(item);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const deleted = await execute(
    `DELETE FROM "Portfolio"
     WHERE "id" = $1 AND "userId" = $2`,
    [paramId(req), req.user!.userId],
  );
  if (deleted === 0) {
    res.status(404).json({ error: 'Portfolio item not found' });
    return;
  }
  res.status(204).send();
});

// ── 2. Profile Signals (Learning Hub Progress, DB Skills, Real Links) ──

router.get('/profile-signals', async (req: AuthRequest, res) => {
  try {
    const signals = await getProfileSignals(req.user!.userId);
    res.json(signals);
  } catch (error) {
    console.error('Error fetching profile signals:', error);
    res.status(500).json({ error: 'Failed to fetch profile signals' });
  }
});

const profileUpdateSchema = z.object({
  githubUrl: z.string().max(255).optional().nullable(),
  linkedinUrl: z.string().max(255).optional().nullable(),
  headline: z.string().max(255).optional().nullable(),
  about: z.string().max(2000).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  targetRole: z.string().max(120).optional().nullable(),
});

router.put('/profile', validateBody(profileUpdateSchema), async (req: AuthRequest, res) => {
  try {
    const updated = await upsertPortfolioProfile(req.user!.userId, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update portfolio profile' });
  }
});

const skillSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.number().int().min(0).max(100).optional(),
  category: z.string().max(100).optional(),
});

router.post('/skills', validateBody(skillSchema), async (req: AuthRequest, res) => {
  try {
    const skill = await upsertPortfolioSkill(req.user!.userId, req.body);
    res.status(201).json(skill);
  } catch (error) {
    console.error('Error adding skill:', error);
    res.status(500).json({ error: 'Failed to save skill' });
  }
});

router.delete('/skills/:id', async (req: AuthRequest, res) => {
  try {
    await deletePortfolioSkill(req.user!.userId, paramId(req));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// ── 3. Real Job Recommendations (Adzuna with Caching & Skill Ranking) ──

router.get('/jobs', async (req: AuthRequest, res) => {
  try {
    const signals = await getProfileSignals(req.user!.userId);
    const targetRole = String(req.query.role || signals.profile.targetRole || 'Junior Software Engineer');
    const location = String(req.query.location || signals.profile.location || 'South Africa');

    // Extract top active skills from Hub + manual
    const activeSkills = [
      ...signals.hubSkills.filter((s) => s.completedLessons > 0).map((s) => s.name),
      ...signals.manualSkills.map((s) => s.name),
    ];

    const result = await fetchRecommendedJobs({
      role: targetRole,
      location,
      userSkills: activeSkills.length > 0 ? activeSkills : ['Java', 'SQL', 'JavaScript', 'React'],
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch job recommendations' });
  }
});

// ── 4. Career Tools (Real Data Generator) ──

const careerToolSchema = z.object({
  tool: z.enum(['resume', 'cv', 'linkedin', 'jobs']),
  targetRole: z.string().max(120).optional(),
  skills: z.array(z.tuple([z.string(), z.number()])).optional(),
  customNotes: z.string().max(1000).optional(),
});

router.post('/career-tools', validateBody(careerToolSchema), async (req: AuthRequest, res) => {
  try {
    const { tool, targetRole, skills: inputSkills, customNotes } = req.body;
    const userId = req.user!.userId;

    // 1. Fetch User
    const user = await queryOne<{ firstName: string; lastName: string; email: string; xp: number; level: number }>(
      `SELECT "firstName", "lastName", "email", "xp", "level" FROM "User" WHERE "id" = $1`,
      [userId],
    );
    const userName = `${user?.firstName ?? 'Student'} ${user?.lastName ?? 'Developer'}`;

    // 2. Fetch Profile Signals
    const signals = await getProfileSignals(userId);
    const role = targetRole || signals.profile.targetRole || 'Junior Software Engineer';

    // 3. Collect Real Completed Lessons
    const completedRows = await query<{ lessonId: string }>(
      `SELECT "lessonId" FROM "LectureLessonProgress" WHERE "userId" = $1`,
      [userId],
    ).catch(() => []);
    const completedLessonIds = new Set(completedRows.map((r) => r.lessonId));

    const completedLessonTitles: string[] = [];
    for (const subject of w3schoolsProgrammingDomain.subjects) {
      for (const mod of subject.modules) {
        for (const lesson of mod.lessons) {
          if (completedLessonIds.has(lesson.id)) {
            completedLessonTitles.push(`${subject.name}: ${lesson.title}`);
          }
        }
      }
    }

    // 4. Collect Portfolio Projects
    const projects = await query<{
      title: string;
      description: string | null;
      projectLink: string | null;
      githubLink: string | null;
    }>(
      `SELECT "title", "description", "projectLink", "githubLink"
       FROM "Portfolio"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC`,
      [userId],
    );

    // 5. Collect Joined Community Projects
    const communityProjects = await query<{
      title: string;
      organization: string;
      category: string;
      status: string;
    }>(
      `SELECT p."title", p."organization", p."category", pa."status"
       FROM "ProjectApplication" pa
       JOIN "Project" p ON p."id" = pa."projectId"
       WHERE pa."userId" = $1`,
      [userId],
    ).catch(() => []);

    // 6. Fetch Public GitHub Repos
    const githubRepos = await fetchGithubReposForUser(userId, signals.profile.githubUrl);

    // 7. Format Skills List from Real Signals (or input overrides if passed)
    let skillsList = '';
    const skillsArray: [string, number][] = [];

    if (inputSkills && inputSkills.length > 0) {
      skillsList = inputSkills.map(([name, val]: [string, number | string]) => `${name} (${val}%)`).join(', ');
      skillsArray.push(...inputSkills);
    } else {
      const activeHub = signals.hubSkills.filter((s) => s.completedLessons > 0);
      const activeManual = signals.manualSkills;

      if (activeHub.length > 0 || activeManual.length > 0) {
        const parts: string[] = [];
        for (const h of activeHub) {
          parts.push(`${h.name} (${h.percent}%)`);
          skillsArray.push([h.name, h.percent]);
        }
        for (const m of activeManual) {
          parts.push(`${m.name} (${m.level}%)`);
          skillsArray.push([m.name, m.level]);
        }
        skillsList = parts.join(', ');
      } else {
        skillsList = 'Software Engineering Fundamentals (Curriculum in progress)';
      }
    }

    // 8. Assemble Full Context
    const ctx: CareerProfileContext = {
      userName,
      email: user?.email ?? 'developer@example.com',
      role,
      skillsList,
      skillsArray,
      projects,
      githubRepos,
      communityProjects,
      completedLessons: completedLessonTitles,
      interviewScores: signals.bestInterviewScores.map((s) => ({ topic: s.topic, score: s.bestScore })),
      profileLinks: signals.profile,
      level: user?.level ?? 1,
      xp: user?.xp ?? 0,
    };

    const fallbackFn = (): string => {
      switch (tool) {
        case 'resume': return generateResumeContent(ctx);
        case 'cv': return generateCvContent(ctx);
        case 'linkedin': return generateLinkedInContent(ctx);
        case 'jobs': return generateJobsContent(ctx);
        default: return '';
      }
    };

    // System prompt instructing Gemini to stick faithfully to provided context
    const systemPrompt = [
      'You are a senior technical recruiter and career strategist.',
      'Generate an industry-standard, professional career document for the candidate.',
      'CRITICAL: Strictly ground all projects, education, and skills in the candidate\'s provided verified portfolio, GitHub repositories, and Learning Hub curriculum progress.',
      'Do NOT invent fictional company experiences or degrees not present in the data.',
      'Highlight real technical achievements, architecture, and code skills cleanly.',
      'Output formatted Markdown.',
    ].join('\n');

    const userPrompt = [
      `Tool: ${tool}`,
      `Candidate Name: ${userName}`,
      `Email: ${user?.email}`,
      `Target Role: ${role}`,
      `Verified Skills: ${skillsList}`,
      `Verified Completed Learning Hub Lessons: ${completedLessonTitles.slice(0, 10).join(', ') || 'In progress'}`,
      `Verified Interview Scores: ${signals.bestInterviewScores.map((s) => `${s.topic} (${s.bestScore}%)`).join(', ') || 'None yet'}`,
      `Portfolio Projects: ${projects.length > 0 ? projects.map((p) => p.title).join(', ') : 'None added yet'}`,
      `GitHub Repositories: ${githubRepos.length > 0 ? githubRepos.map((r) => `${r.name} (${r.language || 'Code'})`).join(', ') : 'None connected'}`,
      `Community Impact Projects Joined: ${communityProjects.length > 0 ? communityProjects.map((c) => `${c.title} (${c.organization})`).join(', ') : 'None'}`,
      customNotes ? `Candidate Custom Notes: ${customNotes}` : '',
    ].join('\n');

    const output = await generateAiResponse(systemPrompt, userPrompt, [], fallbackFn);
    res.json({ content: output, tool, targetRole: role, contextSummary: { projectsCount: projects.length, reposCount: githubRepos.length, lessonsCount: completedLessonTitles.length } });
  } catch (error) {
    console.error('Career tools error:', error);
    res.status(500).json({ error: 'Failed to generate career content' });
  }
});

export default router;
