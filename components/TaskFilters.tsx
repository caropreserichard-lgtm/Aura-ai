"use client";

import { CATEGORIES, Category, PRIORITY_CONFIG, Priority, TaskStatus } from "@/lib/types";
import { useSubcategories } from "@/lib/hooks/useSubcategories";

const CAT_COLORS: Record<string, string> = {
  trabajo: "#d4a04e",
  aprendizaje: "#8b7ec8",
  lifestyle: "#4a9e7e",
  proyectos: "#6b8aaf",
};

interface TaskFiltersProps {
  selectedCategory: Category | "all";
  selectedSubcategory: string | "all";
  selectedPriority: Priority | "all";
  selectedStatus: TaskStatus | "all";
  onCategoryChange: (category: Category | "all") => void;
  onSubcategoryChange: (subcategory: string | "all") => void;
  onPriorityChange: (priority: Priority | "all") => void;
  onStatusChange: (status: TaskStatus | "all") => void;
}

export default function TaskFilters({
  selectedCategory, selectedSubcategory, selectedPriority, selectedStatus,
  onCategoryChange, onSubcategoryChange, onPriorityChange, onStatusChange,
}: TaskFiltersProps) {
  const { subcategories: dynamicSubs } = useSubcategories();

  const allSubcategories: { name: string; category: Category }[] = [];
  (Object.keys(CATEGORIES) as Category[]).forEach((cat) => {
    const subs = dynamicSubs[cat] || CATEGORIES[cat].subcategories;
    subs.forEach((sub) => allSubcategories.push({ name: sub, category: cat }));
  });

  const handleSubTabClick = (sub: { name: string; category: Category }) => {
    if (selectedSubcategory === sub.name) {
      onSubcategoryChange("all");
      onCategoryChange("all");
    } else {
      onCategoryChange(sub.category);
      onSubcategoryChange(sub.name);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => { onCategoryChange("all"); onSubcategoryChange("all"); }}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
            selectedCategory === "all" && selectedSubcategory === "all"
              ? "bg-bg-elevated border-border-strong text-text-primary"
              : "border-transparent text-text-muted hover:text-text-secondary hover:bg-bg-hover"
          }`}
        >
          All
        </button>
        {allSubcategories.map((sub) => {
          const isSelected = selectedSubcategory === sub.name;
          const color = CAT_COLORS[sub.category];
          return (
            <button
              key={`${sub.category}-${sub.name}`}
              onClick={() => handleSubTabClick(sub)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                isSelected ? "" : "border-transparent text-text-muted hover:text-text-secondary hover:bg-bg-hover"
              }`}
              style={isSelected ? { backgroundColor: `${color}15`, color, borderColor: `${color}30` } : {}}
            >
              {sub.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORIES) as Category[]).map((cat) => {
            const config = CATEGORIES[cat];
            const isSelected = selectedCategory === cat;
            const color = CAT_COLORS[cat];
            return (
              <button key={cat} onClick={() => { onCategoryChange(isSelected ? "all" : cat); onSubcategoryChange("all"); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                  isSelected ? "" : "border-transparent text-text-muted hover:text-text-secondary hover:bg-bg-hover"
                }`}
                style={isSelected ? { backgroundColor: `${color}15`, color, borderColor: `${color}30` } : {}}>
                {config.icon} {config.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-text-muted">Status:</span>
          <select value={selectedStatus} onChange={(e) => onStatusChange(e.target.value as TaskStatus | "all")}
            className="px-2 py-1 rounded-md bg-bg-tertiary border border-border text-[11px] text-text-primary focus:outline-none focus:border-accent">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-text-muted">Priority:</span>
          <select value={selectedPriority} onChange={(e) => onPriorityChange(e.target.value === "all" ? "all" : (Number(e.target.value) as Priority))}
            className="px-2 py-1 rounded-md bg-bg-tertiary border border-border text-[11px] text-text-primary focus:outline-none focus:border-accent">
            <option value="all">All</option>
            {([1, 2, 3, 4] as Priority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
