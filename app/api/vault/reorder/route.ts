import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * POST body: { items: { id: string; order: number }[] }
 * Bulk-update the `order` field for the user's vault items.
 * Sort priority in the UI is: pinned desc → order desc → created_at desc.
 */
export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items requerido" }, { status: 400 });
    }
    if (items.length > 200) {
      return NextResponse.json({ error: "máx 200 items por reordenar" }, { status: 400 });
    }

    const db = await getDb();

    // Build bulk write ops scoped to userId
    const ops = items
      .filter((it: { id?: string; order?: number }) => it && typeof it.id === "string" && typeof it.order === "number")
      .map((it: { id: string; order: number }) => ({
        updateOne: {
          filter: { _id: new ObjectId(it.id), userId },
          update: { $set: { order: it.order } },
        },
      }));

    if (ops.length === 0) return NextResponse.json({ updated: 0 });

    const res = await db.collection("knowledge_vault").bulkWrite(ops);
    return NextResponse.json({ updated: res.modifiedCount });
  } catch (error) {
    console.error("POST /api/vault/reorder error:", error);
    return NextResponse.json({ error: "Error al reordenar" }, { status: 500 });
  }
}
