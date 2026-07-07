// Funciones de ayuda para saber "¿quién es este usuario?" y "¿qué puede hacer?".
//
// Casi toda página del panel admin y del flujo de aprendizaje empieza llamando a
// requireUser() o requireCompanyAccess(). Si algún día agregan una página nueva bajo
// /app/[companyId]/algo, esta es la función que hay que llamar primero para protegerla.
//
// Los 4 roles posibles (definidos también en la base de datos, tabla user_client_access):
//   - admin    -> puede crear/editar guías y ver quién ha leído qué, en esa empresa.
//   - editor   -> igual que admin para guías, pero no gestiona usuarios/accesos.
//   - viewer   -> solo puede leer guías y tomar exámenes, sin ver reportes.
//   - aprendiz -> lo mismo que viewer (pensado para el usuario final típico).
// canManageGuides() es la función que decide si un rol puede entrar al panel admin.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "editor" | "viewer" | "aprendiz";

// Confirma que hay una sesión iniciada. Si no la hay, manda al usuario a /login.
// Se usa al principio de cualquier página o API route que requiera estar logueado.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return { supabase, user };
}

export type AccessibleCompany = {
  id: string;
  name: string;
  partner_id: string;
  role: Role;
};

// Devuelve la lista de empresas (client_companies) que el usuario actual puede ver,
// cada una con el rol que tiene ahí. La base de datos (RLS) ya se encarga de que
// client_companies solo devuelva empresas a las que el usuario tiene acceso — acá
// solo agregamos el "rol" de cada una llamando a la función SQL my_role() una vez
// por empresa (my_role vive en supabase/migrations/0002_rls.sql).
export async function getAccessibleCompanies(): Promise<AccessibleCompany[]> {
  const { supabase } = await requireUser();

  const { data: companies, error } = await supabase
    .from("client_companies")
    .select("id, name, partner_id")
    .order("name");

  if (error) throw error;
  if (!companies?.length) return [];

  const withRoles = await Promise.all(
    companies.map(async (company) => {
      const { data: role } = await supabase.rpc("my_role", {
        target_company_id: company.id,
      });
      return { ...company, role: (role as Role) ?? "viewer" };
    })
  );

  return withRoles;
}

// Verifica que el usuario tenga acceso a la empresa `companyId` y devuelve su rol ahí.
// Si no tiene acceso (o la empresa no existe), lo manda de vuelta al selector de
// empresas (/app). Todas las páginas dentro de /app/[companyId]/... llaman a esto
// para no depender solo de la URL — aunque alguien adivine el ID de otra empresa,
// esta función (respaldada por RLS) le va a negar el paso.
export async function requireCompanyAccess(companyId: string) {
  const { supabase, user } = await requireUser();

  const { data: company, error } = await supabase
    .from("client_companies")
    .select("id, name, partner_id")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw error;
  if (!company) redirect("/app");

  const { data: role } = await supabase.rpc("my_role", {
    target_company_id: companyId,
  });

  if (!role) redirect("/app");

  return { supabase, user, company, role: role as Role };
}

// Punto único donde se decide "qué roles pueden entrar al panel admin y crear/editar
// guías". Si en el futuro quieren dar ese permiso a otro rol, se cambia solo acá.
export function canManageGuides(role: Role) {
  return role === "admin" || role === "editor";
}
