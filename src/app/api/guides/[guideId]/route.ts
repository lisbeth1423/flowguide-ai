// Endpoint: PATCH /api/guides/[guideId]
//
// Guarda los cambios que un admin/editor hace al editar una guía a mano (formulario
// en src/app/app/[companyId]/admin/guides/[guideId]/edit-guide-form.tsx).
//
// Nota de diseño importante: esto EDITA la versión actual de la guía "in place" (pisa
// el contenido de guide_versions), no crea una versión nueva. La tabla guide_versions
// está preparada para tener historial de versiones (campo version_number), pero en este
// Sprint 1 no se construyó una pantalla de "ver versiones anteriores" — si en el futuro
// quieren eso, este endpoint es el que habría que cambiar para que INSERTE una fila
// nueva en vez de hacer UPDATE.
//
// Todos los campos del "body" son opcionales: solo actualiza lo que venga en la
// petición (por eso tantos "if" antes de armar guidePatch/versionPatch).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ guideId: string }> }
) {
  const { guideId } = await params;
  const { supabase } = await requireUser();
  const body = await request.json();

  // Primero hay que saber a qué empresa pertenece esta guía, para poder chequear el
  // rol del usuario en ESA empresa (una guía de la Empresa A no la puede editar un
  // editor que solo tiene acceso a la Empresa B).
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

  // --- Campos que viven en la tabla "guides" (título, módulo) ---
  const guidePatch: Record<string, unknown> = {};
  if (typeof body.title === "string") guidePatch.title = body.title;
  if (typeof body.module === "string" || body.module === null) guidePatch.module = body.module;

  if (Object.keys(guidePatch).length) {
    const { error } = await supabase.from("guides").update(guidePatch).eq("id", guideId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // --- Campos que viven en la tabla "guide_versions" (el contenido de la guía) ---
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

  // --- El quiz (preguntas/opciones/respuesta correcta) vive en su propia tabla ---
  if (Array.isArray(body.quiz) && guide.current_version_id) {
    const { error } = await supabase
      .from("quizzes")
      .update({ questions: body.quiz })
      .eq("guide_version_id", guide.current_version_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
