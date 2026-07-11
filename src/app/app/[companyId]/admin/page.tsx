// Página principal del panel admin (/app/[companyId]/admin): la "biblioteca de guías".
// Muestra una tabla con todas las guías de la empresa, con buscador por título, y
// cuántas veces se leyó / se tomó el examen de cada una (conteos, no el detalle —
// el detalle de "quién" está en la página de cada guía: admin/guides/[guideId]/page.tsx).
//
// Solo entra acá quien tiene rol "admin" o "editor" (canManageGuides) — un "viewer" o
// "aprendiz" que intente entrar por URL es redirigido a la vista de aprendizaje.
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompanyAccess, canManageGuides } from "@/lib/auth";
import { CompanySystemField } from "./company-system-field";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { companyId } = await params;
  const { supabase, role, company } = await requireCompanyAccess(companyId);
  if (!canManageGuides(role)) redirect(`/app/${companyId}/learn`);

  const { q } = await searchParams;

  let query = supabase
    .from("guides")
    .select("id, title, module, language, created_at")
    .eq("client_company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("title", `%${q}%`);

  const { data: guides, error } = await query;
  if (error) throw error;

  const guideIds = guides?.map((g) => g.id) ?? [];

  // Trae TODAS las lecturas e intentos de examen de estas guías, y después los
  // contamos "a mano" en JavaScript (readCounts / attemptCounts, abajo). Para pocas
  // guías/lecturas (lo normal en el piloto) es rápido y simple; si la empresa
  // acumula miles de lecturas, convendría mover este conteo a una consulta SQL
  // con GROUP BY en vez de traer todas las filas.
  const [{ data: reads }, { data: attempts }] = await Promise.all([
    guideIds.length
      ? supabase.from("guide_reads").select("guide_id").in("guide_id", guideIds)
      : Promise.resolve({ data: [] as { guide_id: string }[] }),
    guideIds.length
      ? supabase
          .from("quiz_attempts")
          .select("quiz_id, score, passed, quizzes!inner(guide_version_id, guide_versions!inner(guide_id))")
          .eq("client_company_id", companyId)
      : Promise.resolve({ data: [] as { quiz_id: string }[] }),
  ]);

  const readCounts = new Map<string, number>();
  for (const r of reads ?? []) {
    readCounts.set(r.guide_id, (readCounts.get(r.guide_id) ?? 0) + 1);
  }

  const attemptCounts = new Map<string, number>();
  for (const a of (attempts ?? []) as unknown as {
    quizzes: { guide_versions: { guide_id: string } };
  }[]) {
    const guideId = a.quizzes?.guide_versions?.guide_id;
    if (guideId) attemptCounts.set(guideId, (attemptCounts.get(guideId) ?? 0) + 1);
  }

  return (
    <div>
      {role === "admin" && (
        <CompanySystemField companyId={companyId} initialSystem={company.system ?? ""} />
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Biblioteca de guías</h1>
        <div className="flex gap-2">
          {role === "admin" && (
            <Link
              href={`/app/${companyId}/admin/users`}
              className="rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:border-neutral-500"
            >
              Usuarios
            </Link>
          )}
          <Link
            href={`/app/${companyId}/admin/guides/new`}
            className="rounded bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Nueva guía
          </Link>
        </div>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por título..."
          className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </form>

      {!guides?.length ? (
        <p className="text-sm text-muted">Todavía no hay guías. Crea la primera.</p>
      ) : (
        <div className="overflow-hidden rounded border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2">Módulo</th>
                <th className="px-4 py-2">Idioma</th>
                <th className="px-4 py-2">Lecturas</th>
                <th className="px-4 py-2">Intentos de examen</th>
              </tr>
            </thead>
            <tbody>
              {guides.map((guide) => (
                <tr key={guide.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">
                    <Link
                      href={`/app/${companyId}/admin/guides/${guide.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {guide.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">{guide.module ?? "—"}</td>
                  <td className="px-4 py-2 text-muted">{guide.language}</td>
                  <td className="px-4 py-2 text-muted">{readCounts.get(guide.id) ?? 0}</td>
                  <td className="px-4 py-2 text-muted">{attemptCounts.get(guide.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
