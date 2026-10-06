'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkillBar } from '@/components/ui/SkillBar';
import { api, getLevelTitle } from '@/lib/utils';
import {
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Code2,
  Github,
  Layers,
  Linkedin,
  Loader2,
  MapPin,
  Mic,
  Share2,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

interface PublicProfileData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    xp: number;
    level: number;
    createdAt: string;
  };
  profile: {
    headline: string | null;
    about: string | null;
    location: string | null;
    targetRole: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
  };
  hubSkills: Array<{
    id: string;
    name: string;
    percent: number;
    completedLessons: number;
    totalLessons: number;
    unlocked: boolean;
  }>;
  challenges: {
    passedCount: number;
    passedList: Array<{ id: string; title: string; difficulty: string; language: string | null }>;
  };
  bestInterviewScores: Array<{ topic: string; bestScore: number; attempts: number }>;
  offerReadiness: {
    role: string;
    score: number;
    checklist: Array<{ label: string; met: boolean; current: string }>;
  };
  starBullets: Array<{ id: string; title: string; bullet: string; source: string }>;
  joinedProjects: Array<{ id: string; title: string; role: string; category?: string }>;
  featuredProjects: Array<{ id: string; title: string; description: string; projectLink?: string; githubLink?: string }>;
}

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params?.id as string;

  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId) return;
    api<PublicProfileData>(`/portfolio/public/${userId}`)
      .then(setData)
      .catch((err) => setError(err.message || 'Developer profile not found.'))
      .finally(() => setLoading(false));
  }, [userId]);

  function copyShareLink() {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050a0d]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050a0d] p-4 text-center">
        <div className="rounded-xl border border-white/[0.08] bg-[#071015] p-8 max-w-md">
          <p className="text-base font-semibold text-white">Profile Not Found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The requested junior developer profile link is invalid or has been made private.
          </p>
          <Link href="/">
            <Button size="sm" className="mt-4">
              Return to SynergySphere
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { user, profile, hubSkills, challenges, bestInterviewScores, offerReadiness, starBullets, joinedProjects } = data;
  const activeHubSkills = hubSkills.filter((s) => s.percent > 0);

  return (
    <div className="min-h-screen bg-[#050a0d] text-foreground py-10 px-4 sm:px-6 lg:px-8 selection:bg-primary selection:text-black">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">SynergySphere</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyShareLink} className="gap-1.5 text-xs">
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? 'Link Copied!' : 'Share Profile'}
            </Button>
            <Link href="/register">
              <Button size="sm" className="text-xs">
                Join SynergySphere
              </Button>
            </Link>
          </div>
        </div>

        {/* Profile Header */}
        <Card className="border-white/[0.08] bg-[#071015]/95 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {user.firstName} {user.lastName}
                  </h1>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <ShieldCheck className="h-3 w-3" /> Verified Student
                  </span>
                </div>
                <p className="text-sm font-semibold text-primary">
                  {profile.targetRole || 'Junior Software Engineer'} • {getLevelTitle(user.level)} (Lvl {user.level})
                </p>
                {profile.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {profile.location}
                  </p>
                )}
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-2">
                {profile.githubUrl && (
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-black/30 text-muted-foreground hover:text-white hover:border-white/[0.3] transition"
                  >
                    <Github className="h-4 w-4" />
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-black/30 text-muted-foreground hover:text-white hover:border-white/[0.3] transition"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {profile.about && (
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground border-t border-white/[0.06] pt-3 max-w-2xl">
                {profile.about}
              </p>
            )}

            {/* Verified Credentials Chips */}
            <div className="mt-6 flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/[0.08] px-3 py-1.5 text-xs text-primary font-medium">
                <Zap className="h-3.5 w-3.5" />
                <span>{user.xp} Verified XP</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/[0.08] px-3 py-1.5 text-xs text-blue-400 font-medium">
                <Code2 className="h-3.5 w-3.5" />
                <span>{challenges.passedCount} Challenges Passed</span>
              </div>
              {bestInterviewScores.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/[0.08] px-3 py-1.5 text-xs text-purple-400 font-medium">
                  <Mic className="h-3.5 w-3.5" />
                  <span>Interview High: {bestInterviewScores[0].bestScore}% ({bestInterviewScores[0].topic})</span>
                </div>
              )}
              {joinedProjects.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-pink-500/20 bg-pink-500/[0.08] px-3 py-1.5 text-xs text-pink-400 font-medium">
                  <Award className="h-3.5 w-3.5" />
                  <span>{joinedProjects.length} Community Project Contribution</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Verified Skill Graph & Offer Readiness */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Measured Skills */}
          <Card className="border-white/[0.08] bg-[#071015]/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Measured Curriculum Mastery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeHubSkills.length > 0 ? (
                activeHubSkills.map((s) => (
                  <SkillBar
                    key={s.id}
                    name={s.name}
                    percent={s.percent}
                    subtitle={`${s.completedLessons} of ${s.totalLessons} lessons verified`}
                    unlocked={s.unlocked}
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Curriculum modules in progress.</p>
              )}
            </CardContent>
          </Card>

          {/* Offer Readiness Checklist */}
          <Card className="border-white/[0.08] bg-[#071015]/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Intern Readiness
                </span>
                <span className="text-xs font-mono text-primary font-bold">
                  {offerReadiness.score}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-300"
                  style={{ width: `${offerReadiness.score}%` }}
                />
              </div>
              <div className="space-y-2 pt-1">
                {offerReadiness.checklist.map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${c.met ? 'text-primary' : 'text-muted-foreground/30'}`} />
                      <span className={c.met ? 'text-white' : ''}>{c.label}</span>
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-white">{c.current}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verified STAR Bullets (Real Contributions) */}
        {starBullets.length > 0 && (
          <Card className="border-white/[0.08] bg-[#071015]/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Verified Engineering Bullets (STAR)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {starBullets.map((b) => (
                <div key={b.id} className="rounded-lg border border-white/[0.07] bg-black/25 p-3.5 space-y-1">
                  <p className="text-xs font-semibold text-primary">{b.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{b.bullet}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Passed Server-Side Challenges */}
        {challenges.passedList.length > 0 && (
          <Card className="border-white/[0.08] bg-[#071015]/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" /> Completed Code Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {challenges.passedList.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-black/25 p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground">{c.language || 'Code'} • {c.difficulty}</p>
                    </div>
                    <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-mono text-primary font-bold shrink-0">
                      Verified ✓
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center pt-8 border-t border-white/[0.06] text-xs text-muted-foreground space-y-2">
          <p>
            This public engineering profile was verified cryptographically and server-evaluated on{' '}
            <span className="text-white font-medium">SynergySphere</span>.
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} SynergySphere. Learn. Build. Impact.
          </p>
        </div>
      </div>
    </div>
  );
}
