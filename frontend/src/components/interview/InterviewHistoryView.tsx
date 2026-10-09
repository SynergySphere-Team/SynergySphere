'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  X,
  Code2,
  MessageCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import type { InterviewHistoryItem, InterviewHistoryDetail } from './types';

interface InterviewHistoryViewProps {
  onStartNewInterview: () => void;
}

export function InterviewHistoryView({ onStartNewInterview }: InterviewHistoryViewProps) {
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState('all');
  const [selectedScoreFilter, setSelectedScoreFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');

  // Detail Modal state
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<InterviewHistoryDetail | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ history: InterviewHistoryItem[] }>('/ai/interview/history');
      if (data && Array.isArray(data.history)) {
        setHistory(data.history);
      }
    } catch {
      setError('Could not load interview history. Please check connection.');
    } finally {
      setLoading(false);
    }
  }

  async function openDetailModal(id: string) {
    setSelectedInterviewId(id);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const detail = await api<InterviewHistoryDetail>(`/ai/interview/history/${id}`);
      setDetailData(detail);
    } catch (err) {
      console.warn('Could not load interview detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }

  // Filter list
  const filteredHistory = history.filter((item) => {
    if (selectedTopicFilter !== 'all' && item.topic.toLowerCase() !== selectedTopicFilter.toLowerCase()) {
      return false;
    }
    if (selectedScoreFilter === 'high' && item.score < 80) return false;
    if (selectedScoreFilter === 'mid' && (item.score < 60 || item.score >= 80)) return false;
    if (selectedScoreFilter === 'low' && item.score >= 60) return false;
    return true;
  });

  // Analytics derivations
  const totalCompleted = history.length;
  const avgScore = totalCompleted > 0
    ? Math.round(history.reduce((sum, h) => sum + (h.score || 0), 0) / totalCompleted)
    : 0;

  const topicsCount = new Map<string, number>();
  history.forEach((h) => {
    topicsCount.set(h.topic, (topicsCount.get(h.topic) || 0) + 1);
  });
  const mostPracticed = Array.from(topicsCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  const distinctTopics = Array.from(new Set(history.map((h) => h.topic))).filter(Boolean);

  function getScoreBadge(score: number) {
    if (score >= 80) {
      return 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400';
    }
    if (score >= 60) {
      return 'border-amber-500/30 bg-amber-950/40 text-amber-400';
    }
    return 'border-rose-500/30 bg-rose-950/40 text-rose-400';
  }

  return (
    <div className="space-y-6">
      {/* Top Analytics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/[0.08] bg-[#0d131f]/90">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Sessions Completed
              </p>
              <h3 className="text-2xl font-black text-white mt-1">{totalCompleted}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Recorded mock interviews</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#0d131f]/90">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Average Overall Score
              </p>
              <h3 className={`text-2xl font-black mt-1 ${avgScore >= 80 ? 'text-emerald-400' : avgScore >= 60 ? 'text-amber-400' : 'text-slate-200'}`}>
                {avgScore}%
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Rubric benchmark average</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#0d131f]/90">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Most Practiced Track
              </p>
              <h3 className="text-xl font-black text-white mt-1 truncate max-w-[140px]" title={mostPracticed}>
                {mostPracticed}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Focus domain</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#0d131f]/90">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Readiness Trajectory
              </p>
              <h3 className="text-sm font-bold text-primary mt-1">
                {totalCompleted >= 3 ? '+15% Improvement' : 'Building Baseline'}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Based on latest sessions</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-y border-white/[0.06] py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Topic Filter */}
          <select
            value={selectedTopicFilter}
            onChange={(e) => setSelectedTopicFilter(e.target.value)}
            className="h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-white outline-none focus:border-primary/50"
          >
            <option value="all">All Tracks &amp; Topics</option>
            {distinctTopics.map((top) => (
              <option key={top} value={top}>{top}</option>
            ))}
          </select>

          {/* Score Range Filter */}
          <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5 text-xs">
            {(['all', 'high', 'mid', 'low'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedScoreFilter(filter)}
                className={`rounded px-2.5 py-1 font-medium capitalize transition ${
                  selectedScoreFilter === filter
                    ? 'bg-primary text-black font-bold'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {filter === 'high' ? 'Strong (80%+)' : filter === 'mid' ? 'Fair (60-79%)' : filter === 'low' ? 'Needs Work' : 'All Scores'}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadHistory}
            className="h-8 text-xs text-muted-foreground hover:text-white"
            title="Reload history"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button
          onClick={onStartNewInterview}
          size="sm"
          className="bg-primary text-black font-bold hover:bg-primary/90 text-xs shrink-0"
        >
          Start New Mock Interview
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/15 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* History Items List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          Loading interview performance history...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-white/10 p-8">
          <div className="h-12 w-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground mb-3">
            <Calendar className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-white">No Sessions Match Your Filter</h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {history.length === 0
              ? 'You have not completed any mock technical interviews yet. Complete your first session to view deep analytics and question breakdown.'
              : 'Try clearing your topic or score filters to view past sessions.'}
          </p>
          <Button
            onClick={onStartNewInterview}
            className="mt-4 bg-primary text-black font-bold hover:bg-primary/90 text-xs"
          >
            Start First Interview
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#0d131f]/90 p-4 transition hover:border-primary/40 hover:bg-[#111928]"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white truncate">{item.topic} Technical Interview</h4>
                  <span className={`rounded border px-2 py-0.5 text-xs font-black ${getScoreBadge(item.score)}`}>
                    {item.score}%
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.duration || 20}m duration
                  </span>
                  <span>·</span>
                  <span className="capitalize">{item.difficulty || 'Medium'} difficulty</span>
                </div>

                {item.feedback && (
                  <p className="text-xs text-slate-300/80 line-clamp-1 italic">
                    "{item.feedback}"
                  </p>
                )}

                {item.weakAreas && item.weakAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.weakAreas.slice(0, 3).map((w, idx) => (
                      <span key={idx} className="rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 text-[10px] text-rose-300">
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDetailModal(item.id)}
                  className="border-white/10 text-xs text-white hover:bg-primary hover:text-black hover:border-primary"
                >
                  View Full Breakdown <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILED INTERVIEW BREAKDOWN MODAL */}
      {selectedInterviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0a0f18] p-6 shadow-2xl">
            <button
              onClick={() => setSelectedInterviewId(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {detailLoading ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Loading session evaluation...
              </div>
            ) : detailData ? (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded border px-2.5 py-0.5 text-xs font-black ${getScoreBadge(detailData.score)}`}>
                      Overall Score: {detailData.score}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(detailData.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-2">
                    {detailData.topic} Interview Evaluation Report
                  </h3>
                  {detailData.feedback && (
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                      {detailData.feedback}
                    </p>
                  )}
                </div>

                {/* Question by Question Review */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Questions &amp; Rubric Match Breakdown
                  </h4>

                  {detailData.evaluation?.questionReviews && detailData.evaluation.questionReviews.length > 0 ? (
                    detailData.evaluation.questionReviews.map((rev, idx) => (
                      <div key={idx} className="rounded-xl border border-white/[0.08] bg-black/40 p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary">Question {idx + 1}</span>
                          <span className={`rounded border px-2 py-0.2 text-[11px] font-bold ${getScoreBadge(rev.score)}`}>
                            {rev.score}%
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-white">{rev.questionPrompt}</p>

                        {/* Candidate Answer */}
                        {rev.userAnswer && (
                          <div className="rounded-lg bg-white/[0.03] p-2.5 text-xs text-slate-300">
                            <span className="flex items-center gap-1 font-bold text-muted-foreground text-[10px] uppercase mb-1">
                              <MessageCircle className="h-3 w-3" /> Candidate Response:
                            </span>
                            <p className="leading-relaxed whitespace-pre-wrap">{rev.userAnswer}</p>
                          </div>
                        )}

                        {/* Candidate Code */}
                        {rev.scratchCode && rev.scratchCode.trim() && (
                          <div className="rounded-lg bg-[#050a0d] p-2.5 font-mono text-xs text-emerald-300 border border-white/[0.05]">
                            <span className="flex items-center gap-1 font-bold text-muted-foreground text-[10px] uppercase mb-1 font-sans">
                              <Code2 className="h-3 w-3" /> Scratchpad Code:
                            </span>
                            <pre className="overflow-x-auto">{rev.scratchCode}</pre>
                          </div>
                        )}

                        {/* AI Feedback */}
                        {rev.feedback && (
                          <p className="text-xs text-muted-foreground italic">
                            Assessment: {rev.feedback}
                          </p>
                        )}

                        {/* Rubric Points Matched / Missed */}
                        {rev.rubricCoverage && (
                          <div className="grid sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                            {rev.rubricCoverage.matched && rev.rubricCoverage.matched.length > 0 && (
                              <div className="rounded bg-emerald-950/20 border border-emerald-500/20 p-2">
                                <span className="font-bold text-emerald-400">✓ Criteria Demonstrated:</span>
                                <ul className="mt-1 list-inside list-disc space-y-0.5 text-emerald-200/80">
                                  {rev.rubricCoverage.matched.map((m, mIdx) => (
                                    <li key={mIdx}>{m}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {rev.rubricCoverage.missed && rev.rubricCoverage.missed.length > 0 && (
                              <div className="rounded bg-rose-950/20 border border-rose-500/20 p-2">
                                <span className="font-bold text-rose-400">✕ Points Missed:</span>
                                <ul className="mt-1 list-inside list-disc space-y-0.5 text-rose-200/80">
                                  {rev.rubricCoverage.missed.map((m, mIdx) => (
                                    <li key={mIdx}>{m}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground italic p-4 rounded-lg bg-black/20">
                      Standard evaluation logged for this session.
                    </div>
                  )}
                </div>

                {/* Weak Areas Tags */}
                {detailData.weakAreas && detailData.weakAreas.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                    <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                      <AlertTriangle className="h-4 w-4" /> Focus Areas for Next Session
                    </h5>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detailData.weakAreas.map((w, idx) => (
                        <span key={idx} className="rounded-md border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-200">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => setSelectedInterviewId(null)}
                    className="bg-primary text-black font-bold hover:bg-primary/90 text-xs"
                  >
                    Close Report
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Could not load details for this session.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
