import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";

const VALID_TAGS = ["Distracción", "Gasto innecesario", "Fuga de energía"] as const;

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const db = await getDb();
    const items = await db.collection("not_to_do").find({ userId }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const db = await getDb();
    const body = await req.json();
    const text = String(body.text || "").trim();
    if (!text) return NextResponse.json({ error: "Text required" }, { status: 400 });
    const tag = body.tag && (VALID_TAGS as readonly string[]).includes(body.tag) ? body.tag : undefined;
    const doc = {
      userId,
      text,
      ...(body.why ? { why: String(body.why).trim() } : {}),
      ...(tag ? { tag } : {}),
      mastered: false,
      createdAt: new Date().toISOString(),
    };
    const result = await db.collection("not_to_do").insertOne(doc);
    return NextResponse.json({ ...doc, _id: result.insertedId });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
