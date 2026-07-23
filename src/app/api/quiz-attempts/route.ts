// Endpoint: POST /api/quiz-attempts
//
// Corrige un examen y guarda el resultado. Lo llama el formulario del quiz
// (src/app/app/[companyId]/learn/guide/[guideId]/quiz/quiz-form.tsx) cuando el
// usuario final aprieta "Enviar examen".
//
// IMPORTANTE por seguridad: la corrección se hace ACÁ, en el servidor, comparando
// las respuestas del usuario contra "quizzes.questions" (que vive en la base de
// datos). Nunca se confía en un "score" que venga calculado desde el navegador,
// porque cualquiera podría manipularlo con las herramientas de desarrollador del
// navegador y "aprobar" sin saber nada.
//
// Si quieren cambiar el % mínimo para aprobar, se cambia PASS_THRESHOLD acá abajo.
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";

// Porcentaje mínimo de respuestas correctas para considerar el examen "aprobado".
const PASS_THRESHOLD = 70;

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const quizId = String(body.quizId ?? "");
  const clientCompanyId = String(body.clientCompanyId ?? "");
  // answers[i] = índice de la opción que eligió el usuario para la pregunta i.
  const answers = Array.isArray(body.answers) ? (body.answers as number[]) : [];

  if (!quizId || !clientCompanyId) {
    return NextResponse.json({ error: "quizId y clientCompanyId son obligatorios." }, { status: 400 });
  }

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("questions")
    .eq("id", quizId)
    .maybeSingle();
  if (quizError) return NextResponse.json({ error: quizError.message }, { status: 500 });
  if (!quiz) return NextResponse.json({ error: "Quiz no encontrado." }, { status: 404 });

  const questions = quiz.questions as { respuesta_correcta_index: number }[];
  const total = questions.length || 1;
  const correct = questions.reduce(
    (acc, q, i) => (answers[i] === q.respuesta_correcta_index ? acc + 1 : acc),
    0
  );
  const score = Math.round((correct / total) * 100);
  const passed = score >= PASS_THRESHOLD;

  const { error } = await supabase.from("quiz_attempts").insert({
    quiz_id: quizId,
    client_company_id: clientCompanyId,
    user_id: user.id,
    answers,
    score,
    passed,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ score, passed, correct, total });
}
