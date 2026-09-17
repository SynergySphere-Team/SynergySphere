'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import { extractTextFromFile, inferFileType } from '@/lib/lectureExtract';
import { WebCurriculumSection } from '@/components/curriculum/WebCurriculumSection';
import {
  BookOpen,
  Code2,
  FileText,
  Layers3,
  Lightbulb,
  ListChecks,
  Upload,
} from 'lucide-react';

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
  const [pageMode, setPageMode] = useState<'curriculum' | 'upload'>('curriculum');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('text');
  const [uploads, setUploads] = useState<LectureUpload[]>([]);
  const [selected, setSelected] = useState<LectureUpload | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Summary');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadUploads = useCallback(async () => {
    try {
      const items = await api<LectureUpload[]>('/ai/lecture-to-life');
      setUploads(items);
      setSelected((prev) => {
        if (prev && items.some((item) => item.id === prev.id)) return prev;
        return items[0] || null;
      });
    } catch {
      setError('Could not load saved lecture packs from the backend.');
    }
  }, []);

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
    } catch {
      setError('Could not regenerate materials. The original lecture content may not be saved.');
    } finally {
      setLoading(false);
    }
  }

  const flashcards = selected?.flashcards || [];
  const quiz = selected?.quiz || [];
  const miniProjects = selected?.miniProjects || [];
  const codingExercises = selected?.codingExercises || [];

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
            onClick={() => setPageMode('curriculum')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              pageMode === 'curriculum'
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Programming Academy (W3Schools)</span>
          </button>
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
        </div>
      </div>

      {pageMode === 'curriculum' ? (
        <WebCurriculumSection />
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Upload Lecture Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              accept=".pdf,.docx,.txt,.md,.csv"
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
              <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT, and MD supported</p>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Recent Uploads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lecture packs yet. Upload your first slides above.</p>
            ) : (
              uploads.map((upload) => (
                <button
                  key={upload.id}
                  onClick={() => setSelected(upload)}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${
                    selected?.id === upload.id ? 'border-primary/35 bg-primary/10' : 'border-white/[0.07] bg-secondary/40'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{upload.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {upload.fileType.toUpperCase()} · {new Date(upload.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-primary">→</span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {selected && (
        <div className="mt-4">
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
                  <h2 className="mb-3 text-base font-semibold text-white">Summary — {selected.fileName}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {selected.summary || 'No summary generated yet.'}
                  </p>
                  <Button variant="secondary" size="sm" className="mt-5" onClick={regenerate} disabled={loading}>
                    {loading ? 'Regenerating...' : 'Regenerate Materials'}
                  </Button>
                </div>
              )}

              {activeTab === 'Flashcards' && (
                <div className="grid gap-3 md:grid-cols-2">
                  {flashcards.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No flashcards generated for this lecture.</p>
                  ) : (
                    flashcards.map((card) => (
                      <div key={card.front} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-4">
                        <p className="flex items-start gap-2 text-sm font-semibold text-white">
                          <Layers3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {card.front}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.back}</p>
                      </div>
                    ))
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
                            {question.options.map((option, optionIndex) => {
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
