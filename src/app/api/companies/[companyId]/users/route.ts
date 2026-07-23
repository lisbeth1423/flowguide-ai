// Endpoints: GET y POST /api/companies/[companyId]/users
//
// GET: lista los usuarios que tienen acceso a esta empresa, con su rol y áreas
// (usa createAdminClient() para poder mostrar el EMAIL de cada uno — la tabla de
// usuarios de Supabase Auth no se puede leer con el cliente normal, igual que en
// admin/guides/[guideId]/page.tsx).
//
// POST: invita/agrega un usuario a esta empresa.
//   - Si el email no existe todavía en FlowGuide, crea la cuenta (con una contraseña
//     temporal generada al azar, que se devuelve UNA sola vez en la respuesta para que
//     el admin se la pase a la persona — no hay envío de email automático todavía,
//     ver GUIA_DEL_PROYECTO.md).
//   - Si el email YA existe (la persona ya usa FlowGuide en otra empresa), reutiliza
//     esa cuenta y solo le agrega acceso a ESTA empresa.
// Ambos casos requieren que quien hace el pedido sea "admin" de la empresa (no
// alcanza con "editor" — gestionar usuarios es más sensible que gestionar guías).
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireCompanyAdmin(companyId: string) {
  const auth = await requireApiUser();
  if (!auth.ok) return { ok: false as const, response: auth.response };
  const { supabase, user } = auth;
  const { data: role } = await supabase.rpc("my_role", { target_company_id: companyId });
  return { ok: true as const, supabase, user, isAdmin: role === "admin" };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const auth = await requireCompanyAdmin(companyId);
  if (!auth.ok) return auth.response;
  const { supabase, isAdmin } = auth;
  if (!isAdmin) return NextResponse.json({ error: "Solo un admin puede ver esto." }, { status: 403 });

  const { data: rows, error } = await supabase
    .from("user_client_access")
    .select("id, user_id, role, areas, created_at")
    .eq("client_company_id", companyId)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();
  const users = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data } = await admin.auth.admin.getUserById(row.user_id);
      return {
        accessId: row.id,
        userId: row.user_id,
        email: data.user?.email ?? row.user_id,
        role: row.role,
        areas: row.areas ?? [],
      };
    })
  );

  return NextResponse.json({ users });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const auth = await requireCompanyAdmin(companyId);
  if (!auth.ok) return auth.response;
  const { supabase, isAdmin } = auth;
  if (!isAdmin) return NextResponse.json({ error: "Solo un admin puede invitar usuarios." }, { status: 403 });

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "aprendiz");
  const areas = Array.isArray(body.areas) ? (body.areas as string[]) : [];

  if (!email) return NextResponse.json({ error: "email es obligatorio." }, { status: 400 });
  if (!["admin", "editor", "viewer", "aprendiz"].includes(role)) {
    return NextResponse.json({ error: "role inválido." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Busca si ese email ya es un usuario de FlowGuide (de otra empresa, por ejemplo).
  // La API de Supabase no tiene "buscar por email" directo, así que se lista y se
  // filtra acá — para el tamaño de este piloto (decenas/cientos de usuarios, no
  // millones) es una solución razonable.
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = existing?.users.find((u) => u.email?.toLowerCase() === email);

  let userId: string;
  let tempPassword: string | null = null;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    tempPassword = randomBytes(9).toString("base64url"); // ej. "kQ3f8-Xz2LpN1a"
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // no hay envío de email de confirmación configurado todavía
    });
    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message ?? "No se pudo crear el usuario." },
        { status: 500 }
      );
    }
    userId = created.user.id;
  }

  // Este insert lo hace el cliente AUTENTICADO (no el admin), así RLS confirma de
  // nuevo que quien pide esto es admin de la empresa — doble candado, no solo el
  // chequeo de arriba.
  const { error: accessError } = await supabase.from("user_client_access").insert({
    user_id: userId,
    client_company_id: companyId,
    role,
    areas,
  });
  if (accessError) {
    return NextResponse.json({ error: accessError.message }, { status: 500 });
  }

  return NextResponse.json({ userId, email, tempPassword });
}
