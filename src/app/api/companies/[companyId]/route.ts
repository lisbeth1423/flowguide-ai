// Endpoint: PATCH /api/companies/[companyId]
//
// Hoy solo se usa para un campo: "system" (qué ERP/POS usa esa empresa, ej. "SAP
// Business One"). Ese dato es lo que decide qué contenido genérico de la plataforma
// le llega automáticamente a esta empresa (ver supabase/migrations/0004_generic_content.sql
// y src/app/app/[companyId]/learn/page.tsx). Solo el admin de la empresa lo puede
// cambiar (mismo criterio que canManageGuides, pero restringido a "admin" — un editor
// no gestiona configuración de la empresa).
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const body = await request.json();

  const { data: role } = await supabase.rpc("my_role", { target_company_id: companyId });
  if (role !== "admin") {
    return NextResponse.json({ error: "Solo un admin de la empresa puede cambiar esto." }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.system === "string" || body.system === null) patch.system = body.system;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const { error } = await supabase.from("client_companies").update(patch).eq("id", companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
