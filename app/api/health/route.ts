import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({
      status: "ok",
      db: "connected",
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health] MongoDB ping failed:", err);
    return NextResponse.json({
      status: "error",
      db: "unreachable",
      error: String(err),
      ts: new Date().toISOString(),
    }, { status: 503 });
  }
}
