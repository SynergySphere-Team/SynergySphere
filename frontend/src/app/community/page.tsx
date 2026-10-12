'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommunityChat } from '@/components/community/CommunityChat';
import { api } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Filter,
  MapPin,
  Search,
  Trophy,
  Users,
  Plus,
  Github,
  Code2,
  CheckCircle2,
  X,
  ExternalLink,
  Layers,
  MessageSquare,
} from 'lucide-react';

interface Project {
  id: string;
  creatorId: string | null;
  title: string;
  category: string;
  location: string | null;
  organization: string;
  description: string;
  requirements: string | null;
  techStack?: string | null;
  teamCapacity?: number;
  deliverableType?: string | null;
  xpReward: number;
  githubOwner?: string | null;
  githubRepo?: string | null;
  githubFullName?: string | null;
  githubUrl?: string | null;
  githubStars?: number;
  isGithubBacked?: boolean;
  _count: { applications: number };
  hasApplied?: boolean;
  applicationStatus?: string | null;
  isCreator?: boolean;
}

interface Leader {
  id: string;
  firstName: string;
  lastName: string;
  xp: number;
  level: number;
}

interface MyApplicationsResponse {
  applications: Array<{
    id: string;
    status: string;
    project: { id: string; title: string; xpReward: number; category: string; organization: string };
  }>;
  stats: {
    projectsJoined: number;
    hoursContributed: number;
    xpEarned: number;
  };
}

const categoryLabels: Record<string, string> = {
  ALL: 'All Categories',
  OPEN_SOURCE: 'Open Source',
  GREEN_SOFTWARE: 'Green Software',
  CIVIC_TECH: 'Civic Tech',
  EDTECH: 'EdTech',
  RECYCLING: 'Recycling',
  ECO_TOURISM: 'Eco-Tourism',
  GREEN_INFRASTRUCTURE: 'Green Infrastructure',
  SUSTAINABILITY: 'Sustainability',
  OTHER: 'Other',
};

const CATEGORIES = [
  'ALL',
  'OPEN_SOURCE',
  'GREEN_SOFTWARE',
  'CIVIC_TECH',
  'EDTECH',
  'RECYCLING',
  'ECO_TOURISM',
  'GREEN_INFRASTRUCTURE',
  'SUSTAINABILITY',
  'OTHER',
] as const;

type TabType = 'projects' | 'chat';

