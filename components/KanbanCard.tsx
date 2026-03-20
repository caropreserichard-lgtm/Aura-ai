"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Task, CATEGORIES } from "@/lib/types";

const CAT_CLASSES: Record<string, { text: string; bg: string }> = {
  trabajo: { text: "cat-trabajo", bg: "cat-bg-trabajo" },
  aprendizaje: { text: "cat-aprendizaje", bg: "cat-bg-aprendizaje" },
  lifestyle: { text: "cat-lifestyle", bg: "cat-bg-lifestyle" },
  proyectos: { text: "cat-proyectos", bg: "cat-bg-proyectos" },
};

const PRIORITY_DOT: Record<number, string> = {
  1: "bg-priority-critical", 2: "bg-priority-high", 3: "bg-priority-medium", 4: "bg-priority-low",
};

interface KanbanCardProps { task: Task; index: number; onClick: (task: Task) => void; }

export default function KanbanCard({ task, index, onClick }: KanbanCardProps) {
  const catClass = CAT_CLASSES[task.category] || CAT_CLASSES.trabajo;
  return (
    <Draggable draggableId={task._id!} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
            snapshot.isDragging ? "bg-bg-elevated border-accent/30 shadow-md" : "bg-bg-secondary border-border hover:border-border-strong"
          }`}>
          <p className="text-[13px] text-text-primary leading-tight mb-1.5">{task.title}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${catClass.bg} ${catClass.text}`}>{task.subcategory}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
            </div>
            <span className="font-mono text-[10px] text-accent font-medium">+{task.xp}xp</span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
