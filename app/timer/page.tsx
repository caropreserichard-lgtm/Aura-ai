"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Timer, ChevronDown } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { useTimerStore } from "@/lib/timerStore";

const PRESETS = [
  { label: "5 min", mins: 5 },
  { label: "10 min", mins: 10 },
  { label: "15 min", mins: 15 },
  { label: "20 min", mins: 20 },
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

export default function TimerPage() {
  const { isRunning, remainingSeconds, totalSeconds, isFinished, taskTitle, startTimer, pauseTimer, resumeTimer, stopTimer, tick } = useTimerStore();
  const [selectedMins, setSelectedMins] = useState(25);
  const [showPresets, setShowPresets] = useState(false);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const presetsRef = useRef<HTMLDivElement>(null);

  // Tick
  useEffect(() => {
    if (isRunning) {
      tickRef.current = setInterval(() => tick(), 1000);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [isRunning, tick]);

  // Close presets on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) setShowPresets(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const hasActiveTimer = totalSeconds > 0;

  const handleStart = useCallback(() => {
    startTimer("timer-page", "Focus Timer", selectedMins);
  }, [startTimer, selectedMins]);

  const handleToggle = useCallback(() => {
    if (isRunning) pauseTimer();
    else resumeTimer();
  }, [isRunning, pauseTimer, resumeTimer]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar hideAdd />

        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
          {/* Timer Circle */}
          <div className="relative w-72 h-72 mb-10">
            {/* Background ring */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 288 288">
              <circle cx="144" cy="144" r="130" fill="none" stroke="currentColor" strokeWidth="4"
                className="text-border" />
              <circle cx="144" cy="144" r="130" fill="none" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 130}`}
                strokeDashoffset={`${2 * Math.PI * 130 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
                style={{ stroke: isFinished ? "#ef4444" : isRunning ? "#22c55e" : "#4ade80" }}
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className={`font-mono text-5xl font-bold tracking-tight ${
                isFinished ? "text-red-400 animate-pulse" : isRunning ? "text-emerald-400" : "text-text-primary"
              }`}>
                {hasActiveTimer ? formatDisplay(remainingSeconds) : formatDisplay(selectedMins * 60)}
              </p>
              {taskTitle && hasActiveTimer && (
                <p className="text-sm text-text-muted mt-2 max-w-[200px] truncate">{taskTitle}</p>
              )}
              {isFinished && (
                <p className="text-sm text-red-400 font-semibold mt-1">Time&apos;s up!</p>
              )}
            </div>
          </div>

          {/* Duration selector (only when no active timer) */}
          {!hasActiveTimer && (
            <div className="relative mb-8" ref={presetsRef}>
              <button onClick={() => setShowPresets(!showPresets)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-secondary border border-border hover:border-border/80 text-text-primary font-medium transition-colors">
                <Timer size={16} className="text-text-muted" />
                {selectedMins >= 60 ? `${selectedMins / 60} hr` : `${selectedMins} min`}
                <ChevronDown size={14} className="text-text-muted" />
              </button>
              {showPresets && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                  {PRESETS.map((p) => (
                    <button key={p.mins} onClick={() => { setSelectedMins(p.mins); setShowPresets(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedMins === p.mins ? "bg-bg-hover text-accent font-semibold" : "text-text-primary hover:bg-bg-hover"
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!hasActiveTimer ? (
              <button onClick={handleStart}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-accent hover:bg-accent-hover text-text-inverse font-semibold text-base transition-colors shadow-lg">
                <Play size={20} /> Start Focus
              </button>
            ) : (
              <>
                <button onClick={handleToggle}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-colors shadow-lg ${
                    isRunning
                      ? "bg-bg-secondary border border-border text-text-primary hover:bg-bg-hover"
                      : "bg-accent hover:bg-accent-hover text-text-inverse"
                  }`}>
                  {isRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Resume</>}
                </button>
                <button onClick={stopTimer}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-bg-secondary border border-border text-text-muted hover:text-danger hover:border-danger/30 font-medium text-base transition-colors">
                  <RotateCcw size={18} /> Reset
                </button>
              </>
            )}
          </div>

          {/* Info text */}
          <p className="text-xs text-text-muted mt-8 max-w-sm text-center">
            Start a timer here or from any task&apos;s play button. The floating widget will follow you across all pages.
          </p>
        </div>
      </main>
    </div>
  );
}
