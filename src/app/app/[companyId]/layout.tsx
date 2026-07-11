// Este layout envuelve TODAS las páginas bajo /app/[companyId]/... (admin y learn).
// Hace dos cosas clave:
//   1. Llama a requireCompanyAccess: si el usuario no tiene acceso a esta empresa,
//      lo redirige antes de mostrar nada (ver src/lib/auth.ts).
//   2. Dibuja el encabezado con el nombre de la empresa, el rol del usuario, y los
//      links de navegación (Aprender / Admin / Cambiar empresa / Salir, más los
//      condicionales de abajo).
//
// El link "Admin" solo se muestra si canManageGuides(role) da true (o sea, admin o
// editor) — así un "aprendiz" ni siquiera ve la opción de entrar al panel admin.
// "Contenido genérico" solo aparece si es platform admin, "+ Nueva empresa" solo si
// es partner admin de algún partner (ver supabase/migrations/0006_partner_creates_companies.sql).
//
// Si quieren cambiar el menú de arriba (agregar un link nuevo, cambiar el orden),
// es en el <nav> de acá abajo.
//
// El nombre de la empresa/marca (arriba a la izquierda) es un link a "Aprender" —
// es el "botón Home": el patrón habitual en casi cualquier sitio es que el logo/marca
// lleve al inicio, así que lo hicimos clicable en vez de agregar un link de texto
// "Inicio" aparte.
//
// El <div style={themeCssVars(...)}> de acá abajo es lo que permite que cada empresa
// tenga sus propios colores de marca: si company.theme tiene algo guardado, pisa las
// variables CSS de color solo para esta pantalla para abajo (ver src/lib/auth.ts y
// src/app/globals.css). Si company.theme es null, no pisa nada y se ve con los
// colores default de FlowGuide.
import Link from "next/link";
import { requireCompanyAccess, canManageGuides, getAdminPartners, themeCssVars, type CompanyTheme } from "@/lib/auth";
import { logout } from "@/app/login/actions";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { supabase, company, role } = await requireCompanyAccess(companyId);
  const [{ data: isPlatformAdmin }, adminPartners] = await Promise.all([
    supabase.rpc("is_platform_admin"),
    getAdminPartners(),
  ]);
  const isPartnerAdmin = adminPartners.length > 0;

  return (
    <div className="min-h-screen bg-background" style={themeCssVars(company.theme as CompanyTheme | null)}>
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href={`/app/${companyId}/learn`} className="block">
            <p className="text-sm font-semibold text-foreground">{company.name}</p>
            <p className="text-xs text-muted">FlowGuide · {role}</p>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={`/app/${companyId}/learn`} className="text-neutral-600 hover:text-foreground">
              Aprender
            </Link>
            {canManageGuides(role) && (
              <Link href={`/app/${companyId}/admin`} className="text-neutral-600 hover:text-foreground">
                Admin
              </Link>
            )}
            {isPlatformAdmin && (
              <Link href="/platform-admin/guides" className="text-neutral-600 hover:text-foreground">
                Contenido genérico
              </Link>
            )}
            {isPartnerAdmin && (
              <Link href="/app/new-company" className="text-neutral-600 hover:text-foreground">
                + Nueva empresa
              </Link>
            )}
            <Link href="/app" className="text-neutral-600 hover:text-foreground">
              Cambiar empresa
            </Link>
            <form action={logout}>
              <button type="submit" className="text-muted hover:text-neutral-700">
                Salir
              </button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  );
}
