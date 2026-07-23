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
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CSSProperties } from "react";

export type Role = "admin" | "editor" | "viewer" | "aprendiz";

// Forma del campo client_companies.theme (columna jsonb, puede ser null si la empresa
// usa la paleta default de FlowGuide). Todos los campos son opcionales: los que falten
// se completan con el default definido en src/app/globals.css.
export type CompanyTheme = {
  primary?: string;
  accent?: string;
  accentSoft?: string;
  background?: string;
  text?: string;
  mutedText?: string;
};

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

// Versión de requireUser() para rutas /api/*. redirect() (de next/navigation) está
// pensado para páginas — usado adentro de una API route, produce una respuesta HTTP
// de redirección que el fetch() del navegador SIGUE solo, terminando por traerse el
// HTML de /login en vez de JSON. Eso se veía en pantalla como el mensaje sin sentido
// "Unexpected token '<' ... is not valid JSON" cada vez que la sesión ya había
// expirado (típicamente el error salía en segundos, sin importar qué se estuviera
// subiendo — no era un problema de tamaño de archivo).
//
// Uso: `const auth = await requireApiUser(); if (!auth.ok) return auth.response;`
export async function requireApiUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Tu sesión expiró. Volvé a iniciar sesión y probá de nuevo." },
        { status: 401 }
      ),
    };
  }

  return { ok: true as const, supabase, user };
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

  // Estas 3 consultas no dependen una de la otra (ninguna necesita el resultado de
  // las demás para armar su propio pedido), así que se piden las 3 A LA VEZ con
  // Promise.all en vez de una detrás de la otra — en una página que antes hacía 3
  // viajes de ida y vuelta a Supabase, ahora hace 1. Esto es lo que más se nota en
  // la velocidad de las páginas bajo /app/[companyId]/..., porque TODAS pasan por acá.
  const [{ data: company, error }, { data: role }, { data: accessRow }] = await Promise.all([
    supabase
      .from("client_companies")
      .select("id, name, partner_id, theme, system")
      .eq("id", companyId)
      .maybeSingle(),
    supabase.rpc("my_role", { target_company_id: companyId }),
    // Áreas asignadas a este usuario en esta empresa (ver
    // supabase/migrations/0005_areas.sql). Solo importan si el rol es viewer/aprendiz —
    // admin/editor siempre ven todo, sin importar esto. Si el usuario llegó acá siendo
    // partner_admin (no tiene fila propia en user_client_access), areas queda null, que
    // de todos modos no importa porque su rol ya es "admin".
    supabase
      .from("user_client_access")
      .select("areas")
      .eq("client_company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (error) throw error;
  if (!company) redirect("/app");
  if (!role) redirect("/app");

  return { supabase, user, company, role: role as Role, areas: accessRow?.areas ?? null };
}

// Punto único donde se decide "qué roles pueden entrar al panel admin y crear/editar
// guías". Si en el futuro quieren dar ese permiso a otro rol, se cambia solo acá.
export function canManageGuides(role: Role) {
  return role === "admin" || role === "editor";
}

// Partners donde el usuario actual es "partner_admin" (administra TODAS las empresas
// de ese partner, y puede crear empresas nuevas bajo él — ver
// supabase/migrations/0006_partner_creates_companies.sql). Se usa para decidir si
// mostrar el link "+ Nueva empresa" y, si hay más de un partner, para elegir bajo
// cuál crearla. La mayoría de los usuarios no son partner_admin de nada: van a tener
// una lista vacía acá, y no ven ese link.
export async function getAdminPartners(): Promise<{ id: string; name: string }[]> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("partner_admins")
    .select("partners(id, name)")
    .eq("user_id", user.id);
  if (error) throw error;

  return (data ?? [])
    .map((row) => (Array.isArray(row.partners) ? row.partners[0] : row.partners))
    .filter((p): p is { id: string; name: string } => Boolean(p));
}

// "Platform admin" es un rol aparte de los 4 de arriba: no está atado a ninguna
// empresa ni partner, es para quien administra el contenido GENÉRICO de toda la
// plataforma (ver supabase/migrations/0004_generic_content.sql). Hoy en día se
// otorga a mano por SQL (tabla platform_admins) — no hay pantalla para auto-asignarse
// este rol, a propósito.
export async function requirePlatformAdmin() {
  const { supabase, user } = await requireUser();

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) redirect("/app");

  return { supabase, user };
}

// Convierte el theme de una empresa (o null) en variables CSS para pisar la paleta
// default de FlowGuide (definida en src/app/globals.css). Se usa en un
// <div style={themeCssVars(company.theme)}> que envuelve toda la pantalla de esa
// empresa — cualquier campo que la empresa no haya personalizado queda sin pisar,
// así que sigue usando el color default automáticamente.
export function themeCssVars(theme: CompanyTheme | null | undefined): CSSProperties {
  if (!theme) return {};
  return {
    ...(theme.primary && { "--color-primary": theme.primary }),
    ...(theme.accent && { "--color-accent": theme.accent }),
    ...(theme.accentSoft && { "--color-accent-soft": theme.accentSoft }),
    ...(theme.background && { "--background": theme.background }),
    ...(theme.text && { "--foreground": theme.text }),
    ...(theme.mutedText && { "--color-muted": theme.mutedText }),
  } as CSSProperties;
}
