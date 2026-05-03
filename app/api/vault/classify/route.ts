import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { classifyVaultUrl } from "@/lib/claude";
import { detectPlatform } from "@/lib/vault-helpers";

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

/**
 * POST body: { url: string, mode?: "og" | "ai" }
 *
 * Modes:
 *   - "og" (default, free): scrape Open Graph metadata only — no AI call.
 *     Returns { title, description, platform, mode: "og" }. User picks the
 *     category manually in the UI.
 *   - "ai" (uses Anthropic credits): full classify — scrapes OG, then calls
 *     Claude Haiku for { category, summary }. Returns
 *     { title, description, platform, category, summary, mode: "ai" }.
 */
export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const body = await req.json();
    const { url, mode = "og" } = body as { url?: string; mode?: "og" | "ai" };
    if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });

    const platform = detectPlatform(url);
    const { title, description } = await scrapeUrlMeta(url);

    if (mode === "og") {
      return NextResponse.json({ title, description, platform, mode: "og" });
    }

    // AI mode — load existing categories so the model reuses them when sensible.
    let existingCategories: string[] = [];
    try {
      const db = await getDb();
      const cats = await db
        .collection("knowledge_vault")
        .distinct("category", { userId });
      existingCategories = (cats as string[]).filter(Boolean).slice(0, 30);
    } catch {/* non-fatal */}

    const { category, summary } = await classifyVaultUrl(url, title, description, existingCategories);

    return NextResponse.json({ title, description, platform, category, summary, mode: "ai" });
  } catch (error) {
    console.error("POST /api/vault/classify error:", error);
    return NextResponse.json({ error: "Error al clasificar la URL" }, { status: 500 });
  }
}
