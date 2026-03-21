"use client";

import { useState } from "react";
import { X, Play, Trash2, Plus, Check, Calendar, Clock, Link2, ExternalLink } from "lucide-react";
import { Task, PRIORITY_CONFIG } from "@/lib/types";
import { formatTime } from "@/lib/scoring";
import SubcategoryPicker from "./SubcategoryPicker";

const CAT_COLORS: Record<string, string> = {
  trabajo: "#d4a04e",
  aprendizaje: "#8b7ec8",
  lifestyle: "#4a9e7e",
  proyectos: "#6b8aaf",
};

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onComplete: () => void;
  onDelete: () => void;
  onStartTimer: () => void;
}

export default function TaskDetailPanel({ task, onClose, onUpdate, onComplete, onDelete, onStartTimer }: TaskDetailPanelProps) {
  const [description, setDescription] = useState(task.description || "");
  const [startDate, setStartDate] = useState(task.startDate || task.createdAt?.split("T")[0] || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [newSubtask, setNewSubtask] = useState("");
  const [subtasks, setSubtasks] = useState<{ text: string; done: boolean }[]>(task.subtasks || []);
  const [sourceUrl, setSourceUrl] = useState(task.sourceUrl || "");
  const [editingUrl, setEditingUrl] = useState(false);

  const color = CAT_COLORS[task.category] || "#666";
  const isDone = task.status === "done";

  const saveDescription = () => {
    if (description !== (task.description || "")) {
      onUpdate({ description });
    }
  };

  const saveStartDate = (value: string) => {
    setStartDate(value);
    onUpdate({ startDate: value || null });
  };

  const saveDueDate = (value: string) => {
    setDueDate(value);
    onUpdate({ dueDate: value || null });
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const updated = [...subtasks, { text: newSubtask.trim(), done: false }];
    setSubtasks(updated);
    setNewSubtask("");
    onUpdate({ subtasks: updated });
  };

  const toggleSubtask = (index: number) => {
    const updated = subtasks.map((s, i) => i === index ? { ...s, done: !s.done } : s);
    setSubtasks(updated);
    onUpdate({ subtasks: updated });
  };

  const deleteSubtask = (index: number) => {
    const updated = subtasks.filter((_, i) => i !== index);
    setSubtasks(updated);
    onUpdate({ subtasks: updated });
  };

  const handleSubcategoryChange = (category: string, subcategory: string) => {
    onUpdate({ category, subcategory });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg-secondary border-l border-border overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-bg-secondary border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <SubcategoryPicker
              currentCategory={task.category}
              currentSubcategory={task.subcategory}
              onSelect={handleSubcategoryChange}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] text-text-muted">
              <Calendar size={12} />
              <span>Start:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => saveStartDate(e.target.value)}
                className="bg-transparent text-text-secondary text-[11px] focus:outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-text-muted">
              <Calendar size={12} />
              <span>Due:</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => saveDueDate(e.target.value)}
                className="bg-transparent text-text-secondary text-[11px] focus:outline-none cursor-pointer"
              />
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Title + completion */}
          <div className="flex items-start gap-3">
            <button
              onClick={onComplete}
              className={`mt-1 w-5 h-5 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                isDone ? "bg-accent border-accent" : "border-text-muted hover:border-accent"
              }`}
            >
              {isDone && <Check size={10} className="text-text-inverse" />}
            </button>
            <h2 className={`font-heading font-semibold text-lg leading-tight ${isDone ? "line-through text-text-muted" : ""}`}>
              {task.title}
            </h2>
          </div>

          {/* Time + Play */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-primary border border-border">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { onStartTimer(); onClose(); }}
                className="w-8 h-8 rounded-full bg-accent-subtle text-accent-text flex items-center justify-center hover:bg-accent/20 transition-colors"
              >
                <Play size={14} />
              </button>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-text-muted uppercase tracking-wide">
                  <Clock size={10} />
                  <span>Time spent</span>
                </div>
                <span className="font-mono text-sm font-semibold text-text-primary">
                  {task.timeSpent > 0 ? formatTime(task.timeSpent) : "0:00"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-text-muted uppercase tracking-wide">XP</span>
              <p className="font-mono text-sm font-semibold text-accent">+{task.xp}</p>
            </div>
          </div>

          {/* Priority + Flow Score */}
          <div className="flex items-center gap-3">
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded"
              style={{ color: PRIORITY_CONFIG[task.priority].color, backgroundColor: `${PRIORITY_CONFIG[task.priority].color}15` }}
            >
              {PRIORITY_CONFIG[task.priority].label}
            </span>
            <span className="text-[11px] text-text-muted">ROI: {task.roi}/10</span>
            <span className="text-[11px] text-text-muted">Joy: {task.joy}/10</span>
            <span className="text-[11px] text-text-muted">Flow: {task.flowScore}</span>
          </div>

          {/* Link */}
          <div>
            <h3 className="text-[11px] text-text-muted uppercase tracking-wide mb-2">Link</h3>
            {editingUrl || !sourceUrl ? (
              <div className="flex items-center gap-2">
                <Link2 size={13} className="text-text-muted flex-shrink-0" />
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  onBlur={() => {
                    onUpdate({ sourceUrl: sourceUrl || null });
                    setEditingUrl(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onUpdate({ sourceUrl: sourceUrl || null });
                      setEditingUrl(false);
                    }
                  }}
                  placeholder="Add a link..."
                  autoFocus={editingUrl}
                  className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none border-b border-border focus:border-accent pb-0.5"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <Link2 size={13} className="text-accent flex-shrink-0" />
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-accent hover:underline truncate flex-1"
                >
                  {sourceUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
                </a>
                <ExternalLink size={11} className="text-accent flex-shrink-0" />
                <button
                  onClick={() => setEditingUrl(true)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-text-muted hover:text-text-secondary transition-all"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Notes..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-[13px] resize-none"
            />
          </div>

          {/* Subtasks */}
          <div>
            <h3 className="text-[11px] text-text-muted uppercase tracking-wide mb-2">Subtasks</h3>
            <div className="space-y-1">
              {subtasks.map((sub, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleSubtask(i)}
                    className={`w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                      sub.done ? "bg-accent border-accent" : "border-text-muted hover:border-accent"
                    }`}
                  >
                    {sub.done && <Check size={8} className="text-text-inverse" />}
                  </button>
                  <span className={`text-[12px] flex-1 ${sub.done ? "line-through text-text-muted" : "text-text-secondary"}`}>
                    {sub.text}
                  </span>
                  <button
                    onClick={() => deleteSubtask(i)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={addSubtask} className="text-text-muted hover:text-accent transition-colors flex-shrink-0">
                <Plus size={14} />
              </button>
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                placeholder="Add subtask"
                className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>
          </div>

          {/* Activity */}
          <div>
            <h3 className="text-[11px] text-text-muted uppercase tracking-wide mb-2">Activity</h3>
            <div className="space-y-2 text-[11px] text-text-muted">
              <p>Created {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              {task.completedAt && (
                <p>Completed {new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              )}
            </div>
          </div>

          {/* Delete */}
          <div className="pt-2 border-t border-border">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-danger text-[12px] hover:bg-danger-subtle transition-colors"
            >
              <Trash2 size={13} />
              Delete task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
