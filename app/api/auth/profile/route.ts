import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { ObjectId } from "mongodb";

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    fullName: user.fullName,
    email: user.email,
    empireName: user.empireName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  });
}

export async function PATCH(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { fullName, empireName } = await req.json();
  const db = await getDb();

  const updates: Record<string, unknown> = {};
  if (fullName) updates.fullName = fullName.trim();
  if (empireName !== undefined) updates.empireName = empireName.trim();

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: updates }
  );

  return NextResponse.json({ success: true });
}
