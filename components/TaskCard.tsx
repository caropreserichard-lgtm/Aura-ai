"use client";

import { useState } from "react";
import { Clock, Pencil, Trash2, Play, ChevronDown, ChevronUp } from "lucide-react";
import { Task, CATEGORIES, PRIORITY_CONFIG } from "@/lib/types";
import { formatTime } from "@/lib/scoring";

const PRIORITY_BORDER: Record<number, string> = {
  1: "border-l-priority-critical",
  2: "border-l-priority-high",
  3: "border-l-priority-medium",
  4: "border-l-priority-low",
};

const CAT_CLASSES: Record<string, { text: string; bg: string }> = {
  trabajo: { text: "cat-trabajo", bg: "cat-bg-trabajo" },
  aprendizaje: { text: "cat-aprendizaje", bg: "cat-bg-aprendizaje" },
  lifestyle: { text: "cat-lifestyle", bg: "cat-bg-lifestyle" },
  proyectos: { text: "cat-proyectos", bg: "cat-bg-proyectos" },
};

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onFocus: (task: Task) => void;
  onEdit: (task: Task) => void;
  onClick?: () => void;
}

export default function TaskCard({ task, onComplete, onDelete, onFocus, onEdit, onClick }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [xpAnimation, setXpAnimation] = useState(false);

  const isDone = task.status === "done";
  const catClass = CAT_CLASSES[task.category] || CAT_CLASSES.trabajo;

  const handleComplete = () => {
    if (isDone) return;
    setXpAnimation(true);
    onComplete(task._id!);
    setTimeout(() => setXpAnimation(false), 1500);
  };

  return (
    <div className={`relative rounded-lg border-l-[3px] transition-all duration-200 ${
      PRIORITY_BORDER[task.priority] || "border-l-border"
    } ${isDone ? "bg-bg-secondary/50 opacity-50" : "bg-bg-secondary hover:bg-bg-hover"} border-y border-r border-border`}>
      {xpAnimation && (
        <div className="absolute top-0 right-4 animate-float-up pointer-events-none z-10">
          <span className="font-mono font-bold text-sm text-accent">+{task.xp} XP</span>
        </div>
      )}

      <div className="px-3 py-2">
        <div className="flex items-center gap-3">
          <button onClick={handleComplete} disabled={isDone}
            className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex-shrink-0 transition-all duration-200 flex items-center justify-center ${
              isDone ? "bg-accent border-accent" : "border-text-muted hover:border-accent"
            }`}>
            {isDone && (
              <svg className="w-2.5 h-2.5 text-text-inverse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <button onClick={() => onClick ? onClick() : setExpanded(!expanded)} className="flex-1 min-w-0 text-left">
            <span className={`text-[13px] leading-tight ${isDone ? "line-through text-text-muted" : "text-text-primary"}`}>
              {task.title}
            </span>
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            {task.timeSpent > 0 && (
              <span className="font-mono text-[11px] text-text-muted">{formatTime(task.timeSpent)}</span>
            )}
            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${catClass.bg} ${catClass.text}`}>
              # {task.subcategory}
            </span>
            <span className="font-mono text-[11px] text-accent font-medium">+{task.xp}xp</span>
            <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-text-muted hover:text-text-secondary transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 ml-8 space-y-2">
            {task.description && <p className="text-[13px] text-text-secondary leading-relaxed">{task.description}</p>}
            <div className="flex flex-wrap gap-3 text-[11px] text-text-muted">
              <span>ROI: {task.roi}/10</span>
              <span>Joy: {task.joy}/10</span>
              <span>Flow: {task.flowScore}</span>
              <span>{PRIORITY_CONFIG[task.priority].label}</span>
            </div>
            {task.timeSpent > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-text-muted">
                <Clock size={11} /><span>{formatTime(task.timeSpent)} spent</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 pt-1">
              <button onClick={() => onFocus(task)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent-subtle text-accent-text text-[11px] font-medium hover:bg-accent/20 transition-colors">
                <Play size={11} /> Focus
              </button>
              <button onClick={() => onEdit(task)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-bg-tertiary text-text-secondary text-[11px] font-medium hover:bg-bg-hover transition-colors">
                <Pencil size={11} /> Edit
              </button>
              <button onClick={() => onDelete(task._id!)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-danger-subtle text-danger text-[11px] font-medium hover:bg-danger/20 transition-colors">
                <Trash2 size={11} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
