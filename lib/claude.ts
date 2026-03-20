import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Eres un asistente de productividad. Analiza el siguiente texto/links y para CADA item:
1. Clasifícalo en una categoría: trabajo, aprendizaje, lifestyle, proyectos
2. Asigna una subcategoría específica de estas opciones:
   - trabajo: Crypto / Memecoin, App Building (QOVE), Gastro Bar Ops, Web Marketing AI, Content Creation, Client Work / Freelance
   - aprendizaje: Historia Colombia / LatAm, Historia Mundial, Astronomía / Ciencia, Política / Geopolítica, Filosofía, Vocabulario / Idiomas
   - lifestyle: Gym / Fitness, Meditación / Mindfulness, Salud Mental, Nutrición, Social / Networking, Descanso / Recovery
   - proyectos: Memecoin Intel, AI Hype Engine, WhatsApp Reservation Bot, QOVE Platform, Gastro Bar Digital, Side Projects
3. Genera un título claro y conciso
4. Sugiere ROI (1-10) basado en potencial de generar dinero o progreso tangible
5. Sugiere Disfrute (1-10) basado en el tipo de actividad

Responde SOLO en JSON array, sin markdown, sin backticks:
[{
  "title": "...",
  "category": "...",
  "subcategory": "...",
  "roi": N,
  "joy": N,
  "url": "..." // si había un link, sino null
}]

Contexto del usuario: Dueño de gastro bar/nightclub en Bucaramanga Colombia, desarrollador de apps con Next.js, trader de crypto/memecoins, estudiante autodidacta de historia y ciencia.`;

export async function parseInboxText(rawText: string) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: rawText,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Respuesta inesperada de Claude");
  }

  try {
    const parsed = JSON.parse(content.text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new Error("No se pudo parsear la respuesta de Claude: " + content.text);
  }
}
