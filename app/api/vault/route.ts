import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const items = await db
      .collection("knowledge_vault")
      .find({ userId })
      .sort({ created_at: -1 })
      .toArray();
    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/vault error:", error);
    return NextResponse.json({ error: "Error al obtener la bóveda" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const body = await req.json();
    const { url, title, category, insight } = body;

    if (!url || !title) {
      return NextResponse.json({ error: "url y title son requeridos" }, { status: 400 });
    }

    const item = {
      userId,
      url,
      title,
      category: category || "Otro",
      status: "unread",
      insight: insight || "",
      idea: "",
      created_at: new Date().toISOString(),
    };

    const result = await db.collection("knowledge_vault").insertOne(item);
    return NextResponse.json({ ...item, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vault error:", error);
    return NextResponse.json({ error: "Error al guardar en la bóveda" }, { status: 500 });
  }
}
