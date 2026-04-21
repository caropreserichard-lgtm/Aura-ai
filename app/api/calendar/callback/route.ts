import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, saveTokens } from "@/lib/google-calendar";
import { requireUserId } from "@/lib/auth-helpers";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.redirect(new URL("/login", request.url)); }

  try {
    const code = request.nextUrl.searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(new URL("/profile?tab=general&error=no_code", request.url));
    }

    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/profile?tab=general&error=no_tokens", request.url)
      );
    }

    // Get user email
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: tokens.access_token });
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || "unknown";

    await saveTokens(
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date || Date.now() + 3600 * 1000,
      email,
      userId
    );

    return NextResponse.redirect(
      new URL("/profile?tab=general&success=connected", request.url)
    );
  } catch (error) {
    console.error("Calendar callback error:", error);
    return NextResponse.redirect(
      new URL("/profile?tab=general&error=auth_failed", request.url)
    );
  }
}
