'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Bot,
  Briefcase,
  CheckCircle2,
  Code2,
  Cpu,
  Globe2,
  GraduationCap,
  Play,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

const pillars = [
  { icon: Bot, title: 'AI Powered Learning', desc: 'Personalized learning paths with assistant guidance.' },
  { icon: Code2, title: 'Hands-on Coding', desc: 'Real-world challenges, test cases, and projects.' },
  { icon: Users, title: 'Community Impact', desc: 'Work on sustainability projects with real teams.' },
  { icon: Briefcase, title: 'Career Readiness', desc: 'Interviews, portfolios, resumes, and progress.' },
];

const metrics = [
  ['XP Earned', '2,450', '+160 this week'],
  ['Coding Streak', '14 Days', 'Keep it up'],
  ['Tasks Done', '23', '+5 from last week'],
  ['Wellness Score', '78%', 'Good balance'],
];

const partners = ['DUT', 'UNISA', 'WSU', 'NWU', 'VUT'];

function ProductPreview() {
  const activity = [45, 68, 52, 80, 72, 88, 64];

  return (
    <div className="relative min-h-[520px] w-full overflow-hidden rounded-lg border border-white/[0.08] bg-[#071015] p-5 shadow-2xl shadow-black/40">
      <div className="absolute inset-0 dashboard-grid opacity-60" />
      <div className="relative grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-lg border border-primary/20 bg-black/35 p-4"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Student Command Center</p>
              <h3 className="text-lg font-semibold text-white">Good morning, Lerato</h3>
            </div>
            <span className="rounded-full bg-primary/[0.15] px-3 py-1 text-xs font-semibold text-primary">Live</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.map(([label, value, caption]) => (
              <div key={label} className="rounded-lg border border-white/[0.07] bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-bold text-white">{value}</p>
                <p className="text-[11px] text-primary">{caption}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-white/[0.07] bg-black/25 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Weekly Activity</p>
              <p className="text-xs text-muted-foreground">Mon-Sun</p>
            </div>
            <div className="flex h-28 items-end gap-2">
              {activity.map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-primary/50 to-emerald-300"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-lg border border-white/[0.08] bg-black/35 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-white">AI Workspace</p>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-[#071015] p-3 font-mono text-xs leading-6 text-muted-foreground">
              <p><span className="text-primary">for</span> (let i = 0; i &lt; goals.length; i++) {'{'}</p>
              <p className="pl-4">buildProject(goals[i]);</p>
              <p>{'}'}</p>
            </div>
            <p className="mt-3 rounded-lg bg-primary/10 p-3 text-xs text-primary">
              Time complexity improved. Recommended next step: add tests.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="rounded-lg border border-white/[0.08] bg-black/35 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-white">Learning Progress</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {['SkillUp', 'Projects', 'Community', 'Career'].map((item, index) => (
                <div key={item} className="rounded-lg bg-secondary/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-muted-foreground">{item}</span>
                    <span className="font-semibold text-white">{[80, 65, 75, 60][index]}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${[80, 65, 75, 60][index]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden">
      <header className="fixed top-0 z-50 w-full border-b border-white/[0.08] bg-[#030608]/82 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-white">SynergySphere</span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-primary">Features</a>
            <a href="#solutions" className="transition hover:text-primary">Solutions</a>
            <a href="#pricing" className="transition hover:text-primary">Pricing</a>
            <a href="#about" className="transition hover:text-primary">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link href="/register"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <GraduationCap className="h-3.5 w-3.5" />
                Student success operating system
              </div>
              <h1 className="text-5xl font-extrabold tracking-normal text-white md:text-6xl">
                SynergySphere
              </h1>
              <p className="mt-3 text-4xl font-extrabold tracking-normal text-white md:text-5xl">
                Empower. Learn. Build. <span className="gradient-text">Impact.</span>
              </p>
              <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
                The all-in-one AI command center for IT students and junior developers. Learn skills, build projects, support communities, and accelerate your career.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/register">
                  <Button className="w-full sm:w-auto">
                    Start Learning
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Play className="h-4 w-4" />
                    Watch Demo
                  </Button>
                </Link>
              </div>
            </motion.div>

            <div id="features" className="mt-12 grid gap-4 sm:grid-cols-2">
              {pillars.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.08 }}
                  className="rounded-lg border border-white/[0.08] bg-card/70 p-4"
                >
                  <feature.icon className="mb-3 h-5 w-5 text-primary" />
                  <h2 className="text-sm font-semibold text-white">{feature.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <ProductPreview />
        </section>

        <section id="solutions" className="border-y border-white/[0.08] bg-black/20 px-6 py-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5">
            <p className="text-xs text-muted-foreground">Trusted by students from</p>
            <div className="flex flex-wrap items-center gap-8 text-lg font-bold tracking-wide text-muted-foreground">
              {partners.map((partner) => <span key={partner}>{partner}</span>)}
              <span className="text-xs font-medium">and more</span>
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto grid max-w-7xl gap-5 px-6 py-12 md:grid-cols-3">
          {[
            ['One hub', 'Learning, productivity, AI support, wellness, and career progress live in the same focused workspace.'],
            ['Real proof', 'Students can turn challenges, project work, and community contributions into portfolio-ready evidence.'],
            ['Built for SA campuses', 'University-friendly workflows, demo accounts, and project categories that support local impact.'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg border border-white/[0.08] bg-card/70 p-5">
              <CheckCircle2 className="mb-4 h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>

        <footer id="pricing" className="border-t border-white/[0.08] px-6 py-8 text-center text-xs text-muted-foreground">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" />
            <p>SynergySphere 2026 - University Capstone Project</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
