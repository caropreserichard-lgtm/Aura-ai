"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { Task } from "@/lib/types";
import { sortTasksForToday, formatTime } from "@/lib/scoring";
import { RotateCcw, Check, SkipForward, Trash2 } from "lucide-react";
import TopBar from "./TopBar";
import TaskCard from "./TaskCard";
import AddTaskModal from "./AddTaskModal";
import ProgressRing from "./ProgressRing";
import XPBar from "./XPBar";
import StreakBadge from "./StreakBadge";
import Timer from "./Timer";
import LevelUpModal from "./LevelUpModal";
import CalendarEvents from "./CalendarEvents";

interface Stats {
  totalXP: number;
  level: number;
  levelProgress: number;
  xpInLevel: number;
  xpToNext: number;
  streak: number;
  today: {
    tasksCompleted: number;
    totalTasks: number;
    progress: number;
    timeSpent: number;
  };
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTimerTask, setActiveTimerTask] = useState<string | null>(null);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/stats"),
      ]);
      const tasksData = await tasksRes.json();
      const statsData = await statsRes.json();

      if (tasksRes.ok && Array.isArray(tasksData)) {
        setTasks(tasksData);
        setDbError(null);
      } else {
        setTasks([]);
        setDbError(tasksData?.error || "Error connecting to database");
      }

      if (statsRes.ok && !statsData?.error) {
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setTasks([]);
      setDbError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddTask = async (taskData: Record<string, unknown>) => {
    try {
      if (editingTask?._id) {
        await fetch(`/api/tasks/${editingTask._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
      } else {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
      }
      setEditingTask(null);
      fetchData();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleComplete = async (id: string) => {
    const previousLevel = stats?.level || 1;
    confetti({ particleCount: 20, spread: 40, origin: { y: 0.7 }, colors: ["#4a9e7e", "#6b8aaf"] });
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      await fetchData();
      if (stats && stats.level > previousLevel) {
        setLevelUpLevel(stats.level);
      }
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleTimeUpdate = async (taskId: string, seconds: number) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addTime: seconds }),
      });
      fetchData();
    } catch (error) {
      console.error("Error updating time:", error);
    }
  };

  const handleSeedData = async () => {
    try {
      await fetch("/api/seed", { method: "POST" });
      fetchData();
    } catch (error) {
      console.error("Error seeding:", error);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const isRecurringToday = (task: Task): boolean => {
    if (!task.recurring) return false;
    const dow = new Date().getDay();
    switch (task.recurring.type) {
      case "daily": return true;
      case "weekdays": return dow >= 1 && dow <= 5;
      case "weekends": return dow === 0 || dow === 6;
      case "weekly": return task.recurring.days?.includes(dow) ?? true;
      case "custom": return task.recurring.days?.includes(dow) ?? false;
      default: return false;
    }
  };

  const getRecurringLabel = (task: Task): string => {
    if (!task.recurring) return "";
    const labels: Record<string, string> = { daily: "Every day", weekdays: "Mon–Fri", weekends: "Weekends", weekly: "Weekly", custom: "Custom" };
    if (task.recurring.type === "custom" && task.recurring.days?.length) {
      const names = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
      return task.recurring.days.map((d) => names[d]).join(" · ");
    }
    return labels[task.recurring.type] || "";
  };

  const handleRecurringDoneToday = async (id: string) => {
    setOpenMenu(null);
    confetti({ particleCount: 15, spread: 35, origin: { y: 0.6 }, colors: ["#4a9e7e", "#6b8aaf"] });
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addCompletion: todayStr }),
    });
    fetchData();
  };

  const handleRecurringSkip = async (id: string) => {
    setOpenMenu(null);
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addSkipDate: todayStr }),
    });
    fetchData();
  };

  const handleRecurringDelete = async (id: string) => {
    setOpenMenu(null);
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchData();
  };

  const recurringToday = tasks.filter((t) => t.recurring && t.status !== "done" && isRecurringToday(t));
  const todayTasks = sortTasksForToday(tasks).slice(0, 5);
  const doneTodayCount = tasks.filter((t) => t.status === "done").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-muted text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar onAddTask={() => setShowAddModal(true)} />

      <div className="p-4 md:p-6 space-y-5 pb-24 md:pb-6">
        {dbError && (
          <div className="p-3 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-sm">
            <p className="font-medium">Connection error</p>
            <p className="text-danger/70 mt-1 text-xs">{dbError}</p>
          </div>
        )}

        {/* Header stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-bg-secondary border border-border">
            <ProgressRing progress={stats?.today.progress || 0} label="today" />
            <p className="mt-2 text-[11px] text-text-muted">{doneTodayCount}/{tasks.length} tasks</p>
          </div>

          <div className="flex flex-col justify-center p-4 rounded-lg bg-bg-secondary border border-border">
            <XPBar level={stats?.level || 1} progress={stats?.levelProgress || 0} xpInLevel={stats?.xpInLevel || 0} totalXP={stats?.totalXP || 0} />
            <div className="mt-3"><StreakBadge streak={stats?.streak || 0} /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-bg-secondary border border-border text-center">
              <p className="font-mono text-2xl font-bold text-accent">{stats?.today.tasksCompleted || 0}</p>
              <p className="text-[10px] text-text-muted mt-1">Done today</p>
            </div>
            <div className="p-3 rounded-lg bg-bg-secondary border border-border text-center">
              <p className="font-mono text-2xl font-bold text-warning">{todayTasks.length}</p>
              <p className="text-[10px] text-text-muted mt-1">Pending</p>
            </div>
            <div className="col-span-2 p-3 rounded-lg bg-bg-secondary border border-border text-center">
              <p className="font-mono text-lg font-bold text-secondary">{formatTime(stats?.today.timeSpent || 0)}</p>
              <p className="text-[10px] text-text-muted mt-1">Time today</p>
            </div>
          </div>
        </div>

        {/* Daily Routines */}
        {recurringToday.length > 0 && (
          <div ref={menuRef}>
            <div className="flex items-center gap-2 mb-2.5">
              <RotateCcw size={13} className="text-accent" />
              <h2 className="font-heading font-semibold text-sm text-text-secondary">Daily Routines</h2>
              <span className="text-[10px] text-text-muted font-mono bg-bg-hover px-1.5 py-0.5 rounded-full">
                {recurringToday.filter((t) => t.completions?.includes(todayStr)).length}/{recurringToday.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {recurringToday.map((task) => {
                const CAT_COLORS: Record<string, string> = { trabajo: "#d4a04e", aprendizaje: "#8b7ec8", lifestyle: "#4a9e7e", proyectos: "#6b8aaf" };
                const color = CAT_COLORS[task.category] || "#666";
                const doneToday = task.completions?.includes(todayStr) ?? false;
                const skippedToday = task.skips?.includes(todayStr) ?? false;
                const menuOpen = openMenu === task._id;

                return (
                  <div key={task._id}
                    className={`relative flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${
                      doneToday ? "border-accent/30 bg-accent/5 opacity-70" : skippedToday ? "border-border bg-bg-secondary opacity-50" : "border-border bg-bg-secondary hover:border-border-strong"
                    }`}>
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => !doneToday && !skippedToday && setOpenMenu(menuOpen ? null : task._id!)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          doneToday ? "border-accent bg-accent text-white" : skippedToday ? "border-text-muted bg-bg-tertiary" : "border-text-muted hover:border-accent"
                        }`}>
                        {doneToday && <Check size={12} />}
                        {skippedToday && <SkipForward size={10} className="text-text-muted" />}
                      </button>
                      {menuOpen && (
                        <div className="absolute left-0 top-8 z-30 w-44 bg-bg-primary border border-border rounded-lg shadow-xl overflow-hidden">
                          <button onClick={() => handleRecurringDoneToday(task._id!)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors">
                            <Check size={13} className="text-accent" /> Done for today
                          </button>
                          <button onClick={() => handleRecurringSkip(task._id!)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover transition-colors">
                            <SkipForward size={13} className="text-text-muted" /> Skip today
                          </button>
                          <div className="border-t border-border" />
                          <button onClick={() => handleRecurringDelete(task._id!)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-bg-hover transition-colors">
                            <Trash2 size={13} /> Remove task
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12px] font-medium leading-tight truncate ${doneToday || skippedToday ? "line-through text-text-muted" : "text-text-primary"}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-medium" style={{ color }}>#{task.subcategory}</span>
                        <span className="text-[9px] text-text-muted">·</span>
                        <span className="text-[9px] text-text-muted">{getRecurringLabel(task)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-base text-text-primary">Today&apos;s Focus</h2>
              <span className="text-[11px] text-text-muted">Sorted by Flow Score</span>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-12 rounded-lg bg-bg-secondary border border-border">
                <p className="text-text-muted mb-4 text-sm">No tasks yet</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button onClick={() => setShowAddModal(true)} className="px-4 py-2 rounded-lg bg-accent text-text-inverse font-medium text-sm hover:bg-accent-hover transition-colors">Create first task</button>
                  <button onClick={handleSeedData} className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary font-medium text-sm hover:bg-bg-hover transition-colors">Load samples</button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {todayTasks.map((task) => (
                  <TaskCard key={task._id} task={task} onComplete={handleComplete} onDelete={handleDelete}
                    onFocus={(t) => setActiveTimerTask(t._id || null)}
                    onEdit={(t) => { setEditingTask(t); setShowAddModal(true); }} />
                ))}
                {tasks.filter((t) => t.status !== "done").length > 5 && (
                  <a href="/tasks" className="block text-center py-2 text-sm text-accent-text hover:text-accent transition-colors">
                    View all tasks ({tasks.filter((t) => t.status !== "done").length})
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Timer tasks={tasks} activeTaskId={activeTimerTask} onTimeUpdate={handleTimeUpdate} onSetActiveTask={setActiveTimerTask} />
            <CalendarEvents />
          </div>
        </div>
      </div>

      <AddTaskModal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingTask(null); }}
        onSave={handleAddTask} editTask={editingTask} />

      <LevelUpModal level={levelUpLevel || 1} isOpen={levelUpLevel !== null} onClose={() => setLevelUpLevel(null)} />
    </div>
  );
}
