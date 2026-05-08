"use client";

import { useCallback, useState } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Archive } from "lucide-react";
import confetti from "canvas-confetti";
import { Task, TaskStatus } from "@/lib/types";
import KanbanCard from "./KanbanCard";

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => Promise<void> | void;
  onTasksChanged?: () => void;
}

type SortDir = "desc" | "asc";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "pending", label: "Pending", color: "border-warning" },
  { id: "in_progress", label: "In Progress", color: "border-secondary" },
  { id: "done", label: "Done", color: "border-accent" },
];

export default function KanbanBoard({ tasks, onStatusChange, onEditTask, onDeleteTask, onTasksChanged }: KanbanBoardProps) {
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [archiving, setArchiving] = useState(false);

  const tasksByStatus = (status: TaskStatus) => {
    const list = tasks.filter((t) => t.status === status);
    list.sort((a, b) => {
      const aT = new Date(a.createdAt || 0).getTime();
      const bT = new Date(b.createdAt || 0).getTime();
      return sortDir === "desc" ? bT - aT : aT - bT;
    });
    return list;
  };

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const newStatus = destination.droppableId as TaskStatus;
    if (newStatus === "done") confetti({ particleCount: 20, spread: 40, origin: { y: 0.5 }, colors: ["#4a9e7e", "#6b8aaf"] });
    await onStatusChange(draggableId, newStatus);
  }, [onStatusChange]);

  const handleBulkArchive = async () => {
    const doneTasks = tasks.filter((t) => t.status === "done");
    if (doneTasks.length === 0) return;
    if (!confirm(`Archive ${doneTasks.length} completed task${doneTasks.length !== 1 ? "s" : ""}? This will permanently remove them.`)) return;
    setArchiving(true);
    try {
      await Promise.all(doneTasks.map((t) => fetch(`/api/tasks/${t._id}`, { method: "DELETE" })));
      onTasksChanged?.();
    } catch (err) {
      console.error("Bulk archive failed:", err);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex items-center justify-end gap-2 mb-2">
        <button
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-secondary/60 backdrop-blur border border-white/5 text-[11px] text-text-secondary hover:bg-bg-hover transition-colors"
          title="Toggle sort by created date"
        >
          {sortDir === "desc" ? <ArrowDownNarrowWide size={12} /> : <ArrowUpNarrowWide size={12} />}
          {sortDir === "desc" ? "Newest first" : "Oldest first"}
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasksByStatus(col.id);
          const isDoneCol = col.id === "done";
          return (
            <div key={col.id} className="flex-1 min-w-[260px]">
              <div className={`sticky top-0 z-10 bg-bg/85 backdrop-blur-md flex items-center justify-between gap-2 mb-3 pb-2 pt-1 border-b-2 ${col.color}`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-semibold text-[13px] text-text-secondary">{col.label}</h3>
                  <span className="text-[11px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded-full font-mono">{columnTasks.length}</span>
                </div>
                {isDoneCol && columnTasks.length > 0 && (
                  <button
                    onClick={handleBulkArchive}
                    disabled={archiving}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-text-muted hover:text-danger hover:bg-danger-subtle transition-colors disabled:opacity-50"
                    title="Archive all completed tasks"
                  >
                    <Archive size={11} />
                    {archiving ? "Archiving…" : "Archive all"}
                  </button>
                )}
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`space-y-1.5 min-h-[200px] p-1.5 rounded-lg transition-colors duration-200 ${
                      snapshot.isDraggingOver ? "bg-accent-subtle border border-dashed border-accent/30" : ""
                    }`}>
                    {columnTasks.map((task, index) => (
                      <KanbanCard
                        key={task._id}
                        task={task}
                        index={index}
                        onClick={onEditTask}
                        onEdit={onEditTask}
                        onDelete={(id) => { void onDeleteTask(id); }}
                      />
                    ))}
                    {provided.placeholder}
                    {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-center text-text-muted text-[11px] py-8 opacity-50">Drag tasks here</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
