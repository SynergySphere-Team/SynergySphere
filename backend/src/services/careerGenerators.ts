export interface CareerProfileContext {
  userName: string;
  email: string;
  role: string;
  skillsList: string;
  skillsArray: [string, number][];
  projects: Array<{
    title: string;
    description: string | null;
    projectLink: string | null;
    githubLink: string | null;
  }>;
  githubRepos?: Array<{
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    url: string;
  }>;
  communityProjects?: Array<{
    title: string;
    organization: string;
    category?: string;
    status?: string;
  }>;
  completedLessons?: string[];
  interviewScores?: Array<{ topic: string; score: number }>;
  profileLinks?: {
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    headline?: string | null;
    about?: string | null;
    location?: string | null;
  };
  level: number;
  xp: number;
}

export function generateResumeContent(ctx: CareerProfileContext): string {
  const {
    userName,
    email,
    role,
    skillsList,
    projects,
    githubRepos = [],
    communityProjects = [],
    completedLessons = [],
    interviewScores = [],
    profileLinks = {},
    level,
    xp,
  } = ctx;

  const location = profileLinks.location || 'South Africa';
  const headline = profileLinks.headline || `${role} · SynergySphere Level ${level} (${xp} XP)`;
  const linkedinPart = profileLinks.linkedinUrl ? ` | 💼 [LinkedIn](${profileLinks.linkedinUrl})` : '';
  const githubPart = profileLinks.githubUrl ? ` | 🐙 [GitHub](${profileLinks.githubUrl})` : '';

  // 1. Projects Section: User Portfolio Projects + Top GitHub Repos + Community Projects
  const projectItems: string[] = [];

  for (const p of projects) {
    projectItems.push(`### ${p.title}
${p.description ? `*${p.description}*` : '*Full-stack software engineering project*'}
${p.projectLink ? `- Live Deployment: ${p.projectLink}\n` : ''}${p.githubLink ? `- Repository: ${p.githubLink}\n` : ''}- Architected and implemented software components with modular design and clean code standards.
- Designed database interactions and verified data integrity with end-to-end testing.`);
  }

  for (const repo of githubRepos.slice(0, 3)) {
    // Only add if not already in portfolio
    if (!projects.some((p) => p.title.toLowerCase() === repo.name.toLowerCase())) {
      projectItems.push(`### ${repo.name} (Open Source Project)
*Tech: ${repo.language || 'Software'} · ⭐ ${repo.stars} stars · [View Repository](${repo.url})*
${repo.description ? `- ${repo.description}` : '- Actively maintained open-source code repository with version-controlled commits.'}
- Implemented modular functions, structured documentation, and clean Git development flow.`);
    }
  }

  for (const cp of communityProjects) {
    projectItems.push(`### ${cp.title} — ${cp.organization}
*Collaborative Software Initiative (${cp.status || 'Active Contributor'})*
- Contributed to real-world software engineering with a cross-functional student engineering team.
- Developed features adhering to code review guidelines and deliverable milestones.`);
  }

  const projectSection = projectItems.length > 0
    ? projectItems.join('\n\n')
    : `### Getting Started with Projects
*Add a project in your SynergySphere Portfolio, connect your GitHub account, or join a Community Impact project to populate your verified project portfolio here.*`;

  // 2. Education & Verified Learning
  const verifiedEducation: string[] = [];
  if (completedLessons.length > 0) {
    verifiedEducation.push(`**SynergySphere Learning Hub — Verified Technical Curriculum**
- Successfully completed ${completedLessons.length} verified lessons across core technical tracks:
${completedLessons.slice(0, 8).map((l) => `  • ${l}`).join('\n')}${completedLessons.length > 8 ? `\n  • and ${completedLessons.length - 8} more modules` : ''}`);
  }

  if (interviewScores.length > 0) {
    verifiedEducation.push(`**SynergySphere Technical Interview Assessments**
- Verified live technical interview performance:
${interviewScores.map((s) => `  • ${s.topic}: Score ${s.score}%`).join('\n')}`);
  }

  verifiedEducation.push(`**SynergySphere Platform Verification**
- Rank: **Level ${level} Developer** (${xp} Verified Contribution XP)
- Continuous evaluation in problem solving, curriculum mastery, and collaborative development.`);

  return `# ${userName}
**${headline}**
📍 ${location} | ✉️ ${email}${githubPart}${linkedinPart}

---

## PROFESSIONAL SUMMARY
Results-oriented **${role}** with verified technical proficiency in **${skillsList || 'Modern Software Development'}**. ${profileLinks.about || 'Demonstrates strong technical fundamentals, hands-on programming discipline, and structured problem-solving acumen verified through comprehensive curriculum progress and live assessments.'}

---

## TECHNICAL CORE COMPETENCIES
- **Verified Languages & Frameworks:** ${skillsList || 'In Progress'}
- **Software Engineering:** Object-Oriented Design, RESTful APIs, Clean Architecture, Version Control (Git/GitHub)
- **Problem Solving & Reliability:** Algorithmic optimization, unit testing, structured debugging, database querying

---

## FEATURED SOFTWARE & COLLABORATIVE PROJECTS
${projectSection}

---

## EDUCATION & VERIFIED CREDENTIALS
${verifiedEducation.join('\n\n')}

---
*Generated by SynergySphere Career Center · Formatted for ATS compliance and employer review*`;
}

