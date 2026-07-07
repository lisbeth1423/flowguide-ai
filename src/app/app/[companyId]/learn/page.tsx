import Link from "next/link";
import { requireCompanyAccess } from "@/lib/auth";
import { LearnSearch } from "./learn-search";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { supabase } = await requireCompanyAccess(companyId);

  const { data: guides } = await supabase
    .from("guides")
    .select("id, title, module")
    .eq("client_company_id", companyId)
    .order("title");

  const modules = Array.from(
    new Set((guides ?? []).map((g) => g.module).filter((m): m is string => Boolean(m)))
  );

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-2 text-xl font-semibold text-neutral-900">¿Qué necesitas resolver hoy?</h1>
      <p className="mb-6 text-sm text-neutral-500">
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
                <h2 className="mb-2 text-sm font-semibold text-neutral-900">{module}</h2>
                <ul className="space-y-1">
                  {(guides ?? [])
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
