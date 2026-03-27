import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();

    if (action === "add_task") {
      const taskId = new ObjectId().toString();
      const task = { id: taskId, title: body.title, description: "", done: false, labels: [], checklist: [], comments: [], links: body.links || [], createdAt: now };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $push: { tasks: task } as any, $set: { updatedAt: now } });
      return NextResponse.json(task);
    }

    if (action === "update_task") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const allowed = ["title", "description", "labels", "dueDate", "done"];
      const tasks = (project.tasks || []).map((t: { id: string }) => {
        if (t.id === body.taskId) {
          const updated = { ...t };
          for (const f of allowed) {
            if (body[f] !== undefined) (updated as Record<string, unknown>)[f] = body[f];
          }
          return updated;
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "move_task") {
      const { taskId, toProjectId, position } = body;
      const fromProject = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!fromProject) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const task = (fromProject.tasks || []).find((t: { id: string }) => t.id === taskId);
      if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      // Remove from source
      await db.collection("projects").updateOne(
        { _id: new ObjectId(id), userId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { $pull: { tasks: { id: taskId } } as any, $set: { updatedAt: now } }
      );
      // Add to destination
      const toProject = await db.collection("projects").findOne({ _id: new ObjectId(toProjectId), userId });
      if (!toProject) return NextResponse.json({ error: "Dest not found" }, { status: 404 });
      const destTasks = [...(toProject.tasks || [])];
      const pos = position !== undefined ? position : destTasks.length;
      destTasks.splice(pos, 0, task);
      await db.collection("projects").updateOne({ _id: new ObjectId(toProjectId), userId }, { $set: { tasks: destTasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "add_checklist_item") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const itemId = new ObjectId().toString();
      const tasks = (project.tasks || []).map((t: { id: string; checklist?: unknown[] }) => {
        if (t.id === body.taskId) {
          return { ...t, checklist: [...(t.checklist || []), { id: itemId, text: body.text, done: false }] };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ id: itemId });
    }

    if (action === "toggle_checklist_item") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = (project.tasks || []).map((t: { id: string; checklist?: { id: string; done: boolean }[] }) => {
        if (t.id === body.taskId) {
          return { ...t, checklist: (t.checklist || []).map((c) => c.id === body.itemId ? { ...c, done: !c.done } : c) };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_checklist_item") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = (project.tasks || []).map((t: { id: string; checklist?: { id: string }[] }) => {
        if (t.id === body.taskId) {
          return { ...t, checklist: (t.checklist || []).filter((c) => c.id !== body.itemId) };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "reorder_tasks") {
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { tasks: body.tasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "toggle_task") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = (project.tasks || []).map((t: { id: string; done: boolean; completedAt?: string }) => {
        if (t.id === body.taskId) {
          const newDone = !t.done;
          return { ...t, done: newDone, completedAt: newDone ? now : undefined };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_task") {
      await db.collection("projects").updateOne(
        { _id: new ObjectId(id), userId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { $pull: { tasks: { id: body.taskId } } as any, $set: { updatedAt: now } }
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "add_comment") {
      const commentId = new ObjectId().toString();
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = (project.tasks || []).map((t: { id: string; comments: unknown[] }) => {
        if (t.id === body.taskId) {
          return { ...t, comments: [...t.comments, { id: commentId, text: body.text, createdAt: now }] };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ id: commentId });
    }

    if (action === "add_link") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = (project.tasks || []).map((t: { id: string; links: string[] }) => {
        if (t.id === body.taskId) {
          return { ...t, links: [...(t.links || []), body.link] };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "remove_link") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = (project.tasks || []).map((t: { id: string; links: string[] }) => {
        if (t.id === body.taskId) {
          return { ...t, links: (t.links || []).filter((_: string, i: number) => i !== body.linkIndex) };
        }
        return t;
      });
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { tasks, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "archive") {
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { archived: true, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "unarchive") {
      await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: { archived: false, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }

    if (action === "archive_all_cards") {
      // Move all tasks to a special "archived" state — we clear them but store in archivedTasks
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await db.collection("projects").updateOne(
        { _id: new ObjectId(id), userId },
        { $set: { tasks: [], archivedTasks: [...(project.archivedTasks || []), ...(project.tasks || [])], updatedAt: now } }
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "copy_list") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(id), userId });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const copy = {
        userId,
        name: `${project.name} (Copy)`,
        description: project.description,
        color: project.color,
        labels: project.labels || [],
        tasks: (project.tasks || []).map((t: { id: string }) => ({ ...t, id: new ObjectId().toString() })),
        archived: false,
        order: (project.order ?? 0) + 1,
        createdAt: now,
        updatedAt: now,
      };
      const result = await db.collection("projects").insertOne(copy);
      return NextResponse.json({ ...copy, _id: result.insertedId });
    }

    // Generic update (name, description, color, labels)
    const allowed = ["name", "description", "color", "labels"];
    const updates: Record<string, unknown> = { updatedAt: now };
    for (const f of allowed) {
      if (body[f] !== undefined) updates[f] = body[f];
    }
    await db.collection("projects").updateOne({ _id: new ObjectId(id), userId }, { $set: updates });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const now = new Date().toISOString();
    // Soft delete — archive instead of permanent delete
    await db.collection("projects").updateOne(
      { _id: new ObjectId(id), userId },
      { $set: { archived: true, deletedAt: now, updatedAt: now } }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
