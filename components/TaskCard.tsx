"use client";

import { useState } from "react";
import { Clock, Pencil, Trash2, Play, ChevronDown, ChevronUp } from "lucide-react";
import { Task, CATEGORIES, PRIORITY_CONFIG } from "@/lib/types";
import { formatTime } from "@/lib/scoring";

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onFocus: (task: Task) => void;
  onEdit: (task: Task) => void;
}

export default function TaskCard({
  task,
  onComplete,
  onDelete,
  onFocus,
  onEdit,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [xpAnimation, setXpAnimation] = useState(false);

  const category = CATEGORIES[task.category];
  const priority = PRIORITY_CONFIG[task.priority];
  const isDone = task.status === "done";

  const handleComplete = () => {
    if (isDone) return;
    setXpAnimation(true);
    onComplete(task._id!);
    setTimeout(() => setXpAnimation(false), 1500);
  };

  return (
    <div
      className={`relative rounded-xl border transition-all duration-300 ${
        isDone
          ? "bg-white/[0.02] border-white/5 opacity-60"
          : "bg-bg-secondary border-white/5 hover:border-white/10"
      }`}
    >
      {/* XP float animation */}
      {xpAnimation && (
        <div className="absolute top-0 right-4 animate-float-up pointer-events-none z-10">
          <span className="font-mono font-bold text-lg text-accent-pink">
            +{task.xp} XP
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={handleComplete}
            disabled={isDone}
            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 transition-all duration-300 flex items-center justify-center ${
              isDone
                ? "bg-accent-purple border-accent-purple"
                : "border-text-muted hover:border-accent-purple"
            }`}
          >
            {isDone && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              className={`font-medium text-sm leading-tight ${
                isDone ? "line-through text-text-muted" : "text-text-primary"
              }`}
            >
              {task.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {/* Category badge */}
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: `${category.color}15`,
                  color: category.color,
                }}
              >
                {category.icon} {task.subcategory}
              </span>

              {/* Priority */}
              <span
                className="px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: `${priority.color}15`,
                  color: priority.color,
                }}
              >
                {priority.label}
              </span>

              {/* XP */}
              <span className="font-mono text-xs text-accent-pink font-medium">
                +{task.xp}XP
              </span>
            </div>

            {/* Expanded details */}
            {expanded && (
              <div className="mt-3 space-y-2">
                {task.description && (
                  <p className="text-sm text-text-secondary">
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  <span>ROI: {task.roi}/10</span>
                  <span>Joy: {task.joy}/10</span>
                  <span>Flow: {task.flowScore}</span>
                </div>
                {task.timeSpent > 0 && (
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <Clock size={12} />
                    <span>{formatTime(task.timeSpent)} invertidas</span>
                  </div>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <button
                    onClick={() => onFocus(task)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-purple/10 text-accent-purple text-xs font-medium hover:bg-accent-purple/20 transition-colors"
                  >
                    <Play size={12} /> Focus
                  </button>
                  <button
                    onClick={() => onEdit(task)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 text-text-secondary text-xs font-medium hover:bg-white/10 transition-colors"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={() => onDelete(task._id!)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-text-muted hover:text-text-secondary transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
