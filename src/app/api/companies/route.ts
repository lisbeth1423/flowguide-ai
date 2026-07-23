// Endpoint: POST /api/companies
//
// Crea una empresa cliente NUEVA bajo un partner. Solo lo puede hacer un
// "partner_admin" de ese partner (ver supabase/migrations/0006_partner_creates_companies.sql
// y src/lib/auth.ts → getAdminPartners). No hace falta agregar una fila en
// user_client_access para quien la crea: un partner_admin ya tiene acceso admin a
// TODAS las empresas de su partner automáticamente.
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const body = await request.json();

  const partnerId = String(body.partnerId ?? "");
  const name = String(body.name ?? "").trim();
  const system = body.system ? String(body.system).trim() : null;

  if (!partnerId || !name) {
    return NextResponse.json({ error: "partnerId y name son obligatorios." }, { status: 400 });
  }

  // El insert lo hace el cliente AUTENTICADO: la política de RLS
  // (client_companies_insert) es la que de verdad decide si esto puede pasar —
  // si el usuario no es partner_admin de ese partnerId, Supabase lo rechaza solo,
  // sin que haga falta duplicar ese chequeo acá a mano.
  const { data: company, error } = await supabase
    .from("client_companies")
    .insert({ partner_id: partnerId, name, system })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo crear la empresa (¿sos partner admin de ese partner?): " + error.message },
      { status: 403 }
    );
  }

  return NextResponse.json({ companyId: company.id });
}
