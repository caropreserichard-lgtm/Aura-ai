"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import confetti from "canvas-confetti";
import {
  Circle, CheckCircle2, Clock, Play, MoreHorizontal, Plus,
  Trash2, ArrowRight, ChevronDown, ChevronUp, Calendar, Tag,
  Timer, Loader2, Filter, Link2
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AddTaskModal from "@/components/AddTaskModal";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { Task, Category, Priority, TaskStatus, CATEGORIES, PRIORITY_CONFIG } from "@/lib/types";
import { useTimerStore } from "@/lib/timerStore";
import { formatTime } from "@/lib/scoring";

/* ── Column Config ─────────────────────────────────────── */
const COLUMNS: {
  id: TaskStatus;
  label: string;
  icon: React.ReactNode;
  emptyMsg: string;
  accentColor: string;
  glowColor: string;
}[] = [
  {
    id: "pending",
    label: "Pendientes",
    icon: <Circle size={14} className="text-text-muted" />,
    emptyMsg: "No tienes tareas pendientes",
    accentColor: "rgba(160, 160, 160, 0.6)",
    glowColor: "rgba(160, 160, 160, 0.05)",
  },
  {
    id: "in_progress",
    label: "En Progreso",
    icon: <Loader2 size={14} className="text-amber-400 animate-spin" style={{ animationDuration: "3s" }} />,
    emptyMsg: "Ninguna tarea en progreso",
    accentColor: "rgba(231, 202, 121, 0.8)",
    glowColor: "rgba(231, 202, 121, 0.06)",
  },
  {
    id: "done",
    label: "Completadas",
    icon: <CheckCircle2 size={14} className="text-emerald-400" />,
    emptyMsg: "Completa tu primera tarea hoy",
    accentColor: "rgba(52, 211, 153, 0.7)",
    glowColor: "rgba(52, 211, 153, 0.05)",
  },
];

const CAT_COLORS: Record<string, string> = {
  trabajo: "#e7ca79",
  aprendizaje: "#8b7ec8",
  lifestyle: "#4a9e7e",
  proyectos: "#6b8aaf",
};

const PRIORITY_DOT: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-amber-500",
  3: "bg-blue-500",
  4: "bg-gray-500",
};

