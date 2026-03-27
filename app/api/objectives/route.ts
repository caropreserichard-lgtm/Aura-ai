import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get("weekStart") || getWeekStart(new Date());

    const objectives = await db
      .collection("objectives")
      .find({ weekStart, userId })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json(objectives);
  } catch (error) {
    console.error("GET /api/objectives error:", error);
    return NextResponse.json({ error: "Error fetching objectives" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const body = await req.json();

    if (body.action === "toggle" && body.id) {
      const obj = await db.collection("objectives").findOne({ _id: new ObjectId(body.id), userId });
      if (obj) {
        await db.collection("objectives").updateOne(
          { _id: new ObjectId(body.id), userId },
          { $set: { done: !obj.done } }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === "delete" && body.id) {
      await db.collection("objectives").deleteOne({ _id: new ObjectId(body.id), userId });
      return NextResponse.json({ success: true });
    }

    const { text } = body;
    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const weekStart = body.weekStart || getWeekStart(new Date());
    const objective = {
      userId,
      text: text.trim(),
      done: false,
      weekStart,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("objectives").insertOne(objective);
    return NextResponse.json({ ...objective, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/objectives error:", error);
    return NextResponse.json({ error: "Error saving objective" }, { status: 500 });
  }
}
