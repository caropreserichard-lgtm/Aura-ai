"use client";

import { useState, useRef } from "react";
import {
  X, Play, Trash2, Plus, Check, Calendar, Link2, ExternalLink,
  Maximize2, MoreHorizontal, Paperclip, Download, FileText, Image as ImageIcon,
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

const TIME_PRESETS = [
  { label: "5m", mins: 5 }, { label: "10m", mins: 10 }, { label: "15m", mins: 15 },
  { label: "20m", mins: 20 }, { label: "25m", mins: 25 }, { label: "30m", mins: 30 },
  { label: "35m", mins: 35 }, { label: "40m", mins: 40 }, { label: "45m", mins: 45 },
  { label: "1h", mins: 60 }, { label: "2h", mins: 120 },
];

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
  const [startDate] = useState(task.startDate || task.dueDate || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [newSubtask, setNewSubtask] = useState("");
  const [subtasks, setSubtasks] = useState<{ text: string; done: boolean }[]>(task.subtasks || []);
  const [sourceUrl, setSourceUrl] = useState(task.sourceUrl || "");
  const [editingUrl, setEditingUrl] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<{ id: string; text: string; createdAt: string }[]>(task.comments || []);
  const [attachments, setAttachments] = useState<{ name: string; url: string; size: number; type: string; uploadedAt: string }[]>(task.attachments || []);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<number>(task.estimatedTime || 0);
  const [timeInput, setTimeInput] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

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

  const addComment = () => {
    if (!comment.trim()) return;
    const newComment = { id: crypto.randomUUID(), text: comment.trim(), createdAt: new Date().toISOString() };
    const updated = [...comments, newComment];
    setComments(updated);
    setComment("");
    onUpdate({ comments: updated });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const updated = [...attachments, data];
      setAttachments(updated);
      onUpdate({ attachments: updated });
    } catch (err) { console.error("Upload error:", err); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const removeAttachment = (index: number) => {
    const updated = attachments.filter((_, i) => i !== index);
    setAttachments(updated);
    onUpdate({ attachments: updated });
  };

  const handleDueDate = (val: string) => {
    setDueDate(val);
    onUpdate({ dueDate: val || null });
    setShowDuePicker(false);
  };

  const handleEstimatedTime = (mins: number) => {
    setEstimatedTime(mins);
    onUpdate({ estimatedTime: mins });
    setShowTimePicker(false);
  };

  const formatDateShort = (d: string) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon size={13} className="text-blue-400" />;
    return <FileText size={13} className="text-text-muted" />;
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className={`relative bg-bg-secondary rounded-2xl border border-border shadow-2xl overflow-hidden mx-4 my-auto transition-all duration-300 ${
        isFullscreen ? "w-full max-w-5xl" : "w-full max-w-2xl"
      }`}>
        {/* ── Top Bar ──────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-4 min-w-0">
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
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Due date button */}
            <div className="relative">
              <button onClick={() => { setShowDuePicker(!showDuePicker); setShowTimePicker(false); setShowMoreMenu(false); }}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-bg-hover text-text-muted text-[11px] transition-colors">
                <Calendar size={12} /> {dueDate ? formatDateShort(dueDate) : "Due"}
              </button>
              {showDuePicker && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-50 p-3">
                  <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wide">Due date</p>
                  <input type="date" value={dueDate} onChange={(e) => handleDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent" />
                  {dueDate && (
                    <button onClick={() => handleDueDate("")}
                      className="mt-2 text-[10px] text-danger hover:underline">Remove due date</button>
                  )}
                </div>
              )}
            </div>
            {/* + Subtasks button */}
            <button onClick={() => { subtaskInputRef.current?.focus(); subtaskInputRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-bg-hover text-text-muted text-[11px] transition-colors">
              <Plus size={12} /> Subtasks
            </button>
            {/* More menu */}
            <div className="relative">
              <button onClick={() => { setShowMoreMenu(!showMoreMenu); setShowDuePicker(false); setShowTimePicker(false); }}
                className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors">
                <MoreHorizontal size={14} />
              </button>
              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-50 py-1">
                  <button onClick={() => { setEditingUrl(true); setShowMoreMenu(false); }}
                    className="w-full text-left px-3 py-2 text-[11px] text-text-primary hover:bg-bg-hover flex items-center gap-2">
                    <Link2 size={12} /> Add/edit link
                  </button>
                  <button onClick={() => { fileInputRef.current?.click(); setShowMoreMenu(false); }}
                    className="w-full text-left px-3 py-2 text-[11px] text-text-primary hover:bg-bg-hover flex items-center gap-2">
                    <Paperclip size={12} /> Attach file
                  </button>
                  <div className="border-t border-border my-1" />
                  <div className="px-3 py-2">
                    <p className="text-[9px] text-text-muted uppercase tracking-wide mb-1.5">Priority</p>
                    <div className="flex gap-1">
                      {([1, 2, 3, 4] as const).map((p) => (
                        <button key={p} onClick={() => { onUpdate({ priority: p }); setShowMoreMenu(false); }}
                          className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                            task.priority === p ? "ring-1 ring-offset-1 ring-offset-bg-tertiary" : "opacity-60 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: PRIORITY_CONFIG[p].color + "20", color: PRIORITY_CONFIG[p].color, ["--tw-ring-color" as string]: PRIORITY_CONFIG[p].color }}>
                          {PRIORITY_CONFIG[p].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Fullscreen */}
            <button onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors" title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
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
                <div className="relative">
                  <button onClick={() => { setShowTimePicker(!showTimePicker); setShowDuePicker(false); setShowMoreMenu(false); }}
                    className="hover:text-accent transition-colors">
                    {estimatedTime > 0 ? formatTime(estimatedTime) : "--:--"}
                  </button>
                  {showTimePicker && (
                    <div className="absolute top-full right-0 mt-1 w-52 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-50 p-2.5">
                      <input type="text" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} placeholder="e.g. 25 or 1:30"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && timeInput.trim()) {
                            const parts = timeInput.split(":");
                            const mins = parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : parseInt(timeInput);
                            if (!isNaN(mins) && mins > 0) { handleEstimatedTime(mins); setTimeInput(""); }
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent mb-2" />
                      <div className="grid grid-cols-4 gap-1.5">
                        {TIME_PRESETS.map((p) => (
                          <button key={p.label} onClick={() => { handleEstimatedTime(p.mins); setTimeInput(""); }}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                              estimatedTime === p.mins ? "bg-accent text-text-inverse" : "bg-bg-secondary text-text-secondary hover:bg-bg-hover"
                            }`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Subtasks */}
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
              <input ref={subtaskInputRef} type="text" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                placeholder="Add subtask"
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none" />
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mb-4 space-y-1.5">
              <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Attachments</p>
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-bg-tertiary border border-border group">
                  {getFileIcon(att.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-text-primary truncate font-medium">{att.name}</p>
                    <p className="text-[9px] text-text-muted">{formatSize(att.size)}</p>
                  </div>
                  <a href={att.url} target="_blank" rel="noopener noreferrer" download
                    className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-accent transition-colors">
                    <Download size={12} />
                  </a>
                  <button onClick={() => removeAttachment(i)}
                    className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                    <X size={12} />
                  </button>
                </div>
              ))}
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
              onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
              placeholder="Comment..."
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none" />
            <button onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors" title="Attach file">
              {uploading ? (
                <div className="w-3.5 h-3.5 border-2 border-text-muted border-t-accent rounded-full animate-spin" />
              ) : (
                <Paperclip size={14} />
              )}
            </button>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
        </div>

        {/* ── Saved Comments ───────────────────────── */}
        {comments.length > 0 && (
          <div className="border-t border-border px-5 py-3 space-y-2">
            {comments.slice().reverse().map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[8px] font-bold text-accent">RC</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-text-primary">{c.text}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

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
