import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export type GeneratedGuide = {
  titulo: string;
  objetivo: string;
  precondiciones: string;
  pasos: string[];
  advertencias: string;
  resultado_esperado: string;
  quick_guide: string;
  faq: { pregunta: string; respuesta: string }[];
  quiz: { pregunta: string; opciones: string[]; respuesta_correcta_index: number }[];
};

const GUIDE_SCHEMA = {
  type: "object" as const,
  properties: {
    titulo: { type: "string" },
    objetivo: { type: "string" },
    precondiciones: { type: "string" },
    pasos: { type: "array", items: { type: "string" }, maxItems: 6 },
    advertencias: { type: "string" },
    resultado_esperado: { type: "string" },
    quick_guide: { type: "string" },
    faq: {
      type: "array",
      maxItems: 2,
      items: {
        type: "object",
        properties: { pregunta: { type: "string" }, respuesta: { type: "string" } },
        required: ["pregunta", "respuesta"],
      },
    },
    quiz: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          pregunta: { type: "string" },
          opciones: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
          respuesta_correcta_index: { type: "integer" },
        },
        required: ["pregunta", "opciones", "respuesta_correcta_index"],
      },
    },
  },
  required: [
    "titulo",
    "objetivo",
    "precondiciones",
    "pasos",
    "advertencias",
    "resultado_esperado",
    "quick_guide",
    "faq",
    "quiz",
  ],
};

export async function generateGuide(
  rawText: string,
  language: "es" | "en"
): Promise<GeneratedGuide> {
  const languageLabel = language === "es" ? "español" : "inglés";

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: `Eres un redactor técnico que convierte texto operativo desordenado (explicaciones de cómo un equipo usa su ERP/POS/sistema de gestión) en una guía clara y verificable.

Reglas estrictas:
- Máximo 6 pasos, máximo 2 preguntas de FAQ, máximo 3 preguntas de quiz.
- No inventes información que no esté implícita en el texto fuente.
- El quick_guide es un resumen accionable de 3-5 líneas, no la guía completa.
- Cada pregunta de quiz tiene entre 2 y 4 opciones y respuesta_correcta_index apunta al índice correcto (base 0).
- Responde completamente en ${languageLabel}, incluyendo todos los campos.
- Usa exclusivamente la herramienta emit_guide para responder.`,
    tools: [
      {
        name: "emit_guide",
        description: "Registra la guía estructurada generada a partir del texto fuente.",
        input_schema: GUIDE_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "emit_guide" },
    messages: [
      {
        role: "user",
        content: `Idioma deseado: ${language}\n\nTexto desordenado a convertir en guía:\n\n${rawText}`,
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude no devolvió una guía estructurada.");
  }

  return toolUse.input as GeneratedGuide;
}

export type MatchResult = {
  match: "single" | "multiple" | "none";
  guide_ids: string[];
};

const MATCH_SCHEMA = {
  type: "object" as const,
  properties: {
    match: { type: "string", enum: ["single", "multiple", "none"] },
    guide_ids: { type: "array", items: { type: "string" } },
  },
  required: ["match", "guide_ids"],
};

export async function matchGuide(
  query: string,
  guides: { id: string; title: string; quick_guide: string | null }[]
): Promise<MatchResult> {
  if (guides.length === 0) return { match: "none", guide_ids: [] };

  const guideList = guides
    .map((g) => `- id: ${g.id}\n  título: ${g.title}\n  resumen: ${g.quick_guide ?? ""}`)
    .join("\n");

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `Interpretas la intención de un usuario que describe con sus propias palabras un problema que quiere resolver en su software de trabajo, y la comparas contra una lista de guías disponibles.

No hagas coincidencia de palabras clave: interpreta el significado aunque el usuario no use los mismos términos que el título o resumen de la guía.

Responde:
- "single" + un id en guide_ids si hay una guía claramente correcta.
- "multiple" + 2 a 4 ids en guide_ids si hay varias guías plausibles, ordenadas de más a menos probable.
- "none" + guide_ids vacío si ninguna guía de la lista resuelve lo que pide el usuario.

Usa exclusivamente la herramienta emit_match para responder.`,
    tools: [
      {
        name: "emit_match",
        description: "Registra qué guía(s) de la lista responden a la intención del usuario.",
        input_schema: MATCH_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "emit_match" },
    messages: [
      {
        role: "user",
        content: `Pregunta del usuario:\n"${query}"\n\nGuías disponibles:\n${guideList}`,
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { match: "none", guide_ids: [] };
  }

  return toolUse.input as MatchResult;
}
