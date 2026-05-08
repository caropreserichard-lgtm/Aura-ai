"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Pencil, Trash2, ListChecks } from "lucide-react";
import { Task } from "@/lib/types";

const CAT_CLASSES: Record<string, { text: string; bg: string }> = {
  trabajo: { text: "cat-trabajo", bg: "cat-bg-trabajo" },
  aprendizaje: { text: "cat-aprendizaje", bg: "cat-bg-aprendizaje" },
  lifestyle: { text: "cat-lifestyle", bg: "cat-bg-lifestyle" },
  proyectos: { text: "cat-proyectos", bg: "cat-bg-proyectos" },
};

// Gold = Urgent/High (priority 1, 2). Slate = Normal (3). Blue = Low (4).
const PRIORITY_BAR: Record<number, string> = {
  1: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  2: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  3: "bg-slate-500",
  4: "bg-blue-500",
};

interface KanbanCardProps {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function KanbanCard({ task, index, onClick, onEdit, onDelete }: KanbanCardProps) {
  const catClass = CAT_CLASSES[task.category] || CAT_CLASSES.trabajo;
  const isDone = task.status === "done";
  const subtaskTotal = task.subtasks?.length ?? 0;
  const subtaskDone = task.subtasks?.filter((s) => s.done).length ?? 0;

  return (
    <Draggable draggableId={task._id!} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={`group relative overflow-hidden rounded-lg border cursor-pointer transition-all backdrop-blur-md ${
            snapshot.isDragging
              ? "bg-bg-elevated/80 border-accent/40 shadow-lg scale-[1.02]"
              : "bg-bg-secondary/60 border-white/5 hover:border-white/15 hover:bg-bg-secondary/80"
          } ${isDone ? "opacity-60" : ""}`}
        >
          <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${PRIORITY_BAR[task.priority] || "bg-slate-500"}`} />

          <div className="pl-3 pr-2.5 py-2.5">
            <p className={`text-[13px] leading-snug mb-2 pr-12 ${isDone ? "line-through text-text-muted" : "text-text-primary"}`}>
              {task.title}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${catClass.bg} ${catClass.text} truncate max-w-[160px]`}>
                {task.subcategory}
              </span>
              {subtaskTotal > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-text-muted font-mono">
                  <ListChecks size={11} />
                  {subtaskDone}/{subtaskTotal}
                </span>
              )}
            </div>
          </div>

          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="p-1 rounded-md bg-bg-tertiary/80 text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
              aria-label="Edit task"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task._id!); }}
              className="p-1 rounded-md bg-bg-tertiary/80 text-text-muted hover:text-danger hover:bg-danger-subtle transition-colors"
              aria-label="Delete task"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}
