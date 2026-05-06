import Anthropic from "@anthropic-ai/sdk";
import { Category } from "./types";
import { getSubcategories } from "./subcategories";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(subcategories: Record<Category, string[]>): string {
  const subcatLines = Object.entries(subcategories)
    .map(([cat, subs]) => `   - ${cat}: ${subs.join(", ")}`)
    .join("\n");

  return `Eres un asistente de productividad experto en organizar brain dumps masivos. Analiza el texto y extrae CADA item individual (tarea, idea, link, nota).

Para CADA item:
1. Clasifícalo en una categoría: trabajo, aprendizaje, lifestyle, proyectos
2. Asigna una subcategoría de estas opciones:
${subcatLines}
3. Genera un título claro y accionable (máximo 60 caracteres)
4. Sugiere ROI (1-10) basado en potencial de generar dinero o progreso tangible
5. Sugiere Disfrute (1-10) basado en el tipo de actividad
6. Si hay un URL, extráelo

IMPORTANTE:
- Agrupa items duplicados o muy similares en uno solo
- Los threads/links de X (Twitter) que son referencias del mismo tema se pueden agrupar
- Las secciones con headers (emojis, números) te dan contexto de categorización
- Convierte cada bullet point en una tarea accionable
- NO omitas items — procesa TODO el texto

Responde SOLO con un JSON array válido. Sin markdown, sin backticks, sin texto antes o después del JSON.
Formato exacto:
[{"title":"string","category":"string","subcategory":"string","roi":number,"joy":number,"url":null}]
El campo "url" debe ser un string con la URL o null si no hay URL.

Contexto del usuario: Dueño de gastro bar/nightclub en Bucaramanga Colombia, desarrollador de apps con Next.js, trader de crypto/memecoins, estudiante autodidacta de historia y ciencia, creador de contenido.`;
}

const BATCH_SIZE = 50;

function splitIntoBatches(text: string): string[] {
  const lines = text.split("\n").filter((l) => l.trim());

  if (lines.length <= BATCH_SIZE) {
    return [text];
  }

  const batches: string[] = [];
  let currentBatch: string[] = [];
  let currentHeader = "";

  for (const line of lines) {
    if (/^[🚀🎬🪙🏪💊📚💬\d]+/.test(line.trim()) && line.includes(".")) {
      currentHeader = line;
    }

    currentBatch.push(line);

    if (currentBatch.length >= BATCH_SIZE) {
      const batchText = currentHeader && !currentBatch[0].includes(currentHeader)
        ? `[Contexto: ${currentHeader}]\n${currentBatch.join("\n")}`
        : currentBatch.join("\n");
      batches.push(batchText);
      currentBatch = [];
    }
  }

  if (currentBatch.length > 0) {
    const batchText = currentHeader && !currentBatch[0].includes(currentHeader)
      ? `[Contexto: ${currentHeader}]\n${currentBatch.join("\n")}`
      : currentBatch.join("\n");
    batches.push(batchText);
  }

  return batches;
}

function extractJsonArray(text: string): unknown[] {
  // Step 1: Strip markdown fences (```json ... ``` or ``` ... ```)
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

  // Step 2: Try direct parse first
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // continue to fallback strategies
  }

  // Step 3: Find the JSON array in the text using bracket matching
  const startIdx = cleaned.indexOf("[");
  if (startIdx !== -1) {
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < cleaned.length; i++) {
      if (cleaned[i] === "[") depth++;
      else if (cleaned[i] === "]") {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }

    if (endIdx !== -1) {
      const jsonStr = cleaned.substring(startIdx, endIdx + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Step 4: Try fixing common issues — trailing commas before ]
        const fixed = jsonStr
          .replace(/,\s*]/g, "]")
          .replace(/,\s*}/g, "}");
        try {
          const parsed = JSON.parse(fixed);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // continue
        }
      }
    }
  }

  throw new Error(
    "No se pudo parsear la respuesta de Claude. Intenta con menos texto o dividido en partes."
  );
}

async function parseBatch(
  batchText: string,
  systemPrompt: string,
  retries = 1
): Promise<unknown[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: batchText,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Respuesta inesperada de Claude");
  }

  try {
    return extractJsonArray(content.text);
  } catch (err) {
    if (retries > 0) {
      console.warn("Retry parseBatch after parse failure, retries left:", retries);
      return parseBatch(batchText, systemPrompt, retries - 1);
    }
    throw err;
  }
}

// ─── Vault classification ────────────────────────────────────────────────────

const VAULT_USER_CONTEXT = `Eres un asistente clasificador de links para un emprendedor colombiano de Bucaramanga: dueño de gastro bar/nightclub, crypto trader (memecoins, estrategias DeFi), dev de apps con Next.js usando AI, creador de contenido (marca personal), estudiante autodidacta de historia y ciencia.`;

