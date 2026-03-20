import { NextResponse } from "next/server";
import { listUpcomingEvents, getStoredTokens } from "@/lib/google-calendar";

export async function GET() {
  try {
    const tokens = await getStoredTokens();
    if (!tokens) {
      return NextResponse.json({ connected: false, events: [] });
    }

    const events = await listUpcomingEvents(10);

    const formatted = events.map((e) => ({
      id: e.id,
      title: e.summary || "Sin t\u00EDtulo",
      start: e.start?.dateTime || e.start?.date || "",
      end: e.end?.dateTime || e.end?.date || "",
      isRickyFlow: e.summary?.startsWith("[RF]") || false,
    }));

    return NextResponse.json({ connected: true, events: formatted });
  } catch (error) {
    console.error("Calendar events error:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 }
    );
  }
}
