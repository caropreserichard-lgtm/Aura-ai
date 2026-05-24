"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pause, Play, Square, SkipForward, CheckCircle2, Search, X as XIcon } from "lucide-react";
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
  const [taskQuery, setTaskQuery] = useState("");
  const [taskListOpen, setTaskListOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const taskSearchRef = useRef<HTMLInputElement>(null);
  const [customMins, setCustomMins] = useState("");

  const deepWork = useDeepWork();

  const SESSION_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];

  const selectedTask = useMemo(
    () => allTasks.find((t) => t._id === selectedTaskId) || null,
    [allTasks, selectedTaskId],
  );

  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    if (!q) return allTasks.slice(0, 50);
    return allTasks
      .filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.subcategory || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [allTasks, taskQuery]);

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
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "Escape") {
        // If the search input is open/focused, let its local handler manage Escape.
        if (typing || taskListOpen) return;
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
  }, [deepWork, router, taskListOpen]);

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
            <h1 className="font-heading font-extrabold text-3xl text-transparent bg-clip-text bg-accent">
              Deep Work
            </h1>
            <p className="text-text-muted text-sm mt-2">
              Enfoque total, cero distracciones
            </p>
          </div>

          {/* Task selector — searchable */}
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Tarea</label>

            {selectedTask && !taskListOpen ? (
              <div className="flex items-center gap-2 w-full bg-bg-secondary border border-border-strong rounded-lg px-3 py-2.5">
                <span className="text-sm text-text-primary truncate flex-1">{selectedTask.title}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTaskListOpen(true);
                    setTaskQuery("");
                    setHighlightIdx(0);
                    setTimeout(() => taskSearchRef.current?.focus(), 0);
                  }}
                  className="text-[11px] text-text-muted hover:text-accent transition-colors px-2 py-0.5 rounded border border-border hover:border-accent"
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedTaskId(""); setTask(null); }}
                  className="p-0.5 text-text-muted hover:text-danger transition-colors"
                  title="Quitar tarea"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 w-full bg-bg-secondary border border-border-strong rounded-lg px-3 py-2.5 focus-within:border-accent transition-colors">
                  <Search size={14} className="text-text-muted flex-shrink-0" />
                  <input
                    ref={taskSearchRef}
                    type="text"
                    value={taskQuery}
                    onChange={(e) => { setTaskQuery(e.target.value); setHighlightIdx(0); setTaskListOpen(true); }}
                    onFocus={() => setTaskListOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlightIdx((i) => Math.min(i + 1, Math.max(filteredTasks.length - 1, 0)));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlightIdx((i) => Math.max(i - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const pick = filteredTasks[highlightIdx];
                        if (pick) {
                          setSelectedTaskId(pick._id!);
                          setTask(pick);
                          setTaskListOpen(false);
                          setTaskQuery("");
                        }
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        if (taskListOpen) { setTaskListOpen(false); (e.target as HTMLInputElement).blur(); }
                      }
                    }}
                    placeholder="Buscar tarea por título, categoría…"
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                  />
                  {taskQuery && (
                    <button type="button" onClick={() => { setTaskQuery(""); taskSearchRef.current?.focus(); }}
                      className="text-text-muted hover:text-text-primary transition-colors" title="Limpiar">
                      <XIcon size={13} />
                    </button>
                  )}
                </div>

                {taskListOpen && (
                  <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-border bg-bg-secondary shadow-2xl">
                    <button
                      type="button"
                      onClick={() => { setSelectedTaskId(""); setTask(null); setTaskListOpen(false); setTaskQuery(""); }}
                      className="w-full text-left px-3 py-2 text-[12px] text-text-muted hover:bg-bg-hover border-b border-border"
                    >
                      Sin tarea
                    </button>
                    {filteredTasks.length === 0 ? (
                      <p className="px-3 py-3 text-[12px] text-text-muted text-center">Sin resultados</p>
                    ) : (
                      filteredTasks.map((t, i) => (
                        <button
                          key={t._id}
                          type="button"
                          onMouseEnter={() => setHighlightIdx(i)}
                          onClick={() => {
                            setSelectedTaskId(t._id!);
                            setTask(t);
                            setTaskListOpen(false);
                            setTaskQuery("");
                          }}
                          className={`w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 transition-colors ${
                            i === highlightIdx ? "bg-accent/15 text-text-primary" : "text-text-secondary hover:bg-bg-hover"
                          }`}
                        >
                          <span className="truncate">{t.title}</span>
                          <span className="text-[10px] text-text-muted truncate">{t.subcategory || t.category}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Session duration — presets + custom */}
          <div>
            <label className="text-xs text-text-muted block mb-1.5">
              Duración de sesión
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {SESSION_PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    deepWork.setConfig({ ...deepWork.config, sessionMinutes: m });
                    setCustomMins("");
                  }}
                  className={`py-2 rounded-lg font-mono text-xs font-bold transition-colors ${
                    deepWork.config.sessionMinutes === m && !customMins
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "bg-bg-secondary border border-border text-text-secondary hover:border-border-strong"
                  }`}
                >
                  {m < 60 ? `${m}m` : m === 90 ? "1.5h" : `${m / 60}h`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min={1}
                max={600}
                value={customMins}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomMins(v);
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n > 0) {
                    deepWork.setConfig({ ...deepWork.config, sessionMinutes: n });
                  }
                }}
                placeholder="Minutos personalizados"
                className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <span className="text-[11px] text-text-muted">min</span>
            </div>
            {customMins && parseInt(customMins, 10) > 0 && (
              <p className="text-[10px] text-text-muted mt-1">
                Sesión personalizada: {parseInt(customMins, 10)} min
              </p>
            )}
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
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "bg-bg-secondary border border-border text-text-secondary hover:border-border-strong"
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
                      ? "bg-success/20 text-success border border-success/30"
                      : "bg-bg-secondary border border-border text-text-secondary hover:border-border-strong"
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
            className="w-full py-4 rounded-lg bg-accent text-text-inverse font-heading font-bold text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
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
                    ? "bg-accent"
                    : i === deepWork.currentSession - 1
                    ? "bg-secondary animate-pulse"
                    : "bg-bg-hover"
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
            <div className="mt-4 h-1 bg-bg-tertiary rounded-full overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full bg-accent rounded-full transition-all duration-1000"
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
                className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-text-inverse transition-transform hover:scale-110"
              >
                <Play size={28} />
              </button>
            ) : (
              <button
                onClick={deepWork.pause}
                className="w-16 h-16 rounded-full bg-bg-hover flex items-center justify-center text-text-primary transition-transform hover:scale-110 hover:bg-white/15"
              >
                <Pause size={28} />
              </button>
            )}
            <button
              onClick={deepWork.stop}
              className="w-12 h-12 rounded-full bg-danger-subtle flex items-center justify-center text-danger transition-transform hover:scale-110 hover:bg-red-500/20"
            >
              <Square size={20} />
            </button>
          </div>

          {deepWork.isPaused && (
            <p className="text-warning text-sm animate-pulse">En pausa</p>
          )}
        </div>
      )}

      {/* BREAK — Rest screen */}
      {deepWork.state === "break" && (
        <div className="text-center space-y-6">
          <p className="text-success text-sm font-medium">Descanso</p>

          <p className="font-mono text-7xl md:text-8xl font-bold text-success tracking-wider">
            {formatTimer(deepWork.secondsLeft)}
          </p>

          <p className="text-text-muted text-sm">
            Siguiente: Sesión {deepWork.currentSession + 1} de{" "}
            {deepWork.totalSessions}
          </p>

          {/* Progress bar */}
          <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden max-w-xs mx-auto">
            <div
              className="h-full bg-success rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <button
            onClick={deepWork.skipBreak}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-hover text-sm transition-colors"
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
          <h2 className="font-heading font-extrabold text-2xl text-transparent bg-clip-text bg-accent">
            Sesión completada
          </h2>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-bg-secondary border border-border">
              <p className="font-mono text-2xl font-bold text-accent">
                {formatTime(deepWork.totalTimeWorked)}
              </p>
              <p className="text-xs text-text-muted mt-1">Tiempo total</p>
            </div>
            <div className="p-4 rounded-lg bg-bg-secondary border border-border">
              <p className="font-mono text-2xl font-bold text-secondary">
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
                className="w-full py-3 rounded-lg bg-accent text-text-inverse font-medium flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              >
                <CheckCircle2 size={18} />
                Completar tarea
              </button>
            )}
            <button
              onClick={handleSaveAndLeave}
              className="w-full py-3 rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-hover font-medium text-sm transition-colors"
            >
              Guardar tiempo y volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