export function generateCvContent(ctx: CareerProfileContext): string {
  const {
    userName,
    email,
    role,
    skillsList,
    projects,
    githubRepos = [],
    communityProjects = [],
    completedLessons = [],
    interviewScores = [],
    profileLinks = {},
    level,
    xp,
  } = ctx;

  const location = profileLinks.location || 'South Africa';

  const projectDetails: string[] = [];
  for (const p of projects) {
    projectDetails.push(`### ${p.title}
- **Overview:** Engineered ${p.title} adhering to clean architecture and reliable data handling.
- **Technical Description:** ${p.description || 'Full-stack application development.'}
${p.projectLink ? `- **Live System:** ${p.projectLink}\n` : ''}${p.githubLink ? `- **Source Code:** ${p.githubLink}\n` : ''}- **Outcomes:** Implemented with modular design and verified local functionality.`);
  }

  for (const repo of githubRepos.slice(0, 3)) {
    if (!projects.some((p) => p.title.toLowerCase() === repo.name.toLowerCase())) {
      projectDetails.push(`### ${repo.name} (Public GitHub Project)
- **Primary Language:** ${repo.language || 'Software Engineering'}
- **Description:** ${repo.description || 'Open-source software repository.'}
- **Repository URL:** ${repo.url}
- **Community Recognition:** ${repo.stars} stars`);
    }
  }

  for (const cp of communityProjects) {
    projectDetails.push(`### ${cp.title}
- **Organization:** ${cp.organization}
- **Participation:** ${cp.status || 'Active Member'}
- **Focus:** Collaborative IT solution for civic and climate impact.`);
  }

  const projectSection = projectDetails.length > 0
    ? projectDetails.join('\n\n')
    : `*No projects registered yet. Register your work in Portfolio or connect GitHub to showcase your achievements.*`;

  return `# CURRICULUM VITAE

## ${userName}
**${role}**
Email: ${email} | Location: ${location}
${profileLinks.linkedinUrl ? `LinkedIn: ${profileLinks.linkedinUrl} | ` : ''}${profileLinks.githubUrl ? `GitHub: ${profileLinks.githubUrl}` : ''}

---

### 1. PROFESSIONAL BIOGRAPHY
${profileLinks.about || `Passionate software developer focused on building scalable, maintainable software systems. Demonstrates disciplined mastery in ${skillsList || 'computer science and software engineering'}.`}

---

### 2. CORE TECHNICAL COMPETENCIES
- **Primary Technologies:** ${skillsList || 'General Engineering'}
- **Development Lifecycle:** Git, Code Reviews, REST APIs, Database Optimization, Automated Testing
- **SynergySphere Level:** Level ${level} (${xp} Verified Platform XP)

---

### 3. TECHNICAL PROJECT PORTFOLIO
${projectSection}

---

### 4. VERIFIED CURRICULUM & CERTIFICATIONS
${completedLessons.length > 0 ? `**Completed Learning Hub Modules (${completedLessons.length} lessons verified):**\n` + completedLessons.slice(0, 10).map((l) => `- ${l}`).join('\n') : '**Curriculum In Progress:** Actively completing modules in Learning Hub.'}

${interviewScores.length > 0 ? `\n**Verified Technical Interview Scores:**\n` + interviewScores.map((s) => `- ${s.topic}: ${s.score}% mastery`).join('\n') : ''}

---

### 5. PROFESSIONAL REFERENCES
*Verified SynergySphere credentials, GitHub commit history, and references available upon request.*`;
}

