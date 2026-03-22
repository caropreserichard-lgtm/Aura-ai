"use client";

import { useState, useEffect } from "react";
import { X, Link2 } from "lucide-react";
import { CATEGORIES, Category, Priority, PRIORITY_CONFIG } from "@/lib/types";
import { calculateFlowScore, calculateXP } from "@/lib/scoring";
import { useSubcategories } from "@/lib/hooks/useSubcategories";

const CAT_COLORS: Record<string, string> = {
  trabajo: "#d4a04e",
  aprendizaje: "#8b7ec8",
  lifestyle: "#4a9e7e",
  proyectos: "#6b8aaf",
};

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: {
    title: string;
    description: string;
    category: Category;
    subcategory: string;
    priority: Priority;
    roi: number;
    joy: number;
    recurring: { type: "daily" | "weekly" | "custom"; days?: number[] } | null;
    tags: string[];
    dueDate?: string;
    sourceUrl?: string;
  }) => void;
  editTask?: {
    _id?: string;
    title: string;
    description?: string;
    category: Category;
    subcategory: string;
    priority: Priority;
    roi: number;
    joy: number;
    recurring?: { type: "daily" | "weekly" | "custom"; days?: number[] } | null;
    tags?: string[];
    dueDate?: string;
    sourceUrl?: string;
  } | null;
  initialDate?: string;
}

export default function AddTaskModal({ isOpen, onClose, onSave, editTask, initialDate }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("trabajo");
  const [subcategory, setSubcategory] = useState("");
  const [priority, setPriority] = useState<Priority>(2);
  const [roi, setRoi] = useState(5);
  const [joy, setJoy] = useState(5);
  const [dueDate, setDueDate] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<"daily" | "weekly" | "custom">("daily");
  const { subcategories: dynamicSubs } = useSubcategories();

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || "");
      setCategory(editTask.category);
      setSubcategory(editTask.subcategory);
      setPriority(editTask.priority);
      setRoi(editTask.roi);
      setJoy(editTask.joy);
      setDueDate(editTask.dueDate || "");
      setSourceUrl(editTask.sourceUrl || "");
      setIsRecurring(!!editTask.recurring);
      if (editTask.recurring) setRecurringType(editTask.recurring.type);
    } else {
      setTitle("");
      setDescription("");
      setCategory("trabajo");
      setSubcategory((dynamicSubs.trabajo || CATEGORIES.trabajo.subcategories)[0]);
      setPriority(2);
      setRoi(5);
      setJoy(5);
      setDueDate(initialDate || "");
      setSourceUrl("");
      setIsRecurring(false);
    }
  }, [editTask, isOpen, dynamicSubs, initialDate]);

  useEffect(() => {
    const subs = dynamicSubs[category] || CATEGORIES[category].subcategories;
    setSubcategory(subs[0]);
  }, [category, dynamicSubs]);

  const flowScore = calculateFlowScore(roi, joy);
  const xp = calculateXP(flowScore, category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), category, subcategory, priority, roi, joy, recurring: isRecurring ? { type: recurringType } : null, tags: [], ...(dueDate ? { dueDate } : {}), ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}) });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-bg-secondary rounded-t-lg sm:rounded-lg border border-border-strong shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-heading font-semibold text-base">{editTask ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you going to do?"
            autoFocus className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-sm" />

          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
            className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-sm resize-none" />

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary border border-border">
            <Link2 size={14} className="text-text-muted flex-shrink-0" />
            <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Link (optional)"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none" />
            {sourceUrl && (
              <button type="button" onClick={() => setSourceUrl("")} className="text-text-muted hover:text-danger">
                <X size={14} />
              </button>
            )}
          </div>

          <div>
            <label className="block text-[11px] text-text-muted mb-1.5 uppercase tracking-wide">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary focus:outline-none focus:border-accent text-sm" />
          </div>

          <div>
            <label className="block text-[11px] text-text-muted mb-1.5 uppercase tracking-wide">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CATEGORIES) as Category[]).map((cat) => {
                const config = CATEGORIES[cat];
                const isSelected = category === cat;
                const color = CAT_COLORS[cat];
                return (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      isSelected ? "border-current" : "border-border hover:border-border-strong"
                    }`}
                    style={isSelected ? { color, borderColor: color, backgroundColor: `${color}12` } : {}}>
                    <span>{config.icon}</span>
                    <span className={isSelected ? "" : "text-text-secondary"}>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-text-muted mb-1.5 uppercase tracking-wide">Subcategory</label>
            <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary focus:outline-none focus:border-accent text-sm">
              {(dynamicSubs[category] || CATEGORIES[category].subcategories).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-text-muted mb-1.5 uppercase tracking-wide">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as Priority[]).map((p) => {
                const config = PRIORITY_CONFIG[p];
                const isSelected = priority === p;
                return (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      isSelected ? "" : "border-border hover:border-border-strong text-text-secondary"
                    }`}
                    style={isSelected ? { borderColor: config.color, backgroundColor: `${config.color}15`, color: config.color } : {}}>
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-text-muted uppercase tracking-wide">ROI</label>
              <span className="font-mono text-sm font-semibold text-warning">{roi}/10</span>
            </div>
            <input type="range" min={1} max={10} value={roi} onChange={(e) => setRoi(Number(e.target.value))} className="w-full accent-warning" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-text-muted uppercase tracking-wide">Joy</label>
              <span className="font-mono text-sm font-semibold text-accent">{joy}/10</span>
            </div>
            <input type="range" min={1} max={10} value={joy} onChange={(e) => setJoy(Number(e.target.value))} className="w-full accent-accent" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-bg-primary border border-border">
            <div>
              <span className="text-[10px] text-text-muted uppercase">Flow Score</span>
              <p className="font-mono font-bold text-lg text-accent">{flowScore}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-text-muted uppercase">XP</span>
              <p className="font-mono font-bold text-lg text-secondary">+{xp}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-text-secondary">Recurring</label>
            <div className="flex items-center gap-2">
              {isRecurring && (
                <select value={recurringType} onChange={(e) => setRecurringType(e.target.value as "daily" | "weekly")}
                  className="px-2 py-1 rounded-md bg-bg-tertiary border border-border text-xs text-text-primary">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              )}
              <button type="button" onClick={() => setIsRecurring(!isRecurring)}
                className={`w-9 h-5 rounded-full transition-colors ${isRecurring ? "bg-accent" : "bg-bg-tertiary"}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${isRecurring ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
              </button>
            </div>
          </div>

          <button type="submit" disabled={!title.trim()}
            className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-text-inverse font-heading font-semibold text-sm transition-colors disabled:opacity-40">
            {editTask ? "Save Changes" : "Create Task"} (+{xp} XP)
          </button>
        </form>
      </div>
    </div>
  );
}
