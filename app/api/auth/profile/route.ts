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
    fullName: user.fullName || "",
    firstName: user.firstName || user.fullName?.split(" ")[0] || "",
    lastName: user.lastName || user.fullName?.split(" ").slice(1).join(" ") || "",
    email: user.email,
    empireName: user.empireName || "",
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt,
    preferences: {
      timezone: user.preferences?.timezone || "America/Bogota",
      timeFormat: user.preferences?.timeFormat || "12h",
      startOfWeek: user.preferences?.startOfWeek || "monday",
      language: user.preferences?.language || "es",
      countPlannedAsActual: user.preferences?.countPlannedAsActual || false,
    },
  });
}

export async function PATCH(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json();
  const db = await getDb();

  const updates: Record<string, unknown> = {};

  // Profile fields
  if (body.firstName !== undefined) updates.firstName = body.firstName.trim();
  if (body.lastName !== undefined) updates.lastName = body.lastName.trim();
  if (body.firstName !== undefined || body.lastName !== undefined) {
    const first = (body.firstName ?? "").trim();
    const last = (body.lastName ?? "").trim();
    updates.fullName = [first, last].filter(Boolean).join(" ");
  }
  if (body.fullName !== undefined) updates.fullName = body.fullName.trim();
  if (body.empireName !== undefined) updates.empireName = body.empireName.trim();
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;

  // Email change
  if (body.newEmail) {
    const emailClean = body.newEmail.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    const existing = await db.collection("users").findOne({ email: emailClean });
    if (existing && existing._id.toString() !== userId) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    updates.email = emailClean;
  }

  // Preferences
  if (body.preferences) {
    const prefs = body.preferences;
    if (prefs.timezone !== undefined) updates["preferences.timezone"] = prefs.timezone;
    if (prefs.timeFormat !== undefined) updates["preferences.timeFormat"] = prefs.timeFormat;
    if (prefs.startOfWeek !== undefined) updates["preferences.startOfWeek"] = prefs.startOfWeek;
    if (prefs.language !== undefined) updates["preferences.language"] = prefs.language;
    if (prefs.countPlannedAsActual !== undefined) updates["preferences.countPlannedAsActual"] = prefs.countPlannedAsActual;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: updates }
  );

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const db = await getDb();
  const oid = new ObjectId(userId);

  // Delete all user data
  await Promise.all([
    db.collection("users").deleteOne({ _id: oid }),
    db.collection("tasks").deleteMany({ userId }),
    db.collection("projects").deleteMany({ userId }),
    db.collection("inbox").deleteMany({ userId }),
    db.collection("stats").deleteMany({ userId }),
    db.collection("subcategories").deleteMany({ userId }),
    db.collection("calendar_tokens").deleteMany({ userId }),
  ]);

  return NextResponse.json({ success: true });
}
