// Endpoints: PATCH y DELETE /api/companies/[companyId]/users/[userId]
//
// PATCH: cambia el rol y/o las áreas de un usuario que YA tiene acceso a esta empresa.
// DELETE: le quita el acceso a esta empresa (no borra la cuenta del usuario, por si
// tiene acceso a otras empresas también — solo borra la fila de user_client_access).
// Los dos requieren ser "admin" de la empresa.
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";

async function requireCompanyAdmin(companyId: string) {
  const auth = await requireApiUser();
  if (!auth.ok) return { ok: false as const, response: auth.response };
  const { supabase } = auth;
  const { data: role } = await supabase.rpc("my_role", { target_company_id: companyId });
  return { ok: true as const, supabase, isAdmin: role === "admin" };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ companyId: string; userId: string }> }
) {
  const { companyId, userId } = await params;
  const auth = await requireCompanyAdmin(companyId);
  if (!auth.ok) return auth.response;
  const { supabase, isAdmin } = auth;
  if (!isAdmin) return NextResponse.json({ error: "Solo un admin puede editar usuarios." }, { status: 403 });

  const body = await request.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.role === "string") patch.role = body.role;
  if (Array.isArray(body.areas)) patch.areas = body.areas;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_client_access")
    .update(patch)
    .eq("client_company_id", companyId)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ companyId: string; userId: string }> }
) {
  const { companyId, userId } = await params;
  const auth = await requireCompanyAdmin(companyId);
  if (!auth.ok) return auth.response;
  const { supabase, isAdmin } = auth;
  if (!isAdmin) return NextResponse.json({ error: "Solo un admin puede quitar usuarios." }, { status: 403 });

  const { error } = await supabase
    .from("user_client_access")
    .delete()
    .eq("client_company_id", companyId)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
