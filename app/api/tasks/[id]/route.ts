import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { calculateFlowScore, calculateXP } from "@/lib/scoring";
import { Category } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const body = await req.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inv\u00E1lido" }, { status: 400 });
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
      "dueDate",
      "recurring",
      "tags",
      "subtasks",
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
        .findOne({ _id: new ObjectId(id) });
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
        .findOne({ _id: new ObjectId(id) });
      updates.timeSpent = (existing?.timeSpent || 0) + body.addTime;
    }

    // Handle completion
    if (body.status === "done") {
      updates.completedAt = new Date().toISOString();

      // Update daily stats
      const task = await db
        .collection("tasks")
        .findOne({ _id: new ObjectId(id) });
      if (task) {
        const today = new Date().toISOString().split("T")[0];
        const xpToAdd = task.xp;

        await db.collection("stats").updateOne(
          { date: today },
          {
            $inc: {
              totalXP: xpToAdd,
              tasksCompleted: 1,
              [`tasksByCategory.${task.category}`]: 1,
            },
            $setOnInsert: { date: today },
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
      .updateOne({ _id: new ObjectId(id) }, { $set: updates });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    const updated = await db
      .collection("tasks")
      .findOne({ _id: new ObjectId(id) });
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
  try {
    const db = await getDb();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inv\u00E1lido" }, { status: 400 });
    }

    const result = await db
      .collection("tasks")
      .deleteOne({ _id: new ObjectId(id) });

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
