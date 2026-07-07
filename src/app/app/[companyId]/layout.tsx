// Este layout envuelve TODAS las páginas bajo /app/[companyId]/... (admin y learn).
// Hace dos cosas clave:
//   1. Llama a requireCompanyAccess: si el usuario no tiene acceso a esta empresa,
//      lo redirige antes de mostrar nada (ver src/lib/auth.ts).
//   2. Dibuja el encabezado con el nombre de la empresa, el rol del usuario, y los
//      links de navegación (Aprender / Admin / Cambiar empresa / Salir).
//
// El link "Admin" solo se muestra si canManageGuides(role) da true (o sea, admin o
// editor) — así un "aprendiz" ni siquiera ve la opción de entrar al panel admin.
//
// Si quieren cambiar el menú de arriba (agregar un link nuevo, cambiar el orden),
// es en el <nav> de acá abajo.
import Link from "next/link";
import { requireCompanyAccess, canManageGuides } from "@/lib/auth";
import { logout } from "@/app/login/actions";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { company, role } = await requireCompanyAccess(companyId);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">{company.name}</p>
            <p className="text-xs text-neutral-400">FlowGuide AI · {role}</p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={`/app/${companyId}/learn`} className="text-neutral-600 hover:text-neutral-900">
              Aprender
            </Link>
            {canManageGuides(role) && (
              <Link href={`/app/${companyId}/admin`} className="text-neutral-600 hover:text-neutral-900">
                Admin
              </Link>
            )}
            <Link href="/app" className="text-neutral-600 hover:text-neutral-900">
              Cambiar empresa
            </Link>
            <form action={logout}>
              <button type="submit" className="text-neutral-400 hover:text-neutral-700">
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
