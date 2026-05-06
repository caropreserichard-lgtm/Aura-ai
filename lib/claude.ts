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
 * Domain-specific hints for AI classification. Only provides contextual
 * hints about the URL pattern — never generates final summaries or
 * categories. The AI must always analyze the actual scraped content.
 */
function patternHint(url: string, title: string, description: string): string {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }

  const u = url.toLowerCase();

  if (host === "x.com" || host === "twitter.com") {
    const handle = (u.match(/(?:x|twitter)\.com\/([^/?#]+)/i)?.[1] || "").toLowerCase();
    return `Plataforma: X/Twitter. Handle: @${handle}. Analiza el contenido real del título y descripción para clasificar — no asumas la categoría solo por el handle.`;
  }
  if (host === "github.com" || host === "gist.github.com") return `Plataforma: GitHub. Analiza el nombre del repo y la descripción para determinar el tema específico.`;
  if (host === "youtube.com" || host === "youtu.be") return `Plataforma: YouTube. Clasifica según el tema del video, no como "YouTube" genérico.`;
  if (host === "vercel.com" || host.endsWith(".vercel.app")) return `Plataforma: Vercel. Probablemente una app/demo web.`;
  if (host === "producthunt.com") return `Plataforma: Product Hunt. Clasifica según el producto específico.`;
  if (host === "reddit.com" || host.endsWith(".reddit.com")) return `Plataforma: Reddit. Clasifica según el subreddit y tema del post.`;
  if (host === "medium.com" || host.endsWith(".medium.com")) return `Plataforma: Medium. Clasifica según el tema del artículo.`;
  if (host === "substack.com" || host.endsWith(".substack.com")) return `Plataforma: Substack. Clasifica según el tema del newsletter/artículo.`;

  return title || description ? "" : `Dominio: ${host}. Sin metadata disponible, infiere del URL.`;
}

export async function classifyVaultUrl(
  url: string,
  title: string,
  description: string,
  existingCategories: string[] = []
): Promise<{ category: string; summary: string }> {
  const hint = patternHint(url, title, description);

  const existingCatList = existingCategories.length > 0
    ? `\n[Existing Categories]: ${existingCategories.join(", ")}`
    : "";

  const prompt = `${VAULT_USER_CONTEXT}

Tu trabajo: clasificar este link en una categoría ESPECÍFICA y escribir un resumen REAL basado en el contenido.

=== LINK DATA ===
URL: ${url}
Title: ${title || "(no title)"}
Description: ${description || "(no description available)"}
${hint ? `Context: ${hint}` : ""}
${existingCatList}

=== CORE CLASSIFICATION RULES ===
1. ANALYZE CONTENT FIRST: Base the category on the Title and Description content. Do NOT categorize based on URL/platform alone.
2. SPECIFICITY OVER GENERALITY: If the link is about a specific niche (e.g., "GTA", "Claude AI", "SaaS Boilerplates", "Solana MEV"), create a DEDICATED category for that niche. NEVER use generic categories like "General", "Other", "Interesante", or "Varios".
3. DISTINGUISH SIMILAR TOPICS:
   - CRYPTO STRATEGY: Focuses on "The What and Why" (trading plans, market narratives, portfolio management, alpha signals).
   - CRYPTO ALGORITHM: Focuses on "The How" (trading bots, MEV code, smart contract logic, on-chain math).
4. CATEGORY SELECTION:
   - Check the [Existing Categories] list above.
   - If the content fits an existing category PERFECTLY, reuse it.
   - If the content is >30% different from all existing categories, CREATE a new specific category name.
   - Categories should be 1-3 words, title case, en español o inglés mixto.
5. NEVER return "Otro" unless the content is truly unrecognizable with zero context.
6. SUMMARY RULES:
   - Must describe the ACTUAL content of the link, not generic filler.
   - Must be in Spanish, 8-20 words.
   - Must explain WHAT the link contains, like a WhatsApp link preview.
   - NEVER write generic phrases like "Insights útiles", "Estrategias accionables", "Cuenta interesante".
   - If you only have a username/handle, say what domain they appear to work in based on their bio/description.

=== EXAMPLES OF GOOD vs BAD ===
BAD: category="Business Growth", summary="Founder con estrategias de crecimiento accionables."
GOOD: category="SaaS Pricing", summary="Guía de Marc Louvion sobre cómo fijar precios en micro-SaaS."

BAD: category="Crypto Strategy", summary="Trader crypto con alpha de memecoins."
GOOD: category="Solana Trading", summary="Análisis de flujos de liquidez en Solana y oportunidades de MEV."

BAD: category="AI Creative Tools", summary="Herramienta de IA útil para apps Next.js."
GOOD: category="AI Video Generation", summary="Higgsfield AI genera videos cortos con avatares desde texto."

Respond with ONLY valid JSON on a single line:
{"category":"...","summary":"..."}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return { category: "Otro", summary: title ? `Enlace: ${title.slice(0, 80)}` : "" };
    }

    const cleaned = content.text.replace(/```(?:json)?\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    let category = (parsed.category || "").trim();
    let summary  = (parsed.summary || "").trim();

    if (!category || category.toLowerCase() === "otro" || category.toLowerCase() === "other") {
      category = "Sin Clasificar";
    }
    if (!summary && title) {
      summary = title.slice(0, 100);
    }

    return { category, summary };
  } catch (err) {
    console.error("[classifyVaultUrl] AI error:", String(err));
    return {
      category: "Sin Clasificar",
      summary: title ? title.slice(0, 100) : `Link desde ${(() => { try { return new URL(url).hostname; } catch { return url; } })()}`,
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
