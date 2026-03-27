"use client";

import { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { Plus, Check, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Task } from "@/lib/types";
import { formatTime } from "@/lib/scoring";
import TopBar from "./TopBar";
import AddTaskModal from "./AddTaskModal";
import Timer from "./Timer";
import LevelUpModal from "./LevelUpModal";
import TaskDetailPanel from "./TaskDetailPanel";

const CAT_COLORS: Record<string, string> = {
  trabajo: "#e7ca79",
  aprendizaje: "#8b7ec8",
  lifestyle: "#4a9e7e",
  proyectos: "#6b8aaf",
};

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

interface Objective {
  _id: string;
  text: string;
  done: boolean;
  weekStart: string;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split("T")[0];
}

function getWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} - ${fmt(end)}`;
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Objectives
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [newObjective, setNewObjective] = useState("");
  const weekStart = getWeekStart(new Date());

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

  const fetchObjectives = useCallback(async () => {
    try {
      const res = await fetch(`/api/objectives?weekStart=${weekStart}`);
      const data = await res.json();
      if (Array.isArray(data)) setObjectives(data);
    } catch (e) {
      console.error("Error fetching objectives:", e);
    }
  }, [weekStart]);

  useEffect(() => { fetchData(); fetchObjectives(); }, [fetchData, fetchObjectives]);

  const handleAddTask = async (taskData: Record<string, unknown>) => {
    try {
      if (editingTask?._id) {
        await fetch(`/api/tasks/${editingTask._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
      } else {
        // Set dueDate to today if not set
        const today = new Date().toISOString().split("T")[0];
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...taskData, dueDate: taskData.dueDate || today }),
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
    confetti({ particleCount: 20, spread: 40, origin: { y: 0.7 }, colors: ["#e7ca79", "#d4b868"] });
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

  const handleTaskUpdate = async (taskId: string, updates: Record<string, unknown>) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      fetchData();
      // Update selected task in panel
      if (selectedTask?._id === taskId) {
        setSelectedTask((prev) => prev ? { ...prev, ...updates } as Task : null);
      }
    } catch (e) {
      console.error(e);
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

  const addObjective = async () => {
    if (!newObjective.trim()) return;
    try {
      await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newObjective, weekStart }),
      });
      setNewObjective("");
      fetchObjectives();
    } catch (e) { console.error(e); }
  };

  const toggleObjective = async (id: string) => {
    try {
      await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id }),
      });
      fetchObjectives();
    } catch (e) { console.error(e); }
  };

  const deleteObjective = async (id: string) => {
    try {
      await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      fetchObjectives();
    } catch (e) { console.error(e); }
  };

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.dueDate && t.dueDate.startsWith(today) && t.status !== "done");
  const todayDone = tasks.filter((t) => t.dueDate && t.dueDate.startsWith(today) && t.status === "done");
  const totalTimeToday = [...todayTasks, ...todayDone].reduce((s, t) => s + (t.timeSpent || 0), 0);

  const todayDate = new Date();
  const dayName = todayDate.toLocaleDateString("en-US", { weekday: "long" });
  const dateLabel = todayDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });

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

      <div className="p-4 md:p-6 pb-24 md:pb-6">
        {dbError && (
          <div className="p-3 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-sm mb-4">
            <p className="font-medium">Connection error</p>
            <p className="text-danger/70 mt-1 text-xs">{dbError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Today's tasks */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <h1 className="font-heading font-bold text-xl">{dayName}</h1>
              <p className="text-text-muted text-[13px]">{dateLabel}</p>
            </div>

            {/* Progress bar */}
            {(todayTasks.length > 0 || todayDone.length > 0) && (
              <div className="h-1.5 rounded-full bg-bg-tertiary mb-4 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${todayDone.length / (todayTasks.length + todayDone.length) * 100}%` }}
                />
              </div>
            )}

            {/* Add task button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-bg-secondary hover:bg-bg-hover text-text-muted text-[13px] transition-colors mb-3"
            >
              <Plus size={16} />
              <span>Add task</span>
              {totalTimeToday > 0 && (
                <span className="ml-auto font-mono text-accent text-[12px]">{formatTime(totalTimeToday)}</span>
              )}
            </button>

            {/* Today's pending tasks */}
            <div className="space-y-1">
              {todayTasks.map((task) => {
                const color = CAT_COLORS[task.category] || "#666";
                return (
                  <div
                    key={task._id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-secondary border border-border hover:bg-bg-hover transition-colors cursor-pointer group"
                    onClick={() => setSelectedTask(task)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); handleComplete(task._id!); }}
                      className="w-[18px] h-[18px] rounded-full border-[1.5px] border-text-muted hover:border-accent flex-shrink-0 transition-colors"
                    />
                    <span className="text-[13px] text-text-primary flex-1 min-w-0 truncate">{task.title}</span>
                    {task.timeSpent > 0 && (
                      <span className="font-mono text-[11px] text-text-muted">{formatTime(task.timeSpent)}</span>
                    )}
                    <span className="text-[11px] font-medium" style={{ color }}>
                      # {task.subcategory}
                    </span>
                  </div>
                );
              })}

              {/* Done tasks */}
              {todayDone.map((task) => {
                const color = CAT_COLORS[task.category] || "#666";
                return (
                  <div
                    key={task._id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-secondary/50 border border-border/50 transition-colors cursor-pointer opacity-50"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="w-[18px] h-[18px] rounded-full bg-accent border-[1.5px] border-accent flex-shrink-0 flex items-center justify-center">
                      <Check size={10} className="text-text-inverse" />
                    </div>
                    <span className="text-[13px] text-text-muted line-through flex-1 min-w-0 truncate">{task.title}</span>
                    {task.timeSpent > 0 && (
                      <span className="font-mono text-[11px] text-text-muted">{formatTime(task.timeSpent)}</span>
                    )}
                    <span className="text-[11px] font-medium opacity-60" style={{ color }}>
                      # {task.subcategory}
                    </span>
                  </div>
                );
              })}
            </div>

            {todayTasks.length === 0 && todayDone.length === 0 && (
              <div className="text-center py-12 rounded-lg bg-bg-secondary border border-border">
                <p className="text-text-muted mb-4 text-sm">No tasks scheduled for today</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button onClick={() => setShowAddModal(true)} className="px-4 py-2 rounded-lg bg-accent text-text-inverse font-medium text-sm hover:bg-accent-hover transition-colors">Add a task</button>
                  {tasks.length === 0 && (
                    <button onClick={handleSeedData} className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary font-medium text-sm hover:bg-bg-hover transition-colors">Load samples</button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Weekly Objectives + Timer */}
          <div className="space-y-4">
            {/* Weekly Objectives */}
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-heading font-semibold text-sm">Weekly objectives</h2>
              </div>
              <p className="text-[11px] text-text-muted mb-3">{getWeekRange(weekStart)}</p>

              {/* Objectives progress */}
              {objectives.length > 0 && (
                <div className="h-1 rounded-full bg-bg-tertiary mb-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${(objectives.filter(o => o.done).length / objectives.length) * 100}%` }}
                  />
                </div>
              )}

              {/* Add objective */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={addObjective}
                  className="w-4 h-4 rounded flex items-center justify-center text-text-muted hover:text-accent transition-colors flex-shrink-0"
                >
                  <Plus size={14} />
                </button>
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addObjective()}
                  placeholder="Add objective"
                  className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>

              {/* Objectives list */}
              <div className="space-y-1">
                {objectives.map((obj) => (
                  <div key={obj._id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleObjective(obj._id)}
                      className={`w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                        obj.done ? "bg-accent border-accent" : "border-text-muted hover:border-accent"
                      }`}
                    >
                      {obj.done && <Check size={8} className="text-text-inverse" />}
                    </button>
                    <span className={`text-[12px] flex-1 ${obj.done ? "line-through text-text-muted" : "text-text-secondary"}`}>
                      {obj.text}
                    </span>
                    <button
                      onClick={() => deleteObjective(obj._id)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Timer */}
            <Timer tasks={tasks} activeTaskId={activeTimerTask} onTimeUpdate={handleTimeUpdate} onSetActiveTask={setActiveTimerTask} />
          </div>
        </div>
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updates) => handleTaskUpdate(selectedTask._id!, updates)}
          onComplete={() => { handleComplete(selectedTask._id!); setSelectedTask(null); }}
          onDelete={() => { handleDelete(selectedTask._id!); setSelectedTask(null); }}
          onStartTimer={() => setActiveTimerTask(selectedTask._id || null)}
        />
      )}

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingTask(null); }}
        onSave={handleAddTask}
        editTask={editingTask}
        initialDate={today}
      />

      <LevelUpModal level={levelUpLevel || 1} isOpen={levelUpLevel !== null} onClose={() => setLevelUpLevel(null)} />
    </div>
  );
}
