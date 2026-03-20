"use client";

import { useState, useEffect, useCallback } from "react";
import { CATEGORIES, Category } from "@/lib/types";

type SubcategoriesMap = Record<Category, string[]>;

function getDefaults(): SubcategoriesMap {
  return {
    trabajo: [...CATEGORIES.trabajo.subcategories],
    aprendizaje: [...CATEGORIES.aprendizaje.subcategories],
    lifestyle: [...CATEGORIES.lifestyle.subcategories],
    proyectos: [...CATEGORIES.proyectos.subcategories],
  };
}

export function useSubcategories() {
  const [subcategories, setSubcategories] = useState<SubcategoriesMap>(getDefaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subcategories")
      .then((res) => res.json())
      .then((data) => {
        if (data.subcategories) {
          setSubcategories(data.subcategories);
        }
      })
      .catch(() => {
        // Keep defaults on error
      })
      .finally(() => setLoading(false));
  }, []);

  const updateSubcategories = useCallback(
    async (category: Category, subs: string[]) => {
      // Optimistic update
      setSubcategories((prev) => ({ ...prev, [category]: subs }));

      try {
        const res = await fetch("/api/subcategories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, subcategories: subs }),
        });

        if (!res.ok) {
          throw new Error("Failed to update");
        }
      } catch {
        // Revert on error
        setSubcategories((prev) => ({
          ...prev,
          [category]: CATEGORIES[category].subcategories,
        }));
        throw new Error("Error al guardar subcategorías");
      }
    },
    []
  );

  const resetToDefaults = useCallback(async (category: Category) => {
    const defaults = [...CATEGORIES[category].subcategories];
    setSubcategories((prev) => ({ ...prev, [category]: defaults }));

    await fetch("/api/subcategories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, subcategories: defaults }),
    });
  }, []);

  return { subcategories, loading, updateSubcategories, resetToDefaults };
}
