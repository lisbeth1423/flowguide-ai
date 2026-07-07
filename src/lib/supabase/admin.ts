// Cliente de Supabase "todopoderoso": usa la SUPABASE_SERVICE_ROLE_KEY, que SE SALTA
// todas las reglas de seguridad (RLS) de la base de datos.
//
// ⚠️ MUY IMPORTANTE:
// - Solo se puede usar en código de servidor (API routes, Server Components). NUNCA
//   en un archivo "use client", porque ahí el código viaja al navegador del usuario y
//   cualquiera podría copiar la clave y ver/borrar TODA la base de datos.
// - Úsalo solo cuando de verdad haga falta saltarse RLS. Hoy en día se usa para:
//   1. Buscar el email de un usuario a partir de su ID (para mostrar "quién leyó esta
//      guía" en el panel admin — la tabla de usuarios de Supabase Auth no es visible
//      con el cliente normal).
//   2. Scripts de arranque (crear el primer partner/empresa/usuario, ver
//      supabase/bootstrap_example.sql).
//
// Si en el futuro agregan "invitar usuario por email" desde el panel admin, también
// se usaría este cliente (con supabase.auth.admin.createUser).
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
