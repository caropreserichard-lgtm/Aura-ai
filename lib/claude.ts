import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Eres un asistente de productividad experto en organizar brain dumps masivos. Analiza el texto y extrae CADA item individual (tarea, idea, link, nota).

Para CADA item:
1. Clasifícalo en una categoría: trabajo, aprendizaje, lifestyle, proyectos
2. Asigna una subcategoría de estas opciones:
   - trabajo: Crypto / Memecoin, App Building (QOVE), Gastro Bar Ops, Web Marketing AI, Content Creation, Client Work / Freelance
   - aprendizaje: Historia Colombia / LatAm, Historia Mundial, Astronomía / Ciencia, Política / Geopolítica, Filosofía, Vocabulario / Idiomas
   - lifestyle: Gym / Fitness, Meditación / Mindfulness, Salud Mental, Nutrición, Social / Networking, Descanso / Recovery
   - proyectos: Memecoin Intel, AI Hype Engine, WhatsApp Reservation Bot, QOVE Platform, Gastro Bar Digital, Side Projects
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

Responde SOLO en JSON array, sin markdown, sin backticks, sin explicación:
[{"title":"...","category":"...","subcategory":"...","roi":N,"joy":N,"url":"..." o null}]

Contexto del usuario: Dueño de gastro bar/nightclub en Bucaramanga Colombia, desarrollador de apps con Next.js, trader de crypto/memecoins, estudiante autodidacta de historia y ciencia, creador de contenido.`;

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

async function parseBatch(batchText: string): Promise<unknown[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
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

  let text = content.text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new Error("No se pudo parsear la respuesta de Claude: " + text.substring(0, 200));
  }
}

export async function parseInboxText(rawText: string) {
  const batches = splitIntoBatches(rawText);

  if (batches.length === 1) {
    return parseBatch(batches[0]);
  }

  // Process batches in parallel (max 3 concurrent)
  const results: unknown[][] = [];
  for (let i = 0; i < batches.length; i += 3) {
    const chunk = batches.slice(i, i + 3);
    const batchResults = await Promise.all(chunk.map(parseBatch));
    results.push(...batchResults);
  }

  return results.flat();
}
