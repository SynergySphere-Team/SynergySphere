'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/utils';
import {
  Search,
  BookOpen,
  CheckCircle,
  Lightbulb,
  Play,
  ChevronDown,
  ChevronUp,
  Tag,
  ArrowRight,
  Filter,
} from 'lucide-react';
import type { Question } from './types';

interface QuestionBankViewProps {
  onLaunchTrack: (topic: string) => void;
}

export function QuestionBankView({ onLaunchTrack }: QuestionBankViewProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Expanded question rubrics
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, [page, selectedTopic, selectedDifficulty, selectedType]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadQuestions();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function loadQuestions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (selectedTopic !== 'all') params.set('topic', selectedTopic);
      if (selectedDifficulty !== 'all') params.set('difficulty', selectedDifficulty);
      if (selectedType !== 'all') params.set('type', selectedType);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await api<{
        total: number;
        page: number;
        totalPages: number;
        questions: Question[];
      }>(`/ai/interview/questions?${params.toString()}`);

      if (res) {
        setQuestions(res.questions || []);
        setTotalQuestions(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.warn('Could not load questions:', err);
    } finally {
      setLoading(false);
    }
  }

  const topicOptions = [
    { id: 'all', label: 'All Tracks' },
    { id: 'csharp', label: 'C# / .NET' },
    { id: 'java', label: 'Java' },
    { id: 'python', label: 'Python' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'react', label: 'React' },
    { id: 'nodejs', label: 'Node.js' },
    { id: 'sql', label: 'SQL' },
    { id: 'system-design', label: 'System Design' },
    { id: 'behavioral', label: 'Behavioral' },
  ];

  function getDifficultyBadge(diff: string) {
    switch (diff.toLowerCase()) {
      case 'hard':
        return 'border-rose-500/30 bg-rose-950/40 text-rose-300';
      case 'medium':
        return 'border-amber-500/30 bg-amber-950/40 text-amber-300';
      default:
        return 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300';
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d131f]/90 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Technical Question Bank &amp; Rubrics
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore 550+ first-party interview questions, verified grading rubrics, hints, and expected answers.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search prompts, tags, topics..."
              className="pl-9 bg-black/40 border-white/10 text-xs h-9 text-white placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.06]">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>

          {/* Topic Select */}
          <select
            value={selectedTopic}
            onChange={(e) => {
              setSelectedTopic(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-white outline-none focus:border-primary/50"
          >
            {topicOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          {/* Difficulty Select */}
          <select
            value={selectedDifficulty}
            onChange={(e) => {
              setSelectedDifficulty(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-white outline-none focus:border-primary/50"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Type Select */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-white outline-none focus:border-primary/50"
          >
            <option value="all">All Question Types</option>
            <option value="conceptual">Conceptual</option>
            <option value="coding">Coding Problem</option>
            <option value="system-design">System Design</option>
            <option value="sql">SQL / Database</option>
            <option value="behavioral-tech">Behavioral Tech</option>
          </select>

          <span className="ml-auto text-xs font-mono text-muted-foreground">
            {totalQuestions} questions matched
          </span>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          Querying question catalog...
        </div>
      ) : questions.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-white/10 p-8">
          <p className="text-sm font-semibold text-white">No questions match your search.</p>
          <p className="text-xs text-muted-foreground mt-1">Try resetting the topic or difficulty filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const isExpanded = expandedId === q.id;
            return (
              <Card
                key={q.id}
                className="border-white/[0.08] bg-[#0d131f]/90 transition hover:border-white/20"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 font-bold uppercase text-primary">
                          {q.topic}
                        </span>
                        <span className={`rounded border px-1.5 py-0.5 font-semibold uppercase ${getDifficultyBadge(q.difficulty)}`}>
                          {q.difficulty}
                        </span>
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-muted-foreground uppercase font-mono">
                          {q.type}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white leading-relaxed">
                        {q.prompt}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => onLaunchTrack(q.topic)}
                        className="h-8 text-xs bg-primary/20 text-primary hover:bg-primary hover:text-black border border-primary/40 font-bold"
                        title="Start a live interview session on this topic"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Practice Track
                      </Button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                        className="rounded-lg border border-white/10 p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
                        title={isExpanded ? 'Collapse rubric' : 'Expand rubric'}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {q.tags && q.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {q.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-0.5 text-slate-400">
                          <Tag className="h-2.5 w-2.5 opacity-60" /> #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expandable Rubric & Follow-ups */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 rounded-xl border border-white/[0.06] bg-black/40 p-4 text-xs animate-in fade-in">
                      {/* Rubric criteria */}
                      <div>
                        <span className="font-bold text-primary text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" /> Official Evaluation Rubric:
                        </span>
                        <ul className="mt-1.5 space-y-1 text-slate-300">
                          {q.rubric.map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">✓</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Follow ups */}
                      {q.followUps && q.followUps.length > 0 && (
                        <div className="border-t border-white/[0.06] pt-2.5">
                          <span className="font-bold text-amber-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                            <Lightbulb className="h-3.5 w-3.5" /> Likely Interviewer Follow-ups:
                          </span>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-200/80">
                            {q.followUps.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Hints */}
                      {q.hints && q.hints.length > 0 && (
                        <div className="border-t border-white/[0.06] pt-2.5">
                          <span className="font-bold text-blue-400 text-[11px] uppercase tracking-wider">
                            Preparation Hint:
                          </span>
                          <p className="mt-1 text-blue-200/80 italic">
                            {q.hints[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-white/10 text-xs"
          >
            ← Previous Page
          </Button>

          <span className="text-muted-foreground font-mono">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="border-white/10 text-xs"
          >
            Next Page →
          </Button>
        </div>
      )}
    </div>
  );
}