/**
 * Smart fallback for X.com profiles when OG scraping returns no bio.
 * Uses the handle's character patterns for an educated guess — never
 * produces generic filler like "Founder/biz creator".
 */
function xHandleFallback(handle: string): { category: string; summary: string } {
  const h = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const cryptoPatterns = /^(0x|xbt|btc|eth|sol|sui|degen|defi|mev|nft|onchain|alpha|hodl|pump|apes|chart|trade|flip|chain|web3|token|dao|vault)/i;
  const algoPatterns = /(bot|quant|algo|mev|arb|script|code|dev|hack|build|eng|builder|tech)/i;
  const aiPatterns = /(ai|gpt|llm|ml|prompt|copilot|cursor|claude|openai|agent|model)/i;
  const mktPatterns = /(market|brand|copy|seo|content|social|grow|ads|hype|viral)/i;
  const founderPatterns = /(ceo|cto|founder|saas|startup|vc|invest|capital|fund|angel)/i;

  if (cryptoPatterns.test(h)) return { category: "Crypto Strategy", summary: `Cuenta X de trader/analista crypto @${handle} — sin bio pública, clasifica manualmente si lo conoces.` };
  if (algoPatterns.test(h)) return { category: "Crypto Algorithm", summary: `Cuenta X de dev/quant @${handle} — perfil técnico, verifica manualmente.` };
  if (aiPatterns.test(h)) return { category: "AI Tools", summary: `Cuenta X de creador/researcher de IA @${handle} — sin bio pública.` };
  if (mktPatterns.test(h)) return { category: "Marketing", summary: `Cuenta X de marketer/creator @${handle} — sin bio pública.` };
  if (founderPatterns.test(h)) return { category: "Business Growth", summary: `Cuenta X de founder/investor @${handle} — sin bio pública.` };
  return { category: "X Profiles", summary: `Cuenta X guardada: @${handle} — sin bio disponible, clasifica manualmente.` };
}

/** Convert a URL slug to a readable title. */
function slugToTitle(url: string): string {
  try {
    const u = new URL(url);
    const slug = u.pathname.split("/").filter(Boolean).pop() || "";
    if (!slug || slug.length < 3) return "";
    return slug
      .replace(/[-_]/g, " ")
      .replace(/\.\w{2,5}$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch { return ""; }
}

/** True when summary is just a repeat of the title — means AI gave up. */
function isSummaryEcho(title: string, summary: string): boolean {
  if (!title || !summary) return false;
  const t = title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60);
  const s = summary.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60);
  return t === s || s.startsWith(t) || t.startsWith(s);
}

