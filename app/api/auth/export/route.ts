import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { ObjectId } from "mongodb";

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const db = await getDb();

  const [user, tasks, projects, inbox, stats] = await Promise.all([
    db.collection("users").findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } }),
    db.collection("tasks").find({ userId }).toArray(),
    db.collection("projects").find({ userId }).toArray(),
    db.collection("inbox").find({ userId }).toArray(),
    db.collection("stats").find({ userId }).toArray(),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: user ? { fullName: user.fullName, email: user.email, empireName: user.empireName, createdAt: user.createdAt } : null,
    tasks,
    projects,
    inbox,
    stats,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="tayrona-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
