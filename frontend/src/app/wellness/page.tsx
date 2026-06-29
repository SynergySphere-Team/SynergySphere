'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import { Heart, Lightbulb } from 'lucide-react';

interface WellnessEntry {
  id: string;
  stressLevel: number;
  mood: number;
  energyLevel: number;
  notes: string | null;
  date: string;
}

interface Insights {
  recommendations: string[];
  averages: { stress: number; mood: number; energy: number } | null;
}

function Slider({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{value}/10</span>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full accent-${color}`}
        style={{ accentColor: color }}
      />
    </div>
  );
}

export default function WellnessPage() {
  const [stress, setStress] = useState(5);
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<WellnessEntry[]>('/wellness').then(setEntries).catch(console.error);
    api<Insights>('/wellness/insights').then(setInsights).catch(console.error);
  }, []);

  async function logEntry() {
    setLoading(true);
    try {
      await api('/wellness', {
        method: 'POST',
        body: JSON.stringify({ stressLevel: stress, mood, energyLevel: energy, notes: notes || undefined }),
      });
      const [e, i] = await Promise.all([
        api<WellnessEntry[]>('/wellness'),
        api<Insights>('/wellness/insights'),
      ]);
      setEntries(e);
      setInsights(i);
      setNotes('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <h1 className="mb-2 text-3xl font-bold">Wellness Tracker</h1>
      <p className="mb-8 text-muted-foreground">Monitor your mental health and get AI-powered recommendations</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-400" />
              Daily Check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Slider label="Stress Level" value={stress} onChange={setStress} color="#f472b6" />
            <Slider label="Mood" value={mood} onChange={setMood} color="#a78bfa" />
            <Slider label="Energy Level" value={energy} onChange={setEnergy} color="#2dd4bf" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="h-20 w-full rounded-lg border border-border bg-secondary/30 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={logEntry} disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Log Wellness Entry'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              AI Wellness Coach
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights?.averages && (
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-lg font-bold">{insights.averages.stress.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg Stress</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-lg font-bold">{insights.averages.mood.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg Mood</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-lg font-bold">{insights.averages.energy.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg Energy</p>
                </div>
              </div>
            )}
            <ul className="space-y-2">
              {insights?.recommendations.map((rec, i) => (
                <li key={i} className="rounded-lg bg-secondary/30 p-3 text-sm">{rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {entries.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entries.slice(0, 7).map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 text-sm">
                  <span>{new Date(e.date).toLocaleDateString()}</span>
                  <div className="flex gap-4 text-muted-foreground">
                    <span>Stress: {e.stressLevel}</span>
                    <span>Mood: {e.mood}</span>
                    <span>Energy: {e.energyLevel}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
