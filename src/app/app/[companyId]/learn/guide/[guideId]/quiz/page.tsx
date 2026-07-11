// Página del examen de una guía. Trae las preguntas desde la base de datos y se las
// pasa a QuizForm (./quiz-form.tsx) — OJO: le saca el campo "respuesta_correcta_index"
// antes de mandarlo al navegador, para que un usuario curioso no pueda ver la
// respuesta correcta abriendo las herramientas de desarrollador. La corrección real
// pasa en el servidor (src/app/api/quiz-attempts/route.ts).
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompanyAccess } from "@/lib/auth";
import { QuizForm } from "./quiz-form";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ companyId: string; guideId: string }>;
}) {
  const { companyId, guideId } = await params;
  const { supabase } = await requireCompanyAccess(companyId);

  const { data: guide, error } = await supabase
    .from("guides")
    .select("title, guide_versions:current_version_id(id)")
    .eq("id", guideId)
    .or(`client_company_id.eq.${companyId},is_generic.eq.true`)
    .maybeSingle();
  if (error) throw error;
  if (!guide) notFound();

  const version = Array.isArray(guide.guide_versions) ? guide.guide_versions[0] : guide.guide_versions;
  const { data: quiz } = version
    ? await supabase.from("quizzes").select("id, questions").eq("guide_version_id", version.id).maybeSingle()
    : { data: null };

  if (!quiz || !(quiz.questions as unknown[])?.length) {
    return <p className="text-sm text-muted">Esta guía no tiene examen todavía.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/app/${companyId}/learn/guide/${guideId}`}
        className="text-sm text-muted hover:underline"
      >
        ← Volver a la guía
      </Link>
      <h1 className="mb-6 mt-2 text-xl font-semibold text-foreground">Examen: {guide.title}</h1>

      <QuizForm
        companyId={companyId}
        guideId={guideId}
        quizId={quiz.id}
        questions={(
          quiz.questions as { pregunta: string; opciones: string[] }[]
        ).map((q) => ({ pregunta: q.pregunta, opciones: q.opciones }))}
      />
    </div>
  );
}
