import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSubcategories, updateSubcategories } from "@/lib/subcategories";
import { Category } from "@/lib/types";

const VALID_CATEGORIES: Category[] = ["trabajo", "aprendizaje", "lifestyle", "proyectos"];

export async function POST(req: NextRequest) {
  try {
    const { subcategory, fromCategory, toCategory } = await req.json();

    if (!subcategory || !fromCategory || !toCategory) {
      return NextResponse.json(
        { error: "subcategory, fromCategory y toCategory son requeridos" },
        { status: 400 }
      );
    }

    if (
      !VALID_CATEGORIES.includes(fromCategory) ||
      !VALID_CATEGORIES.includes(toCategory)
    ) {
      return NextResponse.json(
        { error: "Categoría inválida" },
        { status: 400 }
      );
    }

    if (fromCategory === toCategory) {
      return NextResponse.json({ success: true, tasksMoved: 0 });
    }

    // 1. Update subcategory lists
    const allSubs = await getSubcategories();

    const fromSubs = allSubs[fromCategory as Category].filter(
      (s: string) => s !== subcategory
    );
    const toSubs = allSubs[toCategory as Category];
    if (!toSubs.includes(subcategory)) {
      toSubs.push(subcategory);
    }

    // Ensure source still has at least one subcategory
    if (fromSubs.length === 0) {
      fromSubs.push("General");
    }

    await updateSubcategories(fromCategory as Category, fromSubs);
    await updateSubcategories(toCategory as Category, toSubs);

    // 2. Move all tasks with this subcategory from old to new category
    const db = await getDb();
    const result = await db.collection("tasks").updateMany(
      { category: fromCategory, subcategory: subcategory },
      { $set: { category: toCategory } }
    );

    return NextResponse.json({
      success: true,
      tasksMoved: result.modifiedCount,
    });
  } catch (error) {
    console.error("POST /api/subcategories/move error:", error);
    const message =
      error instanceof Error ? error.message : "Error al mover subcategoría";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
