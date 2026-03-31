"use client";

import { Plus, Sun, Moon, Flame } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import PulseBar from "./PulseBar";
import { usePulseStore } from "@/lib/pulseStore";

interface TopBarProps {
  onAddTask?: () => void;
  addLabel?: string;
  hideAdd?: boolean;
  leftContent?: React.ReactNode;
}

function formatSessionTime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TopBar({ onAddTask, addLabel = "New Task", hideAdd = false, leftContent }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { pulse, minutesActive, tasksCompletedToday, totalTasksToday, streakDays } = usePulseStore();

  return (
    <div className="sticky top-0 z-30">
      {/* Pulse Bar — always on top */}
      <PulseBar pulse={pulse} />

      {/* Main top bar */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2 bg-bg-secondary/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="md:hidden font-heading font-bold text-base text-text-primary">Tayrona AI</h2>
          <div className="hidden md:block" />
          {leftContent}
        </div>

        {/* Session Stats — center (hidden on small screens) */}
        <div className="hidden md:flex items-center gap-5 text-[11px]">
          <div className="flex flex-col items-center">
            <span className="text-text-muted uppercase tracking-wider" style={{ fontSize: "8px" }}>Sesión</span>
            <span className="font-mono font-semibold text-text-primary">{formatSessionTime(minutesActive)}</span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-text-muted uppercase tracking-wider" style={{ fontSize: "8px" }}>Completadas</span>
            <span className="font-mono font-semibold text-text-primary">
              {tasksCompletedToday} <span className="text-text-muted font-normal">de</span> {totalTasksToday}
            </span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-text-muted uppercase tracking-wider" style={{ fontSize: "8px" }}>Streak</span>
            <span className="font-mono font-semibold text-text-primary flex items-center gap-1">
              {streakDays > 0 && <Flame size={10} style={{ color: streakDays >= 7 ? "#EF9F27" : "#666" }} />}
              {streakDays}d
            </span>
          </div>
          <div className="w-px h-6 bg-border" />
          {/* Pulse badge */}
          <div className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: pulse.badgeBg, color: pulse.color }}>
            {pulse.label}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          {/* Mobile pulse badge */}
          <div className="md:hidden px-2 py-0.5 rounded-full text-[9px] font-semibold"
            style={{ backgroundColor: pulse.badgeBg, color: pulse.color }}>
            {pulse.label}
          </div>
          <button onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-secondary transition-colors"
            title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {!hideAdd && onAddTask && (
            <button onClick={onAddTask}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-text-inverse font-medium text-sm transition-colors">
              <Plus size={16} />
              <span className="hidden sm:inline">{addLabel}</span>
            </button>
          )}
        </div>
      </header>
    </div>
  );
}
