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

  const { data: role } = await supabase.rpc("my_role", {
    target_company_id: clientCompanyId,
  });
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "No tienes permiso para crear guías en esta empresa." }, { status: 403 });
  }

  let generated;
  try {
    generated = await generateGuide(rawText, language);
  } catch (err) {
    console.error("Anthropic generateGuide failed", err);
    return NextResponse.json({ error: "No se pudo generar la guía con la IA." }, { status: 502 });
  }

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
