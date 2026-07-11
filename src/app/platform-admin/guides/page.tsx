// Biblioteca de guías GENÉRICAS (is_generic = true), agrupadas por sistema. Es el
// equivalente de la biblioteca de guías de una empresa
// (src/app/app/[companyId]/admin/page.tsx) pero para contenido compartido de la
// plataforma.
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth";

export default async function GenericGuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase } = await requirePlatformAdmin();
  const { q } = await searchParams;

  let query = supabase
    .from("guides")
    .select("id, title, system, module, language, created_at")
    .eq("is_generic", true)
    .order("system")
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("title", `%${q}%`);

  const { data: guides, error } = await query;
  if (error) throw error;

  const bySystem = new Map<string, typeof guides>();
  for (const guide of guides ?? []) {
    const key = guide.system ?? "Sin sistema asignado";
    bySystem.set(key, [...(bySystem.get(key) ?? []), guide]);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Guías genéricas</h1>
        <Link
          href="/platform-admin/guides/new"
          className="rounded bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          + Nueva guía genérica
        </Link>
      </div>

      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por título..."
          className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </form>

      {!guides?.length ? (
        <p className="text-sm text-muted">
          Todavía no hay guías genéricas. Creá la primera para un sistema (ej. SAP
          Business One).
        </p>
      ) : (
        <div className="space-y-6">
          {Array.from(bySystem.entries()).map(([system, systemGuides]) => (
            <div key={system}>
              <h2 className="mb-2 text-sm font-semibold text-foreground">{system}</h2>
              <div className="overflow-hidden rounded border border-neutral-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-background text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-2">Título</th>
                      <th className="px-4 py-2">Módulo</th>
                      <th className="px-4 py-2">Idioma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemGuides?.map((guide) => (
                      <tr key={guide.id} className="border-t border-neutral-100">
                        <td className="px-4 py-2">
                          <Link
                            href={`/platform-admin/guides/${guide.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {guide.title}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-muted">{guide.module ?? "—"}</td>
                        <td className="px-4 py-2 text-muted">{guide.language}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
