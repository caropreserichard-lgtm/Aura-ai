"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AddTaskModal from "@/components/AddTaskModal";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { Task, CATEGORIES } from "@/lib/types";

const CAT_COLORS: Record<string, string> = {
  trabajo: "#d4a04e",
  aprendizaje: "#8b7ec8",
  lifestyle: "#4a9e7e",
  proyectos: "#6b8aaf",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDates(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date) {
  return isSameDay(d, new Date());
}

function toDateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDate, setAddModalDate] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const weekDates = getWeekDates(weekOffset);
  const pendingTasks = tasks.filter((t) => t.status !== "done");

  // Backlog = pending tasks with NO dueDate (or dueDate outside this week)
  const weekKeys = new Set(weekDates.map(toDateKey));
  const backlogTasks = pendingTasks.filter((t) => !t.dueDate || !weekKeys.has(t.dueDate.split("T")[0]));

  // Group backlog by subcategory
  const subcategoryGroups: Record<string, Task[]> = {};
  backlogTasks.forEach((t) => {
    const key = t.subcategory || "Other";
    if (!subcategoryGroups[key]) subcategoryGroups[key] = [];
    subcategoryGroups[key].push(t);
  });

  // Tasks with due dates mapped to days (include completed — pending first, done last)
  const tasksByDay: Record<string, Task[]> = {};
  weekDates.forEach((d) => {
    const key = toDateKey(d);
    const dayTasks = tasks.filter((t) => t.dueDate && t.dueDate.startsWith(key));
    dayTasks.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      return 0;
    });
    tasksByDay[key] = dayTasks;
  });

  const handleComplete = async (id: string) => {
    const task = tasks.find((t) => t._id === id);
    const newStatus = task?.status === "done" ? "pending" : "done";
    // Optimistic UI update
    setTasks((prev) => prev.map((t) => t._id === id ? { ...t, status: newStatus, completedAt: newStatus === "done" ? new Date().toISOString() : undefined } : t));
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch (e) { console.error(e); fetchTasks(); }
  };

  const handleAddTask = async (taskData: Record<string, unknown>) => {
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      fetchTasks();
    } catch (e) { console.error(e); }
  };

  const handleUpdateDueDate = async (taskId: string, newDueDate: string | null) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, dueDate: newDueDate || undefined } : t))
    );
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDueDate }),
      });
    } catch (e) {
      console.error(e);
      fetchTasks(); // Revert on error
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const taskId = draggableId;
    const destId = destination.droppableId;

    if (destId === "backlog") {
      handleUpdateDueDate(taskId, null);
    } else {
      // destId is a date key like "2026-03-20"
      handleUpdateDueDate(taskId, destId);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, ...updated } : t)));
      if (selectedTask?._id === taskId) {
        setSelectedTask((prev) => prev ? { ...prev, ...updated } : null);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setSelectedTask(null);
    } catch (e) { console.error(e); }
  };

  const openAddForDay = (dateKey: string) => {
    setAddModalDate(dateKey);
    setShowAddModal(true);
  };

  const openAddGeneral = () => {
    setAddModalDate(undefined);
    setShowAddModal(true);
  };

  const monthLabel = weekDates[0].toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar onAddTask={openAddGeneral} />

        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="font-heading font-semibold text-lg">{monthLabel}</h1>
              <p className="text-[11px] text-text-muted mt-0.5">
                {pendingTasks.length} pending tasks across {Object.keys(subcategoryGroups).length} projects
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setWeekOffset(0)} className="px-3 py-1 rounded-lg text-[12px] font-medium hover:bg-bg-hover text-text-secondary transition-colors">
                Today
              </button>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Weekly columns */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {weekDates.map((date, i) => {
                const key = toDateKey(date);
                const dayTasks = tasksByDay[key] || [];
                const today = isToday(date);

                return (
                  <Droppable key={key} droppableId={key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[300px] rounded-lg border transition-colors ${
                          snapshot.isDraggingOver
                            ? "border-accent bg-accent-subtle/60"
                            : today
                            ? "border-accent/40 bg-accent-subtle"
                            : "border-border bg-bg-secondary"
                        }`}
                      >
                        {/* Day header */}
                        <div className={`px-2.5 py-2 border-b ${today ? "border-accent/20" : "border-border"}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-semibold ${today ? "text-accent-text" : "text-text-secondary"}`}>{DAYS[i]}</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-[11px] ${today ? "text-accent-text font-bold" : "text-text-muted"}`}>
                                {date.getDate()}
                              </span>
                              <button
                                onClick={() => openAddForDay(key)}
                                className="w-4 h-4 rounded flex items-center justify-center hover:bg-bg-hover text-text-muted hover:text-accent transition-colors"
                                title="Add task"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                          {dayTasks.length > 0 && (() => {
                            const doneCount = dayTasks.filter((t) => t.status === "done").length;
                            const totalCount = dayTasks.length;
                            return (
                              <div className="mt-1 flex items-center gap-1.5">
                                <div className="flex-1 h-1 rounded-full bg-bg-tertiary overflow-hidden">
                                  <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }} />
                                </div>
                                <span className="text-[10px] text-text-muted font-mono">{doneCount}/{totalCount}</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Day tasks */}
                        <div className="p-1.5 space-y-1">
                          {dayTasks.map((task, index) => {
                            const color = CAT_COLORS[task.category] || "#666";
                            const isDone = task.status === "done";
                            return (
                              <Draggable key={task._id} draggableId={task._id!} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={`group p-1.5 rounded-md border transition-all cursor-grab active:cursor-grabbing ${
                                      dragSnapshot.isDragging
                                        ? "bg-bg-elevated border-accent/30 shadow-lg"
                                        : isDone
                                        ? "bg-bg-primary/20 border-transparent"
                                        : "bg-bg-primary/50 hover:bg-bg-hover border-transparent hover:border-border"
                                    }`}
                                    style={{ opacity: isDone ? 0.45 : 1 }}
                                  >
                                    <div className="flex items-start gap-1.5">
                                      <button onClick={(e) => { e.stopPropagation(); handleComplete(task._id!); }}
                                        className={`mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
                                          isDone
                                            ? "bg-emerald-500 border border-emerald-500"
                                            : "border border-text-muted hover:border-accent"
                                        }`}>
                                        {isDone && <Check size={8} className="text-white" strokeWidth={3} />}
                                      </button>
                                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedTask(task)}>
                                        <p className={`text-[11px] leading-tight truncate transition-all ${
                                          isDone ? "line-through text-text-muted" : "text-text-primary"
                                        }`}>{task.title}</p>
                                        <span className="text-[9px] font-medium" style={{ color: isDone ? `${color}80` : color }}>
                                          # {task.subcategory}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>

            {/* Backlog by subcategory — droppable */}
            <div>
              <h2 className="font-heading font-semibold text-sm text-text-secondary mb-3">Backlog</h2>
              <Droppable droppableId="backlog">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-h-[80px] rounded-lg p-1 transition-colors ${
                      snapshot.isDraggingOver ? "bg-accent-subtle/40 ring-1 ring-accent/30" : ""
                    }`}
                  >
                    {Object.entries(subcategoryGroups).sort((a, b) => b[1].length - a[1].length).slice(0, 9).map(([sub, subTasks]) => {
                      const cat = subTasks[0]?.category || "trabajo";
                      const color = CAT_COLORS[cat] || "#666";
                      return (
                        <div key={sub} className="rounded-lg border border-border bg-bg-secondary p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-semibold" style={{ color }}># {sub}</span>
                            <span className="text-[10px] text-text-muted font-mono">{subTasks.length}</span>
                          </div>
                          <div className="space-y-1">
                            {subTasks.slice(0, 4).map((task, index) => (
                              <Draggable key={task._id} draggableId={task._id!} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={`flex items-center gap-2 group p-1 rounded-md transition-all cursor-grab active:cursor-grabbing ${
                                      dragSnapshot.isDragging ? "bg-bg-elevated shadow-lg border border-accent/30" : "hover:bg-bg-hover"
                                    }`}
                                  >
                                    <button onClick={(e) => { e.stopPropagation(); handleComplete(task._id!); }}
                                      className="w-3 h-3 rounded-full border border-text-muted hover:border-accent flex-shrink-0 transition-colors" />
                                    <p className="text-[11px] text-text-secondary truncate group-hover:text-text-primary transition-colors cursor-pointer" onClick={() => setSelectedTask(task)}>{task.title}</p>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {subTasks.length > 4 && (
                              <p className="text-[10px] text-text-muted pl-5">+{subTasks.length - 4} more</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
        </div>

        <AddTaskModal
          isOpen={showAddModal}
          onClose={() => { setShowAddModal(false); setAddModalDate(undefined); }}
          onSave={handleAddTask}
          initialDate={addModalDate}
        />

        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={(updates) => handleTaskUpdate(selectedTask._id!, updates)}
            onComplete={() => { handleComplete(selectedTask._id!); setSelectedTask(null); }}
            onDelete={() => handleDeleteTask(selectedTask._id!)}
            onStartTimer={() => {}}
          />
        )}
      </main>
    </div>
  );
}
