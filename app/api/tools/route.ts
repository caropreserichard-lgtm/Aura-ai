import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { DEFAULT_CATEGORIES } from "@/lib/toolsData";
import { ObjectId } from "mongodb";

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    let categories = await db.collection("tool_categories").find({ userId }).sort({ order: 1 }).toArray();

    // Seed defaults if empty
    if (categories.length === 0) {
      const seeded = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, userId, order: i }));
      await db.collection("tool_categories").insertMany(seeded);
      categories = await db.collection("tool_categories").find({ userId }).sort({ order: 1 }).toArray();
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/tools error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const body = await req.json();
    const { action } = body;

    if (action === "add_category") {
      const count = await db.collection("tool_categories").countDocuments({ userId });
      const cat = {
        userId,
        id: new ObjectId().toString(),
        name: body.name,
        color: body.color || "#6366F1",
        icon: body.icon || "Folder",
        tools: [],
        order: count,
      };
      await db.collection("tool_categories").insertOne(cat);
      return NextResponse.json(cat);
    }

    if (action === "update_category") {
      const allowed = ["name", "color", "icon"];
      const updates: Record<string, unknown> = {};
      for (const f of allowed) {
        if (body[f] !== undefined) updates[f] = body[f];
      }
      await db.collection("tool_categories").updateOne({ id: body.categoryId, userId }, { $set: updates });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_category") {
      await db.collection("tool_categories").deleteOne({ id: body.categoryId, userId });
      return NextResponse.json({ ok: true });
    }

    if (action === "reorder_categories") {
      // body.order = ["catId1", "catId2", ...]
      const ops = (body.order as string[]).map((catId: string, i: number) =>
        db.collection("tool_categories").updateOne({ id: catId, userId }, { $set: { order: i } })
      );
      await Promise.all(ops);
      return NextResponse.json({ ok: true });
    }

    if (action === "add_tool") {
      const tool = { id: new ObjectId().toString(), name: body.name, url: body.url, description: body.description || "" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.collection("tool_categories").updateOne({ id: body.categoryId, userId }, { $push: { tools: tool } as any });
      return NextResponse.json(tool);
    }

    if (action === "update_tool") {
      const cat = await db.collection("tool_categories").findOne({ id: body.categoryId, userId });
      if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tools = (cat.tools || []).map((t: { id: string }) => {
        if (t.id === body.toolId) return { ...t, ...body.updates };
        return t;
      });
      await db.collection("tool_categories").updateOne({ id: body.categoryId, userId }, { $set: { tools } });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_tool") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.collection("tool_categories").updateOne({ id: body.categoryId, userId }, { $pull: { tools: { id: body.toolId } } as any });
      return NextResponse.json({ ok: true });
    }

    if (action === "reorder_tools") {
      // body.categoryId, body.toolIds = ["id1", "id2", ...]
      const cat = await db.collection("tool_categories").findOne({ id: body.categoryId, userId });
      if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const toolMap = new Map((cat.tools || []).map((t: { id: string }) => [t.id, t]));
      const reordered = (body.toolIds as string[]).map((id: string) => toolMap.get(id)).filter(Boolean);
      await db.collection("tool_categories").updateOne({ id: body.categoryId, userId }, { $set: { tools: reordered } });
      return NextResponse.json({ ok: true });
    }

    if (action === "move_tool") {
      // Move tool from one category to another
      const fromCat = await db.collection("tool_categories").findOne({ id: body.fromCategoryId, userId });
      if (!fromCat) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tool = (fromCat.tools || []).find((t: { id: string }) => t.id === body.toolId);
      if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.collection("tool_categories").updateOne({ id: body.fromCategoryId, userId }, { $pull: { tools: { id: body.toolId } } as any });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.collection("tool_categories").updateOne({ id: body.toCategoryId, userId }, { $push: { tools: tool } as any });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/tools error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
