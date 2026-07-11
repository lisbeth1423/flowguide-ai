// Página donde el usuario final lee una guía. Primero muestra el "quick guide"
// (resumen accionable) y desde ahí se puede expandir a la guía completa + FAQ
// (eso lo maneja el componente GuideBody, en ./guide-body.tsx). Desde acá también
// se entra al examen (quiz/page.tsx) y se puede exportar la guía.
//
// Cada vez que alguien ABRE esta página se inserta una fila en "guide_reads" (ver
// más abajo) — así es como el panel admin sabe "quién ha leído esta guía". Ojo: se
// registra en cada visita, no una sola vez por usuario (si alguien la abre 3 veces,
// quedan 3 registros) — es una decisión a propósito, para poder ver también CUÁNDO
// vuelve la gente a consultarla.
//
// La guía puede ser propia de esta empresa O una guía genérica de la plataforma (ver
// supabase/migrations/0004_generic_content.sql) — por eso el filtro de abajo acepta
// las dos posibilidades en vez de solo "client_company_id = companyId". El guide_read
// igual se guarda con el companyId de quien la está leyendo, no importa si la guía es
// genérica o no — así el reporte de esta empresa sigue siendo consistente.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompanyAccess } from "@/lib/auth";
import { GuideBody } from "./guide-body";

export default async function GuidePage({
  params,
}: {
  params: Promise<{ companyId: string; guideId: string }>;
}) {
  const { companyId, guideId } = await params;
  const { supabase, user } = await requireCompanyAccess(companyId);

  const { data: guide, error } = await supabase
    .from("guides")
    .select(
      "id, title, module, guide_versions:current_version_id(id, objetivo, precondiciones, pasos, advertencias, resultado_esperado, quick_guide, faq)"
    )
    .eq("id", guideId)
    .or(`client_company_id.eq.${companyId},is_generic.eq.true`)
    .maybeSingle();
  if (error) throw error;
  if (!guide) notFound();

  const version = Array.isArray(guide.guide_versions) ? guide.guide_versions[0] : guide.guide_versions;

  const { data: quiz } = version
    ? await supabase
        .from("quizzes")
        .select("id, questions")
        .eq("guide_version_id", version.id)
        .maybeSingle()
    : { data: null };

  await supabase.from("guide_reads").insert({
    guide_id: guideId,
    client_company_id: companyId,
    user_id: user.id,
  });

  if (!version) {
    return <p className="text-sm text-muted">Esta guía todavía no tiene contenido.</p>;
  }

  const hasQuiz = Boolean(quiz?.questions && (quiz.questions as unknown[]).length > 0);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/app/${companyId}/learn`} className="text-sm text-muted hover:underline">
        ← Volver
      </Link>
      <h1 className="mb-1 mt-2 text-xl font-semibold text-foreground">{guide.title}</h1>
      {guide.module && <p className="mb-6 text-sm text-muted">Módulo: {guide.module}</p>}

      <GuideBody
        quickGuide={version.quick_guide ?? ""}
        objetivo={version.objetivo ?? ""}
        precondiciones={version.precondiciones ?? ""}
        pasos={(version.pasos as string[]) ?? []}
        advertencias={version.advertencias ?? ""}
        resultadoEsperado={version.resultado_esperado ?? ""}
        faq={(version.faq as { pregunta: string; respuesta: string }[]) ?? []}
      />

      <div className="mt-6 flex gap-3">
        {hasQuiz && (
          <Link
            href={`/app/${companyId}/learn/guide/${guideId}/quiz`}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Tomar examen
          </Link>
        )}
        <a
          href={`/api/guides/${guideId}/export`}
          className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:border-neutral-500"
        >
          Descargar Markdown
        </a>
        <Link
          href={`/print/${guideId}`}
          target="_blank"
          className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:border-neutral-500"
        >
          Ver para imprimir / PDF
        </Link>
      </div>
    </div>
  );
}
