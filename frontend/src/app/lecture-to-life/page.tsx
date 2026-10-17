'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import { extractTextFromFile, inferFileType } from '@/lib/lectureExtract';
import { CodingChallengesSection } from '@/components/coding/CodingChallengesSection';
import {
  BookOpen,
  Code2,
  FileText,
  Layers3,
  Lightbulb,
  Upload,
  Download,
  Trash2,
} from 'lucide-react';

const safeStr = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return '';
    }
  }
  return '';
};

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value as Record<string, T>);
  if (typeof value === 'string') {
    try {
      const p = JSON.parse(value);
      if (Array.isArray(p)) return p as T[];
      if (p && typeof p === 'object') return Object.values(p) as T[];
    } catch {
      return [];
    }
  }
  return [];
};

const SAMPLE_LECTURES = [
  {
    title: 'Data Structures & Algorithms: Balanced Trees & Hash Maps',
    content: `Data Structures & Algorithms: Balanced Trees & Hash Maps\n\nKey Concepts:\n- Binary Search Trees (BST): A node-based binary tree data structure where each node has at most two children. The left subtree contains only nodes with keys less than the parent's key, and the right subtree contains only nodes with keys greater.\n- Self-Balancing Trees (AVL & Red-Black Trees): Ensure O(log n) time complexity for search, insert, and delete operations by maintaining tree height balance through rotations.\n- Hash Tables: Implement associative arrays using a hash function to map keys to bucket indices. Average case time complexity for lookups, insertions, and deletions is O(1).\n- Collision Resolution Techniques: Chaining (linked lists at each bucket) and Open Addressing (Linear Probing, Quadratic Probing, Double Hashing).\n- Big-O Complexity Comparisons: Array lookup is O(1) by index, O(n) by value. Hash Table lookup is O(1) average, O(n) worst-case. BST lookup is O(log n) balanced, O(n) degenerate.`,
  },
  {
    title: 'Modern Web Architecture: Event Loop & Microservices',
    content: `Modern Web Architecture: Event Loop & Microservices\n\nKey Concepts:\n- Node.js Event Loop: Single-threaded event loop driven by libuv with distinct execution phases: Timers, Pending Callbacks, Idle/Prepare, Poll, Check (setImmediate), and Close callbacks.\n- Microtasks vs Macrotasks: process.nextTick and Promise microtasks execute immediately after the current operation and before the next phase of the event loop.\n- Microservices Architecture: Decentralized software architecture where independently deployable services communicate over HTTP/REST, gRPC, or asynchronous message queues (RabbitMQ, Kafka).\n- Database Sharding & Replication: Horizontal partitioning across multiple database instances to scale read and write throughput while maintaining high availability.\n- Caching Strategies: Cache-aside, Read-Through, Write-Through, and Write-Back patterns utilizing distributed in-memory caches like Redis.`,
  },
];

interface Flashcard {
  front: string;
  back: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
}

interface MiniProject {
  title: string;
  description: string;
  steps: string[];
}

interface CodingExercise {
  title: string;
  description: string;
  hint: string;
}

interface LectureUpload {
  id: string;
  fileName: string;
  fileType: string;
  summary: string | null;
  flashcards: Flashcard[] | null;
  quiz: QuizQuestion[] | null;
  miniProjects: MiniProject[] | null;
  codingExercises: CodingExercise[] | null;
  createdAt: string;
}

const TABS = ['Summary', 'Flashcards', 'Quiz', 'Mini Projects', 'Coding Exercises'] as const;
type Tab = (typeof TABS)[number];

