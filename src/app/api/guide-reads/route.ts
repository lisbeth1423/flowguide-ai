// Endpoint: POST /api/guide-reads
//
// Registra "este usuario abrió esta guía" en la tabla guide_reads (para el reporte
// de "quién ha leído qué" del panel admin).
//
// ⚠️ Aviso para quien mantenga esto: HOY este endpoint no lo llama nadie. El registro
// de lectura se hace directo dentro de la página de la guía
// (src/app/app/[companyId]/learn/guide/[guideId]/page.tsx, que corre en el servidor y
// puede insertar en la base de datos sin pasar por una API). Este archivo quedó armado
// por si en el futuro se necesita registrar la lectura desde el navegador (por ejemplo,
// si agregan una app tipo "quiosco" o una vista que no sea una página de servidor).
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const guideId = String(body.guideId ?? "");
  const clientCompanyId = String(body.clientCompanyId ?? "");

  if (!guideId || !clientCompanyId) {
    return NextResponse.json({ error: "guideId y clientCompanyId son obligatorios." }, { status: 400 });
  }

  const { error } = await supabase.from("guide_reads").insert({
    guide_id: guideId,
    client_company_id: clientCompanyId,
    user_id: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
