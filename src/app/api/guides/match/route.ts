// Endpoint: POST /api/guides/match
//
// Es el motor del "Camino A" de la pantalla de usuario final: "¿Qué necesitas
// resolver hoy?" (src/app/app/[companyId]/learn/learn-search.tsx). El usuario escribe
// con sus propias palabras, y acá se compara esa pregunta contra TODAS las guías
// disponibles para su empresa usando la IA (no busca coincidencia de palabras,
// interpreta el significado). "Disponibles" son dos grupos: las guías propias de la
// empresa MÁS las guías genéricas de la plataforma cuyo "system" coincide con el de
// la empresa (ver supabase/migrations/0004_generic_content.sql).
//
// Devuelve uno de estos 3 casos (definidos por la IA en matchGuide, src/lib/anthropic.ts):
//   - "single": hay una guía clara -> el frontend abre esa guía directo.
//   - "multiple": hay varias posibles -> el frontend muestra "¿Te refieres a...?".
//   - "none": ninguna guía resuelve lo que pide -> el frontend avisa que no encontró nada.
import { NextResponse } from "next/server";
import { requireApiUser, canManageGuides, type Role } from "@/lib/auth";
import { matchGuide } from "@/lib/anthropic";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const clientCompanyId = String(body.clientCompanyId ?? "");
  const query = String(body.query ?? "").trim();

  if (!clientCompanyId || !query) {
    return NextResponse.json({ error: "clientCompanyId y query son obligatorios." }, { status: 400 });
  }

  // Necesitamos el "system" de la empresa para saber qué guías genéricas le tocan, y
  // el rol + áreas del usuario para saber si hay que filtrar esas genéricas por
  // permisos (ver supabase/migrations/0005_areas.sql — las guías propias ya vienen
  // filtradas solas por RLS, las genéricas no).
  const [{ data: company, error: companyError }, { data: role }, { data: accessRow }] = await Promise.all([
    supabase.from("client_companies").select("system").eq("id", clientCompanyId).maybeSingle(),
    supabase.rpc("my_role", { target_company_id: clientCompanyId }),
    supabase
      .from("user_client_access")
      .select("areas")
      .eq("client_company_id", clientCompanyId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 });

  // Trae título + resumen (quick_guide) de las guías propias + las genéricas que
  // apliquen. No hace falta verificar el rol acá para el acceso en sí: cualquier
  // usuario con acceso a la empresa (incluido "aprendiz") puede buscar guías — eso ya
  // lo garantiza RLS. El rol sí importa para el filtro por área de las genéricas.
  const [{ data: ownGuides, error: ownError }, { data: genericGuides, error: genericError }] =
    await Promise.all([
      supabase
        .from("guides")
        .select("id, title, guide_versions:current_version_id(quick_guide)")
        .eq("client_company_id", clientCompanyId),
      company?.system
        ? supabase
            .from("guides")
            .select("id, title, module, guide_versions:current_version_id(quick_guide)")
            .eq("is_generic", true)
            .eq("system", company.system)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (ownError) return NextResponse.json({ error: ownError.message }, { status: 500 });
  if (genericError) return NextResponse.json({ error: genericError.message }, { status: 500 });

  const areas = accessRow?.areas as string[] | null;
  const restrictToAreas = role && !canManageGuides(role as Role) && areas && areas.length > 0;
  const visibleGenericGuides = restrictToAreas
    ? (genericGuides ?? []).filter((g) => !g.module || areas!.includes(g.module))
    : (genericGuides ?? []);

  const guideSummaries = [...(ownGuides ?? []), ...visibleGenericGuides].map((g) => {
    const version = Array.isArray(g.guide_versions) ? g.guide_versions[0] : g.guide_versions;
    return { id: g.id, title: g.title, quick_guide: version?.quick_guide ?? null };
  });

  const result = await matchGuide(query, guideSummaries);
  // La IA solo devuelve ids; acá le agregamos de vuelta el título y resumen de cada
  // guía encontrada para que el frontend pueda mostrarlos sin pedirlos de nuevo.
  const matchedGuides = guideSummaries.filter((g) => result.guide_ids.includes(g.id));

  return NextResponse.json({ ...result, guides: matchedGuides });
}
