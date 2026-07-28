// Endpoints: PATCH y DELETE /api/guides/[guideId]
//
// PATCH: guarda los cambios que un admin/editor hace al editar una guía a mano
// (formulario en src/app/app/[companyId]/admin/guides/[guideId]/edit-guide-form.tsx).
//
// DELETE: borra la guía por completo. guide_versions, quizzes y quiz_attempts se
// borran solos en cascada (ver "on delete cascade" en
// supabase/migrations/0001_schema.sql) — no hace falta borrarlos a mano acá. El
// knowledge_source (texto/PDF original) y el archivo en Storage NO se borran, quedan
// huérfanos — para el tamaño de este proyecto es un costo aceptable de no complicar
// esto con limpieza de Storage.
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
import { requireApiUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ guideId: string }> }
) {
  const { guideId } = await params;
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const body = await request.json();

  // Primero hay que saber a qué empresa pertenece esta guía, para poder chequear el
  // rol del usuario en ESA empresa (una guía de la Empresa A no la puede editar un
  // editor que solo tiene acceso a la Empresa B). Si es una guía GENÉRICA
  // (is_generic=true, sin empresa dueña) el permiso se chequea distinto: solo un
  // platform admin puede editarla (ver supabase/migrations/0004_generic_content.sql).
  const { data: guide, error: guideFetchError } = await supabase
    .from("guides")
    .select("id, client_company_id, current_version_id, is_generic")
    .eq("id", guideId)
    .maybeSingle();
  if (guideFetchError) return NextResponse.json({ error: guideFetchError.message }, { status: 500 });
  if (!guide) return NextResponse.json({ error: "Guía no encontrada." }, { status: 404 });

  if (guide.is_generic) {
    const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
    if (!isPlatformAdmin) {
      return NextResponse.json({ error: "No tienes permiso para editar contenido genérico." }, { status: 403 });
    }
  } else {
    const { data: role } = await supabase.rpc("my_role", {
      target_company_id: guide.client_company_id,
    });
    if (role !== "admin" && role !== "editor") {
      return NextResponse.json({ error: "No tienes permiso para editar esta guía." }, { status: 403 });
    }
  }

  // --- Campos que viven en la tabla "guides" (título, módulo, sistema si es genérica) ---
  const guidePatch: Record<string, unknown> = {};
  if (typeof body.title === "string") guidePatch.title = body.title;
  if (typeof body.module === "string" || body.module === null) guidePatch.module = body.module;
  if (guide.is_generic && typeof body.system === "string") guidePatch.system = body.system;

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

  // El .select() después de .update() hace que Supabase devuelva las filas que
  // realmente cambiaron. Si viene vacío pero no hubo "error", es que RLS bloqueó el
  // update en silencio (pasó de verdad: ver migración 0008) — mejor avisar que
  // "guardar" mintiendo que funcionó.
  if (Object.keys(versionPatch).length && guide.current_version_id) {
    const { data, error } = await supabase
      .from("guide_versions")
      .update(versionPatch)
      .eq("id", guide.current_version_id)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) {
      return NextResponse.json(
        { error: "No se pudo guardar el contenido (permiso denegado por la base de datos)." },
        { status: 403 }
      );
    }
  }

  // --- El quiz (preguntas/opciones/respuesta correcta) vive en su propia tabla ---
  if (Array.isArray(body.quiz) && guide.current_version_id) {
    const { data, error } = await supabase
      .from("quizzes")
      .update({ questions: body.quiz })
      .eq("guide_version_id", guide.current_version_id)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) {
      return NextResponse.json(
        { error: "No se pudo guardar el quiz (permiso denegado por la base de datos)." },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ guideId: string }> }
) {
  const { guideId } = await params;
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data: guide, error: guideFetchError } = await supabase
    .from("guides")
    .select("id, client_company_id, is_generic")
    .eq("id", guideId)
    .maybeSingle();
  if (guideFetchError) return NextResponse.json({ error: guideFetchError.message }, { status: 500 });
  if (!guide) return NextResponse.json({ error: "Guía no encontrada." }, { status: 404 });

  if (guide.is_generic) {
    const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
    if (!isPlatformAdmin) {
      return NextResponse.json({ error: "No tienes permiso para borrar contenido genérico." }, { status: 403 });
    }
  } else {
    const { data: role } = await supabase.rpc("my_role", {
      target_company_id: guide.client_company_id,
    });
    if (role !== "admin" && role !== "editor") {
      return NextResponse.json({ error: "No tienes permiso para borrar esta guía." }, { status: 403 });
    }
  }

  const { data, error } = await supabase.from("guides").delete().eq("id", guideId).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) {
    return NextResponse.json(
      { error: "No se pudo borrar (permiso denegado por la base de datos)." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
