'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
}

const demoProjects: Project[] = [
  {
    id: 'eco-tour',
    title: 'EcoTour Website Redesign',
    category: 'ECO_TOURISM',
    location: 'Cape Nature',
    organization: 'Green Initiative',
    description: 'Modernize a tourism website with accessible pages and booking flows.',
    requirements: 'React, UI/UX',
    xpReward: 350,
    _count: { applications: 5 },
  },
  {
    id: 'green-city',
    title: 'Green City Data Dashboard',
    category: 'GREEN_INFRASTRUCTURE',
    location: 'Green SA',
    organization: 'Urban Lab',
    description: 'Build a dashboard for tracking recycling and energy-use indicators.',
    requirements: 'Charts, APIs',
    xpReward: 320,
    _count: { applications: 3 },
  },
  {
    id: 'recycling-system',
    title: 'Recycling System Mobile App',
    category: 'RECYCLING',
    location: 'eThekwini',
    organization: 'RecycleZA',
    description: 'Create a mobile-first reporting flow for recycling collection points.',
    requirements: 'React Native',
    xpReward: 290,
    _count: { applications: 4 },
  },
  {
    id: 'solar-tracker',
    title: 'Solar Energy Tracker',
    category: 'SUSTAINABILITY',
    location: 'Durban',
    organization: 'Energy Future',
    description: 'Track solar production and compare it with household consumption.',
    requirements: 'Node, APIs',
    xpReward: 210,
    _count: { applications: 2 },
  },
];

const categoryLabels: Record<string, string> = {
  RECYCLING: 'Recycling',
  ECO_TOURISM: 'Eco-Tourism',
  GREEN_INFRASTRUCTURE: 'Green Infrastructure',
  SUSTAINABILITY: 'Sustainability',
  OTHER: 'Other',
};

export default function CommunityPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    api<Project[]>('/projects')
      .then(setProjects)
      .catch(() => setError('Could not load community projects from the backend.'));
  }, []);

  async function apply(projectId: string) {
    try {
      setError('');
      await api(`/projects/${projectId}/apply`, { method: 'POST', body: JSON.stringify({}) });
      setApplied((prev) => new Set(prev).add(projectId));
    } catch {
      setError('Could not apply to this project. Please try again.');
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Community Impact Hub</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Sustainability projects</h1>
          <p className="text-sm text-muted-foreground">Contribute to real community work and earn portfolio-ready XP.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm"><Search className="h-4 w-4" />Search</Button>
          <Button variant="secondary" size="sm"><Filter className="h-4 w-4" />All Categories</Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
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
                  <span className="rounded-md border border-white/[0.08] bg-secondary/50 px-2 py-1">{categoryLabels[project.category]}</span>
                  {project.requirements && <span className="rounded-md border border-white/[0.08] bg-secondary/50 px-2 py-1">{project.requirements}</span>}
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-primary" />{project.organization}</span>
                  {project.location && <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" />{project.location}</span>}
                  <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-primary" />{project._count.applications} members</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/35">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(90, project._count.applications * 14 + 20)}%` }} />
                </div>
                <Button
                  size="sm"
                  variant={applied.has(project.id) ? 'secondary' : 'default'}
                  onClick={() => apply(project.id)}
                  disabled={applied.has(project.id)}
                  className="w-full"
                >
                  {applied.has(project.id) ? 'Applied' : 'Join Project'}
                </Button>
              </CardContent>
            </Card>
          ))}
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
              {['Thabo M.', 'Lerato M.', 'Sipho D.', 'Ayesha K.', 'Kevin L.'].map((name, index) => (
                <div key={name} className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-secondary/40 p-3 text-sm">
                  <span className="text-white">{index + 1}. {name}</span>
                  <span className="text-xs text-primary">{350 - index * 28} XP</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Contributions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Projects joined', '3'],
                ['Hours contributed', '28h'],
                ['XP earned', '320'],
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
