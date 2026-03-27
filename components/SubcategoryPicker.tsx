"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { CATEGORIES, Category } from "@/lib/types";
import { useSubcategories } from "@/lib/hooks/useSubcategories";

const CAT_COLORS: Record<string, string> = {
  trabajo: "#e7ca79",
  aprendizaje: "#8b7ec8",
  lifestyle: "#4a9e7e",
  proyectos: "#6b8aaf",
};

interface SubcategoryPickerProps {
  currentCategory: Category;
  currentSubcategory: string;
  onSelect: (category: Category, subcategory: string) => void;
}

export default function SubcategoryPicker({ currentCategory, currentSubcategory, onSelect }: SubcategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const { subcategories: dynamicSubs } = useSubcategories();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const color = CAT_COLORS[currentCategory] || "#666";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-[11px] font-medium px-1.5 py-0.5 rounded hover:opacity-80 transition-opacity"
        style={{ color, backgroundColor: `${color}15` }}
      >
        # {currentSubcategory}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border bg-bg-elevated shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <p className="text-[10px] text-text-muted mb-1.5 uppercase tracking-wide">Assign to channel:</p>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-bg-tertiary border border-border">
              <Search size={12} className="text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {(Object.keys(CATEGORIES) as Category[]).map((cat) => {
              const subs = dynamicSubs[cat] || CATEGORIES[cat].subcategories;
              const catColor = CAT_COLORS[cat];
              const filtered = subs.filter((s) => s.toLowerCase().includes(search.toLowerCase()));
              if (filtered.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="px-3 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
                    {CATEGORIES[cat].label}
                  </p>
                  {filtered.map((sub) => {
                    const isSelected = cat === currentCategory && sub === currentSubcategory;
                    return (
                      <button
                        key={`${cat}-${sub}`}
                        onClick={() => { onSelect(cat, sub); setOpen(false); setSearch(""); }}
                        className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-bg-hover transition-colors flex items-center justify-between ${
                          isSelected ? "text-accent-text bg-accent-subtle" : "text-text-secondary"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-[10px]" style={{ color: catColor }}>#</span>
                          {sub}
                        </span>
                        {isSelected && <span className="text-accent text-[11px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
