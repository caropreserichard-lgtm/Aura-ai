"use client";

import { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { Task } from "@/lib/types";
import { sortTasksForToday, formatTime } from "@/lib/scoring";
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
        setDbError(tasksData?.error || "Error al conectar con la base de datos");
      }

      if (statsRes.ok && !statsData?.error) {
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setTasks([]);
      setDbError("No se pudo conectar con el servidor");
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

    // Mini confetti on task complete
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ["#8B5CF6", "#EC4899"],
    });

    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      await fetchData();

      // Check for level up
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

  const todayTasks = sortTasksForToday(tasks).slice(0, 5);
  const doneTodayCount = tasks.filter((t) => t.status === "done").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted text-sm">Cargando tu flow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar onAddTask={() => setShowAddModal(true)} />

      <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        {dbError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <p className="font-medium">Error de conexión</p>
            <p className="text-red-400/70 mt-1">{dbError}</p>
            <p className="text-red-400/50 mt-2 text-xs">
              Verifica tu MONGODB_URI en .env.local y que el usuario tenga acceso.
            </p>
          </div>
        )}
        {/* Header: Progress + Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Progress Ring */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-bg-secondary border border-white/5">
            <ProgressRing
              progress={stats?.today.progress || 0}
              label="completado hoy"
            />
            <p className="mt-2 text-xs text-text-muted">
              {doneTodayCount}/{tasks.length} tareas
            </p>
          </div>

          {/* XP + Level */}
          <div className="flex flex-col justify-center p-4 rounded-xl bg-bg-secondary border border-white/5">
            <XPBar
              level={stats?.level || 1}
              progress={stats?.levelProgress || 0}
              xpInLevel={stats?.xpInLevel || 0}
              totalXP={stats?.totalXP || 0}
            />
            <div className="mt-3 flex items-center gap-3">
              <StreakBadge streak={stats?.streak || 0} />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-bg-secondary border border-white/5 text-center">
              <p className="font-mono text-2xl font-bold text-accent-purple">
                {stats?.today.tasksCompleted || 0}
              </p>
              <p className="text-xs text-text-muted mt-1">Hechas hoy</p>
            </div>
            <div className="p-3 rounded-xl bg-bg-secondary border border-white/5 text-center">
              <p className="font-mono text-2xl font-bold text-accent-amber">
                {todayTasks.length}
              </p>
              <p className="text-xs text-text-muted mt-1">Pendientes</p>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-bg-secondary border border-white/5 text-center">
              <p className="font-mono text-lg font-bold text-accent-emerald">
                {formatTime(stats?.today.timeSpent || 0)}
              </p>
              <p className="text-xs text-text-muted mt-1">Tiempo hoy</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-lg">
                Foco del día
              </h2>
              <span className="text-xs text-text-muted">
                Ordenado por Flow Score
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-12 rounded-xl bg-bg-secondary border border-white/5">
                <p className="text-4xl mb-3">{"\uD83D\uDE80"}</p>
                <p className="text-text-secondary mb-4">
                  No tienes tareas aún
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 rounded-lg xp-gradient text-white font-medium text-sm"
                  >
                    Crear primera tarea
                  </button>
                  <button
                    onClick={handleSeedData}
                    className="px-4 py-2 rounded-lg bg-white/5 text-text-secondary hover:bg-white/10 font-medium text-sm transition-colors"
                  >
                    Cargar tareas de ejemplo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    onFocus={(t) => setActiveTimerTask(t._id || null)}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setShowAddModal(true);
                    }}
                  />
                ))}
                {tasks.filter((t) => t.status !== "done").length > 5 && (
                  <a
                    href="/tasks"
                    className="block text-center py-2 text-sm text-accent-purple hover:text-accent-purple/80 transition-colors"
                  >
                    Ver todas las tareas ({tasks.filter((t) => t.status !== "done").length})
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Timer */}
          <div>
            <Timer
              tasks={tasks}
              activeTaskId={activeTimerTask}
              onTimeUpdate={handleTimeUpdate}
              onSetActiveTask={setActiveTimerTask}
            />
          </div>

          {/* Calendar Events */}
          <div>
            <CalendarEvents />
          </div>
        </div>
      </div>

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingTask(null);
        }}
        onSave={handleAddTask}
        editTask={editingTask}
      />

      <LevelUpModal
        level={levelUpLevel || 1}
        isOpen={levelUpLevel !== null}
        onClose={() => setLevelUpLevel(null)}
      />
    </div>
  );
}
