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

export async function classifyVaultUrl(url: string, title: string, description: string): Promise<{ category: string; insight: string }> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Eres un asistente para un emprendedor colombiano: dueño de gastro bar, crypto trader, dev de apps con Next.js, creador de contenido.

Analiza este contenido web y clasifícalo.
URL: ${url}
Título: ${title}
Descripción: ${description}

Responde SOLO con JSON válido (sin markdown):
{"category":"una de: Marketing, Crypto, Negocios, Desarrollo, Aprendizaje, Lifestyle, Otro","insight":"máximo 12 palabras explicando por qué este link es valioso para sus negocios"}`,
    }],
  });

  const content = message.content[0];
  if (content.type !== "text") return { category: "Otro", insight: "" };

  try {
    const cleaned = content.text.replace(/```(?:json)?\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      category: parsed.category || "Otro",
      insight: parsed.insight || "",
    };
  } catch {
    return { category: "Otro", insight: "" };
  }
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