export function generateLinkedInContent(ctx: CareerProfileContext): string {
  const { userName, role, skillsList, projects, githubRepos = [], profileLinks = {} } = ctx;

  const topProject = projects[0]?.title || githubRepos[0]?.name || 'Full-Stack Software Engineering';

  return `# LINKEDIN PROFILE OPTIMIZATION KIT
**Prepared for: ${userName} (${role})**

---

### 1. OPTIMIZED HEADLINE (Choose one)
- **Option A (Role & Skills):** ${role} | ${skillsList.slice(0, 70)} | Building Scalable Software
- **Option B (Outcome-focused):** ${role} · Full-Stack & Systems Engineering · Verified SynergySphere Developer
- **Option C (Minimalist):** Software Engineer | ${skillsList.split(',')[0] || 'Java'} & Web Systems

---

### 2. ABOUT SECTION (Copy & paste to your LinkedIn Summary)
\`\`\`
${profileLinks.about || `Hi, I'm ${userName}! I'm a ${role} focused on writing clean, efficient, and well-tested software.

My core technical toolkit includes:
${skillsList || 'Java, Python, SQL, JavaScript, React'}

I focus on:
• Developing modular RESTful APIs and responsive frontends
• Writing maintainable code backed by strong algorithms and database design
• Continuous growth through hands-on projects and open-source contributions

Let's connect and discuss software engineering, new technologies, or upcoming opportunities!`}
\`\`\`

---

### 3. FEATURED PROJECT HIGHLIGHT
\`\`\`
🚀 Featured Project: ${topProject}
${projects[0]?.description || 'Engineered with clean architecture, tested workflows, and verified real-world functionality.'}
${projects[0]?.githubLink ? `Check out the code: ${projects[0].githubLink}` : ''}
\`\`\`

---

### 4. RECOMMENDED SKILLS TO PIN ON LINKEDIN
${ctx.skillsArray && ctx.skillsArray.length > 0 ? ctx.skillsArray.map(([name]) => `• ${name}`).join('\n') : '• Java\n• Python\n• SQL\n• React\n• JavaScript'}`;
}

export function generateJobsContent(ctx: CareerProfileContext): string {
  const { role, skillsList } = ctx;

  return `# CAREER & JOB SEARCH STRATEGY
**Target Role:** ${role}
**Marketable Stack:** ${skillsList}

---

### 1. TARGET ROLES & TITLES
- Junior ${role}
- Associate Software Engineer
- Graduate Full-Stack Developer
- Backend Developer Intern / Associate

### 2. RECOMMENDED SEARCH KEYWORDS
- \`"${role}" AND (${skillsList.split(',').slice(0, 2).join(' OR ')})\`
- \`"Software Engineer" "Junior" "Remote"\`

### 3. INTERVIEW PREPARATION CHECKLIST
- [ ] Practice 10-question mock interviews in the SynergySphere Interview Hub
- [ ] Ensure your top GitHub project has a detailed README and setup instructions
- [ ] Complete remaining Learning Hub tracks to raise your profile signals`;
}
