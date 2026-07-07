import { redirect, notFound } from "next/navigation";
import { requireCompanyAccess, canManageGuides } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditGuideForm } from "./edit-guide-form";

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; guideId: string }>;
}) {
  const { companyId, guideId } = await params;
  const { supabase, role } = await requireCompanyAccess(companyId);
  if (!canManageGuides(role)) redirect(`/app/${companyId}/learn`);

  const { data: guide, error } = await supabase
    .from("guides")
    .select(
      "id, title, module, language, current_version_id, guide_versions:current_version_id(id, objetivo, precondiciones, pasos, advertencias, resultado_esperado, quick_guide, faq)"
    )
    .eq("id", guideId)
    .eq("client_company_id", companyId)
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

  const [{ data: reads }, { data: attempts }] = await Promise.all([
    supabase
      .from("guide_reads")
      .select("id, user_id, opened_at")
      .eq("guide_id", guideId)
      .order("opened_at", { ascending: false })
      .limit(50),
    quiz
      ? supabase
          .from("quiz_attempts")
          .select("id, user_id, score, passed, created_at, quiz_id")
          .eq("quiz_id", quiz.id)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({
          data: [] as { id: string; user_id: string; score: number; passed: boolean; created_at: string }[],
        }),
  ]);

  const userIds = Array.from(
    new Set([...(reads ?? []).map((r) => r.user_id), ...(attempts ?? []).map((a) => a.user_id)])
  );
  const emailByUserId = new Map<string, string>();
  if (userIds.length) {
    const admin = createAdminClient();
    await Promise.all(
      userIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data.user?.email) emailByUserId.set(id, data.user.email);
      })
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="mb-1 text-lg font-semibold text-neutral-900">{guide.title}</h1>
        <p className="text-sm text-neutral-500">
          Módulo: {guide.module ?? "—"} · Idioma: {guide.language}
        </p>
      </div>

      {version && (
        <EditGuideForm
          companyId={companyId}
          guideId={guideId}
          initial={{
            title: guide.title,
            module: guide.module ?? "",
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

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">
          Quién ha leído esta guía ({reads?.length ?? 0})
        </h2>
        {!reads?.length ? (
          <p className="text-sm text-neutral-500">Todavía nadie la ha abierto.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded border border-neutral-200 bg-white text-sm">
            {reads.map((r) => (
              <li key={r.id} className="flex justify-between px-4 py-2">
                <span>{emailByUserId.get(r.user_id) ?? r.user_id}</span>
                <span className="text-neutral-400">{new Date(r.opened_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">
          Intentos de examen ({attempts?.length ?? 0})
        </h2>
        {!attempts?.length ? (
          <p className="text-sm text-neutral-500">Todavía nadie ha tomado el examen.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded border border-neutral-200 bg-white text-sm">
            {attempts.map((a) => (
              <li key={a.id} className="flex justify-between px-4 py-2">
                <span>{emailByUserId.get(a.user_id) ?? a.user_id}</span>
                <span className={a.passed ? "text-green-600" : "text-red-600"}>
                  {a.score}% {a.passed ? "aprobado" : "no aprobado"}
                </span>
                <span className="text-neutral-400">{new Date(a.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
