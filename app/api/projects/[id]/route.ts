import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();

    if (action === "add_task") {
      const taskId = new ObjectId().toString();
      const task = { id: taskId, title: body.title, done: false, comments: [], links: body.links || [], createdAt: now };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.collection("projects").updateOne({ _id: new ObjectId(id) }, { $push: { tasks: task } as any, $set: { updatedAt: now } });
      return NextResponse.json(task);
    }

    if (action === "toggle_task") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = (project.tasks || []).map((t: { id: string; done: boolean; completedAt?: string }) => {
        if (t.id === body.taskId) {
          const newDone = !t.done;
          return { ...t, done: newDone, completedAt: newDone ? now : undefined };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id) }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_task") {
      await db.collection("projects").updateOne(
        { _id: new ObjectId(id) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { $pull: { tasks: { id: body.taskId } } as any, $set: { updatedAt: now } }
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "add_comment") {
      const commentId = new ObjectId().toString();
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = (project.tasks || []).map((t: { id: string; comments: unknown[] }) => {
        if (t.id === body.taskId) {
          return { ...t, comments: [...t.comments, { id: commentId, text: body.text, createdAt: now }] };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id) }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ id: commentId });
    }

    if (action === "add_link") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = (project.tasks || []).map((t: { id: string; links: string[] }) => {
        if (t.id === body.taskId) {
          return { ...t, links: [...(t.links || []), body.link] };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id) }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "remove_link") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = (project.tasks || []).map((t: { id: string; links: string[] }) => {
        if (t.id === body.taskId) {
          return { ...t, links: (t.links || []).filter((_: string, i: number) => i !== body.linkIndex) };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id) }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    // Generic update (name, description, color)
    const allowed = ["name", "description", "color"];
    const updates: Record<string, unknown> = { updatedAt: now };
    for (const f of allowed) {
      if (body[f] !== undefined) updates[f] = body[f];
    }
    await db.collection("projects").updateOne({ _id: new ObjectId(id) }, { $set: updates });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    await db.collection("projects").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
