"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Hash, Search, ChevronDown, ChevronRight } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { Task, CATEGORIES, Category } from "@/lib/types";

const CAT_COLORS: Record<string, string> = {
  trabajo: "#e7ca79",
  aprendizaje: "#8b7ec8",
  lifestyle: "#4a9e7e",
  proyectos: "#6b8aaf",
};

export default function BacklogPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (error) { console.error("Error:", error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Backlog = pending tasks with no dueDate (or past due dates can be included)
  const backlogTasks = tasks.filter((t) => t.status !== "done" && !t.dueDate);
  const filtered = search
    ? backlogTasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.subcategory.toLowerCase().includes(search.toLowerCase()))
    : backlogTasks;

  // Group by subcategory
  const subcategoryGroups: Record<string, Task[]> = {};
  filtered.forEach((t) => {
    const key = t.subcategory || "Other";
    if (!subcategoryGroups[key]) subcategoryGroups[key] = [];
    subcategoryGroups[key].push(t);
  });

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleComplete = async (id: string) => {
    const task = tasks.find((t) => t._id === id);
    const newStatus = task?.status === "done" ? "pending" : "done";
    setTasks((prev) => prev.map((t) => t._id === id ? { ...t, status: newStatus, completedAt: newStatus === "done" ? new Date().toISOString() : undefined } : t));
    try {
      await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      fetchTasks();
    } catch (e) { console.error(e); fetchTasks(); }
  };

  const handleTaskUpdate = async (taskId: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, ...updated } : t)));
      if (selectedTask?._id === taskId) setSelectedTask((prev) => prev ? { ...prev, ...updated } : null);
    } catch (e) { console.error(e); }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setSelectedTask(null);
    } catch (e) { console.error(e); }
  };

  const handleDragEnd = (result: DropResult) => {
    // For now, just reorder within backlog
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar hideAdd />

        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-heading font-bold text-xl text-text-primary">Backlog</h1>
              <p className="text-[12px] text-text-muted mt-0.5">{backlogTasks.length} unscheduled tasks</p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search backlog..."
                className="pl-9 pr-4 py-2 rounded-xl bg-bg-secondary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent w-64" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : Object.keys(subcategoryGroups).length === 0 ? (
            <div className="text-center py-20">
              <p className="text-text-muted text-sm">No backlog tasks</p>
              <p className="text-text-muted text-xs mt-1">Tasks without a due date will appear here</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-4">
                {Object.entries(subcategoryGroups).sort((a, b) => b[1].length - a[1].length).map(([sub, subTasks]) => {
                  const cat = subTasks[0]?.category || "trabajo";
                  const color = CAT_COLORS[cat] || "#666";
                  const collapsed = collapsedGroups.has(sub);

                  return (
                    <div key={sub} className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
                      {/* Group header */}
                      <button onClick={() => toggleGroup(sub)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors">
                        {collapsed ? <ChevronRight size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                        <Hash size={14} style={{ color }} />
                        <span className="text-[13px] font-semibold" style={{ color }}>{sub}</span>
                        <span className="text-[11px] text-text-muted font-mono ml-auto">{subTasks.length}</span>
                      </button>

                      {/* Tasks */}
                      {!collapsed && (
                        <Droppable droppableId={`backlog-${sub}`}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="px-2 pb-2">
                              {subTasks.map((task, index) => (
                                <Draggable key={task._id} draggableId={task._id!} index={index}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}
                                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                                        dragSnapshot.isDragging ? "bg-bg-elevated shadow-lg border border-accent/30" : "hover:bg-bg-hover"
                                      }`}>
                                      <button onClick={(e) => { e.stopPropagation(); handleComplete(task._id!); }}
                                        className="w-4 h-4 rounded-full border-[1.5px] border-text-muted/40 hover:border-accent flex-shrink-0 transition-colors" />
                                      <p className="flex-1 text-[13px] text-text-primary truncate cursor-pointer hover:text-accent transition-colors"
                                        onClick={() => setSelectedTask(task)}>
                                        {task.title}
                                      </p>
                                      {task.estimatedTime ? (
                                        <span className="text-[10px] font-mono text-text-muted">{task.estimatedTime >= 60 ? `${Math.floor(task.estimatedTime / 60)}h${task.estimatedTime % 60 > 0 ? String(task.estimatedTime % 60).padStart(2, "0") : ""}` : `${task.estimatedTime}m`}</span>
                                      ) : null}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      )}
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          )}
        </div>

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
