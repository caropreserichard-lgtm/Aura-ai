import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { classifyVaultUrlsBulk } from "@/lib/claude";
import { detectPlatform, extractUrls, normalizeUrlForDedupe } from "@/lib/vault-helpers";

// ── Increase Vercel serverless timeout: scraping + Claude + Mongo > 10 s ─────
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST body: { text: string, mode?: "ai" | "og" }
 *
 *  mode "ai"  (default) — OG scrape + Claude Haiku classify, 1 AI credit total.
 *  mode "og"            — OG scrape only, no AI. Saves items with category "Otro".
 *
 * Response: { created: VaultItem[], skipped: { url, reason }[], aiError?: string }
 */
async function quickScrape(url: string): Promise<{ title: string; description: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TayronaBot/1.0)" },
      signal: AbortSignal.timeout(4000),
      redirect: "follow",
    });
    const html = await res.text();
    // Try double-quote variants first, then single-quote
    const ogTitle =
      html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)?.[1] ||
      html.match(/<meta[^>]+property='og:title'[^>]+content='([^']+)'/i)?.[1] ||
      html.match(/<meta[^>]+content='([^']+)'[^>]+property='og:title'/i)?.[1];
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const title = (ogTitle || titleTag || "").trim().replace(/\s+/g, " ").slice(0, 200);

    const ogDesc =
      html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i)?.[1] ||
      html.match(/<meta[^>]+property='og:description'[^>]+content='([^']+)'/i)?.[1] ||
      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i)?.[1];
    const description = (ogDesc || "").trim().replace(/\s+/g, " ").slice(0, 300);

    return { title, description };
  } catch {
    return { title: "", description: "" };
  }
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const body = await req.json();
    const { text, mode = "ai" } = body as { text?: string; mode?: "ai" | "og" };

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
    }

    const urls = extractUrls(text);
    if (urls.length === 0) {
      return NextResponse.json({ error: "No se encontraron URLs en el texto" }, { status: 400 });
    }
    if (urls.length > 60) {
      return NextResponse.json({ error: "Máximo 60 URLs por lote" }, { status: 400 });
    }

    const db = await getDb();

    // ── Dedupe against DB and within batch ────────────────────────────────
    const existing = await db
      .collection("knowledge_vault")
      .find({ userId })
      .project({ url: 1 })
      .toArray();
    const existingNorms = new Set(existing.map((d) => normalizeUrlForDedupe(d.url)));

    const skipped: { url: string; reason: "duplicate" }[] = [];
    const seenInBatch = new Set<string>();
    const fresh: string[] = [];
    for (const u of urls) {
      const norm = normalizeUrlForDedupe(u);
      if (existingNorms.has(norm) || seenInBatch.has(norm)) {
        skipped.push({ url: u, reason: "duplicate" });
        continue;
      }
      seenInBatch.add(norm);
      fresh.push(u);
    }

    if (fresh.length === 0) {
      return NextResponse.json({ created: [], skipped });
    }

    // ── Scrape OG in parallel ─────────────────────────────────────────────
    const scraped = await Promise.all(fresh.map((u) => quickScrape(u)));

    let classified: { category: string; summary: string; title: string }[];
    let aiError: string | undefined;

    if (mode === "ai") {
      // ── Load existing categories for reuse ──────────────────────────────
      const cats = await db.collection("knowledge_vault").distinct("category", { userId });
      const existingCategories = (cats as string[]).filter(Boolean).slice(0, 30);

      // ── Single Haiku call for the whole batch ───────────────────────────
      classified = await classifyVaultUrlsBulk(
        fresh.map((u, i) => ({ url: u, title: scraped[i].title, description: scraped[i].description })),
        existingCategories
      );

      // Detect if AI fallback was triggered (all categories "Otro" + no summaries)
      const allOtro = classified.every((c) => c.category === "Otro" && !c.summary);
      if (allOtro && classified.length > 1) {
        aiError = "La IA no pudo clasificar automáticamente. Categoría asignada: 'Otro'.";
      }
    } else {
      // OG-only mode: no AI, just use scraped data
      classified = fresh.map((u, i) => ({
        title: scraped[i].title || u,
        category: "Otro",
        summary: "",
      }));
    }

    // ── Insert all ────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const docs = fresh.map((url, i) => ({
      userId,
      url,
      title: classified[i].title || scraped[i].title || url,
      category: classified[i].category || "Otro",
      summary: classified[i].summary || "",
      insight: classified[i].summary || "",
      platform: detectPlatform(url),
      status: "unread" as const,
      idea: "",
      created_at: now,
    }));

    const ins = await db.collection("knowledge_vault").insertMany(docs);
    const created = docs.map((d, i) => ({ ...d, _id: ins.insertedIds[i] }));

    return NextResponse.json({ created, skipped, aiError });
  } catch (error) {
    console.error("POST /api/vault/bulk error:", error);
    return NextResponse.json({ error: "Error al procesar el lote" }, { status: 500 });
  }
}
