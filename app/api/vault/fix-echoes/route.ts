import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { scrapeOgMeta } from "@/lib/vault-helpers";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// ── Deterministic helpers (zero AI credits) ───────────────────────────────────

function isEcho(title: string, summary: string): boolean {
  if (!title || !summary) return true; // empty summary counts as broken
  const t = title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
  const s = summary.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
  return t === s || s.startsWith(t.slice(0, 40)) || t.startsWith(s.slice(0, 40));
}

function slugToTitle(url: string): string {
  try {
    const u = new URL(url);
    const slug = u.pathname.split("/").filter(Boolean).pop() || "";
    if (!slug || slug.length < 3) return u.hostname.replace(/^www\./, "");
    return slug
      .replace(/[-_]/g, " ")
      .replace(/\.\w{2,5}$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch { return ""; }
}

function xHandleFix(handle: string): { category: string; summary: string } {
  const h = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (/^(0x|xbt|btc|eth|sol|sui|degen|defi|mev|nft|onchain|alpha|hodl|pump|chain|web3|token|dao)/i.test(h))
    return { category: "Crypto Strategy", summary: `Cuenta X de trader/analista crypto @${handle} — guardada para seguimiento.` };
  if (/(bot|quant|algo|mev|arb|code|dev|hack|build|eng|builder)/i.test(h))
    return { category: "Crypto Algorithm", summary: `Cuenta X de dev/quant @${handle} — perfil técnico en crypto o desarrollo.` };
  if (/(ai|gpt|llm|ml|prompt|copilot|cursor|claude|openai|agent|model)/i.test(h))
    return { category: "AI Tools", summary: `Cuenta X de creador o researcher de IA @${handle}.` };
  if (/(market|brand|copy|seo|content|social|grow|ads|viral)/i.test(h))
    return { category: "Marketing", summary: `Cuenta X de marketer/creator @${handle} — útil para marca personal.` };
  if (/(ceo|cto|founder|saas|startup|vc|invest|capital|fund|angel)/i.test(h))
    return { category: "Business Growth", summary: `Cuenta X de founder/investor @${handle} — estrategias de negocio.` };
  return { category: "X Profiles", summary: `Cuenta X @${handle} — guardada para seguimiento, sin bio pública disponible.` };
}

/**
 * POST /api/vault/fix-echoes
 *
 * Scans the user's vault for items where the summary is empty or is an echo
 * of the title (i.e. the bug where we saved the page title as the summary).
 *
 * Fixes them deterministically — ZERO AI credits:
 *  - X.com profiles → handle-pattern inference
 *  - Other URLs     → re-scrape OG description; fall back to slug-based summary
 *
 * Returns { fixed: number, total: number }
 */
export async function POST() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();
    const all = await db.collection("knowledge_vault").find({ userId }).toArray();

    const broken = all.filter((it) => isEcho(it.title || "", it.summary || ""));
    if (broken.length === 0) return NextResponse.json({ fixed: 0, total: all.length });

    let fixed = 0;

    for (const it of broken) {
      try {
        const url: string = it.url || "";
        let host = "";
        try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { /**/ }

        const isXProfile = (host === "x.com" || host === "twitter.com") &&
          !url.includes("/status/") && !url.includes("/i/");

        let newCategory: string = it.category || "Sin Clasificar";
        let newSummary = "";
        let newTitle: string = it.title || "";

        if (isXProfile) {
          const handle = (url.match(/(?:x|twitter)\.com\/([^/?#]+)/i)?.[1] || "").split("?")[0];
          const fix = xHandleFix(handle);
          newCategory = fix.category;
          newSummary = fix.summary;
        } else {
          // Try to re-scrape and get real OG description
          const scraped = await scrapeOgMeta(url, 3500);
          if (scraped.title && scraped.title !== it.title) newTitle = scraped.title;
          if (scraped.description && !isEcho(newTitle, scraped.description)) {
            newSummary = scraped.description.slice(0, 200);
          } else {
            // Slug fallback: at least give a readable summary from the URL
            const slug = slugToTitle(url);
            newSummary = slug
              ? `${host} — ${slug}`
              : `Enlace guardado desde ${host || url}`;
          }
        }

        await db.collection("knowledge_vault").updateOne(
          { _id: it._id, userId },
          { $set: { title: newTitle, summary: newSummary, insight: newSummary, category: newCategory } }
        );
        fixed++;
      } catch { /* skip single item failure, continue */ }
    }

    return NextResponse.json({ fixed, total: all.length });
  } catch (err) {
    console.error("[fix-echoes]", err);
    return NextResponse.json({ error: "Error al limpiar" }, { status: 500 });
  }
}
