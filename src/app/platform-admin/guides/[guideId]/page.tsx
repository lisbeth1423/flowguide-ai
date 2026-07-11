// Página de detalle/edición de una guía genérica. Más simple que la de una empresa
// (src/app/app/[companyId]/admin/guides/[guideId]/page.tsx): no muestra "quién la
// leyó" porque una guía genérica la puede leer gente de cualquier empresa — llevar
// esa cuenta cruzando empresas queda para una vuelta futura si hace falta.
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth";
import { EditGenericGuideForm } from "./edit-generic-guide-form";

export default async function GenericGuideDetailPage({
  params,
}: {
  params: Promise<{ guideId: string }>;
}) {
  const { guideId } = await params;
  const { supabase } = await requirePlatformAdmin();

  const { data: guide, error } = await supabase
    .from("guides")
    .select(
      "id, title, module, system, is_generic, guide_versions:current_version_id(id, objetivo, precondiciones, pasos, advertencias, resultado_esperado, quick_guide, faq)"
    )
    .eq("id", guideId)
    .eq("is_generic", true)
    .maybeSingle();
  if (error) throw error;
  if (!guide) notFound();

  const version = Array.isArray(guide.guide_versions) ? guide.guide_versions[0] : guide.guide_versions;

  const { data: quiz } = version
    ? await supabase.from("quizzes").select("questions").eq("guide_version_id", version.id).maybeSingle()
    : { data: null };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="mb-1 text-lg font-semibold text-foreground">{guide.title}</h1>
        <p className="text-sm text-muted">
          Sistema: {guide.system} · Módulo: {guide.module ?? "—"}
        </p>
      </div>

      {version && (
        <EditGenericGuideForm
          guideId={guideId}
          initial={{
            title: guide.title,
            module: guide.module ?? "",
            system: guide.system ?? "",
            objetivo: version.objetivo ?? "",
            precondiciones: version.precondiciones ?? "",
            pasos: (version.pasos as string[]) ?? [],
            advertencias: version.advertencias ?? "",
            resultado_esperado: version.resultado_esperado ?? "",
            quick_guide: version.quick_guide ?? "",
            faq: (version.faq as { pregunta: string; respuesta: string }[]) ?? [],
            quiz:
              (quiz?.questions as {
                pregunta: string;
                opciones: string[];
                respuesta_correcta_index: number;
              }[]) ?? [],
          }}
        />
      )}
    </div>
  );
}
