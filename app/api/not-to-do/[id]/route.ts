import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";

const VALID_TAGS = ["Distracción", "Gasto innecesario", "Fuga de energía"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const db = await getDb();
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.text !== undefined) updates.text = String(body.text).trim();
    if (body.why !== undefined) updates.why = body.why ? String(body.why).trim() : "";
    if (body.tag !== undefined) {
      updates.tag = body.tag && (VALID_TAGS as readonly string[]).includes(body.tag) ? body.tag : "";
    }
    if (body.mastered !== undefined) updates.mastered = !!body.mastered;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await db.collection("not_to_do").updateOne(
      { _id: new ObjectId(id), userId },
      { $set: updates }
    );
    const updated = await db.collection("not_to_do").findOne({ _id: new ObjectId(id), userId });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const db = await getDb();
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    await db.collection("not_to_do").deleteOne({ _id: new ObjectId(id), userId });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
