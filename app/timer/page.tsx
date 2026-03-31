"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play, Pause, RotateCcw, Timer, ChevronDown, Volume2, Check,
  Settings2, Palette, Circle, Sun, Moon, Gem, Mountain, Cloud, Grid3X3,
  ChevronRight, Eye, Maximize2, Shapes, X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  useTimerStore,
  WidgetSize, WidgetShape,
  DialStyle, TimerTheme, TimerBackground,
} from "@/lib/timerStore";
import { TIMER_SOUNDS } from "@/lib/timerSounds";

/* ═══════════════════════════════════════════════════════════
   THEME & STYLE CONFIG
   ═══════════════════════════════════════════════════════════ */

const THEME_CONFIG: Record<TimerTheme, {
  label: string; icon: React.ReactNode; description: string;
  primary: string; secondary: string; glow: string;
  gradientStart: string; gradientEnd: string;
}> = {
  dorado: {
    label: "Dorado Tayrona", icon: <Sun size={14} />, description: "Oro ancestral",
    primary: "#e7ca79", secondary: "#d4b868", glow: "rgba(231, 202, 121, 0.35)",
    gradientStart: "#e7ca79", gradientEnd: "#4ecdc4",
  },
  luna: {
    label: "Luna de Plata", icon: <Moon size={14} />, description: "Plateado y gris azulado",
    primary: "#c0c8d8", secondary: "#8892a8", glow: "rgba(192, 200, 216, 0.30)",
    gradientStart: "#c0c8d8", gradientEnd: "#6b7b9e",
  },
  amatista: {
    label: "Amatista", icon: <Gem size={14} />, description: "Morado profundo y dorado",
    primary: "#b07ed8", secondary: "#8a5bb8", glow: "rgba(176, 126, 216, 0.30)",
    gradientStart: "#b07ed8", gradientEnd: "#e7ca79",
  },
};

const DIAL_CONFIG: Record<DialStyle, {
  label: string; description: string;
}> = {
  cenital: { label: "Cenital", description: "Halo de luz sagrada" },
  piedra: { label: "Piedra Tallada", description: "Grabado en roca ancestral" },
  eclipse: { label: "Eclipse", description: "Sombra y luz" },
};

const BG_CONFIG: Record<TimerBackground, {
  label: string; icon: React.ReactNode; description: string;
  style: React.CSSProperties; overlayClass: string;
}> = {
  pizarra: {
    label: "Pizarra Pulida", icon: <Mountain size={14} />, description: "Piedra oscura texturizada",
    style: {
      background: `
        radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.02) 0%, transparent 60%),
        repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.008) 50px, rgba(255,255,255,0.008) 51px),
        repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.005) 50px, rgba(255,255,255,0.005) 51px),
        linear-gradient(180deg, #1a1d23 0%, #15171c 50%, #111318 100%)
      `,
    },
    overlayClass: "",
  },
  cielo: {
    label: "Cielo Despejado", icon: <Cloud size={14} />, description: "Gradiente nocturno",
    style: {
      background: "linear-gradient(135deg, #0f1923 0%, #1a2535 30%, #0d1b2a 60%, #162032 100%)",
    },
    overlayClass: "",
  },
  mural: {
    label: "Mural Tayrona", icon: <Grid3X3 size={14} />, description: "Geometria precolombina",
    style: {
      background: "#13151a",
    },
    overlayClass: "mural-pattern",
  },
};

const PRESETS = [
  { label: "5 min", mins: 5 },
  { label: "10 min", mins: 10 },
  { label: "15 min", mins: 15 },
  { label: "20 min", mins: 20 },
  { label: "25 min", mins: 25 },
  { label: "30 min", mins: 30 },
  { label: "45 min", mins: 45 },
  { label: "1 hr", mins: 60 },
  { label: "1.5 hr", mins: 90 },
  { label: "2 hr", mins: 120 },
];

function formatDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ═══════════════════════════════════════════════════════════
   TIMER PAGE
   ═══════════════════════════════════════════════════════════ */

