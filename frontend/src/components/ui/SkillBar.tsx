import React from 'react';

interface SkillBarProps {
  name: string;
  percent: number;
  subtitle?: string;
  unlocked?: boolean;
}

export function SkillBar({ name, percent, subtitle, unlocked = true }: SkillBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-white flex items-center gap-1.5">
          {name}
          {!unlocked && (
            <span className="text-[10px] text-muted-foreground/60">(Not started)</span>
          )}
        </span>
        <span className="font-semibold text-primary font-mono">{clampedPercent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/[0.05]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-emerald-400 transition-all duration-500 ease-out"
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
