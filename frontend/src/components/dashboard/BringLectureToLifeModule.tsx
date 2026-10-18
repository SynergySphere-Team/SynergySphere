'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import { extractTextFromFile, inferFileType } from '@/lib/lectureExtract';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Code2,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Lightbulb,
  Loader2,
  Presentation,
  RefreshCw,
  Search,
  Sparkles,
  Terminal,
  Upload,
  Zap,
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

interface LearningHubTech {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

const FALLBACK_PROGRAMMING_RESOURCES: LearningHubTech[] = [
  {
    id: 'python',
    name: 'Python',
    category: 'Programming & AI',
    description: 'Core syntax, data structures, OOP, file handling, and algorithms.',
    difficulty: 'Beginner',
    totalLessons: 32,
    completedLessons: 0,
    progressPercent: 0,
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    category: 'Web Development',
    description: 'Modern ES6+, DOM manipulation, async/await, APIs, and client-side logic.',
    difficulty: 'Beginner',
    totalLessons: 30,
    completedLessons: 0,
    progressPercent: 0,
  },
  {
    id: 'java',
    name: 'Java',
    category: 'Software Engineering',
    description: 'Object-oriented programming, inheritance, polymorphism, and collections.',
    difficulty: 'Intermediate',
    totalLessons: 28,
    completedLessons: 0,
    progressPercent: 0,
  },
  {
    id: 'react',
    name: 'React',
    category: 'Frontend Frameworks',
    description: 'Component architecture, hooks, state management, and modern SPA design.',
    difficulty: 'Intermediate',
    totalLessons: 24,
    completedLessons: 0,
    progressPercent: 0,
  },
  {
    id: 'sql',
    name: 'SQL',
    category: 'Database & Backend',
    description: 'Relational data modeling, queries, joins, aggregates, and transactions.',
    difficulty: 'Beginner',
    totalLessons: 20,
    completedLessons: 0,
    progressPercent: 0,
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    category: 'Web Development',
    description: 'Static typing, interfaces, generics, and enterprise application patterns.',
    difficulty: 'Intermediate',
    totalLessons: 22,
    completedLessons: 0,
    progressPercent: 0,
  },
];

type StudyTab = 'summary' | 'flashcards' | 'quiz' | 'projects' | 'exercises';

export function BringLectureToLifeModule() {
  const [activeSection, setActiveSection] = useState<'upload' | 'programming'>('upload');

  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('text');
  const [uploads, setUploads] = useState<LectureUpload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<LectureUpload | null>(null);
  const [studyTab, setStudyTab] = useState<StudyTab>('summary');
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeFlippedCard, setActiveFlippedCard] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number | null>>({});

  const [technologies, setTechnologies] = useState<LearningHubTech[]>(FALLBACK_PROGRAMMING_RESOURCES);
  const [techFilter, setTechFilter] = useState('all');
  const [techSearch, setTechSearch] = useState('');
  const [loadingTech, setLoadingTech] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadUploads = useCallback(async () => {
    try {
      const items = await api<LectureUpload[]>('/ai/lecture-to-life');
      setUploads(items);
      if (items.length > 0) {
        setSelectedUpload(items[0]);
      }
    } catch {
      // Backend may be offline or no uploads yet; gracefully continue
    }
  }, []);

  const loadTechnologies = useCallback(async () => {
    setLoadingTech(true);
    try {
      const res = await api<{ technologies: LearningHubTech[] }>('/curriculum/technologies');
      if (res.technologies && res.technologies.length > 0) {
        setTechnologies(res.technologies);
      }
    } catch {
    } finally {
      setLoadingTech(false);
    }
  }, []);

  useEffect(() => {
    loadUploads();
    loadTechnologies();
  }, [loadUploads, loadTechnologies]);

