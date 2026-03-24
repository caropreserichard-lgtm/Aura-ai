import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const projects = await db.collection("projects").find().sort({ order: 1, createdAt: 1 }).toArray();
    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Error al obtener proyectos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    // Reorder all projects
    if (body.action === "reorder") {
      const { projectIds } = body;
      const bulkOps = projectIds.map((id: string, index: number) => ({
        updateOne: {
          filter: { _id: new (require("mongodb").ObjectId)(id) },
          update: { $set: { order: index } },
        },
      }));
      await db.collection("projects").bulkWrite(bulkOps);
      return NextResponse.json({ ok: true });
    }

    const { name, description, color } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    // Get next order
    const lastProject = await db.collection("projects").find().sort({ order: -1 }).limit(1).toArray();
    const nextOrder = lastProject.length > 0 ? (lastProject[0].order ?? 0) + 1 : 0;

    const now = new Date().toISOString();
    const project = {
      name: name.trim(),
      description: description?.trim() || "",
      color: color || "#3B82F6",
      tasks: [],
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection("projects").insertOne(project);
    return NextResponse.json({ ...project, _id: result.insertedId });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Error al crear proyecto" }, { status: 500 });
  }
}