export async function classifyVaultUrl(
  url: string,
  title: string,
  description: string,
  existingCategories: string[] = []
): Promise<{ category: string; summary: string }> {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { /**/ }

  const isXProfile = (host === "x.com" || host === "twitter.com") &&
    !url.includes("/status/") && !url.includes("/i/");
  const handle = isXProfile
    ? (url.match(/(?:x|twitter)\.com\/([^/?#]+)/i)?.[1] || "")
    : "";

  const hasRealContent = description && description.length > 20 &&
    !isSummaryEcho(title, description);

  // If it's an X profile with NO bio scraped, skip the AI call entirely
  // and use deterministic handle inference — it's faster and doesn't waste credits
  if (isXProfile && !hasRealContent) {
    return xHandleFallback(handle);
  }

  const existingCatList = existingCategories.length > 0
    ? `[Existing Categories]: ${existingCategories.join(", ")}`
    : "";

  const prompt = `${VAULT_USER_CONTEXT}

Classify this link with a SPECIFIC category and write a REAL summary based on the actual content.

=== LINK DATA ===
URL: ${url}
Title: ${title || "(no title)"}
Description: ${description}
${existingCatList ? existingCatList : ""}

=== RULES ===
1. ANALYZE CONTENT: Category must be based on what the content is actually about. Never categorize by platform alone.
2. SPECIFIC CATEGORIES: If niche (e.g., "GTA", "Claude AI", "SaaS Boilerplates", "Solana MEV"), use that exact niche as the category. NEVER use "General", "Varios", "Other", "Sin Clasificar".
3. CRYPTO DISTINCTION:
   - "Crypto Strategy" = market narratives, alpha, portfolio management, trading plans.
   - "Crypto Algorithm" = bots, MEV code, smart contract logic, quant math.
4. REUSE existing categories if content fits perfectly (>70% match). Create new ones for distinct topics.
5. SUMMARY: Must describe what this link ACTUALLY contains. Spanish, 8-18 words. Like a WhatsApp/Telegram link preview.
   NEVER echo or repeat the title. NEVER use: "insights útiles", "estrategias accionables", "cuenta interesante".
   BAD: summary="Nav Toor (@heynavtoor) on X"  ← this is just the title, forbidden.
   GOOD: summary="Artículo explica cómo los MEV bots extraen valor en Uniswap v3."
6. For articles/blog posts: summarize the core topic from the description.
7. For recipe/food sites: category="Cocina" or "Recetas", summary describes the dish.

Respond with ONLY valid JSON on one line — no markdown, no backticks:
{"category":"...","summary":"..."}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("non-text response");

    const cleaned = content.text.replace(/```(?:json)?\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    let category = (parsed.category || "").trim();
    let summary  = (parsed.summary || "").trim();

    // Reject echo: if AI returned the title as summary, discard it
    if (isSummaryEcho(title, summary)) summary = "";

    // Category sanity
    if (!category || ["otro", "other", "sin clasificar", "general", "varios"].includes(category.toLowerCase())) {
      category = isXProfile ? "X Profiles" : "Sin Clasificar";
    }

    // Summary last resort: domain + title, never just the title alone
    if (!summary) {
      summary = description
        ? description.slice(0, 120)
        : `${host || "Enlace"} — ${title ? title.slice(0, 80) : "sin descripción disponible"}`;
    }

    return { category, summary };
  } catch (err) {
    console.error("[classifyVaultUrl] AI error:", String(err));
    // On complete failure: use handle fallback for X, domain info for rest
    if (isXProfile && handle) return xHandleFallback(handle);
    const domain = host || url;
    const fallbackTitle = title && !isSummaryEcho(title, url) ? title : slugToTitle(url);
    return {
      category: "Sin Clasificar",
      summary: fallbackTitle
        ? `${domain} — ${fallbackTitle.slice(0, 100)}`
        : `Link guardado desde ${domain}`,
    };
  }
}

/**
 * Bulk classification — runs N parallel single-URL classify calls (concurrency 4).
 *
 * Why parallel singles instead of one big batch call?
 *   - Single-URL classify is proven to work (we ship it as the chatbox path).
 *   - One bad URL doesn't poison the whole batch.
 *   - JSON parsing of a single object is far more reliable than a 60-item array.
 *   - Latency stays bounded by Promise.all + concurrency cap.
 *
 * Cost trade-off: N Haiku calls instead of 1. Acceptable since the single-call
 * path was failing in production; reliability > token cost.
 */
export async function classifyVaultUrlsBulk(
  items: { url: string; title?: string; description?: string }[],
  existingCategories: string[] = []
): Promise<{ category: string; summary: string; title: string }[]> {
  if (items.length === 0) return [];

  const CONCURRENCY = 2; // lower → safer against any per-IP rate limiting
  const out: { category: string; summary: string; title: string }[] = new Array(items.length);

  // Track categories created during the batch so later items reuse them
  const knownCats = new Set<string>(existingCategories);

  async function classifyOne(idx: number): Promise<void> {
    const it = items[idx];
    const cleanTitle = (it.title || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    try {
      const { category, summary } = await classifyVaultUrl(
        it.url,
        cleanTitle,
        it.description || "",
        Array.from(knownCats)
      );
      const cat = (category || "Otro").trim();
      knownCats.add(cat);
      out[idx] = {
        title: cleanTitle,
        category: cat,
        summary: (summary || "").trim(),
      };
    } catch (err) {
      console.error("[classifyVaultUrlsBulk] item", idx, "failed:", String(err));
      out[idx] = {
        title: cleanTitle,
        category: "Sin Clasificar",
        summary: cleanTitle || `Link desde ${(() => { try { return new URL(it.url).hostname; } catch { return it.url; } })()}`,
      };
    }
  }

  // Run with bounded concurrency
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = Array.from({ length: Math.min(CONCURRENCY, items.length - i) }, (_, j) => i + j);
    await Promise.all(chunk.map((idx) => classifyOne(idx)));
  }

  return out;
}

export async function parseInboxText(rawText: string) {
  // Load dynamic subcategories from DB
  const subcategories = await getSubcategories();
  const systemPrompt = buildSystemPrompt(subcategories);

  const batches = splitIntoBatches(rawText);

  if (batches.length === 1) {
    return parseBatch(batches[0], systemPrompt);
  }

  // Process batches in parallel (max 3 concurrent)
  const results: unknown[][] = [];
  for (let i = 0; i < batches.length; i += 3) {
    const chunk = batches.slice(i, i + 3);
    const batchResults = await Promise.all(
      chunk.map((b) => parseBatch(b, systemPrompt))
    );
    results.push(...batchResults);
  }

  return results.flat();
}
