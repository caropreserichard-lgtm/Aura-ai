"use client";

import { Play, Pause, RotateCcw, Zap, Clock } from "lucide-react";
import { useTimer, TimerMode } from "@/lib/hooks/useTimer";
import { formatTimeCompact } from "@/lib/scoring";
import { Task } from "@/lib/types";

interface TimerProps {
  tasks: Task[];
  activeTaskId: string | null;
  onTimeUpdate: (taskId: string, seconds: number) => void;
  onSetActiveTask: (taskId: string | null) => void;
}

export default function Timer({
  tasks,
  activeTaskId,
  onTimeUpdate,
  onSetActiveTask,
}: TimerProps) {
  const timer = useTimer({
    onComplete: () => {
      if (activeTaskId) {
        const accumulated = timer.reset();
        onTimeUpdate(activeTaskId, accumulated);
      }
    },
  });

  const handlePause = () => {
    timer.pause();
    if (activeTaskId && timer.accumulated > 0) {
      onTimeUpdate(activeTaskId, timer.accumulated);
    }
  };

  const handleReset = () => {
    const accumulated = timer.reset();
    if (activeTaskId && accumulated > 0) {
      onTimeUpdate(activeTaskId, accumulated);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== "done");
  const activeTask = tasks.find((t) => t._id === activeTaskId);

  const DURATIONS = [
    { label: "25m", minutes: 25 },
    { label: "50m", minutes: 50 },
  ];

  return (
    <div className="rounded-xl bg-bg-secondary border border-white/5 p-5">
      <h3 className="font-heading font-bold text-sm text-text-secondary mb-4 flex items-center gap-2">
        <Clock size={16} className="text-accent-purple" />
        TIMER
      </h3>

      {/* Mode selector */}
      <div className="flex gap-1 p-1 rounded-lg bg-bg-primary mb-4">
        {(["flow", "pomodoro"] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => timer.switchMode(m)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              timer.mode === m
                ? "bg-accent-purple text-white"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {m === "flow" ? <Zap size={14} /> : <Clock size={14} />}
            {m === "flow" ? "Flow" : "Pomodoro"}
          </button>
        ))}
      </div>

      {/* Pomodoro duration options */}
      {timer.mode === "pomodoro" && (
        <div className="flex gap-2 mb-4 justify-center">
          {DURATIONS.map((d) => (
            <button
              key={d.minutes}
              onClick={() => timer.setDuration(d.minutes)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                timer.seconds === d.minutes * 60 || (timer.isRunning)
                  ? "bg-white/10 text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Timer display */}
      <div className="text-center mb-4">
        <span className="font-mono font-bold text-5xl text-text-primary tracking-wider">
          {formatTimeCompact(timer.seconds)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {!timer.isRunning ? (
          <button
            onClick={timer.start}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg xp-gradient text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Play size={18} /> Iniciar
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent-amber/20 text-accent-amber font-medium text-sm hover:bg-accent-amber/30 transition-colors"
          >
            <Pause size={18} /> Pausar
          </button>
        )}
        <button
          onClick={handleReset}
          className="p-2.5 rounded-lg bg-white/5 text-text-muted hover:text-text-secondary hover:bg-white/10 transition-colors"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Task selector */}
      <div>
        <label className="block text-xs text-text-muted mb-1.5">
          Tarea activa
        </label>
        <select
          value={activeTaskId || ""}
          onChange={(e) => onSetActiveTask(e.target.value || null)}
          className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-white/5 text-text-primary text-sm focus:outline-none focus:border-accent-purple/50"
        >
          <option value="">Sin tarea</option>
          {pendingTasks.map((t) => (
            <option key={t._id} value={t._id}>
              {t.title}
            </option>
          ))}
        </select>
        {activeTask && (
          <p className="mt-1 text-xs text-accent-purple">
            Enfocado en: {activeTask.title}
          </p>
        )}
      </div>
    </div>
  );
}
