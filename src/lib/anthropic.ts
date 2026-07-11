// Este es EL ARCHIVO donde se le habla a la IA (Claude). Si algún día quieren cambiar:
//   - qué modelo de Claude se usa            -> variable MODEL, más abajo.
//   - las reglas de cómo se arma una guía    -> el texto "system" dentro de generateGuide().
//   - cuántos pasos/preguntas máximo permite -> GUIDE_SCHEMA (maxItems) + el texto "system".
//   - cómo interpreta la búsqueda del usuario final -> el texto "system" dentro de matchGuide().
// este es el lugar.
//
// Técnica usada: en vez de pedirle a Claude "devolveme un JSON" y cruzar los dedos, se le
// da una "herramienta" (tool) con la forma exacta que tiene que llenar (GUIDE_SCHEMA /
// MATCH_SCHEMA) y se lo obliga a usarla (tool_choice). Así la respuesta siempre viene
// perfectamente estructurada, sin tener que parsear texto libre.
import Anthropic from "@anthropic-ai/sdk";

// Modelo de Claude a usar. "claude-sonnet-5" es el modelo estándar recomendado hoy
// (buen balance costo/calidad). Si Anthropic saca un modelo nuevo y quieren probarlo,
// se cambia solo acá.
const MODEL = "claude-sonnet-5";

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// Forma que tiene una guía ya generada por la IA. Estos mismos nombres de campo son
// los que se guardan en la tabla guide_versions (ver supabase/migrations/0001_schema.sql).
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

// Define la forma exacta que Claude tiene que devolver al generar una guía.
// "maxItems" es lo que limita a máximo 6 pasos / 2 FAQ / 3 preguntas de quiz (esto viene
// del documento original del proyecto). Si quieren permitir más pasos, se sube el número acá
// Y TAMBIÉN se actualiza la frase "Máximo 6 pasos..." en el texto "system" de abajo,
// porque Claude sigue las instrucciones en texto, no solo el schema.
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
          // Índice (empezando en 0) de cuál opción del array "opciones" es la correcta.
          // Ej: si la respuesta correcta es la 2da opción, este valor es 1.
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

// Una captura de pantalla (u otra imagen suelta) que el admin sube junto con el texto,
// para que la IA la "vea" como referencia extra al armar la guía. mediaType es el tipo
// de archivo (ej. "image/png"); base64 es el archivo codificado en base64 (sin el
// prefijo "data:image/png;base64,", solo los datos).
export type ImageAttachment = { mediaType: "image/png" | "image/jpeg" | "image/webp"; base64: string };

// Le pide a Claude que convierta un texto desordenado (pegado por un admin, o extraído
// de un link/PDF) en una guía estructurada. Opcionalmente puede recibir capturas de
// pantalla sueltas (images) que Claude "ve" directamente junto con el texto — útil
// cuando el texto solo no alcanza para explicar un paso (ej. dónde está un botón).
// La llama la ruta POST /api/guides/generate.
export async function generateGuide(
  rawText: string,
  language: "es" | "en",
  images: ImageAttachment[] = []
): Promise<GeneratedGuide> {
  const languageLabel = language === "es" ? "español" : "inglés";

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 4096,
    // Este texto "system" son las instrucciones/reglas que la IA sigue SIEMPRE,
    // antes de ver el texto del usuario. Es el lugar para ajustar el "tono" o las
    // reglas de la guía generada (por ejemplo, si quieren pedir más ejemplos, o
    // prohibir cierto tipo de contenido).
    system: `Eres un redactor técnico que convierte texto operativo desordenado (explicaciones de cómo un equipo usa su ERP/POS/sistema de gestión) en una guía clara y verificable. A veces también recibirás capturas de pantalla como referencia adicional: úsalas para precisar nombres de botones/menús exactos, pero la fuente principal de verdad sigue siendo el texto.

Reglas estrictas:
- Máximo 6 pasos, máximo 2 preguntas de FAQ, máximo 3 preguntas de quiz.
- No inventes información que no esté implícita en el texto fuente (ni en las capturas, si las hay).
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
    // Esto obliga a Claude a responder usando la herramienta emit_guide (no le permite
    // "contestar en texto libre"), así siempre llega en el formato que esperamos.
    tool_choice: { type: "tool", name: "emit_guide" },
    messages: [
      {
        role: "user",
        // El contenido es una lista de bloques: primero las imágenes (si hay), después
        // el texto. Claude puede leer varias imágenes en un mismo mensaje sin problema.
        content: [
          ...images.map((img) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 },
          })),
          {
            type: "text" as const,
            text: `Idioma deseado: ${language}\n\nTexto desordenado a convertir en guía:\n\n${rawText}`,
          },
        ],
      },
    ],
  });

  // La respuesta de Claude viene como una lista de "bloques"; cuando se fuerza el uso
  // de una tool, el bloque que nos interesa es el de tipo "tool_use" y su campo
  // ".input" ya viene validado contra el schema de arriba.
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

// Forma que tiene que devolver Claude al interpretar la pregunta del usuario final
// (el "Camino A" de la pantalla "¿Qué necesitas resolver hoy?").
const MATCH_SCHEMA = {
  type: "object" as const,
  properties: {
    match: { type: "string", enum: ["single", "multiple", "none"] },
    guide_ids: { type: "array", items: { type: "string" } },
  },
  required: ["match", "guide_ids"],
};

// Compara la pregunta libre de un usuario final contra la lista de guías disponibles
// de su empresa, e interpreta CUÁL guía responde a lo que necesita — sin depender de
// que use las mismas palabras que el título. La llama la ruta POST /api/guides/match.
export async function matchGuide(
  query: string,
  guides: { id: string; title: string; quick_guide: string | null }[]
): Promise<MatchResult> {
  // Si la empresa todavía no tiene ninguna guía cargada, ni vale la pena preguntarle
  // a la IA: no hay nada para encontrar.
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
    // Si por algún motivo Claude no devuelve la herramienta esperada, preferimos decir
    // "no encontramos nada" antes que romper la pantalla del usuario final.
    return { match: "none", guide_ids: [] };
  }

  return toolUse.input as MatchResult;
}
