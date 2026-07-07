import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ guideId: string }> }
) {
  const { guideId } = await params;
  const { supabase } = await requireUser();
  const body = await request.json();

  const { data: guide, error: guideFetchError } = await supabase
    .from("guides")
    .select("id, client_company_id, current_version_id")
    .eq("id", guideId)
    .maybeSingle();
  if (guideFetchError) return NextResponse.json({ error: guideFetchError.message }, { status: 500 });
  if (!guide) return NextResponse.json({ error: "Guía no encontrada." }, { status: 404 });

  const { data: role } = await supabase.rpc("my_role", {
    target_company_id: guide.client_company_id,
  });
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "No tienes permiso para editar esta guía." }, { status: 403 });
  }

  const guidePatch: Record<string, unknown> = {};
  if (typeof body.title === "string") guidePatch.title = body.title;
  if (typeof body.module === "string" || body.module === null) guidePatch.module = body.module;

  if (Object.keys(guidePatch).length) {
    const { error } = await supabase.from("guides").update(guidePatch).eq("id", guideId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const versionPatch: Record<string, unknown> = {};
  for (const field of [
    "objetivo",
    "precondiciones",
    "advertencias",
    "resultado_esperado",
    "quick_guide",
  ]) {
    if (typeof body[field] === "string") versionPatch[field] = body[field];
  }
  if (Array.isArray(body.pasos)) versionPatch.pasos = body.pasos;
  if (Array.isArray(body.faq)) versionPatch.faq = body.faq;

  if (Object.keys(versionPatch).length && guide.current_version_id) {
    const { error } = await supabase
      .from("guide_versions")
      .update(versionPatch)
      .eq("id", guide.current_version_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(body.quiz) && guide.current_version_id) {
    const { error } = await supabase
      .from("quizzes")
      .update({ questions: body.quiz })
      .eq("guide_version_id", guide.current_version_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