/* ── Main Page ─────────────────────────────────────────── */
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ taskId: string; x: number; y: number } | null>(null);

  const timerTaskId = useTimerStore((s) => s.taskId);
  const timerIsRunning = useTimerStore((s) => s.isRunning);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  /* ── Actions ───────────────────────────────────── */
  const handleAddTask = async (taskData: Record<string, unknown>) => {
    try {
      if (editingTask?._id) {
        await fetch(`/api/tasks/${editingTask._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskData) });
      } else {
        await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskData) });
      }
      setEditingTask(null);
      fetchTasks();
    } catch (error) { console.error("Error saving task:", error); }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => t._id === taskId ? {
        ...t,
        status: newStatus,
        ...(newStatus === "done" ? { completedAt: new Date().toISOString() } : { completedAt: undefined }),
      } : t)
    );

    if (newStatus === "done") {
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.6 }, colors: ["#e7ca79", "#d4b868", "#34d399"] });
      try { const { usePulseStore } = await import("@/lib/pulseStore"); usePulseStore.getState().recordTaskComplete(); } catch { /* ignore */ }
    }

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "done" ? { completedAt: new Date().toISOString() } : {}),
        }),
      });
      fetchTasks();
    } catch (error) {
      console.error("Error updating status:", error);
      fetchTasks(); // revert
    }
  };

  const handleDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t._id !== id));
    try { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); }
    catch (error) { console.error("Error deleting task:", error); fetchTasks(); }
  };

  const handleTaskUpdate = async (taskId: string, updates: Record<string, unknown>) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      fetchTasks();
      if (selectedTask?._id === taskId) {
        setSelectedTask((prev) => prev ? { ...prev, ...updates } as Task : null);
      }
    } catch (error) { console.error("Error updating task:", error); }
  };

  const handleStartTimer = async (task: Task) => {
    // Move to in_progress when timer starts
    if (task.status === "pending") {
      handleStatusChange(task._id!, "in_progress");
    }
    const store = useTimerStore.getState();
    store.startTimer(task._id || "", task.title, task.estimatedTime || 25);
  };

  /* ── Filtering ─────────────────────────────────── */
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterCategory, filterPriority]);

  // Auto-detect in_progress: if timer is running on a task, mark it
  useEffect(() => {
    if (timerTaskId && timerIsRunning) {
      const task = tasks.find((t) => t._id === timerTaskId);
      if (task && task.status === "pending") {
        handleStatusChange(timerTaskId, "in_progress");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerTaskId, timerIsRunning]);

  const tasksByColumn = useMemo(() => {
    const pending = filteredTasks
      .filter((t) => t.status === "pending")
      .sort((a, b) => a.priority - b.priority || b.flowScore - a.flowScore);
    const inProgress = filteredTasks
      .filter((t) => t.status === "in_progress")
      .sort((a, b) => a.priority - b.priority);
    const done = filteredTasks
      .filter((t) => t.status === "done")
      .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());
    return { pending, in_progress: inProgress, done };
  }, [filteredTasks]);

  const totalCount = filteredTasks.length;
  const doneCount = tasksByColumn.done.length;
  const progressCount = tasksByColumn.in_progress.length;

  /* ── Render ────────────────────────────────────── */
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar onAddTask={() => setShowAddModal(true)} />
        <div className="p-4 md:p-6 pb-24 md:pb-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-heading font-semibold text-lg text-text-primary">Tasks</h1>
              <p className="text-[12px] text-text-muted mt-0.5">
                {doneCount} de {totalCount} completadas
                {progressCount > 0 && <span className="text-amber-400 ml-2">· {progressCount} en progreso</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                  showFilters || filterCategory !== "all" || filterPriority !== "all"
                    ? "bg-accent-subtle text-accent-text border-accent/20"
                    : "text-text-muted border-border hover:bg-bg-hover"
                }`}
              >
                <Filter size={13} />
                Filtros
                {(filterCategory !== "all" || filterPriority !== "all") && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent text-bg-primary hover:bg-accent-hover transition-colors"
              >
                <Plus size={13} />
                Nueva tarea
              </button>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mb-4 p-3 rounded-xl bg-bg-secondary border border-border space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] text-text-muted self-center mr-1">Categoría:</span>
                <FilterChip label="Todas" active={filterCategory === "all"} onClick={() => setFilterCategory("all")} />
                {(Object.keys(CATEGORIES) as Category[]).map((cat) => (
                  <FilterChip
                    key={cat}
                    label={`${CATEGORIES[cat].icon} ${CATEGORIES[cat].label}`}
                    active={filterCategory === cat}
                    onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
                    color={CAT_COLORS[cat]}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] text-text-muted self-center mr-1">Prioridad:</span>
                <FilterChip label="Todas" active={filterPriority === "all"} onClick={() => setFilterPriority("all")} />
                {([1, 2, 3, 4] as Priority[]).map((p) => (
                  <FilterChip
                    key={p}
                    label={PRIORITY_CONFIG[p].label}
                    active={filterPriority === p}
                    onClick={() => setFilterPriority(filterPriority === p ? "all" : p)}
                    color={PRIORITY_CONFIG[p].color}
                  />
                ))}
              </div>
              {(filterCategory !== "all" || filterPriority !== "all") && (
                <button
                  onClick={() => { setFilterCategory("all"); setFilterPriority("all"); }}
                  className="text-[11px] text-accent hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Completion progress bar */}
          <div className="mb-5">
            <div className="h-1 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%",
                  background: "linear-gradient(90deg, #e7ca79, #34d399)",
                }}
              />
            </div>
          </div>

          {/* 3-Column Layout */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-8 rounded-lg bg-bg-secondary animate-pulse" />
                  <div className="h-24 rounded-lg bg-bg-secondary animate-pulse" />
                  <div className="h-16 rounded-lg bg-bg-secondary animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {COLUMNS.map((col) => {
                const columnTasks = tasksByColumn[col.id];
                return (
                  <div key={col.id} className="flex flex-col min-h-[300px]">
                    {/* Column header */}
                    <div className="flex items-center gap-2 mb-3 pb-2.5 border-b-2" style={{ borderColor: col.accentColor }}>
                      {col.icon}
                      <h2 className="font-heading font-semibold text-[13px] text-text-secondary">{col.label}</h2>
                      <span
                        className="text-[11px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: col.glowColor, color: col.accentColor }}
                      >
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Task list */}
                    <div className="flex-1 space-y-1.5">
                      {columnTasks.length === 0 ? (
                        <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-border/50">
                          <p className="text-[12px] text-text-muted/60">{col.emptyMsg}</p>
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <TaskRow
                            key={task._id}
                            task={task}
                            columnId={col.id}
                            isTimerActive={timerTaskId === task._id && timerIsRunning}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                            onClick={() => setSelectedTask(task)}
                            onStartTimer={() => handleStartTimer(task)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ taskId: task._id!, x: e.clientX, y: e.clientY });
                            }}
                          />
                        ))
                      )}

                      {/* Add task shortcut for pending column */}
                      {col.id === "pending" && (
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-text-muted hover:text-text-secondary hover:bg-bg-hover border border-dashed border-transparent hover:border-border/50 transition-all"
                        >
                          <Plus size={13} />
                          Agregar tarea
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Context menu */}
        {contextMenu && (
          <ContextMenuPopup
            x={contextMenu.x}
            y={contextMenu.y}
            task={tasks.find((t) => t._id === contextMenu.taskId)!}
            onStatusChange={(status) => {
              handleStatusChange(contextMenu.taskId, status);
              setContextMenu(null);
            }}
            onDelete={() => {
              handleDelete(contextMenu.taskId);
              setContextMenu(null);
            }}
            onClose={() => setContextMenu(null)}
          />
        )}

        <AddTaskModal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingTask(null); }} onSave={handleAddTask} editTask={editingTask} />

        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={(updates) => handleTaskUpdate(selectedTask._id!, updates)}
            onComplete={() => { handleStatusChange(selectedTask._id!, "done"); setSelectedTask(null); }}
            onDelete={() => { handleDelete(selectedTask._id!); setSelectedTask(null); }}
            onStartTimer={() => handleStartTimer(selectedTask)}
          />
        )}
      </main>
    </div>
  );
}

