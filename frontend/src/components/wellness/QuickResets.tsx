'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Wind,
  Timer,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  Headphones,
} from 'lucide-react';
import { GRATITUDE_PROMPT_PRESETS } from './mockData';

interface QuickResetsProps {
  onLogGratitudeWin?: (winText: string) => Promise<void> | void;
}

export function QuickResets({ onLogGratitudeWin }: QuickResetsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<'breathing' | 'pomodoro' | 'gratitude'>('breathing');

  // --- 1. 4-7-8 Breathing State ---
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathSecondsLeft, setBreathSecondsLeft] = useState(4);
  const [completedCycles, setCompletedCycles] = useState(0);

  useEffect(() => {
    if (!isBreathingActive) return;

    const timer = setInterval(() => {
      setBreathSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Transition phases
        if (breathPhase === 'Inhale') {
          setBreathPhase('Hold');
          return 7;
        } else if (breathPhase === 'Hold') {
          setBreathPhase('Exhale');
          return 8;
        } else {
          setBreathPhase('Inhale');
          setCompletedCycles((c) => c + 1);
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isBreathingActive, breathPhase]);

  const resetBreathing = () => {
    setIsBreathingActive(false);
    setBreathPhase('Inhale');
    setBreathSecondsLeft(4);
  };

  // --- 2. Pomodoro Decompression & Ambient Audio State ---
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState(300); // 5 minutes
  const [isPomoRunning, setIsPomoRunning] = useState(false);
  const [soundscape, setSoundscape] = useState<'binaural' | 'rain' | 'cafe'>('binaural');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<{
    gainNode?: GainNode;
    oscillators?: OscillatorNode[];
    noiseNode?: AudioNode;
  }>({});

  useEffect(() => {
    if (!isPomoRunning) return;

    const interval = setInterval(() => {
      setPomoSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsPomoRunning(false);
          stopAmbientAudio();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPomoRunning]);

  // Web Audio Synthesizer for Ambient Soundscapes
  const startAmbientAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      stopAmbientAudio();

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isAudioMuted ? 0 : volume * 0.15, ctx.currentTime);
      masterGain.connect(ctx.destination);
      audioNodesRef.current.gainNode = masterGain;

      if (soundscape === 'binaural') {
        // Binaural Beat: Left Ear 216 Hz, Right Ear 226 Hz (Alpha 10Hz brainwave entrainment)
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        oscL.type = 'sine';
        oscR.type = 'sine';
        oscL.frequency.setValueAtTime(216, ctx.currentTime);
        oscR.frequency.setValueAtTime(226, ctx.currentTime);

        const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

        if (panL && panR) {
          panL.pan.setValueAtTime(-1, ctx.currentTime);
          panR.pan.setValueAtTime(1, ctx.currentTime);
          oscL.connect(panL);
          oscR.connect(panR);
          panL.connect(masterGain);
          panR.connect(masterGain);
        } else {
          oscL.connect(masterGain);
          oscR.connect(masterGain);
        }

        oscL.start();
        oscR.start();
        audioNodesRef.current.oscillators = [oscL, oscR];
      } else if (soundscape === 'rain') {
        // Gentle Rain Simulator: White/Pink Noise with Low-Pass filter
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.11;
          b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();
        audioNodesRef.current.noiseNode = whiteNoise;
      } else {
        // Café White Noise Simulator: Warm Bandpass
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);
        filter.Q.setValueAtTime(1.2, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();
        audioNodesRef.current.noiseNode = whiteNoise;
      }

      setIsAudioPlaying(true);
    } catch (e) {
      console.error('Audio synthesizer error', e);
    }
  };

  const stopAmbientAudio = () => {
    if (audioNodesRef.current.oscillators) {
      audioNodesRef.current.oscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      });
      audioNodesRef.current.oscillators = undefined;
    }
    if (audioNodesRef.current.noiseNode) {
      try {
        (audioNodesRef.current.noiseNode as AudioBufferSourceNode).stop();
        audioNodesRef.current.noiseNode.disconnect();
      } catch {}
      audioNodesRef.current.noiseNode = undefined;
    }
    setIsAudioPlaying(false);
  };

  // Adjust volume
  useEffect(() => {
    if (audioNodesRef.current.gainNode && audioCtxRef.current) {
      audioNodesRef.current.gainNode.gain.setValueAtTime(
        isAudioMuted ? 0 : volume * 0.15,
        audioCtxRef.current.currentTime,
      );
    }
  }, [volume, isAudioMuted]);

  useEffect(() => {
    return () => {
      stopAmbientAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // --- 3. Quick Win Gratitude Box State ---
  const [gratitudeText, setGratitudeText] = useState('');
  const [gratitudeSaved, setGratitudeSaved] = useState(false);

  const handleSaveGratitude = async (textToSave?: string) => {
    const text = textToSave || gratitudeText;
    if (!text.trim()) return;

    if (onLogGratitudeWin) {
      await onLogGratitudeWin(text);
    }
    setGratitudeSaved(true);
    setTimeout(() => setGratitudeSaved(false), 3500);
    setGratitudeText('');
  };

  const formatPomoTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c141a]/85 backdrop-blur-xl">
      {/* Header with collapse toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Quick Resets &amp; Micro-Breaks</span>
              <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.2 text-[10px] font-mono border border-emerald-500/30">
                Mindful OS
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              4-7-8 Breathing, 5-Min Pomodoro Decompression &amp; Gratitude Wins
            </p>
          </div>
        </div>

        <button type="button" className="p-1 text-muted-foreground hover:text-white transition">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-white/[0.06] p-4 space-y-4">
          {/* Tool Selector Tabs */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveTool('breathing')}
              className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-semibold transition ${
                activeTool === 'breathing'
                  ? 'border-pink-500/40 bg-pink-500/15 text-pink-300 shadow-sm shadow-pink-500/10'
                  : 'border-white/[0.06] bg-black/25 text-muted-foreground hover:border-white/20 hover:text-white'
              }`}
            >
              <Wind className="h-3.5 w-3.5 text-pink-400" />
              <span>4-7-8 Breathing</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('pomodoro')}
              className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-semibold transition ${
                activeTool === 'pomodoro'
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-300 shadow-sm shadow-teal-500/10'
                  : 'border-white/[0.06] bg-black/25 text-muted-foreground hover:border-white/20 hover:text-white'
              }`}
            >
              <Timer className="h-3.5 w-3.5 text-teal-400" />
              <span>Decompression</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('gratitude')}
              className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-semibold transition ${
                activeTool === 'gratitude'
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'border-white/[0.06] bg-black/25 text-muted-foreground hover:border-white/20 hover:text-white'
              }`}
            >
              <HeartHandshake className="h-3.5 w-3.5 text-amber-400" />
              <span>Gratitude Win</span>
            </button>
          </div>

          {/* TAB 1: 4-7-8 Breathing Guide */}
          {activeTool === 'breathing' && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-black/30 p-6 space-y-4">
              <div className="text-center">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Parasympathetic Reset Protocol
                </span>
                <p className="text-xs text-foreground/80 mt-0.5">
                  Inhale quietly through nose (4s) • Hold breath (7s) • Exhale completely through mouth (8s)
                </p>
              </div>

              {/* Pulsating Visual Ring */}
              <div className="relative flex items-center justify-center my-3">
                {/* Glow ring */}
                <div
                  className={`absolute rounded-full transition-all duration-1000 ${
                    breathPhase === 'Inhale'
                      ? 'h-40 w-40 bg-pink-500/25 blur-xl scale-125'
                      : breathPhase === 'Hold'
                      ? 'h-40 w-40 bg-purple-500/25 blur-xl scale-125'
                      : 'h-32 w-32 bg-cyan-500/20 blur-md scale-95'
                  }`}
                />

                {/* Animated Ring Border */}
                <div
                  className={`flex h-36 w-36 items-center justify-center rounded-full border-4 transition-all duration-1000 ${
                    breathPhase === 'Inhale'
                      ? 'border-pink-400 shadow-lg shadow-pink-500/40 scale-110'
                      : breathPhase === 'Hold'
                      ? 'border-purple-400 shadow-lg shadow-purple-500/40 scale-110'
                      : 'border-cyan-400 shadow-md shadow-cyan-500/30 scale-95'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {breathPhase}
                    </span>
                    <span className="text-3xl font-black font-mono text-white">
                      {breathSecondsLeft}s
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 font-mono">
                      Cycle {completedCycles + 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBreathingActive(!isBreathingActive)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-pink-500/40 bg-pink-500/20 px-4 py-1.5 text-xs font-semibold text-pink-200 hover:bg-pink-500/30 transition shadow-sm"
                >
                  {isBreathingActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{isBreathingActive ? 'Pause' : 'Start 4-7-8 Breathing'}</span>
                </button>

                <button
                  type="button"
                  onClick={resetBreathing}
                  className="rounded-lg border border-white/10 bg-black/40 p-1.5 text-muted-foreground hover:text-white transition"
                  title="Reset Breathing Timer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Pomodoro Decompression */}
          {activeTool === 'pomodoro' && (
            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Timer Display */}
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-teal-400 bg-teal-500/10 font-mono text-lg font-black text-white shadow-inner">
                    {formatPomoTime(pomoSecondsLeft)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      5-Min Wind-Down Timer
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Lower cognitive arousal between intense coding sprints
                    </p>
                  </div>
                </div>

                {/* Timer buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !isPomoRunning;
                      setIsPomoRunning(nextState);
                      if (nextState && !isAudioPlaying) {
                        startAmbientAudio();
                      } else if (!nextState && isAudioPlaying) {
                        stopAmbientAudio();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/20 px-3.5 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-500/30 transition shadow-sm"
                  >
                    {isPomoRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    <span>{isPomoRunning ? 'Pause' : 'Start 5-Min Rest'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPomoRunning(false);
                      setPomoSecondsLeft(300);
                      stopAmbientAudio();
                    }}
                    className="rounded-lg border border-white/10 bg-black/40 p-2 text-muted-foreground hover:text-white transition"
                    title="Reset Timer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Ambient Audio Toggles */}
              <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Headphones className="h-3.5 w-3.5 text-teal-400" />
                    Ambient Audio Synthesizer
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (isAudioPlaying) {
                        stopAmbientAudio();
                      } else {
                        startAmbientAudio();
                      }
                    }}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold transition ${
                      isAudioPlaying ? 'text-teal-400' : 'text-muted-foreground hover:text-white'
                    }`}
                  >
                    {isAudioPlaying ? 'Soundscape Active' : 'Start Audio'}
                  </button>
                </div>

                {/* Preset Soundscape Options */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'binaural', label: 'Binaural Beats (Alpha 10Hz)' },
                    { id: 'rain', label: 'Gentle Rain' },
                    { id: 'cafe', label: 'Warm Café' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSoundscape(preset.id as any);
                        if (isAudioPlaying) {
                          // restart with new soundscape
                          setTimeout(startAmbientAudio, 50);
                        }
                      }}
                      className={`rounded-lg border p-1.5 text-center text-[11px] font-medium transition ${
                        soundscape === preset.id
                          ? 'border-teal-400/50 bg-teal-500/15 text-teal-300'
                          : 'border-white/[0.06] bg-black/20 text-muted-foreground hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Volume & Mute */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAudioMuted(!isAudioMuted)}
                    className="text-muted-foreground hover:text-white transition"
                  >
                    {isAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isAudioMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      if (isAudioMuted) setIsAudioMuted(false);
                    }}
                    className="w-full h-1.5 rounded-lg bg-black/60 accent-teal-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Quick Win Gratitude Box */}
          {activeTool === 'gratitude' && (
            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Quick Win Gratitude Box
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Acknowledge 1 win before logging off to anchor positive career momentum
                  </p>
                </div>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                  +5 XP
                </span>
              </div>

              {/* 1-Click Suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {GRATITUDE_PROMPT_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setGratitudeText(preset);
                      handleSaveGratitude(preset);
                    }}
                    className="rounded-full border border-white/[0.08] bg-black/40 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gratitudeText}
                  onChange={(e) => setGratitudeText(e.target.value)}
                  placeholder="Or type your own personal win today..."
                  className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-amber-400/50 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveGratitude()}
                  disabled={!gratitudeText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition disabled:opacity-50"
                >
                  {gratitudeSaved ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Sparkles className="h-3.5 w-3.5" />}
                  <span>{gratitudeSaved ? 'Logged!' : 'Log Win'}</span>
                </button>
              </div>

              {gratitudeSaved && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <Check className="h-3.5 w-3.5" />
                  <span>Gratitude win successfully registered to your wellness session (+5 XP)!</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
