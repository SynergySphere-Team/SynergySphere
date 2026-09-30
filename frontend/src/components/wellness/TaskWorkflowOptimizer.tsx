'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskDeconstruction } from './types';
import { generateDynamicTaskDeconstruction } from './mockData';
import {
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle2,
  Circle,
  BookOpen,
  Split,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Wand2,
} from 'lucide-react';

interface TaskWorkflowOptimizerProps {
  linkedTask?: Task | null;
  customTaskTitle?: string;
  selectedModuleId: string;
  stressLevel: number;
  energyLevel: number;
}

export function TaskWorkflowOptimizer({
  linkedTask,
  customTaskTitle,
  selectedModuleId,
  stressLevel,
  energyLevel,
}: TaskWorkflowOptimizerProps) {
  const activeTitle = customTaskTitle?.trim() || linkedTask?.title;
  const isHighStrain = stressLevel > 6 || energyLevel < 5;

  const [deconstruction, setDeconstruction] = useState<TaskDeconstruction | null>(null);
  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'subtasks' | 'resources'>('subtasks');

  // Trigger task deconstruction when active task or strain changes
  useEffect(() => {
    if (activeTitle) {
      const result = generateDynamicTaskDeconstruction(
        activeTitle,
        selectedModuleId,
        stressLevel,
        energyLevel,
      );
      setDeconstruction(result);
      setCompletedSubtasks({});
    } else {
      setDeconstruction(null);
    }
  }, [activeTitle, selectedModuleId, stressLevel, energyLevel]);

  const toggleSubtask = (id: string) => {
    setCompletedSubtasks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // If no task is entered yet, show an inviting idle preview with prompt to select or type a task
  if (!activeTitle) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4 transition-all">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-cyan-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Task & Workflow Optimizer
            </h4>
          </div>
          <span className="text-[10px] rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-cyan-300 font-mono">
            AI Ready
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Link an active task or type an activity on the left. If your stress is &gt;6 or energy &lt;5,
          the AI engine automatically deconstructs bloated tasks into low-friction 25-minute Pomodoro sprints
          and curates documentation guides!
        </p>
      </div>
    );
  }

  if (!deconstruction) return null;

  const totalSubtasks = deconstruction.subtasks.length;
  const completedCount = Object.values(completedSubtasks).filter(Boolean).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#09151f] to-[#060b10] p-4 shadow-lg shadow-cyan-500/5">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Wand2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Task & Workflow Optimizer
              </h4>
              {isHighStrain && (
                <span className="rounded-full bg-pink-500/20 border border-pink-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-pink-300 animate-pulse">
                  High Strain Mode
                </span>
              )}
            </div>
            <p className="truncate text-xs font-medium text-cyan-300/90 font-mono">
              Analyzing: &ldquo;{activeTitle}&rdquo;
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-lg p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-white transition"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3.5 pt-1">
          {/* AI Analysis Diagnosis */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Split className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
              <div className="text-xs space-y-1">
                <p className="text-foreground/90 font-medium">
                  {deconstruction.bloatAnalysis}
                </p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  <strong className="text-cyan-300">Actionable Advice: </strong>
                  {deconstruction.actionableAdvice}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/[0.08] gap-4 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('subtasks')}
              className={`pb-2 font-semibold transition border-b-2 flex items-center gap-1.5 ${
                activeTab === 'subtasks'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Low-Friction Subtasks</span>
              <span className="rounded-full bg-white/[0.08] px-1.5 py-0.2 text-[10px] font-mono">
                {completedCount}/{totalSubtasks}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={`pb-2 font-semibold transition border-b-2 flex items-center gap-1.5 ${
                activeTab === 'resources'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Curated Online Engine</span>
              <span className="rounded-full bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 text-[10px] font-mono">
                {deconstruction.curatedResources.length}
              </span>
            </button>
          </div>

          {/* Tab Content: Subtasks */}
          {activeTab === 'subtasks' && (
            <div className="space-y-2">
              {/* Progress bar */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>Task Slicing Progress</span>
                <span className="text-cyan-300 font-bold">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="space-y-2 pt-1">
                {deconstruction.subtasks.map((sub, i) => {
                  const isDone = !!completedSubtasks[sub.id];
                  return (
                    <div
                      key={sub.id}
                      onClick={() => toggleSubtask(sub.id)}
                      className={`flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition select-none ${
                        isDone
                          ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-muted-foreground'
                          : 'border-white/[0.08] bg-black/30 hover:border-cyan-500/30 hover:bg-black/50 text-foreground'
                      }`}
                    >
                      <button type="button" className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/60 hover:text-cyan-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold ${isDone ? 'line-through text-muted-foreground' : 'text-white'}`}>
                            {i + 1}. {sub.title}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono shrink-0">
                            <Clock className="h-3 w-3 text-cyan-400" />
                            {sub.durationMinutes} min
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {sub.rationale}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab Content: Curated Online Resources */}
          {activeTab === 'resources' && (
            <div className="space-y-2.5">
              <p className="text-[11px] text-muted-foreground">
                Tailored 1–2 online resources for the stack &amp; blockers identified in your session:
              </p>

              <div className="grid gap-2.5">
                {deconstruction.curatedResources.map((res) => (
                  <div
                    key={res.id}
                    className="group relative rounded-xl border border-white/[0.08] bg-black/40 p-3 transition hover:border-cyan-500/40 hover:bg-black/60"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                          {res.badge}
                        </span>
                        <span className="rounded-md bg-secondary/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                          {res.techStack}
                        </span>
                        <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                          {res.readTime}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            res.difficulty === 'Beginner'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : res.difficulty === 'Intermediate'
                              ? 'text-cyan-400 bg-cyan-500/10'
                              : 'text-purple-400 bg-purple-500/10'
                          }`}
                        >
                          {res.difficulty}
                        </span>
                      </div>

                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition shrink-0 group-hover:translate-x-0.5"
                      >
                        <span>Open Guide</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <h5 className="text-xs font-bold text-white mb-1 group-hover:text-cyan-300 transition">
                      {res.title}
                    </h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {res.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
