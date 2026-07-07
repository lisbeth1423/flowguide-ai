// Endpoint: POST /api/guides/match
//
// Es el motor del "Camino A" de la pantalla de usuario final: "¿Qué necesitas
// resolver hoy?" (src/app/app/[companyId]/learn/learn-search.tsx). El usuario escribe
// con sus propias palabras, y acá se compara esa pregunta contra TODAS las guías de
// su empresa usando la IA (no busca coincidencia de palabras, interpreta el significado).
//
// Devuelve uno de estos 3 casos (definidos por la IA en matchGuide, src/lib/anthropic.ts):
//   - "single": hay una guía clara -> el frontend abre esa guía directo.
//   - "multiple": hay varias posibles -> el frontend muestra "¿Te refieres a...?".
//   - "none": ninguna guía resuelve lo que pide -> el frontend avisa que no encontró nada.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { matchGuide } from "@/lib/anthropic";

export async function POST(request: Request) {
  const { supabase } = await requireUser();
  const body = await request.json();
  const clientCompanyId = String(body.clientCompanyId ?? "");
  const query = String(body.query ?? "").trim();

  if (!clientCompanyId || !query) {
    return NextResponse.json({ error: "clientCompanyId y query son obligatorios." }, { status: 400 });
  }

  // Trae título + resumen (quick_guide) de todas las guías de la empresa. No hace
  // falta verificar el rol acá: cualquier usuario con acceso a la empresa (incluido
  // "aprendiz") puede buscar guías — eso ya lo garantiza RLS en la tabla "guides".
  const { data: guides, error } = await supabase
    .from("guides")
    .select("id, title, guide_versions:current_version_id(quick_guide)")
    .eq("client_company_id", clientCompanyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const guideSummaries = (guides ?? []).map((g) => {
    const version = Array.isArray(g.guide_versions) ? g.guide_versions[0] : g.guide_versions;
    return { id: g.id, title: g.title, quick_guide: version?.quick_guide ?? null };
  });

  const result = await matchGuide(query, guideSummaries);
  // La IA solo devuelve ids; acá le agregamos de vuelta el título y resumen de cada
  // guía encontrada para que el frontend pueda mostrarlos sin pedirlos de nuevo.
  const matchedGuides = guideSummaries.filter((g) => result.guide_ids.includes(g.id));

  return NextResponse.json({ ...result, guides: matchedGuides });
}
