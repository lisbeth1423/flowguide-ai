import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

const PASS_THRESHOLD = 70;

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  const body = await request.json();
  const quizId = String(body.quizId ?? "");
  const clientCompanyId = String(body.clientCompanyId ?? "");
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
