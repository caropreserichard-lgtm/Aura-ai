import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-helpers";
import { classifyVaultUrl } from "@/lib/claude";

async function scrapeUrlMeta(url: string): Promise<{ title: string; description: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TayronaBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    // Extract title
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const title = (ogTitle || titleTag || url).trim().replace(/\s+/g, " ").slice(0, 200);

    // Extract description
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1];
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1];
    const description = (ogDesc || metaDesc || "").trim().replace(/\s+/g, " ").slice(0, 400);

    return { title, description };
  } catch {
    // Fallback: extract readable title from URL
    try {
      const u = new URL(url);
      const slug = u.pathname.split("/").filter(Boolean).pop() || u.hostname;
      const title = slug.replace(/[-_]/g, " ").replace(/\.\w+$/, "");
      return { title, description: "" };
    } catch {
      return { title: url, description: "" };
    }
  }
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  void userId;

  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });

    const { title, description } = await scrapeUrlMeta(url);
    const { category, insight } = await classifyVaultUrl(url, title, description);

    return NextResponse.json({ title, category, insight });
  } catch (error) {
    console.error("POST /api/vault/classify error:", error);
    return NextResponse.json({ error: "Error al clasificar la URL" }, { status: 500 });
  }
}
