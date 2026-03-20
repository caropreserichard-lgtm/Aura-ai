"use client";

import { CATEGORIES, Category, PRIORITY_CONFIG, Priority, TaskStatus } from "@/lib/types";

interface TaskFiltersProps {
  selectedCategory: Category | "all";
  selectedPriority: Priority | "all";
  selectedStatus: TaskStatus | "all";
  onCategoryChange: (category: Category | "all") => void;
  onPriorityChange: (priority: Priority | "all") => void;
  onStatusChange: (status: TaskStatus | "all") => void;
}

export default function TaskFilters({
  selectedCategory,
  selectedPriority,
  selectedStatus,
  onCategoryChange,
  onPriorityChange,
  onStatusChange,
}: TaskFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedCategory === "all"
              ? "bg-white/10 text-text-primary"
              : "bg-white/5 text-text-muted hover:text-text-secondary"
          }`}
        >
          Todas
        </button>
        {(Object.keys(CATEGORIES) as Category[]).map((cat) => {
          const config = CATEGORIES[cat];
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? ""
                  : "bg-white/5 text-text-muted hover:text-text-secondary"
              }`}
              style={
                isSelected
                  ? { backgroundColor: `${config.color}20`, color: config.color }
                  : {}
              }
            >
              {config.icon} {config.label}
            </button>
          );
        })}
      </div>

      {/* Status + Priority row */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Estado:</span>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus | "all")}
            className="px-2 py-1 rounded-md bg-bg-tertiary border border-white/5 text-xs text-text-primary focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="in_progress">En progreso</option>
            <option value="done">Completadas</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Prioridad:</span>
          <select
            value={selectedPriority}
            onChange={(e) =>
              onPriorityChange(
                e.target.value === "all" ? "all" : (Number(e.target.value) as Priority)
              )
            }
            className="px-2 py-1 rounded-md bg-bg-tertiary border border-white/5 text-xs text-text-primary focus:outline-none"
          >
            <option value="all">Todas</option>
            {([1, 2, 3, 4] as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_CONFIG[p].label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