  async function processSelectedFile(file: File) {
    setExtracting(true);
    setUploadError('');
    try {
      const text = await extractTextFromFile(file);
      setContent(text);
      setFileName(file.name.replace(/\.[^.]+$/, ''));
      setFileType(inferFileType(file));
    } catch (err) {
      setUploadError((err as Error).message || 'Could not extract text from this file.');
    } finally {
      setExtracting(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    e.target.value = '';
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  }

  async function handleGenerateStudyPack() {
    if (!content.trim() || content.trim().length < 20) {
      setUploadError('Please provide at least 20 characters of lecture content to generate materials.');
      return;
    }

    setGenerating(true);
    setUploadError('');
    try {
      const upload = await api<LectureUpload>('/ai/lecture-to-life', {
        method: 'POST',
        body: JSON.stringify({
          fileName: fileName.trim() || 'Lecture Study Pack',
          fileType,
          content,
        }),
      });

      setUploads((prev) => [upload, ...prev]);
      setSelectedUpload(upload);
      setContent('');
      setFileName('');
      setFileType('text');
      setStudyTab('summary');
    } catch (err) {
      setUploadError((err as Error).message || 'Failed to synthesize study pack. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  const filteredTech = technologies.filter((tech) => {
    const matchesSearch =
      tech.name.toLowerCase().includes(techSearch.toLowerCase()) ||
      tech.description.toLowerCase().includes(techSearch.toLowerCase());
    const matchesCategory =
      techFilter === 'all' ||
      (techFilter === 'languages' && ['python', 'javascript', 'java', 'typescript', 'c', 'cpp'].includes(tech.id)) ||
      (techFilter === 'web' && ['html', 'css', 'javascript', 'react', 'typescript'].includes(tech.id)) ||
      (techFilter === 'data' && ['sql', 'python'].includes(tech.id));
    return matchesSearch && matchesCategory;
  });

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-[#0a1815]/95 via-[#071015]/95 to-[#071015]/90 shadow-xl overflow-hidden">
      {/* Module Header */}
      <CardHeader className="border-b border-white/[0.06] pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                Lecture to Life Module
              </span>
              <span className="hidden sm:inline-flex rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
                W3Schools &amp; AI Powered
              </span>
            </div>
            <CardTitle className="text-xl font-bold text-white tracking-tight">
              Bring the Lecture to Life
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
              Synthesize lecture slides (.pptx), documents (.docx, .pdf), or study notes into instant summaries, flashcards, quizzes, and exercises — or advance through foundational programming tracks from the Learning Hub.
            </p>
          </div>

          {/* Module Mode Switcher */}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-black/40 p-1 shrink-0">
            <button
              onClick={() => setActiveSection('upload')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeSection === 'upload'
                  ? 'bg-primary text-black shadow font-bold'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Study Materials &amp; Upload</span>
            </button>
            <button
              onClick={() => setActiveSection('programming')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeSection === 'programming'
                  ? 'bg-primary text-black shadow font-bold'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Programming Resources</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* ======================================================== */}
        {/* SECTION 1: FILE UPLOAD & STUDY MATERIALS                */}
        {/* ======================================================== */}
        {activeSection === 'upload' && (
          <div className="space-y-5">
            {uploadError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between">
                <span>{uploadError}</span>
                <button onClick={() => setUploadError('')} className="underline text-[11px] ml-2">
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              {/* Left Column: File Upload Area */}
              <div className="space-y-4">
                {/* Drag and Drop Zone supporting .pptx, .docx, .pdf */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pptx,.docx,.pdf,.txt,.md,.csv"
                  className="hidden"
                  onChange={handleFileInput}
                />

                <div
                  ref={dropRef}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="relative rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] hover:bg-primary/[0.06] hover:border-primary/50 transition p-6 text-center group"
                >
                  <div className="flex justify-center items-center gap-2 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition">
                      <Upload className="h-5 w-5" />
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-white">
                    Upload Study Materials &amp; Lecture Slides
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    Drag and drop your files here or click below to browse from your device
                  </p>

                  {/* Supported Format Badges */}
                  <div className="mt-3 flex flex-wrap justify-center items-center gap-1.5 text-[11px]">
                    <span className="rounded bg-primary/15 border border-primary/30 px-2 py-0.5 font-mono text-primary font-bold">
                      .PPTX
                    </span>
                    <span className="rounded bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 font-mono text-blue-400 font-bold">
                      .DOCX
                    </span>
                    <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-amber-400 font-bold">
                      .PDF
                    </span>
                    <span className="rounded bg-white/[0.05] border border-white/[0.1] px-2 py-0.5 font-mono text-muted-foreground">
                      .TXT / .MD
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={extracting}
                      className="border-primary/40 text-xs hover:bg-primary/10"
                    >
                      {extracting ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-primary" />
                          Extracting text...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                          Choose File (.pptx, .docx, .pdf)
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Optional Title & Content Preview / Manual Notes Input */}
                <div className="space-y-2 rounded-lg border border-white/[0.07] bg-black/30 p-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Lecture Title
                    </label>
                    {content ? (
                      <span className="text-[11px] text-primary font-mono">
                        {content.length} characters ready
                      </span>
                    ) : null}
                  </div>
                  <input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g. Distributed Systems Lecture 4, React State Management..."
                    className="h-9 w-full rounded-md border border-white/[0.08] bg-black/40 px-3 text-xs text-white placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
                  />

                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Extracted file text will appear here. You can also paste notes or slide transcripts directly..."
                    rows={4}
                    className="w-full resize-none rounded-md border border-white/[0.08] bg-black/40 p-2.5 text-xs leading-5 text-white placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Minimum 20 characters required to synthesize
                    </span>
                    <Button
                      size="sm"
                      onClick={handleGenerateStudyPack}
                      disabled={generating || extracting || content.trim().length < 20}
                      className="bg-primary text-black hover:bg-primary/90 text-xs font-bold"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Synthesizing Pack...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-1.5 h-3.5 w-3.5" />
                          Generate Study Pack
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Generated Study Pack or Recent Uploads */}
              <div className="space-y-4">
                {/* Recent Uploads Selector */}
                <div className="rounded-xl border border-white/[0.07] bg-black/25 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      Your Lecture Study Packs
                    </h5>
                    <Link
                      href="/lecture-to-life"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      Full Studio <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  {uploads.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">
                      No study packs created yet. Upload a .pptx, .docx, or .pdf to generate your first pack!
                    </p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {uploads.slice(0, 5).map((up) => (
                        <button
                          key={up.id}
                          onClick={() => {
                            setSelectedUpload(up);
                            setStudyTab('summary');
                            setActiveFlippedCard(null);
                          }}
                          className={`rounded-lg border px-3 py-2 text-left shrink-0 transition max-w-[180px] ${
                            selectedUpload?.id === up.id
                              ? 'border-primary/50 bg-primary/15'
                              : 'border-white/[0.07] bg-black/30 hover:border-white/[0.15]'
                          }`}
                        >
                          <p className="truncate text-xs font-semibold text-white">{up.fileName}</p>
                          <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                            {up.fileType || 'LECTURE'} • {new Date(up.createdAt).toLocaleDateString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Pack Interactive Viewer */}
                {selectedUpload ? (
                  <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-primary uppercase font-bold">
                          Active Pack
                        </span>
                        <h4 className="truncate text-sm font-bold text-white">
                          {selectedUpload.fileName}
                        </h4>
                      </div>
                      <div className="flex gap-1">
                        {(['summary', 'flashcards', 'quiz', 'projects', 'exercises'] as StudyTab[]).map(
                          (tab) => (
                            <button
                              key={tab}
                              onClick={() => {
                                setStudyTab(tab);
                                setActiveFlippedCard(null);
                              }}
                              className={`rounded px-2 py-1 text-[11px] font-semibold capitalize transition ${
                                studyTab === tab
                                  ? 'bg-primary text-black font-bold'
                                  : 'text-muted-foreground hover:text-white'
                              }`}
                            >
                              {tab === 'projects' ? 'Projects' : tab === 'exercises' ? 'Code' : tab}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Summary Tab */}
                    {studyTab === 'summary' && (
                      <div className="max-h-48 overflow-y-auto pr-1 text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap scrollbar-thin">
                        {selectedUpload.summary || 'No summary available for this lecture.'}
                      </div>
                    )}

                    {/* Flashcards Tab */}
                    {studyTab === 'flashcards' && (
                      <div className="space-y-2">
                        {(!selectedUpload.flashcards || selectedUpload.flashcards.length === 0) ? (
                          <p className="text-xs text-muted-foreground">No flashcards found.</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {selectedUpload.flashcards.slice(0, 4).map((fc, i) => {
                              const isFlipped = activeFlippedCard === i;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setActiveFlippedCard(isFlipped ? null : i)}
                                  className="h-24 w-full rounded-lg border border-white/[0.08] bg-black/40 p-3 text-left transition hover:border-primary/40 flex flex-col justify-between"
                                >
                                  <div className="text-[10px] font-mono uppercase text-primary">
                                    {isFlipped ? 'Answer' : `Card ${i + 1} (Tap to Flip)`}
                                  </div>
                                  <p className="line-clamp-2 text-xs font-medium text-white">
                                    {isFlipped ? fc.back : fc.front}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quiz Tab */}
                    {studyTab === 'quiz' && (
                      <div className="space-y-3 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                        {(!selectedUpload.quiz || selectedUpload.quiz.length === 0) ? (
                          <p className="text-xs text-muted-foreground">No quiz questions generated.</p>
                        ) : (
                          selectedUpload.quiz.slice(0, 2).map((q, qIdx) => (
                            <div
                              key={qIdx}
                              className="rounded-lg border border-white/[0.06] bg-black/40 p-3 space-y-2"
                            >
                              <p className="text-xs font-semibold text-white">
                                Q{qIdx + 1}: {q.question}
                              </p>
                              <div className="grid gap-1.5 sm:grid-cols-2">
                                {q.options.map((opt, oIdx) => {
                                  const selected = quizAnswers[qIdx] === oIdx;
                                  const isCorrect = q.answer === oIdx;
                                  return (
                                    <button
                                      key={oIdx}
                                      onClick={() =>
                                        setQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                                      }
                                      className={`rounded border p-2 text-left text-[11px] transition ${
                                        selected
                                          ? isCorrect
                                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                                            : 'border-rose-500 bg-rose-500/20 text-rose-300'
                                          : 'border-white/[0.06] bg-black/20 text-neutral-300 hover:border-white/[0.15]'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Mini Projects Tab */}
                    {studyTab === 'projects' && (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {(!selectedUpload.miniProjects || selectedUpload.miniProjects.length === 0) ? (
                          <p className="text-xs text-muted-foreground">No mini projects generated.</p>
                        ) : (
                          selectedUpload.miniProjects.slice(0, 2).map((proj, pIdx) => (
                            <div
                              key={pIdx}
                              className="rounded-lg border border-white/[0.06] bg-black/40 p-3 space-y-1"
                            >
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Lightbulb className="h-3 w-3 text-amber-400" />
                                {proj.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{proj.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Coding Exercises Tab */}
                    {studyTab === 'exercises' && (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {(!selectedUpload.codingExercises || selectedUpload.codingExercises.length === 0) ? (
                          <p className="text-xs text-muted-foreground">No coding exercises generated.</p>
                        ) : (
                          selectedUpload.codingExercises.slice(0, 2).map((ex, eIdx) => (
                            <div
                              key={eIdx}
                              className="rounded-lg border border-white/[0.06] bg-black/40 p-3 space-y-1"
                            >
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Terminal className="h-3 w-3 text-emerald-400" />
                                {ex.title}
                              </p>
                              <p className="text-[11px] text-neutral-300">{ex.description}</p>
                              {ex.hint ? (
                                <p className="text-[10px] text-primary italic">Hint: {ex.hint}</p>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-6 text-center">
                    <GraduationCap className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
                    <p className="text-xs font-medium text-white">No lecture selected</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Upload slides or notes above to generate your study material
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 2: PROGRAMMING RESOURCES (LEARNING HUB)          */}
        {/* ======================================================== */}
        {activeSection === 'programming' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Code2 className="h-4 w-4 text-primary" />
                  Learning Hub Tracks
                </span>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary font-bold">
                  {filteredTech.length} Available
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={techSearch}
                    onChange={(e) => setTechSearch(e.target.value)}
                    placeholder="Search languages or topics..."
                    className="h-8 w-48 rounded-md border border-white/[0.08] bg-black/40 pl-8 pr-3 text-xs text-white placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {/* Categories */}
                <div className="flex items-center gap-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'languages', label: 'Core Languages' },
                    { id: 'web', label: 'Web & UI' },
                    { id: 'data', label: 'Data & SQL' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setTechFilter(filter.id)}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                        techFilter === filter.id
                          ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                          : 'bg-white/[0.04] text-muted-foreground hover:text-white'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid of Learning Hub Programming Resources */}
            {loadingTech ? (
              <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                Loading Learning Hub curriculum tracks...
              </div>
            ) : filteredTech.length === 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-8 text-center text-xs text-muted-foreground">
                No programming resources found matching your search.
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTech.map((tech) => (
                  <div
                    key={tech.id}
                    className="group flex flex-col justify-between rounded-xl border border-white/[0.07] bg-black/35 p-4 hover:border-primary/40 hover:bg-black/50 transition shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <Terminal className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition" />
                          {tech.name}
                        </span>
                        <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
                          {tech.difficulty}
                        </span>
                      </div>

                      <p className="line-clamp-2 text-xs text-neutral-300 leading-5">
                        {tech.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-mono">
                          {tech.completedLessons} of {tech.totalLessons} lessons
                        </span>
                        <span className="font-mono font-bold text-primary">
                          {tech.progressPercent}%
                        </span>
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-300"
                          style={{ width: `${Math.max(tech.progressPercent, 4)}%` }}
                        />
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {tech.category}
                        </span>
                        <Link href={`/learning-hub?subject=${tech.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary hover:text-black gap-1"
                          >
                            Study Track <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Learning Hub Quick Navigation Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 gap-3">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-primary shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-white">
                    Need full W3Schools verified curriculum or coding challenges?
                  </span>
                  <span className="text-muted-foreground block sm:inline sm:ml-1">
                    Explore all tracks, coding exercises, and tests in the dedicated Learning Hub.
                  </span>
                </div>
              </div>
              <Link href="/learning-hub">
                <Button size="sm" className="bg-primary text-black hover:bg-primary/90 text-xs font-bold shrink-0">
                  Open Learning Hub <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}
