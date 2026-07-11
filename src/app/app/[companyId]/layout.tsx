// Este layout envuelve TODAS las páginas bajo /app/[companyId]/... (admin y learn).
// Hace dos cosas clave:
//   1. Llama a requireCompanyAccess: si el usuario no tiene acceso a esta empresa,
//      lo redirige antes de mostrar nada (ver src/lib/auth.ts).
//   2. Dibuja el encabezado: logo de FlowGuide + nombre de la empresa a la izquierda,
//      "Inicio" (la única acción de navegación normal, siempre a la vista), y a la
//      derecha el menú de cuenta (componente UserMenu) con todo lo demás — Admin,
//      Contenido genérico, Nueva empresa, Cambiar empresa, Salir. Esas son acciones
//      administrativas/sensibles, así que quedan un clic más lejos en vez de sueltas
//      en la barra principal, mezcladas con la navegación de todos los días.
//
// El logo (public/logo-horizontal.png) queda SIEMPRE visible arriba a la izquierda,
// en todas las pantallas que pasan por este layout — es la única marca fija del sitio
// hoy (el login tiene su propio logo aparte, ver src/app/login/page.tsx).
//
// El <div style={themeCssVars(...)}> de acá abajo es lo que permite que cada empresa
// tenga sus propios colores de marca: si company.theme tiene algo guardado, pisa las
// variables CSS de color solo para esta pantalla para abajo (ver src/lib/auth.ts y
// src/app/globals.css). Si company.theme es null, no pisa nada y se ve con los
// colores default de FlowGuide.
import Image from "next/image";
import Link from "next/link";
import { requireCompanyAccess, canManageGuides, getAdminPartners, themeCssVars, type CompanyTheme } from "@/lib/auth";
import { UserMenu } from "./user-menu";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { supabase, user, company, role } = await requireCompanyAccess(companyId);
  const [{ data: isPlatformAdmin }, adminPartners] = await Promise.all([
    supabase.rpc("is_platform_admin"),
    getAdminPartners(),
  ]);
  const isPartnerAdmin = adminPartners.length > 0;

  return (
    <div className="min-h-screen bg-background" style={themeCssVars(company.theme as CompanyTheme | null)}>
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href={`/app/${companyId}/learn`} className="flex items-center gap-3">
            <Image src="/logo-horizontal.png" alt="FlowGuide" width={120} height={32} priority />
            <span className="hidden sm:block">
              <p className="text-sm font-semibold text-foreground">{company.name}</p>
              <p className="text-xs text-muted">{role}</p>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={`/app/${companyId}/learn`} className="text-neutral-600 hover:text-foreground">
              Inicio
            </Link>
            <UserMenu
              email={user.email ?? ""}
              companyId={companyId}
              canManageGuides={canManageGuides(role)}
              isPlatformAdmin={Boolean(isPlatformAdmin)}
              isPartnerAdmin={isPartnerAdmin}
            />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  );
}