/* ── Task Row Component ──────────────────────────────────── */
function TaskRow({
  task,
  columnId,
  isTimerActive,
  onStatusChange,
  onDelete,
  onClick,
  onStartTimer,
  onContextMenu,
}: {
  task: Task;
  columnId: TaskStatus;
  isTimerActive: boolean;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
  onStartTimer: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isDone = columnId === "done";
  const isProgress = columnId === "in_progress";
  const catColor = CAT_COLORS[task.category] || "#a0a0a0";

  const handleToggle = () => {
    if (isDone) {
      // Uncomplete: move back to pending
      onStatusChange(task._id!, "pending");
    } else {
      // Complete
      onStatusChange(task._id!, "done");
    }
  };

  const subtasksDone = task.subtasks?.filter((s) => s.done).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 cursor-pointer ${
        isDone
          ? "bg-bg-secondary/40 border-border/30 hover:bg-bg-secondary/60"
          : isTimerActive
          ? "bg-amber-500/5 border-amber-500/20 ring-1 ring-amber-500/10"
          : isProgress
          ? "bg-bg-secondary border-amber-500/15 hover:border-amber-500/30"
          : "bg-bg-secondary border-border hover:border-border-strong hover:bg-bg-hover"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
    >
      <div className="px-3 py-2.5" onClick={onClick}>
        <div className="flex items-start gap-2.5">
          {/* Checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
            className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200 ${
              isDone
                ? "bg-emerald-500 border-emerald-500"
                : isProgress
                ? "border-amber-400 hover:border-amber-300 hover:bg-amber-400/10"
                : "border-text-muted/40 hover:border-accent hover:bg-accent/10"
            }`}
          >
            {isDone && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Priority dot */}
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] || "bg-gray-500"}`} />
              <span className={`text-[13px] leading-snug ${
                isDone ? "line-through text-text-muted/60" : "text-text-primary"
              }`}>
                {task.title}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* Category badge */}
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: `${catColor}12`,
                  color: catColor,
                }}
              >
                # {task.subcategory}
              </span>

              {/* Due date */}
              {task.dueDate && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                  <Calendar size={9} />
                  {new Date(task.dueDate + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                </span>
              )}

              {/* Subtasks */}
              {subtasksTotal > 0 && (
                <span className={`text-[10px] ${subtasksDone === subtasksTotal ? "text-emerald-400" : "text-text-muted"}`}>
                  {subtasksDone}/{subtasksTotal}
                </span>
              )}

              {/* Time spent */}
              {task.timeSpent > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted font-mono">
                  <Clock size={9} />
                  {formatTime(task.timeSpent)}
                </span>
              )}

              {/* Estimated time */}
              {task.estimatedTime && task.estimatedTime > 0 && !isDone && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-muted/60 font-mono">
                  <Timer size={9} />
                  {task.estimatedTime}m
                </span>
              )}

              {/* Source URL */}
              {task.sourceUrl && (
                <a
                  href={task.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-accent/60 hover:text-accent transition-colors"
                >
                  <Link2 size={10} />
                </a>
              )}

              {/* Timer active indicator */}
              {isTimerActive && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Timer activo
                </span>
              )}
            </div>
          </div>

          {/* Action buttons on hover */}
          <div className={`flex items-center gap-1 flex-shrink-0 transition-opacity duration-150 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}>
            {!isDone && !isTimerActive && (
              <button
                onClick={(e) => { e.stopPropagation(); onStartTimer(); }}
                className="p-1 rounded-md hover:bg-accent-subtle text-text-muted hover:text-accent transition-colors"
                title="Iniciar timer"
              >
                <Play size={13} />
              </button>
            )}
            {!isDone && columnId === "pending" && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(task._id!, "in_progress"); }}
                className="p-1 rounded-md hover:bg-amber-500/10 text-text-muted hover:text-amber-400 transition-colors"
                title="Mover a En Progreso"
              >
                <ArrowRight size={13} />
              </button>
            )}
            {!isDone && columnId === "in_progress" && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(task._id!, "done"); }}
                className="p-1 rounded-md hover:bg-emerald-500/10 text-text-muted hover:text-emerald-400 transition-colors"
                title="Completar"
              >
                <CheckCircle2 size={13} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
              className="p-1 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-secondary transition-colors"
            >
              <MoreHorizontal size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Context Menu ────────────────────────────────────────── */
