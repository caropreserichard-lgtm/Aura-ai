// Helpers compartidos por el módulo La Bóveda (servidor + cliente).

export type VaultPlatform =
  | "X"
  | "YouTube"
  | "GitHub"
  | "Reddit"
  | "Medium"
  | "Substack"
  | "TikTok"
  | "Instagram"
  | "LinkedIn"
  | "Notion"
  | "Telegram"
  | "Discord"
  | "Spotify"
  | "Vercel"
  | "ProductHunt"
  | "HackerNews"
  | "Dev.to"
  | "Web";

/** Detect a known platform from a URL. Falls back to "Web". */
export function detectPlatform(url: string): VaultPlatform {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return "Web"; }

  // Twitter / X
  if (host === "x.com" || host === "twitter.com" || host.endsWith(".x.com") || host.endsWith(".twitter.com")) return "X";
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return "YouTube";
  if (host === "github.com" || host === "gist.github.com") return "GitHub";
  if (host === "reddit.com" || host.endsWith(".reddit.com")) return "Reddit";
  if (host === "medium.com" || host.endsWith(".medium.com")) return "Medium";
  if (host === "substack.com" || host.endsWith(".substack.com")) return "Substack";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "TikTok";
  if (host === "instagram.com") return "Instagram";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "LinkedIn";
  if (host === "notion.so" || host.endsWith(".notion.so") || host === "notion.site" || host.endsWith(".notion.site")) return "Notion";
  if (host === "t.me" || host === "telegram.me") return "Telegram";
  if (host === "discord.com" || host === "discord.gg") return "Discord";
  if (host === "spotify.com" || host === "open.spotify.com") return "Spotify";
  if (host === "vercel.com" || host.endsWith(".vercel.app")) return "Vercel";
  if (host === "producthunt.com") return "ProductHunt";
  if (host === "news.ycombinator.com" || host === "ycombinator.com") return "HackerNews";
  if (host === "dev.to") return "Dev.to";

  return "Web";
}

/** Color/theme for each platform tag (used in UI). */
export const PLATFORM_THEME: Record<VaultPlatform, { bg: string; color: string; border: string }> = {
  X:           { bg: "rgba(255,255,255,0.06)", color: "#e5e5e5", border: "rgba(255,255,255,0.18)" },
  YouTube:     { bg: "rgba(239,68,68,0.12)",   color: "#f87171", border: "rgba(239,68,68,0.28)" },
  GitHub:      { bg: "rgba(168,162,158,0.10)", color: "#d6d3d1", border: "rgba(168,162,158,0.22)" },
  Reddit:      { bg: "rgba(249,115,22,0.12)",  color: "#fb923c", border: "rgba(249,115,22,0.28)" },
  Medium:      { bg: "rgba(16,185,129,0.10)",  color: "#34d399", border: "rgba(16,185,129,0.24)" },
  Substack:    { bg: "rgba(251,146,60,0.12)",  color: "#fdba74", border: "rgba(251,146,60,0.28)" },
  TikTok:      { bg: "rgba(236,72,153,0.12)",  color: "#f472b6", border: "rgba(236,72,153,0.28)" },
  Instagram:   { bg: "rgba(217,70,239,0.12)",  color: "#e879f9", border: "rgba(217,70,239,0.28)" },
  LinkedIn:    { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa", border: "rgba(59,130,246,0.28)" },
  Notion:      { bg: "rgba(229,231,235,0.10)", color: "#e5e7eb", border: "rgba(229,231,235,0.22)" },
  Telegram:    { bg: "rgba(56,178,255,0.12)",  color: "#7dd3fc", border: "rgba(56,178,255,0.28)" },
  Discord:     { bg: "rgba(99,102,241,0.12)",  color: "#a5b4fc", border: "rgba(99,102,241,0.28)" },
  Spotify:     { bg: "rgba(34,197,94,0.12)",   color: "#4ade80", border: "rgba(34,197,94,0.28)" },
  Vercel:      { bg: "rgba(255,255,255,0.06)", color: "#e5e5e5", border: "rgba(255,255,255,0.20)" },
  ProductHunt: { bg: "rgba(249,115,22,0.12)",  color: "#fb923c", border: "rgba(249,115,22,0.28)" },
  HackerNews:  { bg: "rgba(249,115,22,0.10)",  color: "#fdba74", border: "rgba(249,115,22,0.24)" },
  "Dev.to":    { bg: "rgba(229,231,235,0.10)", color: "#e5e7eb", border: "rgba(229,231,235,0.22)" },
  Web:         { bg: "rgba(231,202,121,0.10)", color: "#e7ca79", border: "rgba(231,202,121,0.24)" },
};

/** Extract bare URLs from a free-form text blob (one per line is fine, mixed text too). */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const re = /https?:\/\/[^\s<>"')]+/gi;
  const matches = text.match(re) || [];
  // Trim trailing punctuation
  const cleaned = matches.map((u) => u.replace(/[),.;:!?]+$/, ""));
  // Dedupe preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of cleaned) {
    if (!seen.has(u)) { seen.add(u); out.push(u); }
  }
  return out;
}

/**
 * Scrape OG metadata from a URL with a fallback chain of User-Agents.
 * x.com, Instagram, LinkedIn etc. only serve rich OG meta to recognized
 * social-media bots. We try `facebookexternalhit` first (most permissive
 * across sites), then Twitterbot, then a generic browser UA.
 *
 * Returns whatever we find — empty strings if every attempt fails.
 */
export async function scrapeOgMeta(url: string, perTryTimeoutMs = 4500): Promise<{ title: string; description: string; image: string }> {
  const userAgents = [
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Mozilla/5.0 (compatible; Twitterbot/1.0)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0 Safari/537.36",
  ];

  let bestTitle = "";
  let bestDesc = "";
  let bestImage = "";

  for (const ua of userAgents) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
        },
        signal: AbortSignal.timeout(perTryTimeoutMs),
        redirect: "follow",
      });
      if (!res.ok) continue;
      const html = await res.text();

      // Title — try og:title, twitter:title, then <title>
      const ogTitle =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1] ||
        html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
      const title = decodeHtmlEntities((ogTitle || titleTag || "").trim().replace(/\s+/g, " ")).slice(0, 200);

      // Description — try og:description, twitter:description, meta description
      const ogDesc =
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1] ||
        html.match(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
      const description = decodeHtmlEntities((ogDesc || "").trim().replace(/\s+/g, " ")).slice(0, 400);

      // Image (optional, we don't use it yet but might in future)
      const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || "";

      // Keep best result so far (longer description wins)
      if (title && (!bestTitle || title.length > bestTitle.length)) bestTitle = title;
      if (description && description.length > bestDesc.length) bestDesc = description;
      if (ogImage && !bestImage) bestImage = ogImage;

      // If we got both title AND description with this UA, stop trying — done.
      if (bestTitle && bestDesc) break;
    } catch { /* try next UA */ }
  }

  return { title: bestTitle, description: bestDesc, image: bestImage };
}

/** Decode common HTML entities (&amp; &lt; &gt; &quot; &#x27; numeric refs). */
export function decodeHtmlEntities(s: string): string {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/** Normalize a URL for duplicate detection (strip hash, www, trailing slash, common tracking params). */
export function normalizeUrlForDedupe(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    const drop = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid","gclid","ref","ref_src","si"];
    drop.forEach((p) => u.searchParams.delete(p));
    let s = `${u.hostname.replace(/^www\./, "")}${u.pathname}${u.search}`;
    s = s.replace(/\/+$/, "");
    return s.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
