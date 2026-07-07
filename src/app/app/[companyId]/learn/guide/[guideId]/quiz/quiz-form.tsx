"use client";

import { useState } from "react";
import Link from "next/link";

type Question = { pregunta: string; opciones: string[] };
type Result = { score: number; passed: boolean; correct: number; total: number };

export function QuizForm({
  companyId,
  guideId,
  quizId,
  questions,
}: {
  companyId: string;
  guideId: string;
  quizId: string;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const allAnswered = answers.every((a) => a !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, clientCompanyId: companyId, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar el examen.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="rounded border border-neutral-200 bg-white p-6 text-center">
        <p className="text-3xl font-semibold text-neutral-900">{result.score}%</p>
        <p className={`mt-1 text-sm font-medium ${result.passed ? "text-green-600" : "text-red-600"}`}>
          {result.passed ? "Aprobado" : "No aprobado"} · {result.correct}/{result.total} correctas
        </p>
        <Link
          href={`/app/${companyId}/learn/guide/${guideId}`}
          className="mt-4 inline-block rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Volver a la guía
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {questions.map((q, qi) => (
        <div key={qi} className="rounded border border-neutral-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-neutral-900">
            {qi + 1}. {q.pregunta}
          </p>
          <div className="space-y-2">
            {q.opciones.map((op, oi) => (
              <label key={oi} className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="radio"
                  name={`question-${qi}`}
                  checked={answers[qi] === oi}
                  onChange={() => {
                    const next = [...answers];
                    next[qi] = oi;
                    setAnswers(next);
                  }}
                />
                {op}
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={!allAnswered || submitting}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Enviar examen"}
      </button>
    </form>
  );
}
