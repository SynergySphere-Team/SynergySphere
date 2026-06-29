'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/utils';
import { CalendarDays, CheckCircle2, Clock, Flame, Plus, Trash2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
}

const demoTasks: Task[] = [
  { id: 'demo-1', title: 'Finish Java Assignment', description: 'Due May 18', status: 'TODO', dueDate: null },
  { id: 'demo-2', title: 'Study System Design', description: 'Due May 15', status: 'TODO', dueDate: null },
  { id: 'demo-3', title: 'Spring Boot Project', description: 'Build API endpoints', status: 'IN_PROGRESS', dueDate: null },
  { id: 'demo-4', title: 'Study Microservices', description: 'LectureToLife notes', status: 'IN_PROGRESS', dueDate: null },
  { id: 'demo-5', title: 'SQL Optimization', description: 'Review query plan', status: 'REVIEW', dueDate: null },
  { id: 'demo-6', title: 'AI App Challenge', description: 'Submitted', status: 'DONE', dueDate: null },
  { id: 'demo-7', title: 'Git Basics', description: 'Completed', status: 'DONE', dueDate: null },
];

const columns = [
  { key: 'TODO', title: 'To Do' },
  { key: 'IN_PROGRESS', title: 'In Progress' },
  { key: 'REVIEW', title: 'Review' },
  { key: 'DONE', title: 'Done' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [title, setTitle] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    try {
      const data = await api<Task[]>('/tasks');
      setTasks(data.length ? data : demoTasks);
    } catch {
      setTasks(demoTasks);
    }
  }

  async function addTask() {
    if (!title.trim()) return;
    try {
      await api('/tasks', { method: 'POST', body: JSON.stringify({ title }) });
      await loadTasks();
    } catch {
      setTasks((prev) => [{ id: crypto.randomUUID(), title, description: 'New task', status: 'TODO', dueDate: null }, ...prev]);
    }
    setTitle('');
    setShowForm(false);
  }

  async function toggleStatus(task: Task) {
    const flow = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    const next = flow[(flow.indexOf(task.status) + 1) % flow.length];
    try {
      await api(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      await loadTasks();
    } catch {
      setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, status: next } : item));
    }
  }

  async function deleteTask(id: string) {
    try {
      await api(`/tasks/${id}`, { method: 'DELETE' });
      await loadTasks();
    } catch {
      setTasks((prev) => prev.filter((item) => item.id !== id));
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Productivity & Wellness Hub</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Tasks</h1>
          <p className="text-sm text-muted-foreground">Plan coursework, project work, reviews, and focused sessions.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" />Add Task</Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title..." onKeyDown={(e) => e.key === 'Enter' && addTask()} />
            <Button onClick={addTask}>Add</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_270px]">
        <div className="grid gap-4 lg:grid-cols-4">
          {columns.map((column) => {
            const items = tasks.filter((task) => task.status === column.key);
            return (
              <Card key={column.key} className="min-h-[480px]">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>{column.title}</CardTitle>
                  <span className="rounded-md border border-white/[0.08] bg-secondary/50 px-2 py-1 text-[11px] text-muted-foreground">{items.length}</span>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((task) => (
                    <div key={task.id} className="rounded-lg border border-white/[0.08] bg-secondary/40 p-3">
                      <button className="w-full text-left" onClick={() => toggleStatus(task)}>
                        <p className="text-sm font-semibold text-white">{task.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{task.description || task.status.replace('_', ' ')}</p>
                      </button>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-primary">{column.key === 'DONE' ? 'Complete' : 'Next stage'}</span>
                        <button onClick={() => deleteTask(task.id)} className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Focus Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 border-primary/70 bg-primary/10">
                <div>
                  <p className="text-3xl font-bold text-white">25:00</p>
                  <p className="text-xs text-muted-foreground">Focus session</p>
                </div>
              </div>
              <Button className="mt-4 w-full">Start</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" />
                Today&apos;s Wins
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-center">
              {[
                ['Focus Hours', '12.5h'],
                ['Tasks Completed', '23'],
                ['Deep Sessions', '8'],
                ['Distraction Time', '1.2h'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Wellness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wellness Score</span>
                <span className="font-semibold text-white">78%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/35">
                <div className="h-full w-[78%] rounded-full bg-primary" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Good balance
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
