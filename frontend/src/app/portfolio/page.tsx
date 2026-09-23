'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Copy,
  Check,
  RefreshCw,
  Printer,
  Search,
  ArrowRight,
  Award,
  Layers,
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

const initialSkills: [string, number][] = [
  ['Java', 90],
  ['Spring Boot', 85],
  ['SQL', 80],
  ['JavaScript', 70],
  ['React', 60],
];

const CAREER_TOOLS = [
  {
    id: 'resume',
    label: 'Resume Builder',
    icon: FileText,
    desc: 'Generate an ATS-optimized, modern 1-page software engineer resume',
    badge: 'ATS Ready',
  },
  {
    id: 'cv',
    label: 'CV Generator',
    icon: Layers,
    desc: 'Create an in-depth academic & technical Curriculum Vitae',
    badge: 'Academic & Tech',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Optimizer',
    icon: Linkedin,
    desc: 'Optimized headlines, About narrative, and recruiter keyword tags',
    badge: 'Recruiter Ready',
  },
  {
    id: 'jobs',
    label: 'Job Recommendations',
    icon: Briefcase,
    desc: 'Matched job roles with salary estimates, missing skills & 1-click search',
    badge: 'Live Matches',
  },
] as const;

type ToolId = typeof CAREER_TOOLS[number]['id'];

const PRESET_ROLES = [
  'Junior Backend Developer (Java / Spring)',
  'Junior Full-Stack Software Engineer',
  'Junior Software Engineer (General)',
  'Backend API Engineer',
  'Junior React / Frontend Developer',
  'Junior Data / SQL Developer',
  'Software Engineering Intern',
];

