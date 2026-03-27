import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";

/**
 * POST /api/migrate
 * One-time migration: claims all orphaned documents (without userId)
 * and assigns them to the currently authenticated user.
 */
export async function POST() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();

  // All collections that need userId migration
  const collections = [
    "tasks",
    "projects",
    "stats",
    "objectives",
    "subcategories",
    "tool_categories",
    "calendar_tokens",
  ];

  const results: Record<string, number> = {};

  for (const col of collections) {
    try {
      const result = await db.collection(col).updateMany(
        { userId: { $exists: false } }, // documents without userId
        { $set: { userId } }
      );
      results[col] = result.modifiedCount;
    } catch (e) {
      console.error(`Migration error for ${col}:`, e);
      results[col] = -1; // error
    }
  }

  // Also migrate documents where userId is "default" (from old calendar system)
  try {
    const calResult = await db.collection("calendar_tokens").updateMany(
      { userId: "default" },
      { $set: { userId } }
    );
    results["calendar_tokens_default"] = calResult.modifiedCount;
  } catch {
    results["calendar_tokens_default"] = -1;
  }

  const totalMigrated = Object.values(results).filter(v => v > 0).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    success: true,
    message: `Migrated ${totalMigrated} documents to your account`,
    details: results,
  });
}
