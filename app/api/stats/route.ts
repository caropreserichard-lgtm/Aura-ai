import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getLevel } from "@/lib/scoring";

export async function GET() {
  try {
    const db = await getDb();

    // Get all stats to calculate total XP
    const allStats = await db.collection("stats").find().toArray();

    const totalXP = allStats.reduce((sum, s) => sum + (s.totalXP || 0), 0);
    const totalTasksCompleted = allStats.reduce(
      (sum, s) => sum + (s.tasksCompleted || 0),
      0
    );

    // Today's stats
    const today = new Date().toISOString().split("T")[0];
    const todayStats = allStats.find((s) => s.date === today);

    // Calculate streak
    let streak = 0;
    const sortedDates = allStats
      .filter((s) => s.tasksCompleted > 0)
      .map((s) => s.date)
      .sort()
      .reverse();

    if (sortedDates.length > 0) {
      const todayDate = new Date(today);
      let checkDate = todayDate;

      for (const dateStr of sortedDates) {
        const date = new Date(dateStr);
        const diffDays = Math.round(
          (checkDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays <= 1) {
          streak++;
          checkDate = date;
        } else {
          break;
        }
      }
    }

    // Today's tasks stats
    const todayTasks = await db
      .collection("tasks")
      .find({
        $or: [
          { status: { $in: ["pending", "in_progress"] } },
          { completedAt: { $regex: `^${today}` } },
        ],
      })
      .toArray();

    const todayDone = todayTasks.filter((t) => t.status === "done").length;
    const todayTotal = todayTasks.length;
    const todayProgress = todayTotal > 0 ? todayDone / todayTotal : 0;

    const totalTimeToday = todayTasks.reduce(
      (sum, t) => sum + (t.timeSpent || 0),
      0
    );

    const levelInfo = getLevel(totalXP);

    return NextResponse.json({
      totalXP,
      totalTasksCompleted,
      level: levelInfo.level,
      levelProgress: levelInfo.progress,
      xpInLevel: levelInfo.xpInLevel,
      xpToNext: levelInfo.xpToNext,
      streak,
      today: {
        xp: todayStats?.totalXP || 0,
        tasksCompleted: todayDone,
        totalTasks: todayTotal,
        progress: todayProgress,
        timeSpent: totalTimeToday,
        tasksByCategory: todayStats?.tasksByCategory || {},
      },
    });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { error: "Error al obtener stats" },
      { status: 500 }
    );
  }
}
