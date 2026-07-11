// Layout de la zona de "platform admin": el panel para administrar el contenido
// GENÉRICO de toda la plataforma (no de una empresa puntual). Está fuera de
// /app/[companyId]/... a propósito, porque el contenido genérico no pertenece a
// ninguna empresa.
//
// requirePlatformAdmin() corta el paso a cualquiera que no tenga ese rol (ver
// src/lib/auth.ts y la tabla platform_admins en
// supabase/migrations/0004_generic_content.sql).
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth";
import { logout } from "@/app/login/actions";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Contenido genérico</p>
            <p className="text-xs text-muted">FlowGuide · platform admin</p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/platform-admin/guides" className="text-neutral-600 hover:text-foreground">
              Guías genéricas
            </Link>
            <Link href="/app" className="text-neutral-600 hover:text-foreground">
              Ir a mis empresas
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
