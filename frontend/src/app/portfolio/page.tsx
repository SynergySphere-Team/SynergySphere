'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/utils';
import { Briefcase, Download, ExternalLink, Github, Linkedin, Plus, Star, Trash2 } from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  projectLink: string | null;
  githubLink: string | null;
}

const demoItems: PortfolioItem[] = [
  { id: 'student-api', title: 'Student Management API', description: 'Spring Boot, MySQL, JWT', projectLink: null, githubLink: 'https://github.com/' },
  { id: 'eco-tour', title: 'EcoTour Website', description: 'React, Node.js, MongoDB', projectLink: 'https://example.com', githubLink: 'https://github.com/' },
  { id: 'task-tracker', title: 'Task Tracker App', description: 'React, Express, PostgreSQL', projectLink: null, githubLink: 'https://github.com/' },
  { id: 'weather-dashboard', title: 'Weather Dashboard', description: 'JavaScript, OpenWeather API', projectLink: null, githubLink: 'https://github.com/' },
];

const skills = [
  ['Java', 90],
  ['Spring Boot', 85],
  ['SQL', 80],
  ['JavaScript', 70],
  ['React', 60],
];

export default function PortfolioPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', projectLink: '', githubLink: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    api<PortfolioItem[]>('/portfolio')
      .then(setItems)
      .catch(() => setError('Could not load portfolio items from the backend.'));
  }, []);

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
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Portfolio & Career Center</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Career profile</h1>
          <p className="text-sm text-muted-foreground">Showcase projects, skills, achievements, and career readiness.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">View Portfolio</Button>
          <Button onClick={() => setShowForm(!showForm)} size="sm"><Plus className="h-4 w-4" />Add Project</Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {showForm && (
        <Card className="mb-4">
          <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
            <Input placeholder="Project title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="Project URL" value={form.projectLink} onChange={(e) => setForm({ ...form, projectLink: e.target.value })} />
            <Input placeholder="GitHub URL" value={form.githubLink} onChange={(e) => setForm({ ...form, githubLink: e.target.value })} />
            <Button onClick={addItem}>Save Project</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-5 pt-1 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-3xl font-bold text-primary">
                  {user?.firstName?.[0] ?? 'L'}{user?.lastName?.[0] ?? 'M'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{user?.firstName ?? 'Lerato'} {user?.lastName ?? 'Mokoena'}</h2>
                  <p className="text-sm text-muted-foreground">{user ? 'Student Developer' : 'Backend Developer'}</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Passionate about building scalable backend systems and solving real-world problems.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm"><Github className="h-4 w-4" />GitHub</Button>
                    <Button variant="secondary" size="sm"><Linkedin className="h-4 w-4" />LinkedIn</Button>
                    <Button variant="secondary" size="sm"><Download className="h-4 w-4" />Download CV</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Featured Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/[0.08] bg-secondary/40 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      {item.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>}
                    </div>
                    <button onClick={() => removeItem(item.id)} className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
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
                    <span className="text-muted-foreground">Star 45</span>
                    <span className="text-muted-foreground">Fork 12</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Career Tools</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              {['Resume Builder', 'CV Generator', 'LinkedIn Optimizer', 'Job Recommendations'].map((tool) => (
                <div key={tool} className="rounded-lg border border-white/[0.08] bg-secondary/40 p-3">
                  <Star className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-white">{tool}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Career-ready output</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

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
    </DashboardLayout>
  );
}
