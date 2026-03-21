"use client";

import { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { List, Columns3 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import TaskCard from "@/components/TaskCard";
import TaskFilters from "@/components/TaskFilters";
import AddTaskModal from "@/components/AddTaskModal";
import KanbanBoard from "@/components/KanbanBoard";
import { Task, Category, Priority, TaskStatus } from "@/lib/types";

type ViewMode = "list" | "kanban";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [filterSubcategory, setFilterSubcategory] = useState<string | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("ricky-view-mode") as ViewMode) || "list";
    return "list";
  });

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

  const handleComplete = async (id: string) => {
    confetti({ particleCount: 20, spread: 40, origin: { y: 0.7 }, colors: ["#4a9e7e", "#6b8aaf"] });
    try {
      await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done" }) });
      fetchTasks();
    } catch (error) { console.error("Error completing task:", error); }
  };

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); fetchTasks(); }
    catch (error) { console.error("Error deleting task:", error); }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      fetchTasks();
    } catch (error) { console.error("Error updating status:", error); }
  };

  const toggleView = (mode: ViewMode) => { setViewMode(mode); localStorage.setItem("ricky-view-mode", mode); };

  const filteredTasks = tasks.filter((t) => {
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterSubcategory !== "all" && t.subcategory !== filterSubcategory) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar onAddTask={() => setShowAddModal(true)} />
        <div className="p-4 md:p-6 space-y-2 pb-24 md:pb-6">
          <div className="flex items-center justify-between">
            <h1 className="font-heading font-semibold text-lg">All Tasks</h1>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</span>
              <div className="flex bg-bg-secondary rounded-lg border border-border p-0.5">
                <button onClick={() => toggleView("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-accent-subtle text-accent-text" : "text-text-muted hover:text-text-secondary"}`}><List size={15} /></button>
                <button onClick={() => toggleView("kanban")} className={`p-1.5 rounded-md transition-colors ${viewMode === "kanban" ? "bg-accent-subtle text-accent-text" : "text-text-muted hover:text-text-secondary"}`}><Columns3 size={15} /></button>
              </div>
            </div>
          </div>

          <TaskFilters selectedCategory={filterCategory} selectedSubcategory={filterSubcategory} selectedPriority={filterPriority} selectedStatus={filterStatus}
            onCategoryChange={setFilterCategory} onSubcategoryChange={setFilterSubcategory} onPriorityChange={setFilterPriority} onStatusChange={setFilterStatus} />

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-bg-secondary border border-border animate-pulse" />)}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 rounded-lg bg-bg-secondary border border-border"><p className="text-text-muted text-sm">No tasks match these filters</p></div>
          ) : viewMode === "kanban" ? (
            <KanbanBoard tasks={filteredTasks} onStatusChange={handleStatusChange} onEditTask={(t) => { setEditingTask(t); setShowAddModal(true); }} />
          ) : (
            <div className="space-y-0.5">{filteredTasks.map((task) => (
              <TaskCard key={task._id} task={task} onComplete={handleComplete} onDelete={handleDelete} onFocus={() => {}} onEdit={(t) => { setEditingTask(t); setShowAddModal(true); }} />
            ))}</div>
          )}
        </div>
        <AddTaskModal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingTask(null); }} onSave={handleAddTask} editTask={editingTask} />
      </main>
    </div>
  );
}
