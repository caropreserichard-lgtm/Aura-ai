"use client";

import { useState, useRef } from "react";
import {
  X, Play, Trash2, Plus, Check, Calendar, Clock, Link2, ExternalLink,
  Maximize2, MoreHorizontal, Paperclip,
} from "lucide-react";
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
  const [startDate, setStartDate] = useState(task.startDate || task.dueDate || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [newSubtask, setNewSubtask] = useState("");
  const [subtasks, setSubtasks] = useState<{ text: string; done: boolean }[]>(task.subtasks || []);
  const [sourceUrl, setSourceUrl] = useState(task.sourceUrl || "");
  const [editingUrl, setEditingUrl] = useState(false);
  const [comment, setComment] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const color = CAT_COLORS[task.category] || "#666";
  const isDone = task.status === "done";

  const saveDescription = () => {
    if (description !== (task.description || "")) onUpdate({ description });
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

  const formatDateShort = (d: string) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl bg-bg-secondary rounded-2xl border border-border shadow-2xl overflow-hidden mx-4 my-auto">
        {/* ── Top Bar ──────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted uppercase tracking-wide">Channel</span>
              <SubcategoryPicker
                currentCategory={task.category}
                currentSubcategory={task.subcategory}
                onSelect={handleSubcategoryChange}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted uppercase tracking-wide">Start</span>
              <span className="text-xs font-semibold text-text-primary">
                {startDate ? formatDateShort(startDate) : "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-bg-hover text-text-muted text-[11px] transition-colors">
              <Calendar size={12} /> Due
            </button>
            <button className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-bg-hover text-text-muted text-[11px] transition-colors">
              <Plus size={12} /> Subtasks
            </button>
            <button className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors">
              <MoreHorizontal size={14} />
            </button>
            <button className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors">
              <Maximize2 size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Main Content ─────────────────────────── */}
        <div className="px-5 py-4">
          {/* Title row with checkbox, play, and time */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onComplete}
              className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                isDone ? "bg-accent border-accent" : "border-text-muted/40 hover:border-accent"
              }`}>
              {isDone && <Check size={12} className="text-text-inverse" />}
            </button>
            <h2 className={`flex-1 font-heading font-bold text-lg leading-tight ${isDone ? "line-through text-text-muted" : "text-text-primary"}`}>
              {task.title}
            </h2>
            <button onClick={() => { onStartTimer(); onClose(); }}
              className="p-2 rounded-lg hover:bg-bg-hover text-text-muted transition-colors" title="Start timer">
              <Play size={16} />
            </button>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-4 text-[10px] text-text-muted uppercase tracking-wide">
                <span>Actual</span>
                <span>Planned</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-sm font-semibold text-text-primary">
                <span>{task.timeSpent > 0 ? formatTime(task.timeSpent) : "--:--"}</span>
                <span>{(task as unknown as Record<string, unknown>).estimatedTime ? formatTime((task as unknown as Record<string, unknown>).estimatedTime as number) : "--:--"}</span>
              </div>
            </div>
          </div>

          {/* Subtasks */}
          {(subtasks.length > 0 || true) && (
            <div className="mb-4">
              <div className="space-y-0.5">
                {subtasks.map((sub, i) => (
                  <div key={i} className="flex items-center gap-3 group py-1.5 px-1 rounded-lg hover:bg-bg-hover/50">
                    <button onClick={() => toggleSubtask(i)}
                      className={`w-5 h-5 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                        sub.done ? "bg-accent border-accent" : "border-text-muted/40 hover:border-accent"
                      }`}>
                      {sub.done && <Check size={10} className="text-text-inverse" />}
                    </button>
                    <span className={`flex-1 text-sm font-medium ${sub.done ? "line-through text-text-muted" : "text-text-primary"}`}>
                      {sub.text}
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-text-muted font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>--:--</span>
                      <span>--:--</span>
                    </div>
                    <button onClick={() => deleteSubtask(i)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all p-0.5">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-1 px-1">
                <button onClick={addSubtask} className="w-5 h-5 rounded-full border-[1.5px] border-dashed border-text-muted/30 flex-shrink-0 flex items-center justify-center text-text-muted hover:border-accent hover:text-accent transition-colors">
                  <Plus size={11} />
                </button>
                <input type="text" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                  placeholder="Add subtask"
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none" />
              </div>
            </div>
          )}

          {/* Link */}
          {(sourceUrl || editingUrl) && (
            <div className="mb-4">
              {editingUrl || !sourceUrl ? (
                <div className="flex items-center gap-2">
                  <Link2 size={13} className="text-text-muted flex-shrink-0" />
                  <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                    onBlur={() => { onUpdate({ sourceUrl: sourceUrl || null }); setEditingUrl(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { onUpdate({ sourceUrl: sourceUrl || null }); setEditingUrl(false); } }}
                    placeholder="Add a link..." autoFocus
                    className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none border-b border-border focus:border-accent pb-0.5" />
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <Link2 size={13} className="text-accent flex-shrink-0" />
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[12px] text-accent hover:underline truncate flex-1">
                    {sourceUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
                  </a>
                  <ExternalLink size={11} className="text-accent flex-shrink-0" />
                  <button onClick={() => setEditingUrl(true)}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-text-muted hover:text-text-secondary transition-all">Edit</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Notes ─────────────────────────────────── */}
        <div className="border-t border-border px-5 py-4">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription} placeholder="Notes..."
            rows={3}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none" />
        </div>

        {/* ── Comments ─────────────────────────────── */}
        <div className="border-t border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-accent">RC</span>
            </div>
            <input type="text" value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Comment..."
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none" />
            <button className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors">
              <Paperclip size={14} />
            </button>
          </div>
        </div>

        {/* ── Activity Log ─────────────────────────── */}
        <div className="border-t border-border px-5 py-4">
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40 mt-1.5 flex-shrink-0" />
              <p className="text-[12px] text-text-muted">
                Created this · {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            {task.completedAt && (
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40 mt-1.5 flex-shrink-0" />
                <p className="text-[12px] text-text-muted">
                  Completed this · {new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40 mt-1.5 flex-shrink-0" />
                <p className="text-[12px] text-text-muted">
                  Set the start date to {formatDateShort(task.dueDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Delete Footer ────────────────────────── */}
        <div className="border-t border-border px-5 py-3">
          <button onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-danger text-[12px] hover:bg-danger-subtle transition-colors">
            <Trash2 size={13} /> Delete task
          </button>
        </div>
      </div>
    </div>
  );
}
