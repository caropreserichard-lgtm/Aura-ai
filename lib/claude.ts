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
// Categorías sugeridas (no obligatorias — el modelo puede inferir nuevas
// dinámicamente, p.ej. "Crypto Strategy", "AI Creative Tools",
// "Business Growth", "Personal Brand", etc.).
const VAULT_SUGGESTED_CATEGORIES = [
  "Crypto Strategy",
  "AI Creative Tools",
  "Business Growth",
  "Personal Brand",
  "Marketing",
  "Desarrollo",
  "Aprendizaje",
  "Lifestyle",
  "Otro",
];

const VAULT_USER_CONTEXT = `Eres un asistente para un emprendedor colombiano de Bucaramanga: dueño de gastro bar/nightclub, crypto trader (memecoins, estrategias DeFi), dev de apps con Next.js usando AI, creador de contenido (marca personal), estudiante autodidacta de historia y ciencia.`;

/**
 * Domain-specific hints + last-resort fallback inference. Returns a
 * non-Otro category guess and a Spanish one-liner for known URL patterns
 * (X.com handles with crypto signals, GitHub repos, YouTube, etc.) so we
 * never fall back to "Otro / empty summary" when at least the URL pattern
 * gives us a hint. Deterministic — no AI cost.
 */
function patternFallback(url: string, title: string, description: string): { category: string; summary: string; hint: string } {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { /* */ }

  const t = (title || "").toLowerCase();
  const d = (description || "").toLowerCase();
  const u = url.toLowerCase();
  const haystack = `${t} ${d} ${u}`;

  // X.com / Twitter — handle-based inference
  if (host === "x.com" || host === "twitter.com") {
    const handle = (u.match(/(?:x|twitter)\.com\/([^/?#]+)/i)?.[1] || "").toLowerCase();
    const cryptoSignals = /xbt|crypto|btc|eth|sol|sui|degen|memecoin|defi|trader|chart|0x|chain|hyperliquid|hodl/i;
    const aiSignals = /\bai\b|gpt|llm|prompt|copilot|claude|cursor|midjourney|higgsfield|origami|copyrebel/i;
    const founderSignals = /founder|biz|growth|saas|startup|mogul|ceo|build|hustle/i;
    const marketingSignals = /marketing|brand|copy|content|creator|social/i;

    let category = "Crypto Strategy"; // default for X handles in our user's context
    let summary = `Cuenta de X interesante: @${handle}. Insights útiles para tu estrategia.`;

    if (aiSignals.test(handle) || aiSignals.test(haystack)) {
      category = "AI Creative Tools";
      summary = `Herramienta o creator de IA (@${handle}) — útil para apps Next.js con AI.`;
    } else if (founderSignals.test(handle) || founderSignals.test(haystack)) {
      category = "Business Growth";
      summary = `Founder/biz creator (@${handle}) con estrategias de crecimiento accionables.`;
    } else if (marketingSignals.test(handle) || marketingSignals.test(haystack)) {
      category = "Marketing";
      summary = `Creator de marketing/marca (@${handle}) — útil para tu marca personal.`;
    } else if (cryptoSignals.test(handle) || cryptoSignals.test(haystack)) {
      category = "Crypto Strategy";
      summary = `Trader/analista crypto (@${handle}) — alpha de memecoins y estrategias DeFi.`;
    }

    return { category, summary, hint: `X handle: @${handle}.` };
  }

  if (host === "github.com" || host === "gist.github.com") {
    return {
      category: "Desarrollo",
      summary: `Repo/proyecto en GitHub: ${title.slice(0, 60)}.`,
      hint: "GitHub repo o gist — relevante para dev Next.js.",
    };
  }

  if (host === "youtube.com" || host === "youtu.be") {
    return {
      category: "Aprendizaje",
      summary: `Video YouTube: ${title.slice(0, 60)}.`,
      hint: "YouTube — contenido educativo o de creator.",
    };
  }

  if (host === "vercel.com" || host.endsWith(".vercel.app")) {
    return { category: "Desarrollo", summary: `App/demo en Vercel: ${title.slice(0, 60)}.`, hint: "Vercel deploy." };
  }

  if (host === "producthunt.com") {
    return { category: "AI Creative Tools", summary: `Producto en Product Hunt: ${title.slice(0, 60)}.`, hint: "Product Hunt launch." };
  }

  // No known pattern
  return { category: "Otro", summary: "", hint: "" };
}

export async function classifyVaultUrl(
  url: string,
  title: string,
  description: string,
  existingCategories: string[] = []
): Promise<{ category: string; summary: string }> {
  // Deterministic pattern-based hint we'll feed to Claude AND use as fallback
  const fallback = patternFallback(url, title, description);

  const categoryGuide = existingCategories.length > 0
    ? `Categorías existentes en la bóveda (REUTILIZA una si encaja): ${existingCategories.join(", ")}.`
    : `Categorías sugeridas: ${VAULT_SUGGESTED_CATEGORIES.join(", ")}.`;

  const prompt = `${VAULT_USER_CONTEXT}

Tu trabajo: clasificar este link en una categoría útil Y escribir un resumen en español.

URL: ${url}
Título: ${title || "(sin título)"}
Descripción: ${description || "(no disponible)"}
${fallback.hint ? `Pista del dominio: ${fallback.hint}` : ""}
${fallback.category !== "Otro" ? `Sugerencia previa: category="${fallback.category}", summary="${fallback.summary}".` : ""}

${categoryGuide}

REGLAS ESTRICTAS:
1. NUNCA respondas con category="Otro" si el dominio o el título dan CUALQUIER pista. Solo "Otro" si es absolutamente irreconocible.
2. NUNCA respondas con summary vacío. Si no hay descripción, infiere del título/handle/dominio. Mínimo 6 palabras, máximo 14.
3. Para handles de X.com (e.g. "@cyrilXBT", "@higgsfield"): infiere por el username. Handles con "XBT", "crypto", "eth" → "Crypto Strategy"; con "AI", "ml", nombres de tools → "AI Creative Tools"; con "founder", "biz", "growth" → "Business Growth".
4. category: 1-3 palabras, capitalizada, en español o inglés mezclado (p.ej. "Crypto Strategy", "AI Creative Tools", "Business Growth", "Marketing", "Desarrollo", "Aprendizaje").
5. summary: una frase en español, accionable, explicando POR QUÉ es valioso para un emprendedor crypto/dev/bar.

Responde SOLO con JSON válido en una línea:
{"category":"...","summary":"..."}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return fallback.category !== "Otro"
        ? { category: fallback.category, summary: fallback.summary }
        : { category: "Otro", summary: "" };
    }

    const cleaned = content.text.replace(/```(?:json)?\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    let category = (parsed.category || "").trim();
    let summary  = (parsed.summary || parsed.insight || "").trim();

    // If Claude still gave up but we have a deterministic guess — use it
    if ((!category || category === "Otro") && fallback.category !== "Otro") {
      category = fallback.category;
    }
    if (!summary && fallback.summary) {
      summary = fallback.summary;
    }
    if (!category) category = "Otro";

    return { category, summary };
  } catch (err) {
    console.error("[classifyVaultUrl] error, using pattern fallback:", String(err));
    return fallback.category !== "Otro"
      ? { category: fallback.category, summary: fallback.summary }
      : { category: "Otro", summary: "" };
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
      // Even if Claude is unreachable, use deterministic pattern fallback
      const fb = patternFallback(it.url, cleanTitle, it.description || "");
      out[idx] = {
        title: cleanTitle,
        category: fb.category,
        summary: fb.summary,
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
