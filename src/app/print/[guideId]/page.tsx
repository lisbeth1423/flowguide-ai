// Vista "para imprimir / PDF" de una guía. Es una página aparte y más simple
// (sin el menú de arriba de la app) para que al imprimir o "Guardar como PDF" desde
// el navegador, salga solo el contenido de la guía, sin botones ni menús alrededor.
//
// Nota: esta página vive en /print/[guideId] (fuera de /app/[companyId]/...) a
// propósito, para no arrastrar el encabezado del layout de empresa
// (src/app/app/[companyId]/layout.tsx). Por eso vuelve a verificar el login acá
// (requireUser) en vez de depender del layout de la empresa.
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PrintButton } from "./print-button";

export default async function PrintGuidePage({
  params,
}: {
  params: Promise<{ guideId: string }>;
}) {
  const { guideId } = await params;
  const { supabase } = await requireUser();

  // RLS scopes this to guides the user has access to; a mismatch means not found, not a leak.
  const { data: guide, error } = await supabase
    .from("guides")
    .select(
      "title, module, guide_versions:current_version_id(objetivo, precondiciones, pasos, advertencias, resultado_esperado, quick_guide, faq)"
    )
    .eq("id", guideId)
    .maybeSingle();
  if (error) throw error;
  if (!guide) notFound();

  const version = Array.isArray(guide.guide_versions) ? guide.guide_versions[0] : guide.guide_versions;
  if (!version) notFound();

  const pasos = (version.pasos as string[]) ?? [];
  const faq = (version.faq as { pregunta: string; respuesta: string }[]) ?? [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0">
      <div className="mb-6 print:hidden">
        <PrintButton />
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-foreground">{guide.title}</h1>
      {guide.module && <p className="mb-6 text-sm text-muted">Módulo: {guide.module}</p>}

      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold uppercase text-muted">Quick guide</h2>
        <p className="whitespace-pre-line text-sm text-neutral-800">{version.quick_guide}</p>
      </section>

      {version.objetivo && (
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold uppercase text-muted">Objetivo</h2>
          <p className="whitespace-pre-line text-sm text-neutral-800">{version.objetivo}</p>
        </section>
      )}

      {version.precondiciones && (
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold uppercase text-muted">
            Precondiciones
          </h2>
          <p className="whitespace-pre-line text-sm text-neutral-800">{version.precondiciones}</p>
        </section>
      )}

      {pasos.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold uppercase text-muted">Pasos</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-800">
            {pasos.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </section>
      )}

      {version.advertencias && (
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold uppercase text-muted">Advertencias</h2>
          <p className="whitespace-pre-line text-sm text-neutral-800">{version.advertencias}</p>
        </section>
      )}

      {version.resultado_esperado && (
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold uppercase text-muted">
            Resultado esperado
          </h2>
          <p className="whitespace-pre-line text-sm text-neutral-800">
            {version.resultado_esperado}
          </p>
        </section>
      )}

      {faq.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-muted">
            Preguntas frecuentes
          </h2>
          <div className="space-y-3">
            {faq.map((f, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-foreground">{f.pregunta}</p>
                <p className="text-sm text-neutral-700">{f.respuesta}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
