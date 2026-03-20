"use client";

import { Task, CATEGORIES, PRIORITY_CONFIG } from "@/lib/types";
import { Draggable } from "@hello-pangea/dnd";

interface KanbanCardProps {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
}

export default function KanbanCard({ task, index, onClick }: KanbanCardProps) {
  const category = CATEGORIES[task.category];
  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <Draggable draggableId={task._id!} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
            snapshot.isDragging
              ? "bg-bg-tertiary border-accent-purple/50 shadow-lg shadow-accent-purple/10 rotate-2 scale-105"
              : "bg-bg-secondary border-white/5 hover:border-white/10"
          }`}
        >
          {/* Title */}
          <p className={`text-sm font-medium leading-tight ${
            task.status === "done" ? "line-through text-text-muted" : "text-text-primary"
          }`}>
            {task.title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Category badge */}
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-white/5" style={{ color: category.color }}>
              {category.icon} {task.subcategory}
            </span>

            {/* Priority dot */}
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: priority.color }}
              title={priority.label}
            />

            {/* XP */}
            <span className="text-xs font-mono text-accent-pink ml-auto">
              +{task.xp}XP
            </span>
          </div>

          {/* Flow Score */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-text-muted">
              Flow: {task.flowScore}
            </span>
            {task.timeSpent > 0 && (
              <span className="text-[10px] text-text-muted">
                {Math.floor(task.timeSpent / 60)}m
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