export default function TimerPage() {
  const store = useTimerStore();
  const {
    isRunning, remainingSeconds, totalSeconds, isFinished, taskTitle,
    startTimer, pauseTimer, resumeTimer, stopTimer,
    soundId, setSoundId, widgetSize, setWidgetSize, widgetShape, setWidgetShape,
    widgetOpacity, setWidgetOpacity,
    dialStyle, setDialStyle, timerTheme, setTimerTheme,
    timerBackground, setTimerBackground,
  } = store;

  const [selectedMins, setSelectedMins] = useState(25);
  const [showPresets, setShowPresets] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"dial" | "theme" | "bg" | "sound" | "widget">("dial");
  const presetsRef = useRef<HTMLDivElement>(null);
  const [blinkPhase, setBlinkPhase] = useState(0);

  // NOTE: tick interval lives ONLY in TimerWidget.tsx to avoid double-speed bug

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) setShowPresets(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Finished blink animation
  useEffect(() => {
    if (!isFinished) { setBlinkPhase(0); return; }
    const iv = setInterval(() => setBlinkPhase((p) => (p + 1) % 60), 50);
    return () => clearInterval(iv);
  }, [isFinished]);

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const hasActiveTimer = totalSeconds > 0;
  const theme = THEME_CONFIG[timerTheme];
  const bgConfig = BG_CONFIG[timerBackground];

  const handleStart = useCallback(() => {
    startTimer("timer-page", "Focus Timer", selectedMins);
  }, [startTimer, selectedMins]);

  const handleToggle = useCallback(() => {
    if (isRunning) pauseTimer();
    else resumeTimer();
  }, [isRunning, pauseTimer, resumeTimer]);

  /* ── SVG Dial Rendering ─────────────────────── */
  const RADIUS = 130;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeOffset = CIRCUMFERENCE * (1 - progress / 100);

  const finishGlow = isFinished ? 0.3 + Math.sin(blinkPhase * 0.2) * 0.25 : 0;

  const dialGradientId = "dial-gradient";
  const haloFilterId = "halo-filter";
  const stoneFilterId = "stone-texture";

  const renderDial = useMemo(() => {
    const baseStrokeWidth = dialStyle === "piedra" ? 10 : 6;
    const trackStrokeWidth = dialStyle === "piedra" ? 10 : 4;
    const trackOpacity = dialStyle === "eclipse" ? 0.15 : 0.08;

    return (
      <svg className="w-full h-full -rotate-90" viewBox="0 0 288 288" style={{ filter: "url(#drop-shadow)" }}>
        <defs>
          {/* Gradient for progress arc */}
          <linearGradient id={dialGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.gradientStart} />
            <stop offset="100%" stopColor={theme.gradientEnd} />
          </linearGradient>

          {/* Cenital glow filter */}
          {dialStyle === "cenital" && (
            <filter id={haloFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}

          {/* Stone texture filter */}
          {dialStyle === "piedra" && (
            <filter id={stoneFilterId}>
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise" />
              <feComposite in="SourceGraphic" in2="noise" operator="in" result="textured" />
              <feMerge>
                <feMergeNode in="textured" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}

          {/* Shadow for depth */}
          <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={theme.primary} floodOpacity="0.15" />
          </filter>

          {/* Finished pulse glow */}
          {isFinished && (
            <filter id="finish-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Track ring */}
        <circle
          cx="144" cy="144" r={RADIUS}
          fill="none"
          stroke="white"
          strokeWidth={trackStrokeWidth}
          opacity={trackOpacity}
          strokeDasharray={dialStyle === "piedra" ? "4 2" : "none"}
        />

        {/* Eclipse: inner shadow ring */}
        {dialStyle === "eclipse" && (
          <circle
            cx="144" cy="144" r={RADIUS - 15}
            fill="none"
            stroke="white"
            strokeWidth="1"
            opacity={0.04}
          />
        )}

        {/* Progress arc */}
        {progress > 0 && (
          <circle
            cx="144" cy="144" r={RADIUS}
            fill="none"
            stroke={`url(#${dialGradientId})`}
            strokeWidth={baseStrokeWidth}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            strokeLinecap={dialStyle === "piedra" ? "butt" : "round"}
            className="transition-all duration-1000 ease-linear"
            filter={
              isFinished ? "url(#finish-glow)" :
              dialStyle === "cenital" ? `url(#${haloFilterId})` :
              dialStyle === "piedra" ? `url(#${stoneFilterId})` :
              undefined
            }
          />
        )}

        {/* Eclipse: bright dot indicator at progress tip */}
        {dialStyle === "eclipse" && progress > 0 && !isFinished && (
          <circle
            cx={144 + RADIUS * Math.cos((progress / 100) * 2 * Math.PI - Math.PI / 2)}
            cy={144 + RADIUS * Math.sin((progress / 100) * 2 * Math.PI - Math.PI / 2)}
            r="4"
            fill={theme.primary}
            filter={`url(#${haloFilterId})`}
            className="transition-all duration-1000 ease-linear"
          />
        )}

        {/* Tick marks (Piedra style) */}
        {dialStyle === "piedra" && Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
          const isMajor = i % 5 === 0;
          const r1 = RADIUS + (isMajor ? 14 : 12);
          const r2 = RADIUS + (isMajor ? 20 : 16);
          return (
            <line
              key={i}
              x1={144 + r1 * Math.cos(angle)}
              y1={144 + r1 * Math.sin(angle)}
              x2={144 + r2 * Math.cos(angle)}
              y2={144 + r2 * Math.sin(angle)}
              stroke="white"
              strokeWidth={isMajor ? 1.5 : 0.5}
              opacity={isMajor ? 0.15 : 0.06}
            />
          );
        })}
      </svg>
    );
  }, [progress, dialStyle, timerTheme, isFinished, blinkPhase, theme, strokeOffset, CIRCUMFERENCE]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar hideAdd />

        {/* Background */}
        <div
          className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 overflow-hidden"
          style={bgConfig.style}
        >
          {/* Mural pattern overlay */}
          {timerBackground === "mural" && <MuralOverlay color={theme.primary} />}

          {/* Ambient glow behind dial */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-1000"
            style={{
              background: `radial-gradient(circle, ${theme.glow} 0%, transparent 65%)`,
              opacity: isRunning ? 0.8 : isFinished ? finishGlow + 0.3 : 0.3,
            }}
          />

          {/* Cenital light beam */}
          {dialStyle === "cenital" && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[400px] pointer-events-none transition-opacity duration-1000"
              style={{
                background: `linear-gradient(180deg, ${theme.glow} 0%, transparent 100%)`,
                opacity: isRunning ? 0.5 : 0.15,
                clipPath: "polygon(35% 0%, 65% 0%, 80% 100%, 20% 100%)",
              }}
            />
          )}

          {/* ── DIAL ─────────────────────────────────────── */}
          <div className="relative w-72 h-72 md:w-80 md:h-80 mb-8 z-10">
            {renderDial}

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Main time */}
              <p
                className="font-mono text-[52px] md:text-[56px] font-bold tracking-tight leading-none transition-colors duration-500"
                style={{
                  color: isFinished ? theme.primary : "#ffffff",
                  textShadow: isFinished
                    ? `0 0 ${20 + finishGlow * 30}px ${theme.glow}`
                    : isRunning
                    ? `0 0 8px ${theme.glow}`
                    : "none",
                  opacity: isFinished ? 0.6 + finishGlow * 0.4 : 1,
                }}
              >
                {hasActiveTimer ? formatDisplay(remainingSeconds) : formatDisplay(selectedMins * 60)}
              </p>

              {/* Total planned time */}
              <p className="font-mono text-sm text-white/25 mt-1 tracking-wide">
                / {hasActiveTimer ? formatDisplay(totalSeconds) : formatDisplay(selectedMins * 60)}
              </p>

              {/* Task name */}
              {taskTitle && hasActiveTimer && (
                <p className="text-xs text-white/40 mt-3 max-w-[180px] truncate text-center">
                  {taskTitle}
                </p>
              )}

              {/* Finished label */}
              {isFinished && (
                <p
                  className="text-sm font-semibold mt-2 tracking-wide"
                  style={{ color: theme.primary, opacity: 0.5 + finishGlow }}
                >
                  Tiempo cumplido
                </p>
              )}
            </div>
          </div>

          {/* ── Duration Selector ────────────────────────── */}
          {!hasActiveTimer && (
            <div className="relative mb-6 z-10" ref={presetsRef}>
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border transition-all duration-300 hover:scale-[1.02]"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Timer size={15} className="text-white/40" />
                <span className="text-white/80 font-medium text-sm">
                  {selectedMins >= 60 ? `${selectedMins / 60} hr` : `${selectedMins} min`}
                </span>
                <ChevronDown size={13} className="text-white/30" />
              </button>
              {showPresets && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-xl shadow-2xl z-50 py-1 overflow-hidden border"
                  style={{
                    backgroundColor: "rgba(22, 24, 30, 0.95)",
                    borderColor: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {PRESETS.map((p) => (
                    <button
                      key={p.mins}
                      onClick={() => { setSelectedMins(p.mins); setShowPresets(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{
                        color: selectedMins === p.mins ? theme.primary : "rgba(255,255,255,0.7)",
                        backgroundColor: selectedMins === p.mins ? `${theme.primary}10` : "transparent",
                        fontWeight: selectedMins === p.mins ? 600 : 400,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedMins === p.mins ? `${theme.primary}10` : "transparent"}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Controls ─────────────────────────────────── */}
          <div className="flex items-center gap-3 z-10 mb-4">
            {!hasActiveTimer ? (
              <button
                onClick={handleStart}
                className="group flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-semibold text-base transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  color: "#111318",
                  boxShadow: `0 4px 24px ${theme.glow}, 0 0 0 1px ${theme.primary}30`,
                }}
              >
                <Play size={18} className="group-hover:translate-x-0.5 transition-transform" />
                Iniciar Focus
              </button>
            ) : (
              <>
                <button
                  onClick={handleToggle}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    backgroundColor: isRunning ? "rgba(255,255,255,0.06)" : theme.primary,
                    color: isRunning ? "rgba(255,255,255,0.8)" : "#111318",
                    border: isRunning ? "1px solid rgba(255,255,255,0.1)" : "none",
                    boxShadow: !isRunning ? `0 4px 20px ${theme.glow}` : "none",
                  }}
                >
                  {isRunning ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Reanudar</>}
                </button>
                <button
                  onClick={stopTimer}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.5)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                >
                  <RotateCcw size={15} /> Reset
                </button>
              </>
            )}
          </div>

          {/* ── Settings Toggle ───────────────────────────── */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 z-10 text-xs transition-all duration-300 hover:scale-[1.02]"
            style={{ color: showSettings ? theme.primary : "rgba(255,255,255,0.35)" }}
          >
            <Settings2 size={13} />
            {showSettings ? "Ocultar configuracion" : "Configuracion del Imperio"}
            <ChevronRight size={12} className={`transition-transform duration-300 ${showSettings ? "rotate-90" : ""}`} />
          </button>

          {/* ── Settings Panel ────────────────────────────── */}
          {showSettings && (
            <div
              className="z-10 mt-4 w-full max-w-lg rounded-2xl border overflow-hidden transition-all duration-500"
              style={{
                backgroundColor: "rgba(18, 20, 26, 0.85)",
                borderColor: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(24px) saturate(1.3)",
              }}
            >
              {/* Tabs */}
              <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {([
                  { id: "dial" as const, label: "Estilo", icon: <Circle size={12} /> },
                  { id: "theme" as const, label: "Paleta", icon: <Palette size={12} /> },
                  { id: "bg" as const, label: "Fondo", icon: <Mountain size={12} /> },
                  { id: "sound" as const, label: "Sonido", icon: <Volume2 size={12} /> },
                  { id: "widget" as const, label: "Widget", icon: <Shapes size={12} /> },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-all duration-300"
                    style={{
                      color: settingsTab === tab.id ? theme.primary : "rgba(255,255,255,0.35)",
                      borderBottom: settingsTab === tab.id ? `2px solid ${theme.primary}` : "2px solid transparent",
                      backgroundColor: settingsTab === tab.id ? `${theme.primary}08` : "transparent",
                    }}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* ── Dial Style ─────────────────── */}
                {settingsTab === "dial" && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Estilo del Dial
                    </h3>
                    {(Object.keys(DIAL_CONFIG) as DialStyle[]).map((style) => (
                      <button
                        key={style}
                        onClick={() => setDialStyle(style)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300"
                        style={{
                          backgroundColor: dialStyle === style ? `${theme.primary}12` : "rgba(255,255,255,0.02)",
                          border: `1px solid ${dialStyle === style ? `${theme.primary}30` : "rgba(255,255,255,0.04)"}`,
                        }}
                      >
                        {/* Preview mini dial */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: dialStyle === style
                              ? `conic-gradient(from 0deg, ${theme.gradientStart}, ${theme.gradientEnd}, transparent 70%)`
                              : "rgba(255,255,255,0.03)",
                            border: style === "piedra"
                              ? `2px dashed ${dialStyle === style ? theme.primary : "rgba(255,255,255,0.1)"}40`
                              : `2px solid ${dialStyle === style ? theme.primary : "rgba(255,255,255,0.06)"}`,
                          }}
                        >
                          {dialStyle === style && <Check size={12} style={{ color: theme.primary }} />}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium" style={{ color: dialStyle === style ? theme.primary : "rgba(255,255,255,0.7)" }}>
                            {DIAL_CONFIG[style].label}
                          </p>
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {DIAL_CONFIG[style].description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Theme Palette ──────────────── */}
                {settingsTab === "theme" && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Paleta Mistica
                    </h3>
                    {(Object.keys(THEME_CONFIG) as TimerTheme[]).map((t) => {
                      const cfg = THEME_CONFIG[t];
                      return (
                        <button
                          key={t}
                          onClick={() => setTimerTheme(t)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300"
                          style={{
                            backgroundColor: timerTheme === t ? `${cfg.primary}12` : "rgba(255,255,255,0.02)",
                            border: `1px solid ${timerTheme === t ? `${cfg.primary}30` : "rgba(255,255,255,0.04)"}`,
                          }}
                        >
                          {/* Color swatch */}
                          <div className="flex gap-1 flex-shrink-0">
                            <div className="w-5 h-5 rounded-full" style={{ background: `linear-gradient(135deg, ${cfg.gradientStart}, ${cfg.gradientEnd})`, boxShadow: timerTheme === t ? `0 0 8px ${cfg.glow}` : "none" }} />
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: timerTheme === t ? cfg.primary : "rgba(255,255,255,0.7)" }}>
                              {cfg.icon} {cfg.label}
                            </p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{cfg.description}</p>
                          </div>
                          {timerTheme === t && <Check size={14} style={{ color: cfg.primary }} />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── Background ─────────────────── */}
                {settingsTab === "bg" && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Fondo del Modulo
                    </h3>
                    {(Object.keys(BG_CONFIG) as TimerBackground[]).map((bg) => {
                      const cfg = BG_CONFIG[bg];
                      return (
                        <button
                          key={bg}
                          onClick={() => setTimerBackground(bg)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300"
                          style={{
                            backgroundColor: timerBackground === bg ? `${theme.primary}12` : "rgba(255,255,255,0.02)",
                            border: `1px solid ${timerBackground === bg ? `${theme.primary}30` : "rgba(255,255,255,0.04)"}`,
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              ...cfg.style,
                              border: `1px solid ${timerBackground === bg ? `${theme.primary}30` : "rgba(255,255,255,0.06)"}`,
                            }}
                          >
                            {cfg.icon}
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-sm font-medium" style={{ color: timerBackground === bg ? theme.primary : "rgba(255,255,255,0.7)" }}>
                              {cfg.label}
                            </p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{cfg.description}</p>
                          </div>
                          {timerBackground === bg && <Check size={14} style={{ color: theme.primary }} />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── Sound ──────────────────────── */}
                {settingsTab === "sound" && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Sonido de Alarma
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {TIMER_SOUNDS.map((sound) => (
                        <button
                          key={sound.id}
                          onClick={() => { setSoundId(sound.id); sound.play(); }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-all duration-300"
                          style={{
                            backgroundColor: soundId === sound.id ? `${theme.primary}15` : "rgba(255,255,255,0.02)",
                            border: `1px solid ${soundId === sound.id ? `${theme.primary}40` : "rgba(255,255,255,0.04)"}`,
                            color: soundId === sound.id ? theme.primary : "rgba(255,255,255,0.5)",
                          }}
                        >
                          <span className="text-base">{sound.emoji}</span>
                          <span className="flex-1 text-left">{sound.name}</span>
                          {soundId === sound.id && <Check size={11} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Widget ─────────────────────── */}
                {settingsTab === "widget" && (
                  <div className="space-y-5">
                    {/* Size */}
                    <div>
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <Maximize2 size={10} className="inline mr-1" /> Tamano del Widget
                      </h3>
                      <div className="flex gap-2">
                        {(["compact", "normal", "large"] as WidgetSize[]).map((size) => (
                          <button key={size} onClick={() => setWidgetSize(size)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all duration-300"
                            style={{
                              backgroundColor: widgetSize === size ? `${theme.primary}15` : "rgba(255,255,255,0.02)",
                              border: `1px solid ${widgetSize === size ? `${theme.primary}40` : "rgba(255,255,255,0.04)"}`,
                              color: widgetSize === size ? theme.primary : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shape */}
                    <div>
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <Shapes size={10} className="inline mr-1" /> Forma del Widget
                      </h3>
                      <div className="flex gap-2">
                        {(["rounded", "pill", "square"] as WidgetShape[]).map((shape) => (
                          <button key={shape} onClick={() => setWidgetShape(shape)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all duration-300"
                            style={{
                              backgroundColor: widgetShape === shape ? `${theme.primary}15` : "rgba(255,255,255,0.02)",
                              border: `1px solid ${widgetShape === shape ? `${theme.primary}40` : "rgba(255,255,255,0.04)"}`,
                              color: widgetShape === shape ? theme.primary : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {shape}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opacity */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                          <Eye size={10} className="inline mr-1" /> Opacidad
                        </h3>
                        <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{Math.round(widgetOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range" min="40" max="100" value={widgetOpacity * 100}
                        onChange={(e) => setWidgetOpacity(Number(e.target.value) / 100)}
                        className="w-full h-1 rounded-full appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, ${theme.primary}40, ${theme.primary})`, accentColor: theme.primary }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hint text */}
          <p className="text-[10px] text-white/20 mt-6 max-w-sm text-center z-10">
            Inicia un timer aqui o desde el boton de play de cualquier tarea. El widget flotante te seguira por toda la app.
          </p>
        </div>
      </main>

      {/* Global styles for mural pattern */}
      <style jsx global>{`
        @keyframes dial-glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MURAL TAYRONA OVERLAY — Geometric pre-Columbian pattern
   ═══════════════════════════════════════════════════════════ */
function MuralOverlay({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="tayrona-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            {/* Central diamond */}
            <path d="M40 10 L60 40 L40 70 L20 40 Z" fill="none" stroke={color} strokeWidth="0.8" />
            {/* Inner diamond */}
            <path d="M40 22 L52 40 L40 58 L28 40 Z" fill="none" stroke={color} strokeWidth="0.5" />
            {/* Corner spirals */}
            <circle cx="0" cy="0" r="8" fill="none" stroke={color} strokeWidth="0.5" />
            <circle cx="80" cy="0" r="8" fill="none" stroke={color} strokeWidth="0.5" />
            <circle cx="0" cy="80" r="8" fill="none" stroke={color} strokeWidth="0.5" />
            <circle cx="80" cy="80" r="8" fill="none" stroke={color} strokeWidth="0.5" />
            {/* Step pattern (escalera) */}
            <path d="M0 40 L10 40 L10 30 L20 30" fill="none" stroke={color} strokeWidth="0.5" />
            <path d="M80 40 L70 40 L70 50 L60 50" fill="none" stroke={color} strokeWidth="0.5" />
            {/* Dots */}
            <circle cx="40" cy="40" r="1.5" fill={color} />
            <circle cx="10" cy="10" r="1" fill={color} />
            <circle cx="70" cy="10" r="1" fill={color} />
            <circle cx="10" cy="70" r="1" fill={color} />
            <circle cx="70" cy="70" r="1" fill={color} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tayrona-pattern)" />
      </svg>
    </div>
  );
}
