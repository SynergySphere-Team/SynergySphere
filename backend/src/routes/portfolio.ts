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

const router = Router();
router.use(authenticate);

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

const careerToolSchema = z.object({
  tool: z.enum(['resume', 'cv', 'linkedin', 'jobs']),
  targetRole: z.string().max(120).optional(),
  skills: z.array(z.tuple([z.string(), z.number()])).optional(),
  customNotes: z.string().max(1000).optional(),
});

router.post('/career-tools', validateBody(careerToolSchema), async (req: AuthRequest, res) => {
  try {
    const { tool, targetRole, skills: inputSkills, customNotes } = req.body;

    const user = await queryOne<{ firstName: string; lastName: string; email: string; xp: number; level: number }>(
      `SELECT "firstName", "lastName", "email", "xp", "level" FROM "User" WHERE "id" = $1`,
      [req.user!.userId],
    );

    const projects = await query<{ title: string; description: string | null; projectLink: string | null; githubLink: string | null }>(
      `SELECT "title", "description", "projectLink", "githubLink" FROM "Portfolio" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [req.user!.userId],
    );

    const userName = `${user?.firstName ?? 'Student'} ${user?.lastName ?? 'Developer'}`;
    const skillsList = (inputSkills && inputSkills.length > 0)
      ? inputSkills.map(([name, val]: [string, number | string]) => `${name} (${val}%)`).join(', ')
      : 'Java (90%), Spring Boot (85%), SQL (80%), JavaScript (70%), React (60%)';

    const projectList = projects.length > 0
      ? projects.map((p) => `• ${p.title}${p.description ? `: ${p.description}` : ''}${p.githubLink ? ` (GitHub: ${p.githubLink})` : ''}`).join('\n')
      : '• Student Management API: Spring Boot, MySQL, RESTful endpoints, JWT\n• EcoTour Web App: React, Node.js, Express, MongoDB\n• Task Tracker: React, Express, PostgreSQL';

    const role = targetRole || 'Junior Software Engineer';

    const systemPrompt = [
      'You are an executive technical recruiter and Silicon Valley career strategist.',
      'You help students and junior software engineers create compelling, industry-standard, ATS-optimized career materials.',
      'Never give generic lecture or classroom responses. Deliver complete, formatted, ready-to-use content with realistic detail.',
    ].join(' ');

    let userPrompt = '';
    if (tool === 'resume') {
      userPrompt = `Generate an ATS-compliant 1-page modern Software Engineer resume for ${userName}.
Target Role: ${role}
Core Skills: ${skillsList}
Projects:
${projectList}
${customNotes ? `Additional Context: ${customNotes}` : ''}

Include:
1. Contact & Header (Name, Title, Email: ${user?.email ?? 'developer@example.com'}, Location, Portfolio links)
2. Compelling Executive Summary tailored to ${role}
3. Technical Skills (categorized: Languages, Frameworks, Databases & Storage, Developer Tools)
4. Featured Projects with 3 STAR-method bullet points per project emphasizing architecture, technologies, and outcomes
5. Education (BSc in Computer Science / Software Engineering) & SynergySphere Verified Achievements (Level ${user?.level ?? 1}, ${user?.xp ?? 285} XP)
Output clean markdown ready for export.`;
    } else if (tool === 'cv') {
      userPrompt = `Generate a comprehensive Academic & Technical Curriculum Vitae (CV) for ${userName}.
Specialization / Target: ${role}
Technical Proficiencies: ${skillsList}
Key Projects:
${projectList}

Include:
1. Personal Profile & Research/Engineering Philosophy
2. In-depth Technical Core Competencies
3. Detailed Project Architecture & System Design Breakdowns
4. Academic Background & Relevant Coursework (Data Structures, Algorithms, Distributed Systems, Database Design)
5. Certifications, Hackathons & SynergySphere Community Contributions
6. Professional References available upon request
Output thorough, polished markdown with structured headings.`;
    } else if (tool === 'linkedin') {
      userPrompt = `Create a high-converting LinkedIn profile overhaul for ${userName}.
Focus / Target: ${role}
Tech Stack: ${skillsList}
Projects:
${projectList}

Provide:
1. THREE distinct LinkedIn Headlines (1: Results & Tech Stack, 2: Value-driven, 3: SEO Keyword Loaded)
2. An engaging, authentic "About" story (300-400 words) using first-person, highlighting backend passion and project achievements
3. STAR bullet points formatted specifically for LinkedIn's "Projects" or "Featured" section
4. Top 10 high-demand skills to add to profile for recruiter search visibility
5. A personalized recruiter connection outreach message template`;
    } else {
      userPrompt = `Analyze the skill profile and provide tailored Job Recommendations for ${userName}.
Skills: ${skillsList}
Projects:
${projectList}
Preferred Direction: ${role}

Provide:
1. 5-6 matched roles with:
   - Match Percentage (based on existing skills)
   - Why it's a fit
   - Tech stack overlap vs. Recommended Next Skills to learn
   - Realistic salary range for graduate/junior
   - Top 3 companies hiring for this profile
2. Strategic Career Advice for breaking into the industry
3. Top 3 technical interview questions likely asked for the highest match role`;
    }

    const ctx: CareerProfileContext = {
      userName,
      email: user?.email ?? 'developer@example.com',
      role,
      skillsList,
      skillsArray: (inputSkills && inputSkills.length > 0) ? inputSkills : [
        ['Java', 90],
        ['Spring Boot', 85],
        ['SQL', 80],
        ['JavaScript', 70],
        ['React', 60],
      ],
      projects,
      level: user?.level ?? 1,
      xp: user?.xp ?? 285,
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

    const output = await generateAiResponse(systemPrompt, userPrompt, [], fallbackFn);
    res.json({ content: output, tool, targetRole: role });
  } catch (error) {
    console.error('Career tools error:', error);
    res.status(500).json({ error: 'Failed to generate career content' });
  }
});

export default router;