export default function PortfolioPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', projectLink: '', githubLink: '' });
  const [error, setError] = useState('');

  // Social links
  const [links, setLinks] = useState({ github: '', linkedin: '' });
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [linksForm, setLinksForm] = useState({ github: '', linkedin: '' });

  // Skills
  const [skills, setSkills] = useState<[string, number][]>(initialSkills);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(75);

  // Career Tools
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [targetRole, setTargetRole] = useState(PRESET_ROLES[0]);
  const [toolOutputs, setToolOutputs] = useState<Record<string, string>>({});
  const [toolLoading, setToolLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customRoleInput, setCustomRoleInput] = useState('');

  const fullName = `${user?.firstName ?? 'Student'} ${user?.lastName ?? 'Developer'}`;
  const skillsSummary = useMemo(() => skills.map(([name, pct]) => `${name} (${pct}%)`).join(', '), [skills]);

  // Load portfolio items from backend
  useEffect(() => {
    api<PortfolioItem[]>('/portfolio')
      .then(setItems)
      .catch(() => setError('Could not load portfolio items from the backend.'));
  }, []);

  // Load persisted links and skills from localStorage
  useEffect(() => {
    try {
      const savedLinks = localStorage.getItem(LINKS_KEY);
      if (savedLinks) {
        const parsed = JSON.parse(savedLinks);
        setLinks(parsed);
        setLinksForm(parsed);
      }
      const savedSkills = localStorage.getItem(SKILLS_KEY);
      if (savedSkills) {
        setSkills(JSON.parse(savedSkills));
      }
    } catch {
      // ignore parsing errors
    }
  }, []);

  function copyText(key: string, text: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    }
  }

  function saveLinks() {
    localStorage.setItem(LINKS_KEY, JSON.stringify(linksForm));
    setLinks(linksForm);
    setShowLinksModal(false);
  }

  function saveSkill() {
    if (!newSkillName.trim()) return;
    const updated: [string, number][] = [
      ...skills.filter(([n]) => n.toLowerCase() !== newSkillName.trim().toLowerCase()),
      [newSkillName.trim(), Math.min(100, Math.max(10, Number(newSkillLevel) || 70))],
    ];
    setSkills(updated);
    localStorage.setItem(SKILLS_KEY, JSON.stringify(updated));
    setNewSkillName('');
    setShowSkillModal(false);
  }

  function removeSkill(skillToRemove: string) {
    const updated = skills.filter(([n]) => n !== skillToRemove);
    setSkills(updated);
    localStorage.setItem(SKILLS_KEY, JSON.stringify(updated));
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

  // Run or refresh career tool
  async function runCareerTool(toolId: ToolId, role = targetRole) {
    setActiveTool(toolId);
    setToolLoading(true);

    try {
      const res = await api<{ content: string; tool: string; targetRole: string }>('/portfolio/career-tools', {
        method: 'POST',
        body: JSON.stringify({
          tool: toolId,
          targetRole: role,
          skills,
        }),
      });

      if (res?.content) {
        setToolOutputs((prev) => ({ ...prev, [`${toolId}_${role}`]: res.content, [toolId]: res.content }));
      }
    } catch (err) {
      console.warn('Backend career-tools request fallback:', err);
    } finally {
      setToolLoading(false);
    }
  }

  // Active output for current tool
  const currentOutput = toolOutputs[`${activeTool}_${targetRole}`] || toolOutputs[activeTool ?? ''] || '';

  // Download CV document
  function downloadCV() {
    const skillsHtml = skills.map(([s, v]) => `<li><strong>${s}</strong>: ${v}% proficiency</li>`).join('');
    const projectsHtml = items.length
      ? items.map((p) => `
        <div style="margin-bottom:18px;border-left:3px solid #16a34a;padding-left:12px;">
          <h4 style="margin:0 0 4px 0;font-size:16px;">${p.title}</h4>
          ${p.description ? `<p style="margin:2px 0 6px 0;color:#4b5563;font-size:14px;">${p.description}</p>` : ''}
          <div style="font-size:12px;color:#2563eb;">
            ${p.projectLink ? `<a href="${p.projectLink}" style="margin-right:12px;">🔗 Live Project</a>` : ''}
            ${p.githubLink ? `<a href="${p.githubLink}">💻 GitHub Repository</a>` : ''}
          </div>
        </div>`).join('')
      : '<p style="color:#6b7280;font-style:italic;">No featured projects added yet.</p>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${fullName} — Curriculum Vitae</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 820px; margin: 40px auto; color: #1f2937; padding: 0 24px; line-height: 1.6; }
    h1 { font-size: 28px; margin: 0 0 4px 0; color: #111827; }
    .subtitle { font-size: 15px; color: #16a34a; font-weight: 600; margin-bottom: 8px; }
    .contact { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; margin-top: 24px; margin-bottom: 12px; color: #111827; }
    ul { padding-left: 20px; margin: 6px 0; }
    li { margin-bottom: 4px; font-size: 14px; }
    a { color: #2563eb; text-decoration: none; }
    @media print { body { margin: 15mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 13px; font-weight: 600;">Print-Ready Document</span>
    <button onclick="window.print()" style="background: #16a34a; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">Print / Save as PDF</button>
  </div>
  <h1>${fullName}</h1>
  <div class="subtitle">Software Engineer · Backend & Full-Stack Developer</div>
  <div class="contact">
    Email: ${user?.email ?? 'developer@example.com'}
    ${links.github ? ` · GitHub: <a href="${links.github}">${links.github}</a>` : ''}
    ${links.linkedin ? ` · LinkedIn: <a href="${links.linkedin}">${links.linkedin}</a>` : ''}
  </div>

  <div class="section-title">Professional Summary</div>
  <p style="font-size: 14px; color: #374151;">
    Passionate software developer proficient in <strong>${skillsSummary}</strong>. Experienced in designing scalable backend systems, normalized relational databases, and modern web architectures. Strong collaborator dedicated to clean code, robust API design, and continuous learning.
  </p>

  <div class="section-title">Technical Proficiencies</div>
  <ul>${skillsHtml}</ul>

  <div class="section-title">Featured Software Projects</div>
  ${projectsHtml}

  <div class="section-title">Education & Credentials</div>
  <p style="font-size: 14px; margin: 0 0 4px 0;"><strong>Bachelor of Science in Computer Science / Information Technology</strong></p>
  <p style="font-size: 13px; color: #6b7280; margin: 0;">SynergySphere Verified Developer · Level ${user?.level ?? 1} (${user?.xp ?? 285} Contribution XP)</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fullName.replace(/\s+/g, '_')}_CV.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // View public portfolio preview
  function viewPortfolio() {
    const skillsHtml = skills.map(([s, v]) => `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:4px;">
          <span>${s}</span><span>${v}%</span>
        </div>
        <div style="background:#1f2937;border-radius:999px;height:8px;overflow:hidden;">
          <div style="background:#10b981;width:${v}%;height:100%;border-radius:999px;"></div>
        </div>
      </div>`).join('');

    const projectsHtml = items.length
      ? items.map((p) => `
        <div style="background:#1f2937;border:1px solid #374151;border-radius:12px;padding:20px;margin-bottom:16px;">
          <h3 style="margin:0 0 8px 0;font-size:18px;color:#f9fafb;">${p.title}</h3>
          ${p.description ? `<p style="color:#9ca3af;font-size:14px;margin:0 0 14px 0;line-height:1.5;">${p.description}</p>` : ''}
          <div style="display:flex;gap:16px;">
            ${p.projectLink ? `<a href="${p.projectLink}" target="_blank" style="color:#10b981;font-size:13px;font-weight:600;text-decoration:none;">🔗 Live Demo</a>` : ''}
            ${p.githubLink ? `<a href="${p.githubLink}" target="_blank" style="color:#10b981;font-size:13px;font-weight:600;text-decoration:none;">💻 GitHub Source</a>` : ''}
          </div>
        </div>`).join('')
      : '<p style="color:#6b7280;text-align:center;padding:24px;">No projects added yet.</p>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${fullName} — Developer Portfolio</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    .hero { background: #1e293b; border-radius: 16px; padding: 32px; margin-bottom: 32px; border: 1px solid #334155; }
    .links a { display: inline-block; margin-right: 12px; color: #38bdf8; text-decoration: none; font-size: 14px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1 style="margin:0 0 6px 0;font-size:32px;">${fullName}</h1>
      <p style="color:#38bdf8;margin:0 0 12px 0;font-weight:600;">Student Developer · Backend &amp; Full-Stack</p>
      <p style="color:#94a3b8;font-size:15px;margin:0 0 18px 0;max-width:650px;line-height:1.6;">
        Passionate about building scalable backend systems, robust RESTful APIs, and solving real-world problems.
      </p>
      <div class="links">
        ${links.github ? `<a href="${links.github}" target="_blank">GitHub Profile</a>` : ''}
        ${links.linkedin ? `<a href="${links.linkedin}" target="_blank">LinkedIn Profile</a>` : ''}
        <a href="mailto:${user?.email ?? 'contact@example.com'}">Email Contact</a>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 320px;gap:24px;">
      <div>
        <h2 style="font-size:20px;border-bottom:2px solid #334155;padding-bottom:8px;margin-bottom:16px;">Featured Projects</h2>
        ${projectsHtml}
      </div>
      <div>
        <h2 style="font-size:20px;border-bottom:2px solid #334155;padding-bottom:8px;margin-bottom:16px;">Core Skills</h2>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;">
          ${skillsHtml}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
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
      {/* Page Header */}
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
        <Card className="mb-4 border-primary/30">
          <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
            <Input placeholder="Project title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Description (e.g. Spring Boot, PostgreSQL, JWT)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="Live project URL (optional)" value={form.projectLink} onChange={(e) => setForm({ ...form, projectLink: e.target.value })} />
            <Input placeholder="GitHub repo URL (optional)" value={form.githubLink} onChange={(e) => setForm({ ...form, githubLink: e.target.value })} />
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
                  <h2 className="text-xl font-bold text-white">{fullName}</h2>
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
                      title="Edit Social Profile Links"
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
                  No projects yet. Click <strong>Add Project</strong> above to showcase your work.
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

          {/* Career Tools Section */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Career Tools
                </CardTitle>
                <span className="text-xs text-primary font-medium">Click to open &amp; customize</span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {CAREER_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => runCareerTool(tool.id)}
                    className="group relative flex flex-col justify-between rounded-xl border border-white/[0.08] bg-secondary/30 p-4 text-left transition hover:border-primary/50 hover:bg-secondary/60 active:scale-[0.98]"
                  >
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {tool.badge}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white group-hover:text-primary transition">{tool.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition">
                      <span>Launch Studio</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Skills Sidebar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Skills</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary hover:text-primary"
                onClick={() => setShowSkillModal(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Skill
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {skills.map(([skill, value]) => (
              <div key={skill} className="group">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground group-hover:text-white transition">{skill}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{value}%</span>
                    <button
                      onClick={() => removeSkill(skill)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                      title="Remove skill"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Social Links Modal ── */}
      {showLinksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Social &amp; Portfolio Links</h2>
              <button onClick={() => setShowLinksModal(false)} className="rounded-md p-1 text-muted-foreground hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">GitHub Profile or Username</label>
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    placeholder="https://github.com/username or username"
                    value={linksForm.github}
                    onChange={(e) => setLinksForm({ ...linksForm, github: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">LinkedIn Profile URL</label>
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    placeholder="https://linkedin.com/in/username"
                    value={linksForm.linkedin}
                    onChange={(e) => setLinksForm({ ...linksForm, linkedin: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button onClick={saveLinks} className="flex-1">Save Profile Links</Button>
              <Button variant="secondary" onClick={() => setShowLinksModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Skill Modal ── */}
      {showSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add / Update Skill</h2>
              <button onClick={() => setShowSkillModal(false)} className="rounded-md p-1 text-muted-foreground hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skill Name</label>
                <Input
                  placeholder="e.g. Docker, Python, AWS, PostgreSQL"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Proficiency Level</span>
                  <span className="text-primary">{newSkillLevel}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(Number(e.target.value))}
                  className="w-full accent-[#91db5e]"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button onClick={saveSkill} className="flex-1">Add Skill</Button>
              <Button variant="secondary" onClick={() => setShowSkillModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Career Studio Modal ── */}
      {activeTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6">
          <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-[#0d131f] shadow-2xl overflow-hidden">

            {/* Studio Top Navigation & Tabs */}
            <div className="border-b border-white/10 bg-[#111827] px-5 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Career Development Studio</h2>
                    <p className="text-xs text-muted-foreground">Personalized for {fullName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTool(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tool Switcher Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {CAREER_TOOLS.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTool === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => runCareerTool(t.id, targetRole)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
                        isActive
                          ? 'bg-primary text-black shadow-sm'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Role Selector Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0f172a] px-5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Role:</span>
                <select
                  value={targetRole}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setTargetRole(newRole);
                    if (activeTool) runCareerTool(activeTool, newRole);
                  }}
                  className="rounded-lg border border-white/15 bg-[#1e293b] px-3 py-1.5 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {PRESET_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  onClick={() => activeTool && runCareerTool(activeTool, targetRole)}
                  disabled={toolLoading}
                >
                  <RefreshCw className={`mr-1.5 h-3 w-3 ${toolLoading ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                {currentOutput && (
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => copyText('full_output', currentOutput)}
                  >
                    {copiedKey === 'full_output' ? (
                      <>
                        <Check className="mr-1.5 h-3 w-3 text-black" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-3 w-3" />
                        Copy All
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Main Content Body */}
            <div className="flex-1 overflow-y-auto p-5 md:p-7">
              {toolLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Generating {CAREER_TOOLS.find((t) => t.id === activeTool)?.label}…</p>
                    <p className="text-xs text-muted-foreground mt-1">Analyzing your {skills.length} skills and {items.length} projects for {targetRole}</p>
                  </div>
                </div>
              ) : activeTool === 'jobs' ? (
                /* ── Interactive Job Recommendations View ── */
                <div className="space-y-5">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Job Match Intelligence for {fullName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Matched directly against your profile competencies: <strong className="text-white">{skillsSummary}</strong>.
                      Click any role below to launch live search queries on hiring boards.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      {
                        title: 'Junior Java / Spring Boot Developer',
                        match: 96,
                        salary: '$68,000 – $88,000',
                        desc: 'Building and maintaining enterprise microservices, transactional APIs, and database-backed services.',
                        matchingSkills: ['Java', 'Spring Boot', 'SQL', 'REST APIs'],
                        nextSkills: ['Docker', 'Kafka', 'JUnit Mockito'],
                        searchQuery: 'Junior Java Spring Boot Developer',
                      },
                      {
                        title: 'Graduate Full-Stack Engineer',
                        match: 92,
                        salary: '$65,000 – $85,000',
                        desc: 'End-to-end feature delivery spanning React client interfaces and Java/Node server endpoints.',
                        matchingSkills: ['React', 'JavaScript', 'SQL', 'Git'],
                        nextSkills: ['TypeScript', 'Next.js', 'GitHub Actions'],
                        searchQuery: 'Graduate Full Stack Software Engineer',
                      },
                      {
                        title: 'Backend API Engineer',
                        match: 89,
                        salary: '$70,000 – $90,000',
                        desc: 'Architecting high-throughput REST APIs, query optimization, authentication, and data modeling.',
                        matchingSkills: ['SQL', 'Database Design', 'Spring Boot'],
                        nextSkills: ['Redis Caching', 'PostgreSQL Tuning', 'AWS'],
                        searchQuery: 'Junior Backend API Engineer',
                      },
                      {
                        title: 'Junior SQL / Database Developer',
                        match: 84,
                        salary: '$60,000 – $78,000',
                        desc: 'Writing optimized SQL queries, database indexing, reporting pipelines, and schema migrations.',
                        matchingSkills: ['SQL', 'Relational Schema Design', 'Database Joins'],
                        nextSkills: ['Python ETL', 'PostgreSQL Stored Procs'],
                        searchQuery: 'Junior SQL Database Developer',
                      },
                      {
                        title: 'Software Engineering Intern',
                        match: 98,
                        salary: '$28 – $38 / hour',
                        desc: 'Accelerated entry-level program with high full-time conversion. Verified project work provides immediate advantage.',
                        matchingSkills: ['Algorithmic Logic', 'Java', 'React', 'Problem Solving'],
                        nextSkills: ['Agile Team Sprints', 'Code Review Practices'],
                        searchQuery: 'Software Engineering Intern Summer',
                      },
                      {
                        title: 'Junior React / Frontend Developer',
                        match: 78,
                        salary: '$58,000 – $76,000',
                        desc: 'Implementing responsive component hierarchies, state management, and modern client experiences.',
                        matchingSkills: ['React', 'JavaScript', 'HTML5/CSS3'],
                        nextSkills: ['Tailwind CSS', 'Redux/Zustand', 'Jest Testing'],
                        searchQuery: 'Junior React Frontend Developer',
                      },
                    ].map((job) => (
                      <div key={job.title} className="rounded-xl border border-white/10 bg-[#161f30] p-4 flex flex-col justify-between hover:border-primary/40 transition">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-sm font-bold text-white">{job.title}</h4>
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                              {job.match}% Match
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{job.desc}</p>

                          <div className="mb-3 space-y-1.5">
                            <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-white">Matching:</span>
                              {job.matchingSkills.map((s) => (
                                <span key={s} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                  ✓ {s}
                                </span>
                              ))}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-white">Next to learn:</span>
                              {job.nextSkills.map((s) => (
                                <span key={s} className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                                  + {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-white/90 mb-4">
                            Est. Salary: <span className="text-primary">{job.salary}</span>
                          </div>
                        </div>

                        {/* 1-Click Search Buttons */}
                        <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2">
                          <a
                            href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.searchQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-md bg-[#0077b5]/20 hover:bg-[#0077b5]/40 text-[#38bdf8] px-2.5 py-1 text-xs font-semibold transition"
                          >
                            <Linkedin className="h-3 w-3" />
                            LinkedIn Jobs
                          </a>
                          <a
                            href={`https://www.indeed.com/jobs?q=${encodeURIComponent(job.searchQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-md bg-white/5 hover:bg-white/15 text-white px-2.5 py-1 text-xs font-semibold transition"
                          >
                            <Search className="h-3 w-3" />
                            Indeed
                          </a>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(job.searchQuery + ' jobs')}&ibp=htl;jobs`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-md bg-white/5 hover:bg-white/15 text-white px-2.5 py-1 text-xs font-semibold transition"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Google Jobs
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTool === 'linkedin' ? (
                /* ── Interactive LinkedIn Optimizer View ── */
                <div className="space-y-6">
                  {/* Headline Variations */}
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-[#0077b5]" />
                      1. High-Converting LinkedIn Headlines
                    </h3>
                    <div className="space-y-2">
                      {[
                        {
                          type: 'Impact & Stack (Recruiter Favorite)',
                          text: `${fullName} | ${targetRole} | Java • Spring Boot • SQL • React | Building Scalable, High-Performance Software Solutions`,
                        },
                        {
                          type: 'Value Proposition & Architecture',
                          text: `Aspiring Software Engineer specializing in Robust Backend Systems, Clean Architecture & Modern Web Applications | Java & React Enthusiast`,
                        },
                        {
                          type: 'Student / Graduate Fast-Track',
                          text: `Computer Science Developer | Passionate about Backend APIs, Microservices & Data-Driven Platforms | Seeking Software Engineering Roles`,
                        },
                      ].map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-white/10 bg-[#161f30] p-3.5 flex items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{item.type}</span>
                            <p className="text-xs text-white mt-1 leading-relaxed">{item.text}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="shrink-0 h-8 text-xs"
                            onClick={() => copyText(`headline_${idx}`, item.text)}
                          >
                            {copiedKey === `headline_${idx}` ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                            <span className="ml-1.5">{copiedKey === `headline_${idx}` ? 'Copied' : 'Copy'}</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* About Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-white">2. High-Impact "About" Summary</h3>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        onClick={() => copyText('about_narrative', `Hello! I'm a software developer with a relentless curiosity for how scalable systems work behind the scenes.

My primary technical focus is backend engineering with Java and Spring Boot, complemented by deep hands-on experience in SQL databases, RESTful API design, and modern React interfaces. I believe that great software isn't just about making things work—it's about writing clean, maintainable, and well-tested code that solves genuine real-world problems.

What I Bring to the Table:
• Backend Architecture: Designing robust REST APIs, secure authentication (JWT), and modular business logic.
• Database Design: Crafting normalized PostgreSQL/MySQL schemas, indexing for performance, and managing complex queries.
• Full-Stack Fluency: Bridging frontend and backend seamlessly with React and modern web tooling.
• Growth Mindset: Constantly leveling up through technical challenges on SynergySphere, building side projects, and reading architecture case studies.

I am currently looking to connect with engineering leaders, technical recruiters, and fellow developers. Let's talk tech, collaborate on open-source, or explore software engineering roles!`)}
                      >
                        {copiedKey === 'about_narrative' ? <Check className="h-3 w-3 text-primary mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        {copiedKey === 'about_narrative' ? 'Copied!' : 'Copy About Story'}
                      </Button>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#161f30] p-4 text-xs text-gray-200 leading-relaxed space-y-3 font-sans">
                      <p>
                        Hello! I'm a software developer with a relentless curiosity for how scalable systems work behind the scenes.
                      </p>
                      <p>
                        My primary technical focus is backend engineering with <strong>Java and Spring Boot</strong>, complemented by deep hands-on experience in <strong>SQL databases, RESTful API design, and modern React interfaces</strong>. I believe that great software isn't just about making things work—it's about writing clean, maintainable, and well-tested code that solves genuine real-world problems.
                      </p>
                      <div>
                        <strong>What I Bring to the Table:</strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-300">
                          <li><strong>Backend Architecture:</strong> Designing robust REST APIs, secure authentication (JWT), and modular business logic.</li>
                          <li><strong>Database Design:</strong> Crafting normalized PostgreSQL/MySQL schemas, indexing for performance, and managing complex queries.</li>
                          <li><strong>Full-Stack Fluency:</strong> Bridging frontend and backend seamlessly with React and modern web tooling.</li>
                          <li><strong>Growth Mindset:</strong> Constantly leveling up through technical challenges on SynergySphere, building side projects, and reading architecture case studies.</li>
                        </ul>
                      </div>
                      <p className="text-muted-foreground pt-1">
                        I am currently looking to connect with engineering leaders, technical recruiters, and fellow developers. Let's talk tech, collaborate on open-source, or explore software engineering roles!
                      </p>
                    </div>
                  </div>

                  {/* Top Search Keywords */}
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2">3. Top 10 Recruiter Search Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Java',
                        'Spring Boot',
                        'REST APIs',
                        'PostgreSQL / SQL',
                        'React.js',
                        'Object-Oriented Programming (OOP)',
                        'Git & GitHub',
                        'Database Design',
                        'Software Development Life Cycle (SDLC)',
                        'Data Structures & Algorithms',
                      ].map((kw) => (
                        <button
                          key={kw}
                          onClick={() => copyText(`kw_${kw}`, kw)}
                          className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-black transition"
                          title="Click to copy"
                        >
                          {copiedKey === `kw_${kw}` ? '✓ Copied' : `+ ${kw}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action link */}
                  <div className="rounded-xl border border-white/10 bg-[#161f30] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Ready to update your LinkedIn?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Open your profile now and paste your tailored headlines and narrative.</p>
                    </div>
                    <Button onClick={openLinkedIn} size="sm">
                      <Linkedin className="mr-1.5 h-4 w-4" />
                      Go to LinkedIn
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Formatted Paper Preview (Resume / CV) ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Formatted Document Output</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>${activeTool === 'resume' ? 'Resume' : 'CV'} — ${fullName}</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; padding: 30px; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; }
                                    h1 { margin-bottom: 4px; font-size: 26px; }
                                    h2 { font-size: 15px; border-bottom: 2px solid #333; padding-bottom: 3px; margin-top: 22px; text-transform: uppercase; }
                                    h3 { font-size: 15px; margin: 12px 0 4px 0; }
                                    pre { white-space: pre-wrap; font-family: inherit; }
                                  </style>
                                </head>
                                <body>
                                  <pre>${currentOutput.replace(/#/g, '')}</pre>
                                  <script>window.print();</script>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }
                        }}
                      >
                        <Printer className="mr-1.5 h-3 w-3" />
                        Print / PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        onClick={() => {
                          const blob = new Blob([currentOutput], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${fullName.replace(/\s+/g, '_')}_${activeTool}.md`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="mr-1.5 h-3 w-3" />
                        Download .md
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#161f30] p-6 text-sm text-gray-100 font-sans leading-relaxed shadow-inner">
                    <pre className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-6 selection:bg-primary selection:text-black">
                      {currentOutput}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 bg-[#111827] px-5 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-primary" />
                Tailored for {targetRole}
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setActiveTool(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
