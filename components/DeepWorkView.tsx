"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pause, Play, Square, SkipForward, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useDeepWork, type DeepWorkState } from "@/lib/hooks/useDeepWork";
import { Task } from "@/lib/types";
import { formatTime } from "@/lib/scoring";

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function DeepWorkView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [task, setTask] = useState<Task | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(taskId || "");

  const deepWork = useDeepWork();

  // Fetch tasks
  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const pending = data.filter((t: Task) => t.status !== "done");
          setAllTasks(pending);
          if (taskId) {
            const found = data.find((t: Task) => t._id === taskId);
            if (found) {
              setTask(found);
              setSelectedTaskId(found._id!);
            }
          }
        }
      })
      .catch(console.error);
  }, [taskId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deepWork.state === "idle" || deepWork.state === "completed") {
          router.push("/");
        }
      }
      if (e.key === " " && deepWork.state !== "idle" && deepWork.state !== "completed") {
        e.preventDefault();
        if (deepWork.isPaused) deepWork.resume();
        else deepWork.pause();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deepWork, router]);

  // Confetti on completion
  useEffect(() => {
    if (deepWork.state === "completed") {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981"],
      });
    }
  }, [deepWork.state]);

  const handleCompleteTask = async () => {
    const id = selectedTaskId || task?._id;
    if (!id) return;

    // Save time worked
    if (deepWork.totalTimeWorked > 0) {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addTime: deepWork.totalTimeWorked }),
      });
    }

    // Mark as done
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#8B5CF6", "#EC4899"],
    });

    setTimeout(() => router.push("/"), 1500);
  };

  const handleSaveAndLeave = async () => {
    const id = selectedTaskId || task?._id;
    if (id && deepWork.totalTimeWorked > 0) {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addTime: deepWork.totalTimeWorked }),
      });
    }
    router.push("/");
  };

  const handleStart = () => {
    const id = selectedTaskId;
    if (id) {
      const found = allTasks.find((t) => t._id === id);
      if (found) setTask(found);
    }
    deepWork.start();
  };

  const progressPercent =
    deepWork.state === "working"
      ? ((deepWork.config.sessionMinutes * 60 - deepWork.secondsLeft) /
          (deepWork.config.sessionMinutes * 60)) *
        100
      : deepWork.state === "break"
      ? ((deepWork.config.breakMinutes * 60 - deepWork.secondsLeft) /
          (deepWork.config.breakMinutes * 60)) *
        100
      : 0;

  return (
    <div className="fixed inset-0 bg-bg-primary z-50 flex flex-col items-center justify-center">
      {/* Back button */}
      <button
        onClick={() =>
          deepWork.state === "idle" || deepWork.state === "completed"
            ? router.push("/")
            : deepWork.stop()
        }
        className="absolute top-6 left-6 text-text-muted hover:text-text-primary transition-colors flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={18} />
        {deepWork.state === "idle" || deepWork.state === "completed" ? "Volver" : "Terminar"}
      </button>

      {/* IDLE — Setup screen */}
      {deepWork.state === "idle" && (
        <div className="w-full max-w-md px-6 space-y-8">
          <div className="text-center">
            <h1 className="font-heading font-extrabold text-3xl text-transparent bg-clip-text xp-gradient">
              Deep Work
            </h1>
            <p className="text-text-muted text-sm mt-2">
              Enfoque total, cero distracciones
            </p>
          </div>

          {/* Task selector */}
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Tarea</label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full bg-bg-secondary border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
            >
              <option value="">Sin tarea</option>
              {allTasks.map((t) => (
                <option key={t._id} value={t._id!}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Session duration */}
          <div>
            <label className="text-xs text-text-muted block mb-1.5">
              Duración de sesión
            </label>
            <div className="flex gap-2">
              {[25, 50, 90].map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    deepWork.setConfig({ ...deepWork.config, sessionMinutes: m })
                  }
                  className={`flex-1 py-2.5 rounded-lg font-mono text-sm font-bold transition-colors ${
                    deepWork.config.sessionMinutes === m
                      ? "bg-accent-purple/20 text-accent-purple border border-accent-purple/30"
                      : "bg-bg-secondary border border-white/5 text-text-secondary hover:border-white/10"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Sessions count */}
          <div>
            <label className="text-xs text-text-muted block mb-1.5">
              Número de sesiones
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() =>
                    deepWork.setConfig({ ...deepWork.config, totalSessions: n })
                  }
                  className={`flex-1 py-2.5 rounded-lg font-mono text-sm font-bold transition-colors ${
                    deepWork.config.totalSessions === n
                      ? "bg-accent-purple/20 text-accent-purple border border-accent-purple/30"
                      : "bg-bg-secondary border border-white/5 text-text-secondary hover:border-white/10"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Break duration */}
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Descanso</label>
            <div className="flex gap-2">
              {[5, 10, 15].map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    deepWork.setConfig({ ...deepWork.config, breakMinutes: m })
                  }
                  className={`flex-1 py-2.5 rounded-lg font-mono text-sm font-bold transition-colors ${
                    deepWork.config.breakMinutes === m
                      ? "bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30"
                      : "bg-bg-secondary border border-white/5 text-text-secondary hover:border-white/10"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-xl xp-gradient text-white font-heading font-bold text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Comenzar Deep Work
          </button>

          <p className="text-center text-text-muted text-xs">
            Esc para volver · Espacio para pausar/reanudar
          </p>
        </div>
      )}

      {/* WORKING — Focus screen */}
      {deepWork.state === "working" && (
        <div className="text-center space-y-6">
          {/* Session indicator */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: deepWork.totalSessions }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i < deepWork.currentSession - 1
                    ? "bg-accent-purple"
                    : i === deepWork.currentSession - 1
                    ? "bg-accent-pink animate-pulse"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>

          <p className="text-text-muted text-sm">
            Sesión {deepWork.currentSession} de {deepWork.totalSessions}
          </p>

          {/* Big timer */}
          <div className="relative">
            <p className="font-mono text-8xl md:text-9xl font-bold text-text-primary tracking-wider">
              {formatTimer(deepWork.secondsLeft)}
            </p>
            {/* Progress bar under timer */}
            <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full xp-gradient rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Task title */}
          {task && (
            <p className="text-text-secondary text-sm max-w-sm mx-auto truncate">
              {task.title}
            </p>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            {deepWork.isPaused ? (
              <button
                onClick={deepWork.resume}
                className="w-16 h-16 rounded-full xp-gradient flex items-center justify-center text-white transition-transform hover:scale-110"
              >
                <Play size={28} />
              </button>
            ) : (
              <button
                onClick={deepWork.pause}
                className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-text-primary transition-transform hover:scale-110 hover:bg-white/15"
              >
                <Pause size={28} />
              </button>
            )}
            <button
              onClick={deepWork.stop}
              className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 transition-transform hover:scale-110 hover:bg-red-500/20"
            >
              <Square size={20} />
            </button>
          </div>

          {deepWork.isPaused && (
            <p className="text-accent-amber text-sm animate-pulse">En pausa</p>
          )}
        </div>
      )}

      {/* BREAK — Rest screen */}
      {deepWork.state === "break" && (
        <div className="text-center space-y-6">
          <p className="text-accent-emerald text-sm font-medium">Descanso</p>

          <p className="font-mono text-7xl md:text-8xl font-bold text-accent-emerald tracking-wider">
            {formatTimer(deepWork.secondsLeft)}
          </p>

          <p className="text-text-muted text-sm">
            Siguiente: Sesión {deepWork.currentSession + 1} de{" "}
            {deepWork.totalSessions}
          </p>

          {/* Progress bar */}
          <div className="h-1 bg-white/5 rounded-full overflow-hidden max-w-xs mx-auto">
            <div
              className="h-full bg-accent-emerald rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <button
            onClick={deepWork.skipBreak}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-white/5 text-text-secondary hover:bg-white/10 text-sm transition-colors"
          >
            <SkipForward size={16} />
            Saltar descanso
          </button>
        </div>
      )}

      {/* COMPLETED — Summary screen */}
      {deepWork.state === "completed" && (
        <div className="text-center space-y-6 max-w-sm px-6">
          <div className="text-5xl">{"🎯"}</div>
          <h2 className="font-heading font-extrabold text-2xl text-transparent bg-clip-text xp-gradient">
            Sesión completada
          </h2>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-bg-secondary border border-white/5">
              <p className="font-mono text-2xl font-bold text-accent-purple">
                {formatTime(deepWork.totalTimeWorked)}
              </p>
              <p className="text-xs text-text-muted mt-1">Tiempo total</p>
            </div>
            <div className="p-4 rounded-xl bg-bg-secondary border border-white/5">
              <p className="font-mono text-2xl font-bold text-accent-pink">
                {deepWork.currentSession}
              </p>
              <p className="text-xs text-text-muted mt-1">Sesiones</p>
            </div>
          </div>

          {task && (
            <p className="text-text-secondary text-sm">{task.title}</p>
          )}

          <div className="space-y-3 pt-2">
            {(selectedTaskId || task?._id) && (
              <button
                onClick={handleCompleteTask}
                className="w-full py-3 rounded-xl xp-gradient text-white font-medium flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              >
                <CheckCircle2 size={18} />
                Completar tarea
              </button>
            )}
            <button
              onClick={handleSaveAndLeave}
              className="w-full py-3 rounded-xl bg-white/5 text-text-secondary hover:bg-white/10 font-medium text-sm transition-colors"
            >
              Guardar tiempo y volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
