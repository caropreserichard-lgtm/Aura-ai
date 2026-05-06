import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * GET → list all categories for the user with item counts.
 *
 * Response: { categories: { name: string, count: number }[] }
 */
export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const agg = await db.collection("knowledge_vault").aggregate([
      { $match: { userId } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();

    return NextResponse.json({
      categories: agg.map((c) => ({ name: c._id || "Otro", count: c.count })),
    });
  } catch (err) {
    console.error("GET /api/vault/categories error:", err);
    return NextResponse.json({ error: "Error al listar categorías" }, { status: 500 });
  }
}

/**
 * PATCH body: { from: string, to: string }
 *
 * Rename or merge: moves all items from category `from` to `to`. If `to`
 * already exists in the user's vault, it's effectively a merge.
 *
 * Response: { updated: number }
 */
export async function PATCH(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const { from, to } = await req.json();
    if (!from || !to || typeof from !== "string" || typeof to !== "string") {
      return NextResponse.json({ error: "from y to son requeridos" }, { status: 400 });
    }
    const fromTrim = from.trim();
    const toTrim = to.trim();
    if (!fromTrim || !toTrim) {
      return NextResponse.json({ error: "categorías no pueden estar vacías" }, { status: 400 });
    }
    if (fromTrim === toTrim) {
      return NextResponse.json({ updated: 0 });
    }

    const db = await getDb();
    const res = await db.collection("knowledge_vault").updateMany(
      { userId, category: fromTrim },
      { $set: { category: toTrim } }
    );

    return NextResponse.json({ updated: res.modifiedCount });
  } catch (err) {
    console.error("PATCH /api/vault/categories error:", err);
    return NextResponse.json({ error: "Error al renombrar categoría" }, { status: 500 });
  }
}

/**
 * DELETE body: { name: string, reassignTo?: string }
 *
 * Reassigns all items in category `name` to `reassignTo` (default: "Otro").
 * Doesn't delete any items — categories are virtual (derived from items).
 */
export async function DELETE(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const { name, reassignTo = "Otro" } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name es requerido" }, { status: 400 });
    }

    const db = await getDb();
    const res = await db.collection("knowledge_vault").updateMany(
      { userId, category: name.trim() },
      { $set: { category: String(reassignTo).trim() || "Otro" } }
    );

    return NextResponse.json({ updated: res.modifiedCount });
  } catch (err) {
    console.error("DELETE /api/vault/categories error:", err);
    return NextResponse.json({ error: "Error al eliminar categoría" }, { status: 500 });
  }
}
