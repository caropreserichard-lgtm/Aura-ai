"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { CATEGORIES, Category, Priority, PRIORITY_CONFIG } from "@/lib/types";
import { calculateFlowScore, calculateXP } from "@/lib/scoring";
import { useSubcategories } from "@/lib/hooks/useSubcategories";

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
  } | null;
}

export default function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  editTask,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("trabajo");
  const [subcategory, setSubcategory] = useState("");
  const [priority, setPriority] = useState<Priority>(2);
  const [roi, setRoi] = useState(5);
  const [joy, setJoy] = useState(5);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<"daily" | "weekly" | "custom">(
    "daily"
  );
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
      setIsRecurring(false);
    }
  }, [editTask, isOpen, dynamicSubs]);

  useEffect(() => {
    const subs = dynamicSubs[category] || CATEGORIES[category].subcategories;
    setSubcategory(subs[0]);
  }, [category, dynamicSubs]);

  const flowScore = calculateFlowScore(roi, joy);
  const xp = calculateXP(flowScore, category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      category,
      subcategory,
      priority,
      roi,
      joy,
      recurring: isRecurring ? { type: recurringType } : null,
      tags: [],
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-bg-secondary rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="font-heading font-bold text-lg">
            {editTask ? "Editar Tarea" : "Nueva Tarea"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Qué vas a hacer?"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-white/5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción (opcional)"
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-white/5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 text-sm resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-text-muted mb-1.5">
              Categoría
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CATEGORIES) as Category[]).map((cat) => {
                const config = CATEGORIES[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? "border-2"
                        : "border border-white/5 hover:border-white/10"
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: config.color,
                            backgroundColor: `${config.color}10`,
                            color: config.color,
                          }
                        : {}
                    }
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategory */}
          <div>
            <label className="block text-xs text-text-muted mb-1.5">
              Subcategoría
            </label>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-white/5 text-text-primary focus:outline-none focus:border-accent-purple/50 text-sm"
            >
              {(dynamicSubs[category] || CATEGORIES[category].subcategories).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs text-text-muted mb-1.5">
              Prioridad
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as Priority[]).map((p) => {
                const config = PRIORITY_CONFIG[p];
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "border-2"
                        : "border border-white/5 hover:border-white/10"
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: config.color,
                            backgroundColor: `${config.color}15`,
                            color: config.color,
                          }
                        : {}
                    }
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ROI Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-text-muted">
                ROI (dinero/progreso)
              </label>
              <span className="font-mono text-sm font-bold text-accent-amber">
                {roi}/10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={roi}
              onChange={(e) => setRoi(Number(e.target.value))}
              className="w-full accent-accent-amber"
            />
          </div>

          {/* Joy Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-text-muted">Disfrute</label>
              <span className="font-mono text-sm font-bold text-accent-emerald">
                {joy}/10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={joy}
              onChange={(e) => setJoy(Number(e.target.value))}
              className="w-full accent-accent-emerald"
            />
          </div>

          {/* Live Flow Score + XP */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-bg-primary border border-white/5">
            <div>
              <span className="text-xs text-text-muted">Flow Score</span>
              <p className="font-mono font-bold text-xl text-accent-purple">
                {flowScore}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-muted">XP</span>
              <p className="font-mono font-bold text-xl text-accent-pink">
                +{xp}
              </p>
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-text-secondary">
              Tarea recurrente
            </label>
            <div className="flex items-center gap-2">
              {isRecurring && (
                <select
                  value={recurringType}
                  onChange={(e) =>
                    setRecurringType(e.target.value as "daily" | "weekly")
                  }
                  className="px-2 py-1 rounded-md bg-bg-tertiary border border-white/5 text-xs text-text-primary"
                >
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                </select>
              )}
              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`w-10 h-5 rounded-full transition-colors ${
                  isRecurring ? "bg-accent-purple" : "bg-white/10"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isRecurring ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-3 rounded-lg xp-gradient text-white font-heading font-bold text-sm transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            {editTask ? "Guardar Cambios" : "Crear Tarea"} (+{xp} XP)
          </button>
        </form>
      </div>
    </div>
  );
}
