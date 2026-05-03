import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { classifyVaultUrlsBulk } from "@/lib/claude";
import { detectPlatform, extractUrls, normalizeUrlForDedupe } from "@/lib/vault-helpers";

/**
 * POST body: { text: string }
 *
 * Extrae todas las URLs del texto, scrapea OG en paralelo (con timeout corto),
 * llama a Claude Haiku UNA sola vez para clasificar el batch, y crea los items
 * en MongoDB. Skipea duplicados (mismo userId + url normalizada).
 *
 * Response: { created: VaultItem[], skipped: { url: string, reason: "duplicate" | "invalid" }[] }
 */
async function quickScrape(url: string): Promise<{ title: string; description: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TayronaBot/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const title = (ogTitle || titleTag || "").trim().replace(/\s+/g, " ").slice(0, 200);

    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1];
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1];
    const description = (ogDesc || metaDesc || "").trim().replace(/\s+/g, " ").slice(0, 300);

    return { title, description };
  } catch {
    return { title: "", description: "" };
  }
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const { text } = await req.json();
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

    // ── Scrape OG in parallel (with short per-URL timeout) ────────────────
    const scraped = await Promise.all(fresh.map((u) => quickScrape(u)));

    // ── Existing categories for reuse ─────────────────────────────────────
    const cats = await db.collection("knowledge_vault").distinct("category", { userId });
    const existingCategories = (cats as string[]).filter(Boolean).slice(0, 30);

    // ── Single Haiku call for the whole batch ─────────────────────────────
    const classified = await classifyVaultUrlsBulk(
      fresh.map((u, i) => ({ url: u, title: scraped[i].title, description: scraped[i].description })),
      existingCategories
    );

    // ── Insert all ────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const docs = fresh.map((url, i) => ({
      userId,
      url,
      title: classified[i].title || scraped[i].title || url,
      category: classified[i].category || "Otro",
      summary: classified[i].summary || "",
      insight: classified[i].summary || "", // legacy field for backward compat
      platform: detectPlatform(url),
      status: "unread" as const,
      idea: "",
      created_at: now,
    }));

    const ins = await db.collection("knowledge_vault").insertMany(docs);
    const created = docs.map((d, i) => ({ ...d, _id: ins.insertedIds[i] }));

    return NextResponse.json({ created, skipped });
  } catch (error) {
    console.error("POST /api/vault/bulk error:", error);
    return NextResponse.json({ error: "Error al procesar el lote" }, { status: 500 });
  }
}