export default function CommunityPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [myStats, setMyStats] = useState<MyApplicationsResponse['stats'] | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Project Creation Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    organization: '',
    location: '',
    description: '',
    requirements: '',
    techStack: '',
    category: 'OPEN_SOURCE',
    teamCapacity: 10,
    deliverableType: 'Full-Stack Solution',
    xpReward: 200,
  });

  const loadProjects = useCallback(async () => {
    const params = new URLSearchParams();
    if (category !== 'ALL') params.set('category', category);
    if (search.trim()) params.set('search', search.trim());
    const query = params.toString();
    const data = await api<Project[]>(`/projects${query ? `?${query}` : ''}`);
    setProjects(data);
  }, [category, search]);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      loadProjects(),
      api<Leader[]>('/leaderboard').then(setLeaders).catch(() => setLeaders([])),
      api<MyApplicationsResponse>('/projects/my-applications')
        .then((res) => setMyStats(res.stats))
        .catch(() => setMyStats(null)),
    ])
      .catch(() => setError('Could not load community projects from the backend.'))
      .finally(() => setLoading(false));
  }, [loadProjects]);

  async function apply(projectId: string) {
    try {
      setError('');
      setSuccess('');
      await api(`/projects/${projectId}/apply`, { method: 'POST', body: JSON.stringify({}) });
      setSuccess('Application submitted! XP awarded for joining the project.');
      await Promise.all([
        loadProjects(),
        api<MyApplicationsResponse>('/projects/my-applications').then((res) => setMyStats(res.stats)),
      ]);
    } catch (err) {
      const message = (err as Error).message || '';
      if (message.includes('Already applied')) {
        await loadProjects();
      } else {
        setError('Could not apply to this project. Please try again.');
      }
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.description.trim() || !createForm.organization.trim()) {
      setError('Please provide title, organization, and a descriptive brief.');
      return;
    }

    setCreateLoading(true);
    setError('');
    setSuccess('');

    try {
      await api('/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: createForm.title.trim(),
          organization: createForm.organization.trim(),
          location: createForm.location.trim() || 'Remote',
          description: createForm.description.trim(),
          requirements: createForm.requirements.trim() || createForm.techStack.trim() || 'Software development',
          techStack: createForm.techStack.trim() || createForm.requirements.trim(),
          category: createForm.category,
          teamCapacity: Number(createForm.teamCapacity) || 10,
          deliverableType: createForm.deliverableType.trim() || 'Software Solution',
          xpReward: Number(createForm.xpReward) || 200,
        }),
      });

      setSuccess(`Project "${createForm.title}" published successfully! +50 Creator XP earned.`);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        organization: '',
        location: '',
        description: '',
        requirements: '',
        techStack: '',
        category: 'OPEN_SOURCE',
        teamCapacity: 10,
        deliverableType: 'Full-Stack Solution',
        xpReward: 200,
      });
      await loadProjects();
    } catch (err) {
      setError((err as Error).message || 'Failed to create project. Please check fields.');
    } finally {
      setCreateLoading(false);
    }
  }

  const filteredCount = useMemo(() => projects.length, [projects]);

  return (
    <DashboardLayout>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              Community Hub
            </span>
            <span className="text-xs text-muted-foreground">· Chat, Collaborate & Build</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">
            Community
          </h1>
          <p className="text-sm text-muted-foreground">
            Chat with the community, ask questions, and collaborate on real software projects.
          </p>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/30 p-1 w-fit">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
            activeTab === 'chat'
              ? 'bg-primary text-black shadow'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Community Chat
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
            activeTab === 'projects'
              ? 'bg-primary text-black shadow'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          <Layers className="h-4 w-4" />
          Software Initiatives
        </button>
      </div>

      {/* ── Chat Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'chat' && <CommunityChat />}

      {/* ── Projects Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <>
          {/* Projects toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                if (user?.role === 'ADMIN') {
                  setError('Admin accounts cannot create projects.');
                  return;
                }
                setShowCreateModal(true);
              }}
              disabled={user?.role === 'ADMIN'}
              title={user?.role === 'ADMIN' ? 'Admin accounts cannot create projects' : undefined}
              className={user?.role === 'ADMIN' ? 'opacity-50 cursor-not-allowed border border-red-500/30 text-red-400 bg-red-950/20' : 'bg-primary font-bold text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(163,230,53,0.2)]'}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {user?.role === 'ADMIN' ? 'Create Project (Restricted)' : 'Create Project'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowSearch((v) => !v)}>
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowFilter((v) => !v)}>
              <Filter className="h-4 w-4" />
              {categoryLabels[category] || 'All Categories'}
            </Button>
          </div>

          {showSearch && (
            <Card className="mb-4 border-white/[0.08] bg-black/40">
              <CardContent className="pt-4">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search software initiatives by title, tech stack, or organization..."
                  className="bg-secondary/40"
                />
              </CardContent>
            </Card>
          )}

          {showFilter && (
            <Card className="mb-4 border-white/[0.08] bg-black/40">
              <CardContent className="flex flex-wrap gap-2 pt-4">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={category === cat ? 'default' : 'secondary'}
                    onClick={() => setCategory(cat)}
                    className="text-xs font-semibold"
                  >
                    {categoryLabels[cat]}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/15 p-3.5 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3.5 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Main Grid: Projects + Sidebar */}
          <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
            <div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading software initiatives...</p>
              ) : filteredCount === 0 ? (
                <Card className="border-white/[0.08] bg-black/40">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                    <p>No initiatives match your filters. Be the first to create one!</p>
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      variant="outline"
                      size="sm"
                      className="mt-3 border-primary/40 text-primary"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Post New Initiative
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {projects.map((project) => {
                    const capacity = project.teamCapacity || 10;
                    const fillPercent = Math.min(100, Math.round((project._count.applications / capacity) * 100));
                    const techChips = (project.techStack || project.requirements || '')
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean);

                    return (
                      <Card
                        key={project.id}
                        className="flex flex-col justify-between border-white/[0.08] bg-[#0d131f]/90 transition hover:border-primary/40"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                  {categoryLabels[project.category] || project.category}
                                </span>
                                {project.isCreator && (
                                  <span className="rounded border border-amber-500/40 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                    Creator
                                  </span>
                                )}
                              </div>
                              <CardTitle className="mt-1.5 text-base font-bold text-white">{project.title}</CardTitle>
                            </div>
                            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-black text-primary">
                              +{project.xpReward} XP
                            </span>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-1">
                          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                            {project.description}
                          </p>

                          {/* Tech Stack Chips */}
                          {techChips.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {techChips.slice(0, 4).map((tech, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 rounded border border-white/[0.06] bg-black/40 px-2 py-0.5 text-[10px] font-medium text-slate-300"
                                >
                                  <Code2 className="h-2.5 w-2.5 text-primary" />
                                  {tech}
                                </span>
                              ))}
                              {techChips.length > 4 && (
                                <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  +{techChips.length - 4}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Meta Information */}
                          <div className="space-y-1.5 border-t border-white/[0.06] pt-3 text-[11px] text-muted-foreground">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-primary" /> {project.organization}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {project.location || 'Remote'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Deliverable:</span>
                              <span className="font-medium text-white/80">{project.deliverableType || 'Software System'}</span>
                            </div>
                          </div>

                          {/* Capacity Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Users className="h-3 w-3" /> Team Capacity
                              </span>
                              <span className="font-semibold text-white">
                                {project._count.applications} / {capacity}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  fillPercent >= 100 ? 'bg-amber-400' : 'bg-primary'
                                }`}
                                style={{ width: `${fillPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* GitHub Link if linked */}
                          {project.githubUrl && (
                            <a
                              href={project.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                            >
                              <Github className="h-3.5 w-3.5" />
                              <span>{project.githubFullName || 'Open GitHub Repository'}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}

                          {/* Actions */}
                          <div className="pt-2">
                            {project.hasApplied ? (
                              <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-center text-xs font-bold text-primary">
                                ✓ Member ({project.applicationStatus || 'Approved'})
                              </div>
                            ) : fillPercent >= 100 ? (
                              <Button disabled className="w-full text-xs">
                                Team Full
                              </Button>
                            ) : (
                              <Button
                                onClick={() => apply(project.id)}
                                className="w-full bg-primary font-bold text-black hover:bg-primary/90"
                                size="sm"
                              >
                                Join Initiative · +{project.xpReward} XP
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar: Stats & Leaderboard */}
            <div className="space-y-4">
              {myStats && (
                <Card className="border-white/[0.08] bg-[#0d131f]/90">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-white">Your Community Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Initiatives Joined:</span>
                      <span className="font-bold text-white">{myStats.projectsJoined}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Hours Contributed:</span>
                      <span className="font-bold text-white">{myStats.hoursContributed}h</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Verified Impact XP:</span>
                      <span className="font-bold text-primary">+{myStats.xpEarned} XP</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-white/[0.08] bg-[#0d131f]/90">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-white">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    Top Contributors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {leaders.slice(0, 5).map((l, i) => (
                    <div key={l.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="font-medium text-white">{l.firstName} {l.lastName}</span>
                      </div>
                      <span className="font-bold text-primary">{l.xp} XP</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0d131f] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Create Community Software Project</h3>
                <p className="text-xs text-muted-foreground">Open to students, mentors, and organization leads.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Project Title *</label>
                <Input
                  required
                  placeholder="e.g. Campus Wi-Fi & Occupancy Telemetry Dashboard"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Organization / Group *</label>
                  <Input
                    required
                    placeholder="e.g. Student Union IT Guild"
                    value={createForm.organization}
                    onChange={(e) => setCreateForm({ ...createForm, organization: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Location</label>
                  <Input
                    placeholder="e.g. Campus / Remote"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                  >
                    {CATEGORIES.filter((c) => c !== 'ALL').map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900">
                        {categoryLabels[cat]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Team Capacity (Students)</label>
                  <Input
                    type="number"
                    min={2}
                    max={50}
                    value={createForm.teamCapacity}
                    onChange={(e) => setCreateForm({ ...createForm, teamCapacity: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tech Stack (comma-separated)</label>
                <Input
                  placeholder="e.g. React, Node.js, PostgreSQL, Docker, WebSockets"
                  value={createForm.techStack}
                  onChange={(e) => setCreateForm({ ...createForm, techStack: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Deliverable Type</label>
                <Input
                  placeholder="e.g. REST API, IoT Telemetry Dashboard, Mobile Client"
                  value={createForm.deliverableType}
                  onChange={(e) => setCreateForm({ ...createForm, deliverableType: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Project Brief &amp; Scope *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the software engineering architecture, the problem being solved, and what students will build..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/40 p-3 text-xs leading-relaxed text-white outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.08] pt-4">
                <span className="text-xs text-primary font-semibold">+50 XP awarded for publishing</span>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLoading} className="bg-primary font-bold text-black">
                    {createLoading ? 'Publishing...' : 'Publish Initiative'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
