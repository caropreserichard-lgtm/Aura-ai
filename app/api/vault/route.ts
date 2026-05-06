import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { detectPlatform, normalizeUrlForDedupe } from "@/lib/vault-helpers";

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
    const { url, title, category, summary, insight, platform } = body;

    if (!url || !title) {
      return NextResponse.json({ error: "url y title son requeridos" }, { status: 400 });
    }

    // Duplicate check (per-user, normalized URL)
    const norm = normalizeUrlForDedupe(url);
    const existing = await db.collection("knowledge_vault").find({ userId }).project({ url: 1 }).toArray();
    const dup = existing.find((d) => normalizeUrlForDedupe(d.url) === norm);
    if (dup) {
      return NextResponse.json({ error: "duplicate", duplicateId: String(dup._id) }, { status: 409 });
    }

    const finalSummary = (summary || insight || "").trim();
    const item = {
      userId,
      url,
      title,
      category: category || "Sin Clasificar",
      summary: finalSummary,
      insight: finalSummary, // legacy field, keep in sync
      platform: platform || detectPlatform(url),
      status: "unread" as const,
      idea: "",
      pinned: false,
      order: Date.now(), // higher = newer; later sorted desc
      created_at: new Date().toISOString(),
    };

    const result = await db.collection("knowledge_vault").insertOne(item);
    return NextResponse.json({ ...item, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vault error:", error);
    return NextResponse.json({ error: "Error al guardar en la bóveda" }, { status: 500 });
  }
}
