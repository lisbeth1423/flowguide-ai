// Endpoint: POST /api/guides/extract
//
// Le saca el texto a un PDF ya subido a Storage (ver /api/uploads/pdf-url), SIN
// llamar a Claude — por eso es rápido incluso con documentos grandes, muy por debajo
// del límite de 60s de Vercel. Existe para separar dos pasos que antes estaban
// pegados dentro de /api/guides/generate: extraer (rápido) y generar con IA (lento).
//
// El navegador usa esto para saber CUÁNTO texto hay antes de decidir si hace falta
// partirlo en varias guías (ver new-guide-form.tsx / new-generic-guide-form.tsx) —
// así, en vez de recortar contenido y perderlo, se genera una guía por cada parte,
// automáticamente, sin que quien lo use tenga que dividir el PDF a mano.
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { extractTextFromPdf } from "@/lib/extract";
import { createAdminClient } from "@/lib/supabase/admin";

// Igual que en /api/guides/generate: 60s es el máximo permitido en el plan gratuito
// de Vercel. Le había puesto 30 pensando que extraer texto (sin llamar a Claude) iba
// a ser rápido siempre, pero un PDF con muchas páginas o fuentes/formato complejo
// puede tardar más de lo esperado — mejor darle todo el margen posible.
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const pdfStoragePath = body.pdfStoragePath ? String(body.pdfStoragePath) : null;
  if (!pdfStoragePath) {
    return NextResponse.json({ error: "pdfStoragePath es obligatorio." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: fileData, error: downloadError } = await admin.storage
    .from("knowledge-files")
    .download(pdfStoragePath);
  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: `No se pudo leer el PDF subido: ${downloadError?.message ?? "archivo no encontrado"}` },
      { status: 500 }
    );
  }

  try {
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const text = await extractTextFromPdf(buffer);
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo extraer el texto del PDF.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
