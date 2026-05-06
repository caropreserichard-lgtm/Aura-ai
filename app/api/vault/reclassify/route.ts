import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { classifyVaultUrl } from "@/lib/claude";
import { scrapeOgMeta, detectPlatform } from "@/lib/vault-helpers";
import { ObjectId } from "mongodb";

function slugToTitle(url: string): string {
  try {
    const u = new URL(url);
    const slug = u.pathname.split("/").filter(Boolean).pop() || "";
    if (!slug || slug.length < 3) return u.hostname.replace(/^www\./, "");
    return slug.replace(/[-_]/g, " ").replace(/\.\w{2,5}$/, "").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
  } catch { return ""; }
}

export const maxDuration = 90;
export const dynamic = "force-dynamic";

/**
 * POST body: { ids?: string[], force?: boolean }
 *
 *  - ids:   if provided, reclassify only those items.
 *           if omitted, reclassify all items in the user's vault.
 *  - force: if true, re-run even items that already have a non-Otro
 *           category and a summary. Default false → only items missing
 *           summary or with category "Otro".
 *
 * Re-scrapes each URL with the rich UA fallback chain, runs the AI
 * classify, and updates title / category / summary / platform.
 *
 * Response: { updated: number, skipped: number, total: number }
 */
export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const body = await req.json().catch(() => ({}));
    const { ids, force = false } = body as { ids?: string[]; force?: boolean };

    const db = await getDb();
    const filter: Record<string, unknown> = { userId };
    if (Array.isArray(ids) && ids.length > 0) {
      filter._id = { $in: ids.map((id) => new ObjectId(id)) };
    }

    const items = await db.collection("knowledge_vault").find(filter).toArray();

    if (items.length === 0) {
      return NextResponse.json({ updated: 0, skipped: 0, total: 0 });
    }
    if (items.length > 60) {
      return NextResponse.json({ error: "Máximo 60 items por reclasificación. Selecciona menos." }, { status: 400 });
    }

    // Filter to items that need reclassification
    const toProcess = force
      ? items
      : items.filter((it) => !it.summary || it.category === "Otro" || it.category === "Sin Clasificar" || !it.category);

    let updated = 0;
    const knownCats = new Set<string>(items.map((it) => it.category).filter(Boolean) as string[]);

    // Process with concurrency 2 — same as bulk
    const CONCURRENCY = 2;
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const chunk = toProcess.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (it) => {
        try {
          const scraped = await scrapeOgMeta(it.url, 4500);
          const rawTitle = scraped.title || it.title || slugToTitle(it.url) || it.url;
          const rawDesc = scraped.description || "";
          // X.com: og:title = "Name on X" (metadata). Use og:description (real content) as title.
          const isXUrl = /(?:x|twitter)\.com\//i.test(it.url || "");
          const titleIsXMeta = /^.{1,100}\s+on X$/i.test(rawTitle);
          const finalTitle = (isXUrl && titleIsXMeta && rawDesc.length > 20)
            ? rawDesc.slice(0, 160).replace(/\s+/g, " ").trim()
            : rawTitle;
          const { category, summary } = await classifyVaultUrl(
            it.url,
            finalTitle,
            rawDesc,
            Array.from(knownCats)
          );
          knownCats.add(category);

          await db.collection("knowledge_vault").updateOne(
            { _id: it._id, userId },
            {
              $set: {
                title: finalTitle,
                category,
                summary,
                insight: summary,
                platform: it.platform || detectPlatform(it.url),
              },
            }
          );
          updated++;
        } catch (err) {
          console.error("[reclassify] item", String(it._id), "failed:", String(err));
        }
      }));
    }

    return NextResponse.json({
      updated,
      skipped: items.length - toProcess.length,
      total: items.length,
    });
  } catch (error) {
    console.error("POST /api/vault/reclassify error:", error);
    return NextResponse.json({ error: "Error al reclasificar" }, { status: 500 });
  }
}
