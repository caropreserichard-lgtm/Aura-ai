import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import {
  getStoredTokens,
  createCalendarEvent,
} from "@/lib/google-calendar";
import type { Task } from "@/lib/types";

export async function POST() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const tokens = await getStoredTokens(userId);
    if (!tokens) {
      return NextResponse.json(
        { error: "Google Calendar no est\u00E1 conectado" },
        { status: 401 }
      );
    }

    const db = await getDb();
    const tasks = await db
      .collection("tasks")
      .find({
        userId,
        dueDate: { $exists: true, $ne: "" },
        calendarEventId: { $exists: false },
        status: { $ne: "done" },
      })
      .toArray();

    let synced = 0;
    const errors: string[] = [];

    for (const task of tasks) {
      try {
        const eventId = await createCalendarEvent(task as unknown as Task, userId);
        if (eventId) {
          await db
            .collection("tasks")
            .updateOne(
              { _id: new ObjectId(task._id), userId },
              { $set: { calendarEventId: eventId } }
            );
          synced++;
        }
      } catch (err) {
        errors.push(`Error sincronizando "${task.title}": ${err}`);
      }
    }

    return NextResponse.json({
      synced,
      total: tasks.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: "Error al sincronizar" },
      { status: 500 }
    );
  }
}
