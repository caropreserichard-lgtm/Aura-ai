import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google-calendar";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  // userId verified - user is authenticated
  void userId;

  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "Google Calendar no est\u00E1 configurado. Agrega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET a .env.local" },
        { status: 500 }
      );
    }

    const url = await getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Calendar auth error:", error);
    return NextResponse.json({ error: "Error al iniciar autenticaci\u00F3n" }, { status: 500 });
  }
}
