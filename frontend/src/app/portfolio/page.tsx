'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/utils';
import {
  parseDocument,
  serializeToHtml,
  serializeToMarkdown,
  serializeToPlainText,
  escapeHtml,
  type DocBlock,
} from '@/lib/careerDocument';
import { CareerDocumentEditor } from '@/components/portfolio/CareerDocumentEditor';
import Link from 'next/link';
import {
  Briefcase,
  Download,
  ExternalLink,
  Github,
  Linkedin,
  Plus,
  Trash2,
  X,
  Loader2,
  FileText,
  Sparkles,
  Copy,
  Check,
  Printer,
  Search,
  ArrowRight,
  Award,
  Layers,
  CheckCircle2,
  AlertCircle,
  Code2,
  GraduationCap,
  Calendar,
  Building,
  MapPin,
  RefreshCw,
  Pencil,
} from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  projectLink: string | null;
  githubLink: string | null;
}

interface HubSkillSignal {
  id: string;
  name: string;
  completedLessons: number;
  totalLessons: number;
  percent: number;
}

interface ManualSkillSignal {
  id: string;
  name: string;
  level: number;
  category?: string;
}

interface ProfileSignalsResponse {
  profile?: {
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    headline?: string | null;
    about?: string | null;
    location?: string | null;
    targetRole?: string | null;
  };
  hubSkills?: HubSkillSignal[];
  manualSkills?: ManualSkillSignal[];
  interviewScores?: Record<string, number>;
  bestInterviewScores?: Array<{ topic: string; bestScore: number; attempts: number }>;
  featuredProjects?: {
    id: string;
    title: string;
    description: string;
    projectLink?: string;
    githubLink?: string;
  }[];
  joinedProjects?: {
    id: string;
    title: string;
    role: string;
    status: string;
    category?: string;
  }[];
  githubRepos?: {
    name: string;
    description?: string;
    language?: string;
    stars?: number;
    url?: string;
  }[];
}

interface JobListing {
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

interface JobsResponse {
  role: string;
  location: string;
  configured: boolean;
  source: string;
  jobs: JobListing[];
  searchLinks: {
    linkedin: string;
    indeed: string;
    googleJobs: string;
  };
}

const SKILLS_KEY = 'synergysphere.portfolio.skills';
const LINKS_KEY = 'synergysphere.portfolio.links';
const DOCS_KEY = 'synergysphere.portfolio.documents';

const CAREER_TOOLS = [
  {
    id: 'resume',
    label: 'Resume Builder',
    icon: FileText,
    desc: 'Generate an ATS-optimized, modern 1-page software engineer resume from verified work',
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
    desc: 'Real-time job matching, salary ranges, missing skill analysis & 1-click apply',
    badge: 'Live Matches',
  },
] as const;

type ToolId = typeof CAREER_TOOLS[number]['id'];

const docKeyFor = (tool: ToolId, role: string) => `${tool}_${role}`;

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

  // Profile signals from backend
  const [signals, setSignals] = useState<ProfileSignalsResponse | null>(null);
  const [signalsLoading, setSignalsLoading] = useState(true);

  // Social links
  const [links, setLinks] = useState({ github: '', linkedin: '' });
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [linksForm, setLinksForm] = useState({ github: '', linkedin: '', headline: '', about: '' });

  // Skills
  const [hubSkills, setHubSkills] = useState<HubSkillSignal[]>([]);
  const [manualSkills, setManualSkills] = useState<ManualSkillSignal[]>([]);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(80);

