import { NextRequest, NextResponse } from "next/server";
import { parseInboxText } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { rawText } = await req.json();

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "Texto vacío" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada en .env.local" },
        { status: 500 }
      );
    }

    const items = await parseInboxText(rawText.trim());

    return NextResponse.json({ items });
  } catch (error) {
    console.error("POST /api/inbox error:", error);
    const message = error instanceof Error ? error.message : "Error al procesar inbox";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