export default function LectureToLifePage() {
  const router = useRouter();
  const [pageMode, setPageMode] = useState<'upload' | 'challenges'>('upload');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('text');
  const [uploads, setUploads] = useState<LectureUpload[]>([]);
  const [selected, setSelected] = useState<LectureUpload | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Summary');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number | null>>({});
  const [flippedCardIndex, setFlippedCardIndex] = useState<number | null>(null);
  const [srsDueCards, setSrsDueCards] = useState<
    Array<{
      id: string;
      front: string;
      back: string;
      easeFactor: number;
      intervalDays: number;
      repetitions: number;
      lectureId?: string;
    }>
  >([]);
  const [srsFlippedId, setSrsFlippedId] = useState<string | null>(null);
  const [srsReviewing, setSrsReviewing] = useState(false);
  const [srsNotice, setSrsNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadSrsDue = useCallback(async () => {
    try {
      const res = await api<{
        dueCount: number;
        totalCount: number;
        cards: Array<{
          id: string;
          front: string;
          back: string;
          easeFactor: number;
          intervalDays: number;
          repetitions: number;
          lectureId?: string;
        }>;
      }>('/ai/srs/due');
      if (res && Array.isArray(res.cards)) {
        setSrsDueCards(res.cards);
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleSrsReview(
    card: { id?: string; front: string; back: string; lectureId?: string },
    quality: 1 | 3 | 4 | 5
  ) {
    if (srsReviewing) return;
    setSrsReviewing(true);
    try {
      const res = await api<{
        xpAwarded: number;
        card: { intervalDays: number; easeFactor: number };
      }>('/ai/srs/review', {
        method: 'POST',
        body: JSON.stringify({
          cardId: card.id,
          front: card.front,
          back: card.back,
          lectureId: card.lectureId || selected?.id,
          quality,
        }),
      });
      if (card.id) {
        setSrsDueCards((prev) => prev.filter((c) => c.id !== card.id));
        setSrsFlippedId(null);
      }
      const nextDays = res?.card?.intervalDays ?? 1;
      const xpText = res?.xpAwarded ? ` (+${res.xpAwarded} XP)` : '';
      setSrsNotice(`Scheduled next review in ${nextDays} day${nextDays === 1 ? '' : 's'}${xpText}`);
      setTimeout(() => setSrsNotice(null), 3500);
      loadSrsDue();
    } catch {
      // ignore
    } finally {
      setSrsReviewing(false);
    }
  }

  const loadUploads = useCallback(async () => {
    try {
      const items = await api<LectureUpload[]>('/ai/lecture-to-life');
      const list = Array.isArray(items) ? items : [];
      setUploads(list);
      setSelected((prev) => {
        if (list.length === 0) return null;
        if (prev && list.some((item) => item.id === prev.id)) return prev;
        return list[0] || null;
      });
      if (list.length === 0) {
        setSrsDueCards([]);
        setSrsFlippedId(null);
      } else {
        loadSrsDue();
      }
    } catch {
      setError('Could not load saved lecture packs from the backend.');
    }
  }, [loadSrsDue]);

  async function clearAllSessions() {
    if (!confirm('Are you sure you want to clear all saved lecture sessions and due flashcards? This cannot be undone.')) return;
    setClearing(true);
    setError('');
    try {
      setUploads([]);
      setSelected(null);
      setSrsDueCards([]);
      setSrsFlippedId(null);
      await api('/ai/lecture-to-life', { method: 'DELETE' }).catch(() => {});
      await api('/ai/srs/due', { method: 'DELETE' }).catch(() => {});
    } catch {
      setError('Could not clear saved sessions.');
    } finally {
      setClearing(false);
    }
  }

  async function deleteSession(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setError('');
    try {
      let remainingCount = 0;
      setUploads((prev) => {
        const remaining = prev.filter((item) => item.id !== id);
        remainingCount = remaining.length;
        if (selected?.id === id) {
          setSelected(remaining[0] || null);
        }
        return remaining;
      });
      setSrsDueCards((prev) => {
        if (remainingCount === 0) {
          setSrsFlippedId(null);
          return [];
        }
        return prev.filter((c: any) => c.uploadId !== id && c.lectureId !== id && !String(c.cardKey || '').startsWith(`${id}:`));
      });
      await api(`/ai/lecture-to-life/${id}`, { method: 'DELETE' });
    } catch {
      setError('Could not delete this session.');
    }
  }

  function downloadSummary() {
    if (!selected?.summary) return;
    const dateStr = new Date(selected.createdAt).toLocaleString();
    const markdownContent = `# ${selected.fileName || 'Lecture'} - Study Summary\n\n**Generated:** ${dateStr}\n**Format:** ${selected.fileType.toUpperCase()}\n\n---\n\n${selected.summary}\n`;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (selected.fileName || 'Lecture_Summary').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${safeTitle}_Summary.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  useEffect(() => {
    setQuizAnswers({});
    setActiveTab('Summary');
  }, [selected?.id]);

  async function handleFile(file: File) {
    setExtracting(true);
    setError('');
    try {
      const text = await extractTextFromFile(file);
      setContent(text);
      setFileName(file.name.replace(/\.[^.]+$/, ''));
      setFileType(inferFileType(file));
    } catch (err) {
      setError((err as Error).message || 'Could not read this file.');
    } finally {
      setExtracting(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function convert() {
    if (!content.trim() || content.trim().length < 20) {
      setError('Please provide at least 20 characters of lecture content.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const upload = await api<LectureUpload>('/ai/lecture-to-life', {
        method: 'POST',
        body: JSON.stringify({
          fileName: fileName || 'Lecture Notes',
          fileType,
          content,
        }),
      });
      setUploads((prev) => [upload, ...prev]);
      setSelected(upload);
      setContent('');
      setFileName('');
      setFileType('text');
      loadSrsDue();
    } catch {
      setError('Could not generate this study pack. Please check the backend or AI configuration and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const upload = await api<LectureUpload>(`/ai/lecture-to-life/${selected.id}/regenerate`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setUploads((prev) => prev.map((item) => (item.id === upload.id ? upload : item)));
      setSelected(upload);
      loadSrsDue();
    } catch {
      setError('Could not regenerate materials. The original lecture content may not be saved.');
    } finally {
      setLoading(false);
    }
  }

  const flashcards = asArray<Flashcard>(selected?.flashcards);
  const quiz = asArray<QuizQuestion>(selected?.quiz);
  const miniProjects = asArray<MiniProject>(selected?.miniProjects);
  const codingExercises = asArray<CodingExercise>(selected?.codingExercises);

  return (
    <DashboardLayout>
      <div className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">LectureToLife</p>
        <h1 className="text-2xl font-bold text-white md:text-3xl">Transform lectures into learning material</h1>
        <p className="text-sm text-muted-foreground">
          Upload slides or paste content — summaries, flashcards, quizzes, and exercises are generated from your material.
        </p>

        {/* Mode Switcher */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setPageMode('upload')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              pageMode === 'upload'
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Upload Lecture Notes</span>
          </button>
          <button
            onClick={() => setPageMode('challenges')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              pageMode === 'challenges'
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Coding Challenges</span>
          </button>
        </div>
      </div>

      {pageMode === 'challenges' ? (
        <CodingChallengesSection showHeading={false} />
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          {srsNotice && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
              ✓ {srsNotice}
            </div>
          )}

          {/* Spaced Repetition (SM-2) Due Queue */}
          {srsDueCards.length > 0 && (
            <Card className="mb-5 border-amber-500/30 bg-amber-500/5">
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-amber-400" />
                  Due for Active Recall ({srsDueCards.length} Flashcards)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-300">
                    SM-2 Spaced Repetition • +5 XP
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllSessions}
                    disabled={clearing}
                    className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {clearing ? 'Clearing...' : 'Clear'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const currentCard = srsDueCards[0];
                  const isFlipped = srsFlippedId === currentCard.id;
                  return (
                    <div className="space-y-3">
                      <div
                        onClick={() => setSrsFlippedId(isFlipped ? null : currentCard.id)}
                        className="cursor-pointer rounded-xl border border-white/10 bg-black/40 p-4 transition hover:border-amber-400/40"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-1.5">
                          <span className="font-bold text-amber-300">
                            {isFlipped ? 'ANSWER' : 'QUESTION (CLICK TO REVEAL)'}
                          </span>
                          <span>
                            Interval: {currentCard.intervalDays}d • EF: {Number(currentCard.easeFactor || 2.5).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {isFlipped ? currentCard.back : currentCard.front}
                        </p>
                      </div>
                      {isFlipped && (
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: 'Again (1d)', quality: 1 as const, cls: 'border-red-500/40 bg-red-500/15 text-red-300' },
                            { label: 'Hard', quality: 3 as const, cls: 'border-amber-500/40 bg-amber-500/15 text-amber-300' },
                            { label: 'Good (+5 XP)', quality: 4 as const, cls: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' },
                            { label: 'Easy (+5 XP)', quality: 5 as const, cls: 'border-blue-500/40 bg-blue-500/15 text-blue-300' },
                          ].map((btn) => (
                            <button
                              key={btn.quality}
                              type="button"
                              disabled={srsReviewing}
                              onClick={() => handleSrsReview(currentCard, btn.quality)}
                              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition hover:opacity-90 ${btn.cls}`}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            {/* Upload Section */}
            <div>
              <div className="mb-2.5 flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Upload Lecture Content</h2>
              </div>
              <Card>
                <CardContent className="space-y-4 pt-6">
                  {/* Quick Sample Lecture 'Use' Buttons */}
                  <div className="flex flex-wrap gap-2 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFileName(SAMPLE_LECTURES[0].title);
                        setContent(SAMPLE_LECTURES[0].content);
                        setFileType('text');
                        setError('');
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                    >
                      <span>✨ Use Sample: Algorithms</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFileName(SAMPLE_LECTURES[1].title);
                        setContent(SAMPLE_LECTURES[1].content);
                        setFileType('text');
                        setError('');
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400 transition hover:bg-sky-500/20"
                    >
                      <span>💻 Use Sample: Web Architecture</span>
                    </button>
                  </div>

                  <input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Lecture title..."
                    className="flex h-10 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste lecture notes or upload a PDF/DOCX file — content will appear here..."
                    className="h-52 w-full resize-none rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pptx,.docx,.pdf,.txt,.md,.csv"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <div
                    ref={dropRef}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    className="rounded-lg border border-dashed border-primary/25 bg-primary/5 p-8 text-center"
                  >
                    <FileText className="mx-auto mb-3 h-8 w-8 text-primary" />
                    <p className="text-sm font-semibold text-white">Drag and drop lecture files here</p>
                    <p className="mt-1 text-xs text-muted-foreground">PPTX, DOCX, PDF, TXT, and MD supported</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={extracting}>
                        {extracting ? 'Reading file...' : 'Choose File'}
                      </Button>
                      <Button onClick={convert} disabled={loading || extracting || content.trim().length < 20}>
                        {loading ? 'Generating...' : 'Generate Study Pack'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Saved Sessions Section */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Saved Sessions</h2>
                  {uploads.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {uploads.length}
                    </span>
                  )}
                </div>
                {uploads.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllSessions}
                    disabled={clearing}
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {clearing ? 'Clearing...' : 'Clear Saved Sessions'}
                  </Button>
                )}
              </div>
              <Card>
                <CardContent className="space-y-3 pt-6">
                  {uploads.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No lecture packs yet. Upload your first slides above.</p>
                  ) : (
                    uploads.map((upload) => (
                      <div
                        key={upload.id}
                        onClick={() => setSelected(upload)}
                        className={`group flex w-full cursor-pointer items-center justify-between rounded-lg border p-3 text-left transition ${
                          selected?.id === upload.id
                            ? 'border-primary/35 bg-primary/10'
                            : 'border-white/[0.07] bg-secondary/40 hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{upload.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {upload.fileType.toUpperCase()} · {new Date(upload.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => deleteSession(upload.id, e)}
                            className="rounded p-1 text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                            title="Delete session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-primary text-sm">→</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {selected && (
            <div className="mt-6">
              {/* Heading Outside the Card */}
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                    Study Pack: {selected.fileName}
                  </h2>
                </div>
                {selected.summary && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSummary}
                    className="h-8 gap-1.5 border-primary/30 text-xs text-primary hover:bg-primary/10"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Summary (.md)
                  </Button>
                )}
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap gap-2">
                    {TABS.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                          activeTab === tab
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-white/[0.08] bg-secondary/40 text-muted-foreground hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  {activeTab === 'Summary' && (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-white">Summary — {selected.fileName}</h3>
                        {selected.summary && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={downloadSummary}
                            className="h-7 gap-1 text-xs"
                          >
                            <Download className="h-3 w-3" />
                            Download Summary
                          </Button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                        {selected.summary || 'No summary generated yet.'}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            router.push(`/ai-assistant?prompt=${encodeURIComponent(`I am studying "${safeStr(selected.fileName)}". Here is my study summary:\n\n${safeStr(selected.summary)}\n\nPlease explain the key takeaways, test me on them, and clarify any difficult concepts.`)}&autoAsk=true`);
                          }}
                          className="gap-1.5 text-xs font-bold"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Use in AI Assistant
                        </Button>
                        <Button variant="secondary" size="sm" onClick={regenerate} disabled={loading}>
                          {loading ? 'Regenerating...' : 'Regenerate Materials'}
                        </Button>
                        {selected.summary && (
                          <Button variant="outline" size="sm" onClick={downloadSummary} className="gap-1.5 text-xs">
                            <Download className="h-3.5 w-3.5" />
                            Download Summary
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'Flashcards' && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {flashcards.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No flashcards generated for this lecture.</p>
                      ) : (
                        flashcards.map((card, idx) => {
                          const isFlipped = flippedCardIndex === idx;
                          return (
                            <div
                              key={card.front}
                              onClick={() => setFlippedCardIndex(isFlipped ? null : idx)}
                              className="cursor-pointer rounded-lg border border-white/[0.07] bg-secondary/40 p-4 transition hover:border-primary/40 space-y-3"
                            >
                              <p className="flex items-start gap-2 text-sm font-semibold text-white">
                                <Layers3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                {card.front}
                              </p>
                              <p className="text-xs leading-5 text-muted-foreground">{card.back}</p>
                              <div className="flex flex-wrap gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                                {[
                                  { label: 'Again', quality: 1 as const, cls: 'border-red-500/30 bg-red-500/10 text-red-300' },
                                  { label: 'Hard', quality: 3 as const, cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
                                  { label: 'Good (+5 XP)', quality: 4 as const, cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
                                  { label: 'Easy (+5 XP)', quality: 5 as const, cls: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
                                ].map((btn) => (
                                  <button
                                    key={btn.quality}
                                    type="button"
                                    disabled={srsReviewing}
                                    onClick={() =>
                                      handleSrsReview(
                                        { front: card.front, back: card.back, lectureId: selected.id },
                                        btn.quality
                                      )
                                    }
                                    className={`rounded border px-2 py-1 text-[10px] font-bold transition hover:opacity-90 ${btn.cls}`}
                                  >
                                    {btn.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {activeTab === 'Quiz' && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {quiz.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No quiz questions generated for this lecture.</p>
                      ) : (
                        quiz.map((question, index) => {
                          const chosen = quizAnswers[index];
                          const answered = chosen !== undefined && chosen !== null;
                          return (
                            <div key={question.question} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-4">
                              <p className="mb-3 text-sm font-semibold text-white">{index + 1}. {question.question}</p>
                              <div className="grid gap-2">
                                {(Array.isArray(question?.options)
                                  ? question.options
                                  : (question?.options && typeof question.options === 'object'
                                      ? Object.values(question.options as Record<string, string>)
                                      : [])
                                ).map((option, optionIndex) => {
                                  let style = 'border-white/[0.08] text-muted-foreground';
                                  if (answered) {
                                    if (optionIndex === question.answer) style = 'border-green-500/40 bg-green-500/10 text-green-400';
                                    else if (optionIndex === chosen) style = 'border-destructive/40 bg-destructive/10 text-destructive';
                                  } else if (chosen === optionIndex) {
                                    style = 'border-primary/30 bg-primary/10 text-primary';
                                  }
                                  return (
                                    <button
                                      key={option}
                                      onClick={() => setQuizAnswers((prev) => ({ ...prev, [index]: optionIndex }))}
                                      className={`rounded-md border px-2 py-1.5 text-left text-xs transition ${style}`}
                                    >
                                      {option}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {activeTab === 'Mini Projects' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {miniProjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No mini projects generated for this lecture.</p>
                      ) : (
                        miniProjects.map((project) => (
                          <div key={project.title} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-4">
                            <p className="flex items-center gap-2 text-sm font-semibold text-white">
                              <Lightbulb className="h-4 w-4 text-primary" />
                              {project.title}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{project.description}</p>
                            <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                              {project.steps.map((step) => (
                                <li key={step}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'Coding Exercises' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {codingExercises.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No coding exercises generated for this lecture.</p>
                      ) : (
                        codingExercises.map((exercise) => (
                          <div key={exercise.title} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-4">
                            <p className="flex items-center gap-2 text-sm font-semibold text-white">
                              <Code2 className="h-4 w-4 text-primary" />
                              {exercise.title}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{exercise.description}</p>
                            <p className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-2 text-xs text-primary">
                              Hint: {exercise.hint}
                            </p>
                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setPageMode('challenges');
                                }}
                                className="h-7 gap-1 text-xs font-bold text-primary hover:bg-primary/15"
                              >
                                <Code2 className="h-3 w-3" />
                                Use in Coding Challenges
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  router.push(
                                    `/ai-assistant?prompt=${encodeURIComponent(`Explain this coding exercise from my lecture:\n\nTitle: ${safeStr(exercise.title)}\nDescription: ${safeStr(exercise.description)}\nHint: ${safeStr(exercise.hint)}\n\nHow do I implement this solution step-by-step?`)}&autoAsk=true`
                                  );
                                }}
                                className="h-7 text-xs text-muted-foreground hover:text-white"
                              >
                                Ask AI Hints
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
