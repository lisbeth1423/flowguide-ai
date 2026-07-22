// Endpoint: POST /api/guides/generate
//
// La llaman DOS formularios distintos:
//   - El del panel admin de una empresa (src/app/app/[companyId]/admin/guides/new/new-guide-form.tsx)
//     -> crea una guía normal, atada a clientCompanyId.
//   - El del panel de platform admin (src/app/platform-admin/guides/new/new-generic-guide-form.tsx)
//     -> crea una guía GENÉRICA (isGeneric=true + system), sin clientCompanyId. Ver
//     supabase/migrations/0004_generic_content.sql para el porqué de este modelo.
//
// En ambos casos acepta 3 formas de dar la fuente de conocimiento (campo "sourceType"):
//   - "text":     texto pegado a mano (como en el Sprint 1 original).
//   - "url":      un link — el servidor entra y saca el texto solo (src/lib/extract.ts).
//   - "document": un PDF subido — se le extrae el texto (src/lib/extract.ts).
// En cualquiera de los 3 casos, además se pueden adjuntar capturas de pantalla sueltas
// (campo "images", opcional) que Claude "ve" directamente junto con el texto.
//
// Qué hace, paso a paso:
//   1. Confirma que hay sesión iniciada y que el usuario es "admin" o "editor" de
//      la empresa (los otros roles no pueden crear guías).
//   2. Según sourceType, obtiene el texto final (pegado, extraído de la URL, o del PDF).
//   3. Si hay un PDF, lo sube a Supabase Storage (bucket "knowledge-files") para
//      quedarnos con el original. Las capturas de pantalla sueltas NO se guardan —
//      se usan solo como referencia para esta generación y después se descartan (ver
//      nota en el bloque de "images" más abajo si en el futuro quieren persistirlas).
//   4. Le pasa el texto (+ imágenes) a la IA (generateGuide, en src/lib/anthropic.ts).
//   5. Guarda todo en la base de datos, en este orden (cada tabla depende de la
//      anterior): knowledge_sources -> guides -> guide_versions -> quizzes.
//
// Nota para quien lo mantenga: estos inserts NO están en una sola transacción de
// base de datos (Supabase desde el cliente normal no lo permite fácilmente). Si algo
// falla a mitad de camino, puede quedar un registro "huérfano". Para el tamaño de este
// proyecto (MVP) es un riesgo aceptable — ver detalle en versiones anteriores de este
// comentario en el historial de git si hace falta más contexto.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateGuide, type ImageAttachment } from "@/lib/anthropic";
import { extractTextFromUrl, extractTextFromPdf } from "@/lib/extract";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGES = 5;

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();

  const form = await request.formData();
  const clientCompanyId = form.get("clientCompanyId") ? String(form.get("clientCompanyId")) : null;
  const language = form.get("language") === "en" ? "en" : "es";
  const moduleName = form.get("module") ? String(form.get("module")) : null;
  const sourceType = String(form.get("sourceType") ?? "text");
  // Guías genéricas (contenido compartido de la plataforma, ver
  // supabase/migrations/0004_generic_content.sql): no tienen empresa dueña, en cambio
  // tienen un "system" (ej. "SAP Business One") que decide a qué empresas les llega.
  const isGeneric = form.get("isGeneric") === "true";
  const system = form.get("system") ? String(form.get("system")).trim() : null;

  if (!["text", "url", "document"].includes(sourceType)) {
    return NextResponse.json({ error: "sourceType inválido." }, { status: 400 });
  }

  if (isGeneric) {
    if (!system) {
      return NextResponse.json({ error: "system es obligatorio para una guía genérica." }, { status: 400 });
    }
    const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
    if (!isPlatformAdmin) {
      return NextResponse.json({ error: "No tienes permiso para crear contenido genérico." }, { status: 403 });
    }
  } else {
    if (!clientCompanyId) {
      return NextResponse.json({ error: "clientCompanyId es obligatorio." }, { status: 400 });
    }
    // my_role() es una función de la base de datos (ver supabase/migrations/0002_rls.sql)
    // que devuelve el rol efectivo del usuario logueado en esa empresa.
    const { data: role } = await supabase.rpc("my_role", { target_company_id: clientCompanyId });
    if (role !== "admin" && role !== "editor") {
      return NextResponse.json({ error: "No tienes permiso para crear guías en esta empresa." }, { status: 403 });
    }
  }

  // --- Paso 1: resolver el texto final según de dónde viene, y (si aplica) subir el
  // archivo original a Storage para quedarnos con una copia. Usamos el cliente admin
  // (service role) para el upload porque el bucket no tiene políticas de RLS propias
  // todavía — es seguro acá porque ya validamos el rol admin/editor arriba.
  let finalText: string;
  let storagePath: string | null = null;
  const admin = createAdminClient();

  try {
    if (sourceType === "text") {
      finalText = String(form.get("rawText") ?? "").trim();
      if (!finalText) {
        return NextResponse.json({ error: "rawText es obligatorio para sourceType=text." }, { status: 400 });
      }
    } else if (sourceType === "url") {
      const url = String(form.get("url") ?? "").trim();
      if (!url) {
        return NextResponse.json({ error: "url es obligatoria para sourceType=url." }, { status: 400 });
      }
      const extracted = await extractTextFromUrl(url);
      finalText = extracted.text;
      storagePath = url; // guardamos el link como referencia de origen, no es un path de Storage real
    } else {
      // El PDF ya fue subido directo del navegador a Supabase Storage (ver
      // /api/uploads/pdf-url) — acá solo recibimos la ruta y lo bajamos del lado del
      // servidor para sacarle el texto. Así el archivo nunca pasa por esta función de
      // Vercel, que corta pedidos de más de ~4.5 MB.
      const pdfStoragePath = form.get("pdfStoragePath") ? String(form.get("pdfStoragePath")) : null;
      if (!pdfStoragePath) {
        return NextResponse.json({ error: "pdfStoragePath es obligatorio para sourceType=document." }, { status: 400 });
      }
      const { data: fileData, error: downloadError } = await admin.storage
        .from("knowledge-files")
        .download(pdfStoragePath);
      if (downloadError || !fileData) {
        return NextResponse.json(
          { error: `No se pudo leer el PDF subido: ${downloadError?.message ?? "archivo no encontrado"}` },
          { status: 500 }
        );
      }
      const buffer = Buffer.from(await fileData.arrayBuffer());
      finalText = await extractTextFromPdf(buffer);
      storagePath = pdfStoragePath;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo procesar la fuente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // --- Paso 2: capturas de pantalla sueltas (opcionales, para cualquier sourceType).
  // Se leen y se codifican en base64 para mandárselas a Claude en el mismo pedido.
  // OJO: no se suben a Storage ni se guardan en la base — son solo "contexto visual"
  // para esta generación puntual. Si en el futuro quieren conservarlas (para volver a
  // verlas después), hay que: 1) subirlas a Storage como se hace con el PDF arriba,
  // 2) agregar una tabla nueva tipo guide_attachments (guides hoy solo admite UN
  // knowledge_source por guía, no varios).
  const imageFiles = form.getAll("images").filter((f): f is File => f instanceof File);
  if (imageFiles.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Máximo ${MAX_IMAGES} capturas de pantalla por guía.` }, { status: 400 });
  }

  const images: ImageAttachment[] = [];
  for (const file of imageFiles) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Formato de imagen no soportado: ${file.type}. Usá PNG, JPEG o WEBP.` },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    images.push({
      mediaType: file.type as ImageAttachment["mediaType"],
      base64: buffer.toString("base64"),
    });
  }

  // Acá es donde se gasta la API key de Anthropic: el texto (+ imágenes) entra,
  // una guía estructurada sale. Puede tardar varios segundos.
  let generated;
  try {
    generated = await generateGuide(finalText, language, images);
  } catch (err) {
    console.error("Anthropic generateGuide failed", err);
    // Mostramos el motivo real (Anthropic ya devuelve mensajes bastante claros, ej.
    // "sin crédito" o "modelo no disponible") en vez de un genérico "algo salió mal",
    // para que quien lo use sepa qué hacer sin tener que mirar los logs del servidor.
    const detail = err instanceof Error ? err.message : "";
    return NextResponse.json(
      { error: `No se pudo generar la guía con la IA.${detail ? ` (${detail})` : ""}` },
      { status: 502 }
    );
  }

  // 1) Guarda el texto (pegado, o extraído del link/PDF) para tener trazabilidad de
  // "de dónde salió" esta guía.
  const { data: source, error: sourceError } = await supabase
    .from("knowledge_sources")
    .insert({
      client_company_id: clientCompanyId,
      type: sourceType,
      raw_content: finalText,
      storage_path: storagePath,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }

  // 2) Crea el "contenedor" de la guía (título, idioma, módulo). El contenido en sí
  // (pasos, FAQ, etc.) vive en guide_versions, no acá — así en el futuro se pueden
  // tener varias versiones de una misma guía sin perder el historial.
  const { data: guide, error: guideError } = await supabase
    .from("guides")
    .insert({
      client_company_id: clientCompanyId,
      is_generic: isGeneric,
      system: isGeneric ? system : null,
      knowledge_source_id: source.id,
      title: generated.titulo,
      language,
      module: moduleName,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (guideError) {
    return NextResponse.json({ error: guideError.message }, { status: 500 });
  }

  // 3) Crea la primera versión (version_number: 1) con el contenido que devolvió la IA.
  const { data: version, error: versionError } = await supabase
    .from("guide_versions")
    .insert({
      guide_id: guide.id,
      version_number: 1,
      objetivo: generated.objetivo,
      precondiciones: generated.precondiciones,
      pasos: generated.pasos,
      advertencias: generated.advertencias,
      resultado_esperado: generated.resultado_esperado,
      quick_guide: generated.quick_guide,
      faq: generated.faq,
    })
    .select("id")
    .single();
  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 500 });
  }

  // 4) Dos cosas en paralelo: (a) le decimos a "guides" cuál es su versión vigente
  // (current_version_id), y (b) creamos el examen asociado a esa versión.
  const [{ error: updateError }, { error: quizError }] = await Promise.all([
    supabase.from("guides").update({ current_version_id: version.id }).eq("id", guide.id),
    supabase.from("quizzes").insert({
      guide_version_id: version.id,
      questions: generated.quiz,
    }),
  ]);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (quizError) return NextResponse.json({ error: quizError.message }, { status: 500 });

  return NextResponse.json({ guideId: guide.id, title: generated.titulo });
}
