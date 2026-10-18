'use client';

import React, { useState } from 'react';
import { BurnoutRisk } from './types';
import { AlertTriangle, ShieldCheck, Flame, Info, CheckCircle2, ArrowRight } from 'lucide-react';

interface BurnoutRiskMeterProps {
  risk: BurnoutRisk;
  avgStress?: number;
  avgEnergy?: number;
  onActivateReset?: () => void;
}

export function BurnoutRiskMeter({
  risk,
  avgStress,
  avgEnergy,
  onActivateReset,
}: BurnoutRiskMeterProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [acknowledgedTriggers, setAcknowledgedTriggers] = useState<Record<number, boolean>>({});

  const toggleTrigger = (index: number) => {
    setAcknowledgedTriggers((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const isCritical = risk.level === 'CRITICAL';
  const isModerate = risk.level === 'MODERATE';
  const isLow = risk.level === 'LOW';

  const badgeColor = isCritical
    ? 'border-red-500/40 bg-red-500/15 text-red-400 shadow-red-500/20'
    : isModerate
    ? 'border-amber-500/40 bg-amber-500/15 text-amber-400 shadow-amber-500/20'
    : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-emerald-500/20';

  const meterGradient = isCritical
    ? 'from-red-500 via-rose-500 to-pink-500'
    : isModerate
    ? 'from-amber-400 via-yellow-500 to-orange-500'
    : 'from-emerald-400 via-teal-400 to-cyan-400';

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-black/30 p-4 transition-all hover:border-white/15">
      {/* Background ambient glow */}
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-20 ${
          isCritical ? 'bg-red-500' : isModerate ? 'bg-amber-400' : 'bg-emerald-400'
        }`}
      />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <Flame className="h-4 w-4 text-red-400 animate-pulse" />
          ) : isModerate ? (
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Predictive Burnout Risk Meter
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowDetail(!showDetail)}
          className="text-muted-foreground hover:text-white transition text-xs flex items-center gap-1"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="text-[11px]">{showDetail ? 'Hide' : 'Info'}</span>
        </button>
      </div>

      {/* Main Gauge Row */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-white font-mono">
            {risk.score}%
          </span>
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border shadow-sm ${badgeColor}`}
          >
            {risk.label}
          </span>
        </div>

        {/* Quick rolling averages pills */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
          {avgStress !== undefined && (
            <span className="rounded bg-pink-500/10 px-1.5 py-0.5 text-pink-300 border border-pink-500/20">
              Stress: {avgStress.toFixed(1)}
            </span>
          )}
          {avgEnergy !== undefined && (
            <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-teal-300 border border-teal-500/20">
              Energy: {avgEnergy.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Animated Glowing Progress Bar */}
      <div className="relative mb-3 h-2.5 w-full overflow-hidden rounded-full bg-black/60 border border-white/10 p-[1px]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${meterGradient} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(100, Math.max(8, risk.score))}%` }}
        />
        {/* Threshold Markers */}
        <div className="absolute left-[33%] top-0 h-full w-[1px] bg-white/20" title="Low / Moderate threshold" />
        <div className="absolute left-[66%] top-0 h-full w-[1px] bg-white/20" title="Moderate / Critical threshold" />
      </div>

      {/* Risk Scale Legend */}
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-3 font-semibold">
        <span className={isLow ? 'text-emerald-400 font-bold' : ''}>Low (0-33%)</span>
        <span className={isModerate ? 'text-amber-400 font-bold' : ''}>Moderate (34-66%)</span>
        <span className={isCritical ? 'text-red-400 font-bold' : ''}>Critical (67-100%)</span>
      </div>

      {/* Description */}
      <p className="text-xs text-foreground/80 leading-relaxed mb-3">
        {risk.description}
      </p>

      {/* Proactive Triggers & Recommendations */}
      {risk.triggers && risk.triggers.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Recommended Pacing Adjustments</span>
            {isCritical && (
              <span className="text-[10px] font-bold text-red-400 animate-pulse">Action Required</span>
            )}
          </div>
          <ul className="space-y-1.5">
            {risk.triggers.map((trigger, idx) => {
              const isChecked = !!acknowledgedTriggers[idx];
              return (
                <li
                  key={idx}
                  onClick={() => toggleTrigger(idx)}
                  className={`flex items-start gap-2 text-xs rounded p-1.5 cursor-pointer transition select-none ${
                    isChecked
                      ? 'bg-emerald-500/10 text-muted-foreground line-through'
                      : 'hover:bg-white/[0.04] text-foreground/90'
                  }`}
                >
                  <CheckCircle2
                    className={`h-3.5 w-3.5 mt-0.5 shrink-0 transition ${
                      isChecked ? 'text-emerald-400' : 'text-muted-foreground/50'
                    }`}
                  />
                  <span className="leading-snug">{trigger}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Quick Action Button for Critical/Moderate */}
      {(isCritical || isModerate) && onActivateReset && (
        <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Feeling overwhelmed?</span>
          <button
            type="button"
            onClick={onActivateReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/25"
          >
            <span>Launch Quick Reset</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {showDetail && (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/60 p-3 text-[11px] text-muted-foreground space-y-1 leading-relaxed">
          <p className="font-semibold text-white">How Burnout Risk is calculated:</p>
          <p>
            Calculated via a multi-day rolling weighted index incorporating stress levels (55%), biological energy drain (35%), and sleep deficits.
          </p>
          <p>
            When scores exceed 66%, the system triggers preventive pacing interventions to safeguard against cognitive exhaustion.
          </p>
        </div>
      )}
    </div>
  );
}
