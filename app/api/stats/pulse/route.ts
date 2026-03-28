import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("rickyflow");

    // Get userId
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const userId = user._id.toString();

    const today = toLocalDateKey(new Date());

    // Get today's tasks
    const allTodayTasks = await db.collection("tasks").find({
      userId,
      dueDate: { $regex: `^${today}` },
    }).toArray();

    const tasksCompletedToday = allTodayTasks.filter(t => t.status === "done").length;
    const totalTasksToday = allTodayTasks.length;

    // Calculate streak
    let streakDays = 0;
    const checkDate = new Date();

    // Check if today counts (at least 3 completed)
    if (tasksCompletedToday >= 3) {
      streakDays = 1;
    } else if (tasksCompletedToday >= 1) {
      // Grace day — counts but weak
      streakDays = 1;
    }

    // Check previous days
    for (let i = 1; i <= 365; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const dateKey = toLocalDateKey(checkDate);

      const dayTasks = await db.collection("tasks").find({
        userId,
        dueDate: { $regex: `^${dateKey}` },
        status: "done",
      }).toArray();

      if (dayTasks.length >= 3) {
        streakDays++;
      } else if (dayTasks.length >= 1) {
        // Grace — don't break streak but it's a weak day
        streakDays++;
      } else {
        // 0 tasks completed — streak breaks
        break;
      }
    }

    // Save daily log
    await db.collection("dailyLogs").updateOne(
      { userId, date: today },
      {
        $set: {
          userId,
          date: today,
          tasksCompleted: tasksCompletedToday,
          totalTasks: totalTasksToday,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      tasksCompletedToday,
      totalTasksToday,
      streakDays,
    });
  } catch (error) {
    console.error("Pulse stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
