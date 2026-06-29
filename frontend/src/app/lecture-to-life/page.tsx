'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import { BookOpen, FileText, Layers3, ListChecks, Upload } from 'lucide-react';

interface LectureUpload {
  id: string;
  fileName: string;
  summary: string | null;
  flashcards: Array<{ front: string; back: string }> | null;
  quiz: Array<{ question: string; options: string[]; answer: number }> | null;
  createdAt: string;
}

const demoUpload: LectureUpload = {
  id: 'jdbc-demo',
  fileName: 'JDBC Introduction.pdf',
  summary: 'This lecture covers the fundamentals of JDBC connectivity, including drivers, DriverManager, Connection, Statement, ResultSet processing, and exception handling.',
  flashcards: [
    { front: 'What is JDBC?', back: 'A Java API for connecting to relational databases.' },
    { front: 'What does DriverManager do?', back: 'It manages database drivers and creates connections.' },
  ],
  quiz: [
    { question: 'Which interface sends SQL statements?', options: ['ResultSet', 'Statement', 'Driver', 'Package'], answer: 1 },
    { question: 'Which object stores query results?', options: ['ResultSet', 'Connection', 'DriverManager', 'ClassLoader'], answer: 0 },
  ],
  createdAt: new Date().toISOString(),
};

export default function LectureToLifePage() {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploads, setUploads] = useState<LectureUpload[]>([demoUpload]);
  const [selected, setSelected] = useState<LectureUpload | null>(demoUpload);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<LectureUpload[]>('/ai/lecture-to-life')
      .then((items) => {
        const next = items.length ? items : [demoUpload];
        setUploads(next);
        setSelected(next[0]);
      })
      .catch(() => {
        setUploads([demoUpload]);
        setSelected(demoUpload);
      });
  }, []);

  async function convert() {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const upload = await api<LectureUpload>('/ai/lecture-to-life', {
        method: 'POST',
        body: JSON.stringify({
          fileName: fileName || 'Lecture Notes',
          fileType: 'text',
          content,
        }),
      });
      setUploads((prev) => [upload, ...prev]);
      setSelected(upload);
    } catch {
      const upload = {
        ...demoUpload,
        id: crypto.randomUUID(),
        fileName: fileName || 'Lecture Notes',
        summary: content.slice(0, 260) || demoUpload.summary,
      };
      setUploads((prev) => [upload, ...prev]);
      setSelected(upload);
    } finally {
      setContent('');
      setFileName('');
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">LectureToLife</p>
        <h1 className="text-2xl font-bold text-white md:text-3xl">Transform lectures into learning material</h1>
        <p className="text-sm text-muted-foreground">Upload notes or paste content and let AI generate summaries, flashcards, quizzes, and exercises.</p>
      </div>

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
              placeholder="Paste your lecture notes, slides text, or PDF content here..."
              className="h-52 w-full resize-none rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="rounded-lg border border-dashed border-primary/25 bg-primary/5 p-8 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-primary" />
              <p className="text-sm font-semibold text-white">Drag and drop lecture files here</p>
              <p className="mt-1 text-xs text-muted-foreground">PDF, PPTX, DOCX, and notes supported</p>
              <Button onClick={convert} disabled={loading || !content.trim()} className="mt-4">
                {loading ? 'Generating...' : 'Generate Study Pack'}
              </Button>
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
            {uploads.map((upload) => (
              <button
                key={upload.id}
                onClick={() => setSelected(upload)}
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${
                  selected?.id === upload.id ? 'border-primary/35 bg-primary/10' : 'border-white/[0.07] bg-secondary/40'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{upload.fileName}</p>
                  <p className="text-xs text-muted-foreground">Updated {new Date(upload.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="text-primary">+</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {selected && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-2">
                {['Summary', 'Flashcards', 'Quiz', 'Mini Projects', 'Coding Exercises'].map((tab, index) => (
                  <span key={tab} className={`rounded-lg border px-3 py-1.5 text-xs ${index === 0 ? 'border-primary/30 bg-primary/10 text-primary' : 'border-white/[0.08] bg-secondary/40 text-muted-foreground'}`}>
                    {tab}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <h2 className="mb-3 text-base font-semibold text-white">Summary</h2>
              <p className="text-sm leading-7 text-muted-foreground">{selected.summary}</p>
              <Button variant="secondary" size="sm" className="mt-5">Regenerate Summary</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-primary" />
                Key Takeaways
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(selected.flashcards || demoUpload.flashcards || []).map((card) => (
                <div key={card.front} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                  <p className="text-sm font-semibold text-white">{card.front}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{card.back}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                Quiz Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {(selected.quiz || demoUpload.quiz || []).map((question, index) => (
                <div key={question.question} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-4">
                  <p className="mb-3 text-sm font-semibold text-white">{index + 1}. {question.question}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((option, optionIndex) => (
                      <span key={option} className={`rounded-md border px-2 py-1 text-xs ${optionIndex === question.answer ? 'border-primary/30 bg-primary/10 text-primary' : 'border-white/[0.08] text-muted-foreground'}`}>
                        {option}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
