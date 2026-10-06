'use client';

import React, { useState, useMemo } from 'react';
import { WellnessEntry, ModuleMetadata } from './types';
import {
  Calendar,
  Layers,
  Zap,
  Clock,
  CheckCircle2,
  Activity,
  Flame,
} from 'lucide-react';

interface InteractiveTrendsAnalyticsProps {
  entries: WellnessEntry[];
  modules: ModuleMetadata[];
}

type TimeRange = '7D' | '30D' | 'SEMESTER';

export function InteractiveTrendsAnalytics({
  entries,
  modules,
}: InteractiveTrendsAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [activeMetrics, setActiveMetrics] = useState({
    stress: true,
    mood: true,
    energy: true,
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter entries according to time range
  const filteredEntries = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const now = new Date().getTime();
    if (timeRange === '7D') {
      const cut = now - 7 * 86400000;
      const res = sorted.filter((e) => new Date(e.date).getTime() >= cut);
      return res.length >= 3 ? res : sorted.slice(-7);
    } else if (timeRange === '30D') {
      const cut = now - 30 * 86400000;
      const res = sorted.filter((e) => new Date(e.date).getTime() >= cut);
      return res.length >= 5 ? res : sorted.slice(-20);
    } else {
      // Semester: up to 120 days
      const cut = now - 120 * 86400000;
      const res = sorted.filter((e) => new Date(e.date).getTime() >= cut);
      return res.length > 0 ? res : sorted;
    }
  }, [entries, timeRange]);

  // Averages for filtered slice
  const stats = useMemo(() => {
    if (filteredEntries.length === 0) return { avgStress: 0, avgMood: 0, avgEnergy: 0 };
    const avgStress =
      filteredEntries.reduce((acc, curr) => acc + curr.stressLevel, 0) / filteredEntries.length;
    const avgMood =
      filteredEntries.reduce((acc, curr) => acc + curr.mood, 0) / filteredEntries.length;
    const avgEnergy =
      filteredEntries.reduce((acc, curr) => acc + curr.energyLevel, 0) / filteredEntries.length;

    return {
      avgStress: Number(avgStress.toFixed(1)),
      avgMood: Number(avgMood.toFixed(1)),
      avgEnergy: Number(avgEnergy.toFixed(1)),
    };
  }, [filteredEntries]);

  // Module Correlation Heatmap Data
  const correlationData = useMemo(() => {
    const map: Record<
      string,
      { count: number; totalStress: number; totalEnergy: number; totalMood: number; highStressCount: number; highEnergyCount: number }
    > = {};

    entries.forEach((e) => {
      const mod = e.moduleId || 'GENERAL';
      if (!map[mod]) {
        map[mod] = { count: 0, totalStress: 0, totalEnergy: 0, totalMood: 0, highStressCount: 0, highEnergyCount: 0 };
      }
      map[mod].count += 1;
      map[mod].totalStress += e.stressLevel;
      map[mod].totalEnergy += e.energyLevel;
      map[mod].totalMood += e.mood;
      if (e.stressLevel > 6) map[mod].highStressCount += 1;
      if (e.energyLevel >= 7) map[mod].highEnergyCount += 1;
    });

    return modules.map((mod) => {
      const entry = map[mod.id] || {
        count: 0,
        totalStress: 0,
        totalEnergy: 0,
        totalMood: 0,
        highStressCount: 0,
        highEnergyCount: 0,
      };
      const count = entry.count || 1;
      const avgStress = entry.count ? Number((entry.totalStress / count).toFixed(1)) : 0;
      const avgEnergy = entry.count ? Number((entry.totalEnergy / count).toFixed(1)) : 0;
      const avgMood = entry.count ? Number((entry.totalMood / count).toFixed(1)) : 0;
      const netStrain = Number((avgStress - avgEnergy).toFixed(1));

      return {
        ...mod,
        count: entry.count,
        avgStress,
        avgEnergy,
        avgMood,
        netStrain,
        highStressCount: entry.highStressCount,
        highEnergyCount: entry.highEnergyCount,
      };
    });
  }, [entries, modules]);

  // SVG Chart Geometry
  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 35 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Build points
  const points = useMemo(() => {
    if (filteredEntries.length === 0) return [];
    const count = filteredEntries.length;
    const stepX = count > 1 ? graphWidth / (count - 1) : graphWidth / 2;

    return filteredEntries.map((e, idx) => {
      const x = padding.left + (count > 1 ? idx * stepX : graphWidth / 2);
      // scale 1 to 10 onto graphHeight
      const getY = (val: number) =>
        padding.top + graphHeight - ((val - 1) / 9) * graphHeight;

      return {
        entry: e,
        x,
        yStress: getY(e.stressLevel),
        yMood: getY(e.mood),
        yEnergy: getY(e.energyLevel),
      };
    });
  }, [filteredEntries, graphWidth, graphHeight]);

  // Cubic Bezier SVG Curve Generator
  const generateSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 3;
      const cp1y = curr.y;
      const cp2x = curr.x + ((next.x - curr.x) * 2) / 3;
      const cp2y = next.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const stressPath = useMemo(
    () => generateSmoothPath(points.map((p) => ({ x: p.x, y: p.yStress }))),
    [points],
  );
  const moodPath = useMemo(
    () => generateSmoothPath(points.map((p) => ({ x: p.x, y: p.yMood }))),
    [points],
  );
  const energyPath = useMemo(
    () => generateSmoothPath(points.map((p) => ({ x: p.x, y: p.yEnergy }))),
    [points],
  );

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-black/30 p-3.5">
        {/* Metric Toggles */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
            Metrics:
          </span>
          <button
            type="button"
            onClick={() => setActiveMetrics((m) => ({ ...m, stress: !m.stress }))}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition border ${
              activeMetrics.stress
                ? 'border-pink-500/50 bg-pink-500/15 text-pink-300 shadow-sm shadow-pink-500/20'
                : 'border-white/[0.06] bg-black/20 text-muted-foreground/60'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-pink-400" />
            <span>Stress Level</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMetrics((m) => ({ ...m, mood: !m.mood }))}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition border ${
              activeMetrics.mood
                ? 'border-purple-500/50 bg-purple-500/15 text-purple-300 shadow-sm shadow-purple-500/20'
                : 'border-white/[0.06] bg-black/20 text-muted-foreground/60'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span>Mood</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMetrics((m) => ({ ...m, energy: !m.energy }))}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition border ${
              activeMetrics.energy
                ? 'border-teal-500/50 bg-teal-500/15 text-teal-300 shadow-sm shadow-teal-500/20'
                : 'border-white/[0.06] bg-black/20 text-muted-foreground/60'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            <span>Energy Level</span>
          </button>
        </div>

        {/* Time-Range Selector */}
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-black/50 p-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-1" />
          {(['7D', '30D', 'SEMESTER'] as TimeRange[]).map((range) => {
            const labels: Record<TimeRange, string> = {
              '7D': '7 Days',
              '30D': '30 Days',
              SEMESTER: 'Semester',
            };
            return (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  timeRange === range
                    ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {labels[range]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Analytics Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3 text-center">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Entries Logged</span>
          <p className="text-xl font-black text-white font-mono">{filteredEntries.length}</p>
        </div>
        <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-3 text-center">
          <span className="text-[11px] uppercase tracking-wider text-pink-300">Period Avg Stress</span>
          <p className="text-xl font-black text-pink-400 font-mono">{stats.avgStress}/10</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-center">
          <span className="text-[11px] uppercase tracking-wider text-purple-300">Period Avg Mood</span>
          <p className="text-xl font-black text-purple-400 font-mono">{stats.avgMood}/10</p>
        </div>
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 text-center">
          <span className="text-[11px] uppercase tracking-wider text-teal-300">Period Avg Energy</span>
          <p className="text-xl font-black text-teal-400 font-mono">{stats.avgEnergy}/10</p>
        </div>
      </div>

      {/* Multi-Line & Area Chart Card */}
      <div className="relative rounded-xl border border-white/[0.08] bg-[#0c141a]/90 backdrop-blur-xl p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Wellness &amp; Cognitive Load Trajectory
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Hover over points to inspect tasks &amp; ratings
          </span>
        </div>

        {/* SVG Visualization */}
        <div className="relative w-full overflow-x-auto scrollbar-thin">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[650px] select-none"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f472b6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[2, 4, 6, 8, 10].map((level) => {
              const y = padding.top + graphHeight - ((level - 1) / 9) * graphHeight;
              return (
                <g key={level}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    fill="rgba(255,255,255,0.35)"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {level}
                  </text>
                </g>
              );
            })}

            {/* Area Fills */}
            {points.length > 1 && (
              <>
                {activeMetrics.stress && (
                  <path
                    d={`${stressPath} L ${points[points.length - 1].x} ${
                      padding.top + graphHeight
                    } L ${points[0].x} ${padding.top + graphHeight} Z`}
                    fill="url(#stressGrad)"
                  />
                )}
                {activeMetrics.mood && (
                  <path
                    d={`${moodPath} L ${points[points.length - 1].x} ${
                      padding.top + graphHeight
                    } L ${points[0].x} ${padding.top + graphHeight} Z`}
                    fill="url(#moodGrad)"
                  />
                )}
                {activeMetrics.energy && (
                  <path
                    d={`${energyPath} L ${points[points.length - 1].x} ${
                      padding.top + graphHeight
                    } L ${points[0].x} ${padding.top + graphHeight} Z`}
                    fill="url(#energyGrad)"
                  />
                )}
              </>
            )}

            {/* Glowing Stroke Lines */}
            {activeMetrics.stress && stressPath && (
              <path
                d={stressPath}
                fill="none"
                stroke="#f472b6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(244, 114, 182, 0.4))' }}
              />
            )}
            {activeMetrics.mood && moodPath && (
              <path
                d={moodPath}
                fill="none"
                stroke="#c084fc"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(192, 132, 252, 0.4))' }}
              />
            )}
            {activeMetrics.energy && energyPath && (
              <path
                d={energyPath}
                fill="none"
                stroke="#2dd4bf"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(45, 212, 191, 0.4))' }}
              />
            )}

            {/* Vertical crosshair if point hovered */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={padding.top + graphHeight}
                stroke="rgba(255,255,255,0.4)"
                strokeDasharray="3 3"
              />
            )}

            {/* Interactive Data Nodes */}
            {points.map((p, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <g
                  key={p.entry.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                >
                  {/* Invisible hit target for smooth mouse tracking */}
                  <rect
                    x={p.x - 12}
                    y={padding.top}
                    width={24}
                    height={graphHeight}
                    fill="transparent"
                  />

                  {/* Stress point */}
                  {activeMetrics.stress && (
                    <circle
                      cx={p.x}
                      cy={p.yStress}
                      r={isHovered ? 6 : 3.5}
                      fill="#f472b6"
                      stroke="#0c141a"
                      strokeWidth="2"
                    />
                  )}

                  {/* Mood point */}
                  {activeMetrics.mood && (
                    <circle
                      cx={p.x}
                      cy={p.yMood}
                      r={isHovered ? 6 : 3.5}
                      fill="#c084fc"
                      stroke="#0c141a"
                      strokeWidth="2"
                    />
                  )}

                  {/* Energy point */}
                  {activeMetrics.energy && (
                    <circle
                      cx={p.x}
                      cy={p.yEnergy}
                      r={isHovered ? 6 : 3.5}
                      fill="#2dd4bf"
                      stroke="#0c141a"
                      strokeWidth="2"
                    />
                  )}

                  {/* Date label at bottom */}
                  {(points.length <= 14 || idx % Math.ceil(points.length / 10) === 0) && (
                    <text
                      x={p.x}
                      y={height - 8}
                      fill="rgba(255,255,255,0.45)"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {new Date(p.entry.date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover Tooltip Box */}
          {activePoint && (
            <div
              className="absolute z-20 pointer-events-none rounded-xl border border-white/20 bg-[#091118]/95 p-3 shadow-2xl backdrop-blur-md transition-all text-xs"
              style={{
                left: Math.min(
                  Math.max(activePoint.x - 100, 10),
                  width - 240,
                ),
                top: 30,
              }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2 gap-3">
                <span className="font-mono text-muted-foreground text-[11px]">
                  {new Date(activePoint.entry.date).toLocaleDateString()} at{' '}
                  {new Date(activePoint.entry.date).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {activePoint.entry.moduleId && (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary font-mono">
                    {activePoint.entry.moduleId}
                  </span>
                )}
              </div>

              {/* Exact Ratings */}
              <div className="grid grid-cols-3 gap-2 mb-2 font-mono">
                <div className="rounded bg-pink-500/10 border border-pink-500/20 px-1.5 py-1 text-center">
                  <div className="text-[10px] text-pink-300">Stress</div>
                  <div className="font-bold text-pink-400 text-sm">
                    {activePoint.entry.stressLevel}
                  </div>
                </div>
                <div className="rounded bg-purple-500/10 border border-purple-500/20 px-1.5 py-1 text-center">
                  <div className="text-[10px] text-purple-300">Mood</div>
                  <div className="font-bold text-purple-400 text-sm">
                    {activePoint.entry.mood}
                  </div>
                </div>
                <div className="rounded bg-teal-500/10 border border-teal-500/20 px-1.5 py-1 text-center">
                  <div className="text-[10px] text-teal-300">Energy</div>
                  <div className="font-bold text-teal-400 text-sm">
                    {activePoint.entry.energyLevel}
                  </div>
                </div>
              </div>

              {/* Linked Task & Status */}
              {(activePoint.entry.linkedTaskTitle || activePoint.entry.taskTitle) && (
                <div className="flex items-center gap-1.5 text-[11px] text-white bg-black/40 rounded px-2 py-1 mb-1">
                  {activePoint.entry.linkedTaskStatus === 'DONE' ||
                  activePoint.entry.taskStatus === 'DONE' ? (
                    <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate max-w-[200px]">
                    {activePoint.entry.linkedTaskTitle || activePoint.entry.taskTitle}
                  </span>
                </div>
              )}

              {/* Notes or Gratitude */}
              {activePoint.entry.notes && (
                <p className="text-[11px] text-muted-foreground italic truncate max-w-[220px]">
                  &ldquo;{activePoint.entry.notes}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Academic vs. Wellness Correlation Heatmap */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0c141a]/90 backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Academic vs. Wellness Correlation Heatmap
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Analyzing cognitive strain vs. flow state triggers across platform modules
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Net Strain = Avg Stress − Avg Energy
          </span>
        </div>

        {/* Heatmap Grid Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {correlationData.map((item) => {
            const ModIcon = item.icon;
            // Determine heat tier:
            // High Stress (Net Strain > 1.0) -> Red/Pink
            // High Flow (Net Strain < -1.0) -> Green/Emerald
            // Neutral -> Cyan/Slate
            const isHighStrain = item.avgStress >= 6.0 || item.netStrain > 0.8;
            const isHighFlow = item.avgEnergy >= 6.5 && item.netStrain <= -0.5;

            return (
              <div
                key={item.id}
                className={`relative overflow-hidden rounded-xl border p-3.5 transition-all ${
                  isHighStrain
                    ? 'border-pink-500/30 bg-gradient-to-br from-[#1b0d14] to-black/60 shadow-md shadow-pink-500/5'
                    : isHighFlow
                    ? 'border-emerald-500/30 bg-gradient-to-br from-[#0c1b14] to-black/60 shadow-md shadow-emerald-500/5'
                    : 'border-white/[0.08] bg-black/30'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ModIcon className="h-4 w-4 shrink-0" style={{ color: item.color }} />
                    <span className="font-bold text-xs text-white truncate">{item.label}</span>
                  </div>

                  <span className="text-[10px] text-muted-foreground font-mono rounded bg-white/[0.05] px-1.5 py-0.5">
                    {item.count} logs
                  </span>
                </div>

                {/* Heatmap Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs my-2 font-mono">
                  <div className="rounded-lg bg-black/40 border border-white/[0.05] p-1.5">
                    <div className="text-[10px] text-pink-300">Stress</div>
                    <div className="font-bold text-pink-400">{item.avgStress}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 border border-white/[0.05] p-1.5">
                    <div className="text-[10px] text-teal-300">Energy</div>
                    <div className="font-bold text-teal-400">{item.avgEnergy}</div>
                  </div>
                  <div className="rounded-lg bg-black/40 border border-white/[0.05] p-1.5">
                    <div className="text-[10px] text-muted-foreground">Strain</div>
                    <div
                      className={`font-bold ${
                        item.netStrain > 0
                          ? 'text-pink-400'
                          : item.netStrain < 0
                          ? 'text-emerald-400'
                          : 'text-white'
                      }`}
                    >
                      {item.netStrain > 0 ? `+${item.netStrain}` : item.netStrain}
                    </div>
                  </div>
                </div>

                {/* Actionable Correlation Diagnosis */}
                <div className="mt-2 pt-2 border-t border-white/[0.06] text-[11px] leading-tight">
                  {isHighStrain ? (
                    <span className="text-pink-300/90 flex items-center gap-1 font-medium">
                      <Flame className="h-3 w-3 text-pink-400 shrink-0" />
                      <span>High cognitive friction. Apply 25m Pomodoro slices.</span>
                    </span>
                  ) : isHighFlow ? (
                    <span className="text-emerald-300/90 flex items-center gap-1 font-medium">
                      <Zap className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span>Peak flow state trigger. Ideal for complex challenges.</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                      <span>Balanced workload and mental reserve.</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
