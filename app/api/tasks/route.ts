import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { calculateFlowScore, calculateXP } from "@/lib/scoring";
import { Category, Priority } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const filter: Record<string, string> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const tasks = await db
      .collection("tasks")
      .find(filter)
      .sort({ priority: 1, flowScore: -1 })
      .toArray();

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Error al obtener tareas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    const {
      title,
      description,
      category,
      subcategory,
      priority,
      roi,
      joy,
      recurring,
      tags,
      dueDate,
      sourceUrl,
      subtasks,
    } = body;

    if (!title || !category || !subcategory || !priority || !roi || !joy) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const flowScore = calculateFlowScore(roi, joy);
    const xp = calculateXP(flowScore, category as Category);

    const task = {
      title,
      description: description || "",
      category: category as Category,
      subcategory,
      priority: priority as Priority,
      roi: Number(roi),
      joy: Number(joy),
      flowScore,
      xp,
      status: "pending" as const,
      timeSpent: 0,
      dueDate: dueDate || null,
      recurring: recurring || null,
      tags: tags || [],
      subtasks: subtasks || [],
      sourceUrl: sourceUrl || null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    const result = await db.collection("tasks").insertOne(task);

    return NextResponse.json(
      { ...task, _id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Error al crear tarea" },
      { status: 500 }
    );
  }
}
