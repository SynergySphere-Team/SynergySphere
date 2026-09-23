'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/utils';
import {
  Briefcase,
  Download,
  ExternalLink,
  Github,
  Linkedin,
  Plus,
  Star,
  Trash2,
  X,
  Eye,
  Loader2,
  Settings,
  FileText,
  Sparkles,
  Briefcase as BriefcaseIcon,
} from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  projectLink: string | null;
  githubLink: string | null;
}

const SKILLS_KEY = 'synergysphere.portfolio.skills';
const LINKS_KEY = 'synergysphere.portfolio.links';

const defaultSkills: [string, number][] = [
  ['Java', 90],
  ['Spring Boot', 85],
  ['SQL', 80],
  ['JavaScript', 70],
  ['React', 60],
];

const CAREER_TOOLS = [
  { id: 'resume', label: 'Resume Builder', icon: FileText, desc: 'Generate a professional resume from your portfolio' },
  { id: 'cv', label: 'CV Generator', icon: FileText, desc: 'Create a detailed academic CV' },
  { id: 'linkedin', label: 'LinkedIn Optimizer', icon: Linkedin, desc: 'Improve your LinkedIn headline & summary' },
  { id: 'jobs', label: 'Job Recommendations', icon: BriefcaseIcon, desc: 'Get matched job roles based on your skills' },
] as const;

type ToolId = typeof CAREER_TOOLS[number]['id'];

