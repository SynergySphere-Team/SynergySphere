'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/utils';
import { Building2, Filter, MapPin, Search, Trophy, Users } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  category: string;
  location: string | null;
  organization: string;
  description: string;
  requirements: string | null;
  xpReward: number;
  _count: { applications: number };
  hasApplied?: boolean;
  applicationStatus?: string | null;
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
  RECYCLING: 'Recycling',
  ECO_TOURISM: 'Eco-Tourism',
  GREEN_INFRASTRUCTURE: 'Green Infrastructure',
  SUSTAINABILITY: 'Sustainability',
  OTHER: 'Other',
  ALL: 'All Categories',
};

const CATEGORIES = ['ALL', 'RECYCLING', 'ECO_TOURISM', 'GREEN_INFRASTRUCTURE', 'SUSTAINABILITY', 'OTHER'] as const;

export default function CommunityPage() {
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

  const filteredCount = useMemo(() => projects.length, [projects]);

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Community Impact Hub</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Sustainability projects</h1>
          <p className="text-sm text-muted-foreground">Contribute to real community work and earn portfolio-ready XP.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowSearch((v) => !v)}>
            <Search className="h-4 w-4" />Search
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowFilter((v) => !v)}>
            <Filter className="h-4 w-4" />{categoryLabels[category] || 'All Categories'}
          </Button>
        </div>
      </div>

      {showSearch && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects by title, description, or organization..."
            />
          </CardContent>
        </Card>
      )}

      {showFilter && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap gap-2 pt-4">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={category === cat ? 'default' : 'secondary'}
                onClick={() => setCategory(cat)}
              >
                {categoryLabels[cat]}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{success}</div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          ) : filteredCount === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No projects match your search. Try a different category or search term.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {projects.map((project) => {
                const capacity = 10;
                const fillPercent = Math.min(100, Math.round((project._count.applications / capacity) * 100));
                return (
                  <Card key={project.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle>{project.title}</CardTitle>
                        <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                          {project.xpReward} XP
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="min-h-[60px] text-sm leading-6 text-muted-foreground">{project.description}</p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded-md border border-white/[0.08] bg-secondary/50 px-2 py-1">
                          {categoryLabels[project.category]}
                        </span>
                        {project.requirements && (
                          <span className="rounded-md border border-white/[0.08] bg-secondary/50 px-2 py-1">
                            {project.requirements}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-primary" />{project.organization}
                        </span>
                        {project.location && (
                          <span className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-primary" />{project.location}
                          </span>
                        )}
                        <span className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          {project._count.applications} applicant{project._count.applications === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                          <span>Team capacity</span>
                          <span>{project._count.applications}/{capacity}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-black/35">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${fillPercent}%` }} />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={project.hasApplied ? 'secondary' : 'default'}
                        onClick={() => apply(project.id)}
                        disabled={project.hasApplied}
                        className="w-full"
                      >
                        {project.hasApplied
                          ? `Applied (${project.applicationStatus || 'PENDING'})`
                          : 'Join Project'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leaderboard data yet.</p>
              ) : (
                leaders.slice(0, 5).map((leader, index) => (
                  <div key={leader.id} className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-secondary/40 p-3 text-sm">
                    <span className="text-white">
                      {index + 1}. {leader.firstName} {leader.lastName.charAt(0)}.
                    </span>
                    <span className="text-xs text-primary">{leader.xp} XP</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Contributions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Projects joined', String(myStats?.projectsJoined ?? 0)],
                ['Hours contributed', `${myStats?.hoursContributed ?? 0}h`],
                ['XP earned', String(myStats?.xpEarned ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
