// Genera una o varias guías a partir de un texto ya listo (pegado a mano, o ya
// extraído de un PDF). Si el texto es muy largo, lo parte en pedazos (chunkText) y
// llama a /api/guides/generate UNA VEZ POR PEDAZO — cada llamada es una función nueva
// de Vercel con sus propios 60 segundos, así que documentos grandes no se cortan a
// mitad de camino. Cada parte queda como una guía separada, marcada "(Parte N de M)"
// en el título (ver partLabel en src/app/api/guides/generate/route.ts).
//
// Se usa desde new-guide-form.tsx y new-generic-guide-form.tsx — es la misma lógica
// para los dos, solo cambian los datos de "a qué empresa/sistema pertenece".
import { readJsonResponse } from "@/lib/fetch-json";
import { chunkText } from "@/lib/chunk-text";

// Un poco por debajo del límite de recorte del servidor (60.000, ver
// src/app/api/guides/generate/route.ts) para dejar margen y que nunca haga falta
// que el servidor recorte de nuevo un pedazo que ya armamos acá.
const MAX_CHUNK_CHARS = 55000;

export type GenerateGuideTarget = {
  clientCompanyId?: string;
  isGeneric?: boolean;
  system?: string;
  language: "es" | "en";
  module: string;
  images: File[];
};

export async function generateGuidesFromText(
  fullText: string,
  target: GenerateGuideTarget,
  onProgress?: (info: { index: number; total: number }) => void
): Promise<{ guideIds: string[]; parts: number }> {
  const chunks = chunkText(fullText, MAX_CHUNK_CHARS);
  const guideIds: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.({ index: i + 1, total: chunks.length });

    const formData = new FormData();
    if (target.clientCompanyId) formData.set("clientCompanyId", target.clientCompanyId);
    if (target.isGeneric) formData.set("isGeneric", "true");
    if (target.system) formData.set("system", target.system);
    formData.set("language", target.language);
    formData.set("module", target.module);
    formData.set("sourceType", "text");
    formData.set("rawText", chunks[i]);
    if (chunks.length > 1) formData.set("partLabel", `Parte ${i + 1} de ${chunks.length}`);
    // Las capturas de pantalla solo se mandan con la primera parte — son referencia
    // visual general del proceso, no algo que tenga sentido repetir en cada tanda.
    if (i === 0) target.images.forEach((img) => formData.append("images", img));

    const res = await fetch("/api/guides/generate", { method: "POST", body: formData });
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error((data.error as string) ?? "Error al generar la guía.");
    guideIds.push(data.guideId as string);
  }

  return { guideIds, parts: chunks.length };
}
