// Pantalla principal del usuario final: "¿Qué necesitas resolver hoy?".
// Combina los dos caminos que pedía el documento original del proyecto:
//   - Camino A (el principal): el buscador de texto libre, componente LearnSearch
//     (./learn-search.tsx), que usa la IA para interpretar la pregunta.
//   - Camino B (respaldo): los "chips" de módulo de acá abajo, agrupando las guías
//     por su campo "module" — para cuando el usuario no sabe cómo describir lo que
//     busca y prefiere navegar por categoría.
//
// Las guías que se listan acá son DOS grupos combinados: las propias de esta empresa
// (client_company_id = companyId) MÁS las guías genéricas de la plataforma cuyo
// "system" coincide con el que esta empresa tiene configurado (company.system, se
// edita en el panel admin). Si la empresa no configuró ningún sistema, solo ve las
// suyas. Ver supabase/migrations/0004_generic_content.sql para el detalle del modelo.
//
// Permisos por área (supabase/migrations/0005_areas.sql): las guías PROPIAS ya vienen
// filtradas solas por RLS según las áreas del usuario (si tiene alguna asignada). Las
// guías GENÉRICAS no pueden filtrarse en RLS (no tienen una sola empresa de
// referencia), así que ese filtro se hace acá a mano, con la misma regla: si el rol es
// admin/editor ve todo, si es viewer/aprendiz con áreas asignadas solo ve las
// genéricas sin módulo o con un módulo dentro de sus áreas.
import Link from "next/link";
import { requireCompanyAccess, canManageGuides } from "@/lib/auth";
import { LearnSearch } from "./learn-search";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { supabase, company, role, areas } = await requireCompanyAccess(companyId);

  const [{ data: ownGuides }, { data: genericGuides }] = await Promise.all([
    supabase.from("guides").select("id, title, module").eq("client_company_id", companyId),
    company.system
      ? supabase
          .from("guides")
          .select("id, title, module")
          .eq("is_generic", true)
          .eq("system", company.system)
      : Promise.resolve({ data: [] as { id: string; title: string; module: string | null }[] }),
  ]);

  const restrictToAreas = !canManageGuides(role) && areas && areas.length > 0;
  const visibleGenericGuides = restrictToAreas
    ? (genericGuides ?? []).filter((g) => !g.module || areas!.includes(g.module))
    : (genericGuides ?? []);

  const guides = [...(ownGuides ?? []), ...visibleGenericGuides].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  const modules = Array.from(
    new Set(guides.map((g) => g.module).filter((m): m is string => Boolean(m)))
  );

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-2 text-xl font-semibold text-foreground">¿Qué necesitas resolver hoy?</h1>
      <p className="mb-6 text-sm text-muted">
        Descríbelo con tus palabras, no hace falta que uses los términos exactos de la guía.
      </p>

      <LearnSearch companyId={companyId} />

      {modules.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-sm font-medium text-neutral-700">
            O elige un módulo si no sabes cómo describirlo:
          </p>
          <div className="flex flex-wrap gap-2">
            {modules.map((module) => (
              <a
                key={module}
                href={`#modulo-${encodeURIComponent(module)}`}
                className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-700 hover:border-neutral-500"
              >
                {module}
              </a>
            ))}
          </div>

          <div className="mt-6 space-y-6">
            {modules.map((module) => (
              <div key={module} id={`modulo-${encodeURIComponent(module)}`}>
                <h2 className="mb-2 text-sm font-semibold text-foreground">{module}</h2>
                <ul className="space-y-1">
                  {guides
                    .filter((g) => g.module === module)
                    .map((g) => (
                      <li key={g.id}>
                        <Link
                          href={`/app/${companyId}/learn/guide/${g.id}`}
                          className="text-sm text-neutral-700 hover:underline"
                        >
                          {g.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
