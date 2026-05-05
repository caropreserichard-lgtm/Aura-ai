import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { ObjectId } from "mongodb";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const { id } = await params;
    const db = await getDb();
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined)   updates.status   = body.status;
    if (body.idea !== undefined)     updates.idea     = body.idea;
    if (body.category !== undefined) updates.category = String(body.category).trim() || "Otro";
    if (body.title !== undefined)    updates.title    = String(body.title).trim();
    if (body.platform !== undefined) updates.platform = body.platform;
    if (body.pinned !== undefined)   updates.pinned   = !!body.pinned;
    if (body.order !== undefined)    updates.order    = Number(body.order) || 0;
    if (body.summary !== undefined) {
      const s = String(body.summary).trim();
      updates.summary = s;
      updates.insight = s; // keep legacy field in sync
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    await db.collection("knowledge_vault").updateOne(
      { _id: new ObjectId(id), userId },
      { $set: updates }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/vault/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const { id } = await params;
    const db = await getDb();
    await db.collection("knowledge_vault").deleteOne({ _id: new ObjectId(id), userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/vault/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