function ContextMenuPopup({
  x, y, task, onStatusChange, onDelete, onClose,
}: {
  x: number;
  y: number;
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  if (!task) return null;

  // Adjust position to stay in viewport
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    top: Math.min(y, window.innerHeight - 200),
    left: Math.min(x, window.innerWidth - 200),
    zIndex: 50,
  };

  return (
    <div style={menuStyle} className="bg-bg-elevated border border-border rounded-xl shadow-xl py-1 min-w-[180px] animate-in fade-in zoom-in-95">
      {task.status !== "pending" && (
        <MenuItem icon={<Circle size={13} />} label="Mover a Pendientes" onClick={() => onStatusChange("pending")} />
      )}
      {task.status !== "in_progress" && (
        <MenuItem icon={<Loader2 size={13} />} label="Mover a En Progreso" onClick={() => onStatusChange("in_progress")} />
      )}
      {task.status !== "done" && (
        <MenuItem icon={<CheckCircle2 size={13} />} label="Marcar completada" onClick={() => onStatusChange("done")} />
      )}
      <div className="h-px bg-border mx-2 my-1" />
      <MenuItem icon={<Trash2 size={13} />} label="Eliminar" onClick={onDelete} danger />
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-text-secondary hover:bg-bg-hover"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Filter Chip ─────────────────────────────────────────── */
function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
        active
          ? "border-current"
          : "border-transparent text-text-muted hover:text-text-secondary hover:bg-bg-hover"
      }`}
      style={active && color ? { backgroundColor: `${color}15`, color, borderColor: `${color}30` } : active ? { backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-strong)", color: "var(--text-primary)" } : {}}
    >
      {label}
    </button>
  );
}
