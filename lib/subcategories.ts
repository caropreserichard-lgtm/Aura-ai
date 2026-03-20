import { getDb } from "./mongodb";
import { CATEGORIES, Category } from "./types";

const VALID_CATEGORIES: Category[] = ["trabajo", "aprendizaje", "lifestyle", "proyectos"];

export function getDefaultSubcategories(): Record<Category, string[]> {
  const defaults: Record<string, string[]> = {};
  for (const cat of VALID_CATEGORIES) {
    defaults[cat] = [...CATEGORIES[cat].subcategories];
  }
  return defaults as Record<Category, string[]>;
}

export async function getSubcategories(): Promise<Record<Category, string[]>> {
  const defaults = getDefaultSubcategories();

  try {
    const db = await getDb();
    const docs = await db.collection("subcategories").find({}).toArray();

    for (const doc of docs) {
      const cat = doc.category as Category;
      if (VALID_CATEGORIES.includes(cat) && Array.isArray(doc.subcategories)) {
        defaults[cat] = doc.subcategories;
      }
    }
  } catch (err) {
    console.error("Error loading subcategories from DB, using defaults:", err);
  }

  return defaults;
}

export async function updateSubcategories(
  category: Category,
  subcategories: string[]
): Promise<void> {
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Categoría inválida: ${category}`);
  }

  if (!Array.isArray(subcategories) || subcategories.length === 0) {
    throw new Error("Debe haber al menos una subcategoría");
  }

  // Clean up: trim, remove empty, deduplicate
  const cleaned = [...new Set(subcategories.map((s) => s.trim()).filter(Boolean))];

  const db = await getDb();
  await db.collection("subcategories").updateOne(
    { category },
    { $set: { category, subcategories: cleaned, updatedAt: new Date() } },
    { upsert: true }
  );
}