  // Career Tools
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [targetRole, setTargetRole] = useState(PRESET_ROLES[0]);
  const [docs, setDocs] = useState<Record<string, DocBlock[]>>({});
  const [editedKeys, setEditedKeys] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(true);
  const [toolError, setToolError] = useState('');
  const [toolLoading, setToolLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [docsHydrated, setDocsHydrated] = useState(false);

  // Restore documents the user edited on a previous visit
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DOCS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, DocBlock[]>;
        if (saved && typeof saved === 'object') {
          setDocs(saved);
          setEditedKeys(Object.keys(saved));
        }
      }
    } catch {
      localStorage.removeItem(DOCS_KEY);
    } finally {
      setDocsHydrated(true);
    }
  }, []);

  // Persist only edited documents; generated ones can always be regenerated
  useEffect(() => {
    if (!docsHydrated) return;
    try {
      const edited: Record<string, DocBlock[]> = {};
      editedKeys.forEach((key) => {
        if (docs[key]) edited[key] = docs[key];
      });
      if (Object.keys(edited).length > 0) {
        localStorage.setItem(DOCS_KEY, JSON.stringify(edited));
      } else {
        localStorage.removeItem(DOCS_KEY);
      }
    } catch {
      // Storage may be full or unavailable; edits still live in memory for this session
    }
  }, [docs, editedKeys, docsHydrated]);

  // Jobs tool state
  const [jobsData, setJobsData] = useState<JobsResponse | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);

  const fullName = `${user?.firstName ?? 'Student'} ${user?.lastName ?? 'Developer'}`;

  // Combined active skills for tools
  const effectiveSkills = useMemo<[string, number][]>(() => {
    const list: [string, number][] = [];
    hubSkills.filter((s) => s.percent > 0).forEach((s) => list.push([s.name, s.percent]));
    manualSkills.forEach((s) => list.push([s.name, s.level]));
    return list;
  }, [hubSkills, manualSkills]);

  const skillsSummary = useMemo(() => {
    if (effectiveSkills.length === 0) return 'In Progress (Learning Hub)';
    return effectiveSkills.map(([name, pct]) => `${name} (${pct}%)`).join(', ');
  }, [effectiveSkills]);

  // Load portfolio items
  useEffect(() => {
    api<PortfolioItem[]>('/portfolio')
      .then(setItems)
      .catch(() => setError('Could not load portfolio items from backend.'));
  }, []);

  // Load real profile signals from Learning Hub, DB, and GitHub
  const fetchProfileSignals = async () => {
    setSignalsLoading(true);
    try {
      const data = await api<ProfileSignalsResponse>('/portfolio/profile-signals');
      setSignals(data);
      if (data.hubSkills) setHubSkills(data.hubSkills);
      if (data.manualSkills) setManualSkills(data.manualSkills);

      const gh = data.profile?.githubUrl || '';
      const li = data.profile?.linkedinUrl || '';
      setLinks({ github: gh, linkedin: li });
      setLinksForm({
        github: gh,
        linkedin: li,
        headline: data.profile?.headline || '',
        about: data.profile?.about || '',
      });

      if (data.profile?.targetRole) {
        setTargetRole(data.profile.targetRole);
      }
    } catch {
      // Fallback to localStorage if offline
      try {
        const savedLinks = localStorage.getItem(LINKS_KEY);
        if (savedLinks) {
          const parsed = JSON.parse(savedLinks);
          setLinks(parsed);
          setLinksForm((prev) => ({ ...prev, ...parsed }));
        }
        const savedSkills = localStorage.getItem(SKILLS_KEY);
        if (savedSkills) {
          const parsed = JSON.parse(savedSkills);
          if (Array.isArray(parsed)) {
            setManualSkills(parsed.map(([name, level]: [string, number], idx: number) => ({ id: `local-${idx}`, name, level })));
          }
        }
      } catch {
        // ignore
      }
    } finally {
      setSignalsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileSignals();
  }, []);

  function copyText(key: string, text: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    }
  }

  async function saveLinks() {
    try {
      localStorage.setItem(LINKS_KEY, JSON.stringify({ github: linksForm.github, linkedin: linksForm.linkedin }));
      setLinks({ github: linksForm.github, linkedin: linksForm.linkedin });

      // Save to backend database
      await api('/portfolio/profile', {
        method: 'PUT',
        body: JSON.stringify({
          githubUrl: linksForm.github,
          linkedinUrl: linksForm.linkedin,
          headline: linksForm.headline,
          about: linksForm.about,
          targetRole,
        }),
      });
      setShowLinksModal(false);
      fetchProfileSignals();
    } catch {
      setShowLinksModal(false);
    }
  }

  async function saveSkill() {
    if (!newSkillName.trim()) return;
    try {
      const added = await api<ManualSkillSignal>('/portfolio/skills', {
        method: 'POST',
        body: JSON.stringify({
          name: newSkillName.trim(),
          level: newSkillLevel,
          category: 'Manual',
        }),
      });
      setManualSkills((prev) => [...prev.filter((s) => s.name.toLowerCase() !== added.name.toLowerCase()), added]);
    } catch {
      // Optimistic local fallback
      const fallback: ManualSkillSignal = {
        id: `local-${Date.now()}`,
        name: newSkillName.trim(),
        level: newSkillLevel,
      };
      setManualSkills((prev) => [...prev.filter((s) => s.name.toLowerCase() !== fallback.name.toLowerCase()), fallback]);
    }
    setNewSkillName('');
    setShowSkillModal(false);
  }

  async function removeSkill(id: string) {
    setManualSkills((prev) => prev.filter((s) => s.id !== id));
    try {
      await api(`/portfolio/skills/${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  }

  function openGitHub() {
    if (links.github) {
      window.open(links.github.startsWith('http') ? links.github : `https://github.com/${links.github}`, '_blank');
    } else {
      setLinksForm((prev) => ({ ...prev, github: links.github, linkedin: links.linkedin }));
      setShowLinksModal(true);
    }
  }

  function openLinkedIn() {
    if (links.linkedin) {
      window.open(links.linkedin.startsWith('http') ? links.linkedin : `https://linkedin.com/in/${links.linkedin}`, '_blank');
    } else {
      setLinksForm((prev) => ({ ...prev, github: links.github, linkedin: links.linkedin }));
      setShowLinksModal(true);
    }
  }

  // Load jobs recommendation
  async function loadJobs(role = targetRole) {
    setJobsLoading(true);
    try {
      const data = await api<JobsResponse>(`/portfolio/jobs?role=${encodeURIComponent(role)}`);
      setJobsData(data);
    } catch (err) {
      console.warn('Jobs fetch error:', err);
    } finally {
      setJobsLoading(false);
    }
  }

  // Run or refresh career tool. Cached documents are reused unless `force` is set so
  // switching tabs never discards the user's edits.
  async function runCareerTool(toolId: ToolId, role = targetRole, force = false) {
    setActiveTool(toolId);
    setToolError('');
    setIsEditing(toolId !== 'jobs');

    if (toolId === 'jobs') {
      await loadJobs(role);
      return;
    }

    const key = docKeyFor(toolId, role);
    if (!force && docs[key]) return;
    if (force && editedKeys.includes(key) && !window.confirm('Regenerating will replace your edits to this document. Continue?')) {
      return;
    }

    setToolLoading(true);
    try {
      const res = await api<{ content: string; tool: string; targetRole: string }>('/portfolio/career-tools', {
        method: 'POST',
        body: JSON.stringify({
          tool: toolId,
          targetRole: role,
          skills: effectiveSkills,
        }),
      });

      if (res?.content) {
        setDocs((prev) => ({ ...prev, [key]: parseDocument(res.content) }));
        setEditedKeys((prev) => prev.filter((k) => k !== key));
      } else {
        setToolError('The generator returned an empty document. Please try Regenerate.');
      }
    } catch (err) {
      console.warn('Career-tools request failed:', err);
      setToolError('Could not generate this document right now. Check your connection and click Regenerate.');
    } finally {
      setToolLoading(false);
    }
  }

  const currentDocKey = activeTool ? docKeyFor(activeTool, targetRole) : '';
  const currentBlocks = useMemo<DocBlock[]>(() => docs[currentDocKey] ?? [], [docs, currentDocKey]);
  const isDocEdited = editedKeys.includes(currentDocKey);

  function updateBlocks(blocks: DocBlock[]) {
    if (!currentDocKey) return;
    setDocs((prev) => ({ ...prev, [currentDocKey]: blocks }));
    setEditedKeys((prev) => (prev.includes(currentDocKey) ? prev : [...prev, currentDocKey]));
  }

  function documentTitle() {
    const label = CAREER_TOOLS.find((t) => t.id === activeTool)?.label ?? 'Document';
    return `${label} - ${fullName}`;
  }

  function printDocument() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setToolError('Your browser blocked the print window. Allow pop-ups for this site and try again.');
      return;
    }
    printWindow.document.write(serializeToHtml(currentBlocks, documentTitle()));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }

  function downloadMarkdown() {
    const blob = new Blob([serializeToMarkdown(currentBlocks)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fullName.replace(/\s+/g, '_')}_${activeTool}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Download CV document
  function downloadCV() {
    const skillsHtml = effectiveSkills
      .map(([s, v]) => `<li><strong>${escapeHtml(s)}</strong>: ${v}% proficiency</li>`)
      .join('');
    const projectsHtml = items.length
      ? items
          .map(
            (p) => `
        <div style="margin-bottom:18px;border-left:3px solid #91db5e;padding-left:12px;">
          <h4 style="margin:0 0 4px 0;font-size:16px;">${escapeHtml(p.title)}</h4>
          ${p.description ? `<p style="margin:2px 0 6px 0;color:#4b5563;font-size:14px;">${escapeHtml(p.description)}</p>` : ''}
          <div style="font-size:12px;color:#2563eb;">
            ${p.projectLink ? `<a href="${escapeHtml(p.projectLink)}" style="margin-right:12px;">Live Project</a>` : ''}
            ${p.githubLink ? `<a href="${escapeHtml(p.githubLink)}">GitHub Repository</a>` : ''}
          </div>
        </div>`
          )
          .join('')
      : '<p style="color:#6b7280;font-style:italic;">No featured projects added yet.</p>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(fullName)} — Curriculum Vitae</title>
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
  <h1>${escapeHtml(fullName)}</h1>
  <div class="subtitle">Software Engineer · Backend &amp; Full-Stack Developer</div>
  <div class="contact">
    ${user?.email ? `Email: ${escapeHtml(user.email)}` : ''}
    ${links.github ? ` · GitHub: <a href="${escapeHtml(links.github)}">${escapeHtml(links.github)}</a>` : ''}
    ${links.linkedin ? ` · LinkedIn: <a href="${escapeHtml(links.linkedin)}">${escapeHtml(links.linkedin)}</a>` : ''}
  </div>

  <div class="section-title">Professional Summary</div>
  <p style="font-size: 14px; color: #374151;">
    Passionate software developer proficient in <strong>${escapeHtml(skillsSummary)}</strong>. Experienced in designing scalable backend systems, normalized relational databases, and modern web architectures. Strong collaborator dedicated to clean code, robust API design, and continuous learning.
  </p>

  <div class="section-title">Technical Proficiencies</div>
  <ul>${skillsHtml}</ul>

  <div class="section-title">Featured Software Projects</div>
  ${projectsHtml}

  <div class="section-title">Education &amp; Verified SynergySphere Credentials</div>
  <p style="font-size: 14px; margin: 0 0 4px 0;"><strong>SynergySphere Verified Learning Hub Track Completions</strong></p>
  <p style="font-size: 13px; color: #6b7280; margin: 0;">Developer Level ${user?.level ?? 1} (${user?.xp ?? 0} Contribution XP)</p>
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

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    try {
      const newItem = await api<PortfolioItem>('/portfolio', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setItems((prev) => [newItem, ...prev]);
      setForm({ title: '', description: '', projectLink: '', githubLink: '' });
      setShowForm(false);
    } catch {
      setError('Could not create portfolio item.');
    }
  }

  async function removeItem(id: string) {
    try {
      await api(`/portfolio/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Could not remove portfolio item.');
    }
  }

  if (user?.role === 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-950/20 p-8 shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-400">
              <Briefcase className="h-8 w-8" />
            </div>
            <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold tracking-wider text-red-400">
              ADMIN ACCOUNT DETECTED
            </span>
            <h2 className="mt-4 text-xl font-bold text-white">Career Portfolio Restricted</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Career Portfolio and Career Studio tools are exclusively available for students to build ATS resumes and showcase verified credentials. Admin accounts cannot use career portfolio tools.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link href="/admin">
                <Button className="bg-primary font-bold text-black hover:bg-primary/90">
                  Open Admin Portal
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="border-white/10 text-white">
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Hero */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Production Portfolio</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">{fullName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Level {user?.level ?? 1} · {user?.xp ?? 0} XP · Verified skills computed directly from Learning Hub progress
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {effectiveSkills.slice(0, 6).map(([sName, sLevel]) => (
                <span
                  key={sName}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary shadow-sm"
                >
                  <Sparkles className="h-3 w-3" />
                  {sName} · {sLevel}%
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openGitHub}
              className={`border-white/10 ${links.github ? 'text-primary border-primary/40' : 'text-muted-foreground'}`}
            >
              <Github className="mr-1.5 h-4 w-4" />
              {links.github ? 'GitHub Connected' : 'Connect GitHub'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openLinkedIn}
              className={`border-white/10 ${links.linkedin ? 'text-[#38bdf8] border-[#0077b5]/40' : 'text-muted-foreground'}`}
            >
              <Linkedin className="mr-1.5 h-4 w-4" />
              {links.linkedin ? 'LinkedIn Added' : 'Add LinkedIn'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLinksModal(true)}
              className="border-white/10 text-white"
            >
              Edit Links
            </Button>
            <Button size="sm" onClick={downloadCV}>
              <Download className="mr-1.5 h-4 w-4" />
              Download CV
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Main Grid: Projects & Career Tools on Left, Skills on Right */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Featured Projects Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Featured Projects</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Showcase software engineering builds, IoT dashboards, and GitHub repositories
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-primary text-black hover:bg-primary/90 font-semibold"
                    onClick={() => setShowForm(!showForm)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {showForm ? 'Cancel' : 'Add Project'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showForm && (
                  <form onSubmit={handleAddProject} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-white">Add Featured Project</h3>
                    <Input
                      placeholder="Project Title (e.g. EcoBin IoT Telemetry Gateway)"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                    <Input
                      placeholder="Brief Description & Tech Stack (e.g. Node.js, TimescaleDB, MQTT)"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Live URL (https://...)"
                        value={form.projectLink}
                        onChange={(e) => setForm({ ...form, projectLink: e.target.value })}
                      />
                      <Input
                        placeholder="GitHub URL (https://github.com/...)"
                        value={form.githubLink}
                        onChange={(e) => setForm({ ...form, githubLink: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" className="bg-primary text-black hover:bg-primary/90">
                        Save Project
                      </Button>
                    </div>
                  </form>
                )}

                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                    <Code2 className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-semibold text-white">No featured projects yet</p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                      Add a project or connect your GitHub profile to showcase software engineering repositories on your generated resume.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-primary/30 text-primary"
                      onClick={() => setShowForm(true)}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add First Project
                    </Button>
                  </div>
                ) : (
                  items.map((item) => (
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
                  ))
                )}
              </CardContent>
            </Card>

            {/* Career Tools Section */}
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Career Studio
                  </CardTitle>
                  <span className="text-xs text-primary font-medium">Real-data generation</span>
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

          {/* Skills Sidebar: Real Learning Hub Progress + Verified Database Skills */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-1.5 text-base">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Hub Verified Skills
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Live from Learning Hub curriculum</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary hover:text-primary"
                    onClick={() => setShowSkillModal(true)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Custom
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {signalsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Learning Hub Verified Progress */}
                    {hubSkills.filter((s) => s.completedLessons > 0).length > 0 ? (
                      <div className="space-y-3.5">
                        {hubSkills
                          .filter((s) => s.completedLessons > 0)
                          .map((skill) => (
                            <div key={skill.id} className="group">
                              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs min-w-0">
                                <span className="font-medium text-white flex items-center gap-1.5 min-w-0 max-w-[62%] truncate" title={skill.name}>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span className="truncate">{skill.name}</span>
                                </span>
                                <div className="flex items-center gap-2 text-muted-foreground shrink-0 ml-auto">
                                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                                    {skill.completedLessons}/{skill.totalLessons}
                                  </span>
                                  <span className="font-semibold text-primary">{skill.percent}%</span>
                                </div>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-300"
                                  style={{ width: `${Math.max(5, skill.percent)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-white/10 p-4 text-center">
                        <p className="text-xs text-muted-foreground">No completed Learning Hub lessons yet.</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Complete tracks to unlock verified skill bars.</p>
                        <Link href="/curriculum">
                          <Button variant="outline" size="sm" className="mt-3 text-xs border-primary/30 text-primary h-7">
                            Explore Curriculum
                          </Button>
                        </Link>
                      </div>
                    )}

                    {/* Manual / Supplementary Skills */}
                    {manualSkills.length > 0 && (
                      <div className="pt-3 border-t border-white/10 space-y-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Custom &amp; Additional Skills
                        </div>
                        {manualSkills.map((s) => (
                          <div key={s.id} className="group">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground group-hover:text-white transition">{s.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{s.level}%</span>
                                <button
                                  onClick={() => removeSkill(s.id)}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                                  title="Remove skill"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                              <div className="h-full rounded-full bg-primary/70" style={{ width: `${s.level}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {signals && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Verified Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Developer Tier</span>
                    <span className="text-white font-medium">Level {user?.level ?? 1}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>SynergySphere XP</span>
                    <span className="text-primary font-bold">{user?.xp ?? 0} XP</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Community Projects Joined</span>
                    <span className="text-white font-medium">{signals.joinedProjects?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Interview Best Score</span>
                    <span className="text-white font-medium">
                      {(() => {
                        if (signals.bestInterviewScores && signals.bestInterviewScores.length > 0) {
                          const maxScore = Math.max(...signals.bestInterviewScores.map((s) => s.bestScore));
                          return maxScore > 0 ? `${maxScore}%` : 'None yet';
                        }
                        if (signals.interviewScores && Object.keys(signals.interviewScores).length > 0) {
                          const maxScore = Math.max(...Object.values(signals.interviewScores));
                          return maxScore > 0 ? `${maxScore}%` : 'None yet';
                        }
                        return 'None yet';
                      })()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ── Social Links Modal ── */}
        {showLinksModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Profile &amp; Career Links</h2>
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
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Headline (Optional)</label>
                  <Input
                    placeholder="e.g. Junior Backend Engineer (Java / SQL)"
                    value={linksForm.headline}
                    onChange={(e) => setLinksForm({ ...linksForm, headline: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button onClick={saveLinks} className="flex-1 bg-primary text-black hover:bg-primary/90 font-semibold">Save to Profile</Button>
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
                <h2 className="text-lg font-bold text-white">Add Custom Skill</h2>
                <button onClick={() => setShowSkillModal(false)} className="rounded-md p-1 text-muted-foreground hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skill Name</label>
                  <Input
                    placeholder="e.g. Docker, AWS, PostgreSQL, Redis"
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
                <Button onClick={saveSkill} className="flex-1 bg-primary text-black hover:bg-primary/90 font-semibold">Save Skill</Button>
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
                      <p className="text-xs text-muted-foreground">Tailored for {fullName}</p>
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
              <div className="border-b border-white/10 bg-[#161f30] px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-muted-foreground">Target Role:</span>
                  <select
                    value={targetRole}
                    onChange={(e) => {
                      setTargetRole(e.target.value);
                      runCareerTool(activeTool, e.target.value);
                    }}
                    className="rounded-md border border-white/10 bg-[#0d131f] px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {PRESET_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary hover:text-primary"
                    onClick={() => runCareerTool(activeTool, targetRole, true)}
                    disabled={toolLoading || jobsLoading}
                  >
                    <RefreshCw className={`mr-1.5 h-3 w-3 ${(toolLoading || jobsLoading) ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
              </div>

              {/* Main Content Body */}
              <div className="flex-1 overflow-y-auto p-5 md:p-7">
                {toolLoading || jobsLoading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                    <div className="relative">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Generating {CAREER_TOOLS.find((t) => t.id === activeTool)?.label}…</p>
                      <p className="text-xs text-muted-foreground mt-1">Grounding in verified Learning Hub completions and projects</p>
                    </div>
                  </div>
                ) : activeTool === 'jobs' ? (
                  /* ── Real Job Recommendations View ── */
                  <div className="space-y-5">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Live Job Match Intelligence for {fullName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Evaluated against your verified competencies: <strong className="text-white">{skillsSummary}</strong>.
                      </p>
                    </div>

                    {!jobsData?.configured && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                        <div className="flex items-center gap-2 font-semibold text-white mb-1">
                          <AlertCircle className="h-4 w-4 text-amber-400" />
                          Live Job Aggregator Notice (Adzuna API)
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          To stream live real-time job listings from the market, configure <code className="text-amber-300">ADZUNA_APP_ID</code> and <code className="text-amber-300">ADZUNA_APP_KEY</code> in <code className="text-white">backend/.env</code>.
                          In the meantime, click any tailored search link below to query live hiring boards directly with your exact skills!
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {jobsData?.searchLinks && (
                            <>
                              <a
                                href={jobsData.searchLinks.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded bg-[#0077b5]/30 hover:bg-[#0077b5]/50 px-2.5 py-1 text-xs font-semibold text-sky-300"
                              >
                                <Linkedin className="h-3.5 w-3.5" />
                                Search LinkedIn Jobs
                              </a>
                              <a
                                href={jobsData.searchLinks.indeed}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                <Search className="h-3.5 w-3.5" />
                                Search Indeed
                              </a>
                              <a
                                href={jobsData.searchLinks.googleJobs}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Google Jobs
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {jobsData && jobsData.jobs.length > 0 && (
                      <div className="grid gap-4 md:grid-cols-2">
                        {jobsData.jobs.map((job) => (
                          <div key={job.id} className="rounded-xl border border-white/10 bg-[#161f30] p-4 flex flex-col justify-between hover:border-primary/40 transition">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <h4 className="text-sm font-bold text-white">{job.title}</h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span className="flex items-center gap-1"><Building className="h-3 w-3" />{job.company}</span>
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                  {job.matchPercent}% Match
                                </span>
                              </div>

                              <div className="my-3 space-y-1.5 text-xs">
                                {job.matchingSkills.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">Matching:</span>
                                    {job.matchingSkills.map((s) => (
                                      <span key={s} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                        ✓ {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {job.missingSkills.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">Next:</span>
                                    {job.missingSkills.map((s) => (
                                      <span key={s} className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                                        + {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {job.salary && (
                                <div className="text-xs font-semibold text-white/90 mb-3">
                                  Salary: <span className="text-primary">{job.salary}</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(job.postedAt).toLocaleDateString()}
                              </span>
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded bg-primary text-black font-semibold px-3 py-1 text-xs hover:bg-primary/90 transition"
                              >
                                View / Apply
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Editable Resume / CV / LinkedIn Document ── */
                  <div className="space-y-4">
                    {toolError && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        <span>{toolError}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-2">
                        {activeTool === 'linkedin'
                          ? 'Tailored LinkedIn profile kit'
                          : 'ATS-friendly document grounded in your verified Hub data'}
                        {isDocEdited && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Edited · saved on this device
                          </span>
                        )}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant={isEditing ? 'default' : 'secondary'}
                          className="h-7 text-xs"
                          onClick={() => setIsEditing((prev) => !prev)}
                          disabled={currentBlocks.length === 0 && !isEditing}
                        >
                          {isEditing ? <Check className="mr-1.5 h-3 w-3" /> : <Pencil className="mr-1.5 h-3 w-3" />}
                          {isEditing ? 'Done Editing' : 'Edit'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={() => copyText('doc', serializeToPlainText(currentBlocks))}
                          disabled={currentBlocks.length === 0}
                        >
                          {copiedKey === 'doc' ? <Check className="mr-1.5 h-3 w-3 text-primary" /> : <Copy className="mr-1.5 h-3 w-3" />}
                          {copiedKey === 'doc' ? 'Copied' : 'Copy'}
                        </Button>
                        {activeTool !== 'linkedin' && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs"
                              onClick={printDocument}
                              disabled={currentBlocks.length === 0}
                            >
                              <Printer className="mr-1.5 h-3 w-3" />
                              Print / PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs"
                              onClick={downloadMarkdown}
                              disabled={currentBlocks.length === 0}
                            >
                              <Download className="mr-1.5 h-3 w-3" />
                              Download .md
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                        Click any line to change its text. Press <kbd className="rounded bg-white/10 px-1">Enter</kbd> to add a new line below, use the controls on the right of each line to restyle, reorder or delete it, then click <strong className="text-white">Done Editing</strong>.
                      </p>
                    )}

                    <CareerDocumentEditor blocks={currentBlocks} editing={isEditing} onChange={updateBlocks} />

                    {activeTool === 'linkedin' && (
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#161f30] p-4">
                        <div>
                          <p className="text-sm font-bold text-white">Open LinkedIn</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Apply your tailored headlines and narrative directly to your profile.</p>
                        </div>
                        <Button onClick={openLinkedIn} size="sm" className="bg-[#0077b5] text-white hover:bg-[#0077b5]/90">
                          <Linkedin className="mr-1.5 h-4 w-4" />
                          Go to LinkedIn
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 bg-[#111827] px-5 py-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  Target: {targetRole}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setActiveTool(null)}
                >
                  Close Studio
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
