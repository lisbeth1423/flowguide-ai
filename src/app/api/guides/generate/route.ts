// Endpoint: POST /api/guides/generate
//
// Lo llama el formulario "Nueva guía" del panel admin
// (src/app/app/[companyId]/admin/guides/new/new-guide-form.tsx) cuando alguien pega
// texto desordenado y aprieta "Generar guía".
//
// Qué hace, paso a paso:
//   1. Confirma que hay sesión iniciada y que el usuario es "admin" o "editor" de
//      la empresa (los otros roles no pueden crear guías).
//   2. Le pasa el texto a la IA (generateGuide, en src/lib/anthropic.ts) para que
//      devuelva la guía ya estructurada (título, pasos, FAQ, quiz, etc).
//   3. Guarda todo en la base de datos, en este orden (cada tabla depende de la
//      anterior): knowledge_sources -> guides -> guide_versions -> quizzes.
//
// Nota para quien lo mantenga: estos 4 inserts NO están en una sola transacción de
// base de datos (Supabase desde el cliente normal no lo permite fácilmente). Si algo
// falla a mitad de camino, puede quedar un registro "huérfano" (por ejemplo, un
// knowledge_source sin guía). Para el tamaño de este proyecto (MVP) es un riesgo
// aceptable, pero si en el futuro esto crece mucho, valdría la pena mover esta lógica
// a una función de base de datos (RPC) que sí sea una transacción real.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateGuide } from "@/lib/anthropic";

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();

  const body = await request.json();
  const clientCompanyId = String(body.clientCompanyId ?? "");
  const rawText = String(body.rawText ?? "").trim();
  const language = body.language === "en" ? "en" : "es";
  const moduleName = body.module ? String(body.module) : null;

  if (!clientCompanyId || !rawText) {
    return NextResponse.json(
      { error: "clientCompanyId y rawText son obligatorios." },
      { status: 400 }
    );
  }

  // my_role() es una función de la base de datos (ver supabase/migrations/0002_rls.sql)
  // que devuelve el rol efectivo del usuario logueado en esa empresa.
  const { data: role } = await supabase.rpc("my_role", {
    target_company_id: clientCompanyId,
  });
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "No tienes permiso para crear guías en esta empresa." }, { status: 403 });
  }

  // Acá es donde se gasta la API key de Anthropic: un texto desordenado entra,
  // una guía estructurada sale. Puede tardar varios segundos.
  let generated;
  try {
    generated = await generateGuide(rawText, language);
  } catch (err) {
    console.error("Anthropic generateGuide failed", err);
    return NextResponse.json({ error: "No se pudo generar la guía con la IA." }, { status: 502 });
  }

  // 1) Guarda el texto original tal cual lo pegó el admin (para tener trazabilidad
  // de "de dónde salió" esta guía).
  const { data: source, error: sourceError } = await supabase
    .from("knowledge_sources")
    .insert({
      client_company_id: clientCompanyId,
      type: "text",
      raw_content: rawText,
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
