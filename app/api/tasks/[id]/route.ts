import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { calculateFlowScore, calculateXP } from "@/lib/scoring";
import { Category } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const { id } = await params;
    const body = await req.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inv\u00E1lido" }, { status: 400 });
    }

    // Handle addCompletion: log a recurring task as done for a specific date
    if (body.addCompletion) {
      const date = body.addCompletion as string;
      const task = await db.collection("tasks").findOne({ _id: new ObjectId(id), userId });
      if (task) {
        await db.collection("tasks").updateOne(
          { _id: new ObjectId(id), userId },
          { $addToSet: { completions: date } }
        );
        await db.collection("stats").updateOne(
          { date, userId },
          {
            $inc: {
              totalXP: task.xp,
              tasksCompleted: 1,
              [`tasksByCategory.${task.category}`]: 1,
            },
            $setOnInsert: { date, userId },
          },
          { upsert: true }
        );
      }
      const updated = await db.collection("tasks").findOne({ _id: new ObjectId(id), userId });
      return NextResponse.json(updated);
    }

    // Handle addSkipDate: skip a recurring task for a specific date
    if (body.addSkipDate) {
      await db.collection("tasks").updateOne(
        { _id: new ObjectId(id), userId },
        { $addToSet: { skips: body.addSkipDate } }
      );
      const updated = await db.collection("tasks").findOne({ _id: new ObjectId(id), userId });
      return NextResponse.json(updated);
    }

    // Handle setOverride: save a per-day override for a recurring task instance
    if (body.setOverride) {
      const { date, ...overrideData } = body.setOverride as { date: string; [key: string]: unknown };
      const setFields: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(overrideData)) {
        setFields[`overrides.${date}.${k}`] = v;
      }
      await db.collection("tasks").updateOne({ _id: new ObjectId(id), userId }, { $set: setFields });
      const updated = await db.collection("tasks").findOne({ _id: new ObjectId(id), userId });
      return NextResponse.json(updated);
    }

    // Handle removeOverride: clear a per-day override for a recurring task
    if (body.removeOverride) {
      const date = body.removeOverride as string;
      await db.collection("tasks").updateOne(
        { _id: new ObjectId(id), userId },
        { $unset: { [`overrides.${date}`]: "" } }
      );
      const updated = await db.collection("tasks").findOne({ _id: new ObjectId(id), userId });
      return NextResponse.json(updated);
    }

    const updates: Record<string, unknown> = {};

    // Handle field updates
    const allowedFields = [
      "title",
      "description",
      "category",
      "subcategory",
      "priority",
      "roi",
      "joy",
      "status",
      "startDate",
      "dueDate",
      "recurring",
      "tags",
      "subtasks",
      "sourceUrl",
      "estimatedTime",
      "attachments",
      "comments",
      "completions",
      "skips",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Recalculate flow score if roi or joy changed
    if (body.roi !== undefined || body.joy !== undefined) {
      const existing = await db
        .collection("tasks")
        .findOne({ _id: new ObjectId(id), userId });
      if (existing) {
        const roi = body.roi ?? existing.roi;
        const joy = body.joy ?? existing.joy;
        const category = (body.category ?? existing.category) as Category;
        updates.flowScore = calculateFlowScore(roi, joy);
        updates.xp = calculateXP(updates.flowScore as number, category);
      }
    }

    // Handle time accumulation
    if (body.addTime) {
      const existing = await db
        .collection("tasks")
        .findOne({ _id: new ObjectId(id), userId });
      updates.timeSpent = (existing?.timeSpent || 0) + body.addTime;
    }

    // Handle completion
    if (body.status === "done") {
      updates.completedAt = new Date().toISOString();

      // Update daily stats
      const task = await db
        .collection("tasks")
        .findOne({ _id: new ObjectId(id), userId });
      if (task) {
        const today = new Date().toISOString().split("T")[0];
        const xpToAdd = task.xp;

        await db.collection("stats").updateOne(
          { date: today, userId },
          {
            $inc: {
              totalXP: xpToAdd,
              tasksCompleted: 1,
              [`tasksByCategory.${task.category}`]: 1,
            },
            $setOnInsert: { date: today, userId },
          },
          { upsert: true }
        );

        // Create next instance if recurring
        if (task.recurring) {
          const nextTask = {
            ...task,
            _id: undefined,
            status: "pending",
            timeSpent: 0,
            completedAt: null,
            createdAt: new Date().toISOString(),
          };
          delete nextTask._id;
          await db.collection("tasks").insertOne(nextTask);
        }
      }
    }

    const result = await db
      .collection("tasks")
      .updateOne({ _id: new ObjectId(id), userId }, { $set: updates });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    const updated = await db
      .collection("tasks")
      .findOne({ _id: new ObjectId(id), userId });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar tarea" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inv\u00E1lido" }, { status: 400 });
    }

    const result = await db
      .collection("tasks")
      .deleteOne({ _id: new ObjectId(id), userId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar tarea" },
      { status: 500 }
    );
  }
}
