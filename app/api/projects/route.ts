import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const projects = await db.collection("projects").find().sort({ updatedAt: -1 }).toArray();
    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Error al obtener proyectos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const { name, description, color } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const project = {
      name: name.trim(),
      description: description?.trim() || "",
      color: color || "#3B82F6",
      tasks: [],
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
