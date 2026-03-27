import { NextResponse } from "next/server";
import { getStoredTokens, deleteTokens } from "@/lib/google-calendar";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const tokens = await getStoredTokens(userId);
    if (!tokens) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected: true,
      email: tokens.email,
      connectedAt: tokens.connectedAt,
    });
  } catch (error) {
    console.error("Calendar status error:", error);
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    await deleteTokens(userId);
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error("Calendar disconnect error:", error);
    return NextResponse.json(
      { error: "Error al desconectar" },
      { status: 500 }
    );
  }
}