export default function PortfolioPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', projectLink: '', githubLink: '' });
  const [error, setError] = useState('');

  // Social links stored in localStorage (no backend schema change needed)
  const [links, setLinks] = useState({ github: '', linkedin: '' });
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [linksForm, setLinksForm] = useState({ github: '', linkedin: '' });

  // Career tool modal
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [toolOutput, setToolOutput] = useState('');
  const [toolLoading, setToolLoading] = useState(false);

  // Skills
  const skills: [string, number][] = defaultSkills;

  // Load portfolio items
  useEffect(() => {
    api<PortfolioItem[]>('/portfolio')
      .then(setItems)
      .catch(() => setError('Could not load portfolio items from the backend.'));
  }, []);

  // Load saved links from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LINKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLinks(parsed);
        setLinksForm(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  function saveLinks() {
    localStorage.setItem(LINKS_KEY, JSON.stringify(linksForm));
    setLinks(linksForm);
    setShowLinksModal(false);
  }

  function openGitHub() {
    if (links.github) {
      window.open(links.github.startsWith('http') ? links.github : `https://github.com/${links.github}`, '_blank');
    } else {
      setLinksForm(links);
      setShowLinksModal(true);
    }
  }

  function openLinkedIn() {
    if (links.linkedin) {
      window.open(links.linkedin.startsWith('http') ? links.linkedin : `https://linkedin.com/in/${links.linkedin}`, '_blank');
    } else {
      setLinksForm(links);
      setShowLinksModal(true);
    }
  }

  function downloadCV() {
    const name = `${user?.firstName ?? 'Student'} ${user?.lastName ?? 'Developer'}`;
    const skillsHtml = skills.map(([s, v]) => `<li>${s} — ${v}%</li>`).join('');
    const projectsHtml = items.length
      ? items.map((item) => `
          <div style="margin-bottom:12px">
            <strong>${item.title}</strong>
            ${item.description ? `<p style="margin:4px 0;color:#555">${item.description}</p>` : ''}
            ${item.projectLink ? `<a href="${item.projectLink}">Live Demo</a>` : ''}
            ${item.githubLink ? ` | <a href="${item.githubLink}">GitHub</a>` : ''}
          </div>`).join('')
      : '<p>No projects added yet.</p>';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${name} — CV</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #222; padding: 0 20px; }
    h1 { font-size: 28px; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #555; font-weight: normal; margin-bottom: 20px; }
    h3 { font-size: 18px; border-bottom: 2px solid #91db5e; padding-bottom: 4px; margin-top: 28px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    a { color: #2563eb; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${name}</h1>
  <h2>Student Developer</h2>
  <p>Passionate about building scalable backend systems and solving real-world problems.</p>
  ${links.github ? `<p><strong>GitHub:</strong> <a href="${links.github}">${links.github}</a></p>` : ''}
  ${links.linkedin ? `<p><strong>LinkedIn:</strong> <a href="${links.linkedin}">${links.linkedin}</a></p>` : ''}

  <h3>Skills</h3>
  <ul>${skillsHtml}</ul>

  <h3>Featured Projects</h3>
  ${projectsHtml}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}_CV.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function viewPortfolio() {
    const name = `${user?.firstName ?? 'Student'} ${user?.lastName ?? 'Developer'}`;
    const skillsHtml = skills.map(([s, v]) => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span>${s}</span><strong>${v}%</strong>
        </div>
        <div style="background:#e5e7eb;border-radius:999px;height:6px">
          <div style="background:#91db5e;width:${v}%;height:100%;border-radius:999px"></div>
        </div>
      </div>`).join('');

    const projectsHtml = items.length
      ? items.map((item) => `
          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px">
            <h3 style="margin:0 0 6px">${item.title}</h3>
            ${item.description ? `<p style="color:#6b7280;font-size:13px;margin:0 0 10px">${item.description}</p>` : ''}
            <div style="display:flex;gap:16px">
              ${item.projectLink ? `<a href="${item.projectLink}" style="color:#2563eb;font-size:13px">🔗 Live Demo</a>` : ''}
              ${item.githubLink ? `<a href="${item.githubLink}" style="color:#2563eb;font-size:13px">💻 GitHub</a>` : ''}
            </div>
          </div>`).join('')
      : '<p style="color:#6b7280">No projects added yet.</p>';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${name} — Portfolio</title>
  <style>body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#111}</style>
</head>
<body>
  <h1 style="font-size:32px;margin-bottom:4px">${name}</h1>
  <p style="color:#6b7280;margin-bottom:4px">Student Developer</p>
  <p style="color:#6b7280;margin-bottom:20px">Passionate about building scalable backend systems and solving real-world problems.</p>
  ${links.github ? `<a href="${links.github}" style="margin-right:16px;color:#2563eb">GitHub</a>` : ''}
  ${links.linkedin ? `<a href="${links.linkedin}" style="color:#2563eb">LinkedIn</a>` : ''}
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
  <h2>Skills</h2>
  ${skillsHtml}
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
  <h2>Featured Projects</h2>
  ${projectsHtml}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function runCareerTool(toolId: ToolId) {
    setActiveTool(toolId);
    setToolOutput('');
    setToolLoading(true);

    const name = `${user?.firstName ?? 'Student'} ${user?.lastName ?? 'Developer'}`;
    const skillsList = skills.map(([s, v]) => `${s} (${v}%)`).join(', ');
    const projectList = items.map((p) => `- ${p.title}: ${p.description || ''}`).join('\n');

    const prompts: Record<ToolId, string> = {
      resume: `Write a professional 1-page resume for a student developer named ${name}.
Skills: ${skillsList}.
Projects:
${projectList || 'No projects listed yet.'}
Format it clearly with sections: Summary, Skills, Projects, Education. Keep it concise and ATS-friendly.`,

      cv: `Write a detailed academic CV for a student developer named ${name}.
Skills: ${skillsList}.
Projects:
${projectList || 'No projects listed yet.'}
Include: Personal Statement, Technical Skills, Projects, Education, Extracurricular. Make it professional and thorough.`,

      linkedin: `Write an optimised LinkedIn profile for a student developer named ${name}.
Skills: ${skillsList}.
Projects:
${projectList || 'No projects listed yet.'}
Provide: 1) A punchy headline (under 220 chars), 2) An engaging About section (300-500 words), 3) 5 skill keywords to add to their profile.`,

      jobs: `Based on these skills and projects, recommend 6 specific job roles for a student developer named ${name}.
Skills: ${skillsList}.
Projects:
${projectList || 'No projects listed yet.'}
For each role provide: Role title, Why it fits, Recommended next skill to learn, Example companies hiring. Format clearly.`,
    };

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompts[toolId] }),
      });

      if (!response.ok) throw new Error('AI service unavailable');
      const data = await response.json();
      setToolOutput(data.reply || data.message || data.response || data.content || JSON.stringify(data, null, 2));
    } catch {
      // Fallback: generate meaningful static output per tool
      const fallbacks: Record<ToolId, string> = {
        resume: `# ${name} — Resume

## Summary
Passionate student developer with strong backend and full-stack skills. Experienced with Java, Spring Boot, SQL, JavaScript, and React. Eager to contribute to real-world projects and continue growing as a software engineer.

## Technical Skills
${skills.map(([s, v]) => `• ${s} — ${v}%`).join('\n')}

## Projects
${items.length ? items.map((p) => `• **${p.title}** — ${p.description || ''}`).join('\n') : '• Add your projects using the "Add Project" button above.'}

## Education
Bachelor of Computer Science (In Progress)

---
*Generated by SynergySphere Career Tools*`,

        cv: `# Curriculum Vitae — ${name}

## Personal Statement
I am a motivated student developer passionate about building scalable backend systems and solving complex real-world problems. I am continuously developing my technical skills and seeking opportunities to contribute to impactful projects.

## Technical Skills
${skills.map(([s, v]) => `| ${s} | ${'█'.repeat(Math.round(v / 10))}${'░'.repeat(10 - Math.round(v / 10))} | ${v}% |`).join('\n')}

## Projects
${items.length ? items.map((p) => `### ${p.title}\n${p.description || 'A software development project.'}\n${p.projectLink ? `Live: ${p.projectLink}` : ''}${p.githubLink ? `  GitHub: ${p.githubLink}` : ''}`).join('\n\n') : 'Add your projects using the "Add Project" button above.'}

## Education
Bachelor of Computer Science — In Progress

---
*Generated by SynergySphere Career Tools*`,

        linkedin: `# LinkedIn Optimisation for ${name}

## ✅ Recommended Headline
"Student Developer | Java • Spring Boot • React | Building scalable backend systems"

## ✅ About Section
I'm a passionate software developer currently pursuing my Computer Science degree. I specialize in backend development using Java and Spring Boot, with strong experience in SQL databases and modern JavaScript/React frontends.

I love solving real-world problems through code — from designing RESTful APIs to building full-stack applications. I'm always looking to collaborate on meaningful projects and grow as an engineer.

Let's connect if you're working on something impactful! 🚀

## ✅ Top 5 Skills to Add
1. Java
2. Spring Boot
3. REST API Development
4. PostgreSQL / SQL
5. React.js

---
*Generated by SynergySphere Career Tools*`,

        jobs: `# Job Recommendations for ${name}

## 🎯 1. Junior Backend Developer
**Why it fits:** Your Java & Spring Boot skills are exactly what backend teams need.
**Next skill:** Learn Docker & containerization.
**Companies:** Amazon, Nedbank, Capitec, FNB Tech

## 🎯 2. Full Stack Developer (Junior)
**Why it fits:** Your combo of React + Java + SQL covers the full stack.
**Next skill:** TypeScript and REST API testing with Postman.
**Companies:** Discovery, Takealot, Allan Gray

## 🎯 3. Software Engineer Intern
**Why it fits:** Great entry point to apply your academic and project experience.
**Next skill:** Git workflows, CI/CD basics.
**Companies:** Standard Bank, Old Mutual, Shoprite IT

## 🎯 4. API Developer
**Why it fits:** Spring Boot REST API experience is directly relevant.
**Next skill:** API security (OAuth2, JWT).
**Companies:** Vodacom, MTN, Telkom

## 🎯 5. Data Engineer (Junior)
**Why it fits:** Your SQL skills (80%) are a strong foundation.
**Next skill:** Python, Apache Spark.
**Companies:** PwC, Deloitte, BCX

## 🎯 6. Frontend Developer
**Why it fits:** JavaScript (70%) and React (60%) skills are marketable.
**Next skill:** Next.js, Tailwind CSS.
**Companies:** Yoco, MiWay, Iress

---
*Generated by SynergySphere Career Tools*`,
      };
      setToolOutput(fallbacks[toolId]);
    } finally {
      setToolLoading(false);
    }
  }

  async function addItem() {
    if (!form.title.trim()) return;
    try {
      setError('');
      await api('/portfolio', { method: 'POST', body: JSON.stringify(form) });
      const data = await api<PortfolioItem[]>('/portfolio');
      setItems(data);
    } catch {
      setError('Could not save this project. Please try again.');
    }
    setForm({ title: '', description: '', projectLink: '', githubLink: '' });
    setShowForm(false);
  }

  async function removeItem(id: string) {
    try {
      await api(`/portfolio/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError('Could not delete this project. Please try again.');
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Portfolio &amp; Career Center</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Career profile</h1>
          <p className="text-sm text-muted-foreground">Showcase projects, skills, achievements, and career readiness.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={viewPortfolio}>
            <Eye className="h-4 w-4" />View Portfolio
          </Button>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4" />Add Project
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Add Project Form */}
      {showForm && (
        <Card className="mb-4">
          <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
            <Input placeholder="Project title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Description (e.g. React, Node.js)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="Live project URL" value={form.projectLink} onChange={(e) => setForm({ ...form, projectLink: e.target.value })} />
            <Input placeholder="GitHub repo URL" value={form.githubLink} onChange={(e) => setForm({ ...form, githubLink: e.target.value })} />
            <div className="flex gap-2">
              <Button onClick={addItem}>Save Project</Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">

          {/* Profile Card */}
          <Card>
            <CardContent className="flex flex-col gap-5 pt-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-3xl font-bold text-primary">
                  {user?.firstName?.[0] ?? 'D'}{user?.lastName?.[0] ?? 'S'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{user?.firstName ?? 'Demo'} {user?.lastName ?? 'Student'}</h2>
                  <p className="text-sm text-muted-foreground">Student Developer</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Passionate about building scalable backend systems and solving real-world problems.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={openGitHub}
                      title={links.github ? `Open ${links.github}` : 'Set your GitHub URL'}
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={openLinkedIn}
                      title={links.linkedin ? `Open ${links.linkedin}` : 'Set your LinkedIn URL'}
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </Button>
                    <Button variant="secondary" size="sm" onClick={downloadCV}>
                      <Download className="h-4 w-4" />
                      Download CV
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setLinksForm(links); setShowLinksModal(true); }}
                      title="Edit GitHub & LinkedIn URLs"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Featured Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Featured Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {items.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                  No projects yet. Click <strong>Add Project</strong> to showcase your work.
                </div>
              ) : items.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/[0.08] bg-secondary/40 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      {item.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      title="Remove project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs">
                    {item.projectLink && (
                      <a href={item.projectLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />Live
                      </a>
                    )}
                    {item.githubLink && (
                      <a href={item.githubLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <Github className="h-3.5 w-3.5" />Code
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Career Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Career Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              {CAREER_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => runCareerTool(tool.id)}
                    className="rounded-lg border border-white/[0.08] bg-secondary/40 p-3 text-left transition hover:border-primary/40 hover:bg-secondary/70 active:scale-95"
                  >
                    <Icon className="mb-2 h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-white">{tool.label}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{tool.desc}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Skills Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {skills.map(([skill, value]) => (
              <div key={skill}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{skill}</span>
                  <span className="font-semibold text-white">{value}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/35">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Social Links Modal ── */}
      {showLinksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Edit Social Links</h2>
              <button onClick={() => setShowLinksModal(false)} className="rounded-md p-1 text-muted-foreground hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">GitHub URL or Username</label>
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    placeholder="https://github.com/yourusername"
                    value={linksForm.github}
                    onChange={(e) => setLinksForm({ ...linksForm, github: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">LinkedIn URL or Username</label>
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    placeholder="https://linkedin.com/in/yourusername"
                    value={linksForm.linkedin}
                    onChange={(e) => setLinksForm({ ...linksForm, linkedin: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button onClick={saveLinks} className="flex-1">Save Links</Button>
              <Button variant="secondary" onClick={() => setShowLinksModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Career Tool Output Modal ── */}
      {activeTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#111827] shadow-2xl" style={{ maxHeight: '85vh' }}>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-white">
                  {CAREER_TOOLS.find((t) => t.id === activeTool)?.label}
                </h2>
              </div>
              <button onClick={() => { setActiveTool(null); setToolOutput(''); }} className="rounded-md p-1 text-muted-foreground hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {toolLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating your career content…</p>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-200 font-sans">{toolOutput}</pre>
              )}
            </div>

            {/* Footer */}
            {!toolLoading && toolOutput && (
              <div className="shrink-0 border-t border-white/10 px-6 py-4 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([toolOutput], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${CAREER_TOOLS.find((t) => t.id === activeTool)?.label.replace(/\s+/g, '_')}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-4 w-4" />Download
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigator.clipboard?.writeText(toolOutput)}
                >
                  Copy Text
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
