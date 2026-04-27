import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const db = await getDb();
    const birthdays = await db.collection("birthdays").find({ userId }).sort({ date: 1 }).toArray();
    return NextResponse.json(birthdays);
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
    const { name, date, relation, birthYear, notes } = body;
    if (!name || !date) return NextResponse.json({ error: "Name and date required" }, { status: 400 });
    const doc = {
      userId,
      name: String(name).trim(),
      date: String(date), // "MM-DD"
      relation: relation || "amigo",
      ...(birthYear ? { birthYear: Number(birthYear) } : {}),
      ...(notes ? { notes: String(notes) } : {}),
      createdAt: new Date().toISOString(),
    };
    const result = await db.collection("birthdays").insertOne(doc);
    return NextResponse.json({ ...doc, _id: result.insertedId });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
