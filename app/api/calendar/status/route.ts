import { NextResponse } from "next/server";
import { getStoredTokens, deleteTokens } from "@/lib/google-calendar";

export async function GET() {
  try {
    const tokens = await getStoredTokens();
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
  try {
    await deleteTokens();
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error("Calendar disconnect error:", error);
    return NextResponse.json(
      { error: "Error al desconectar" },
      { status: 500 }
    );
  }
}
