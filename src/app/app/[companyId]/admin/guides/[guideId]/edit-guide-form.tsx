// Formulario completo para editar una guía a mano: título, módulo, quick guide,
// objetivo, precondiciones, pasos, advertencias, resultado esperado, FAQ y quiz.
//
// Recibe el contenido actual en "initial" (lo carga la página, page.tsx, desde la
// base de datos) y lo guarda todo junto en un solo objeto de estado ("form"). Al
// apretar "Guardar cambios" manda TODO el objeto a PATCH /api/guides/[guideId]
// (ver src/app/api/guides/[guideId]/route.ts), que decide qué actualizar.
//
// Si quieren agregar un campo nuevo a la guía (por ejemplo "tiempo estimado"), hay
// que: 1) agregarlo al tipo "Initial" acá abajo, 2) agregar el <input> correspondiente
// en el JSX, 3) agregar la columna en la base de datos y en el PATCH del backend.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Faq = { pregunta: string; respuesta: string };
type QuizQuestion = { pregunta: string; opciones: string[]; respuesta_correcta_index: number };

type Initial = {
  title: string;
  module: string;
  objetivo: string;
  precondiciones: string;
  pasos: string[];
  advertencias: string;
  resultado_esperado: string;
  quick_guide: string;
  faq: Faq[];
  quiz: QuizQuestion[];
};

export function EditGuideForm({
  companyId,
  guideId,
  initial,
}: {
  companyId: string;
  guideId: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/guides/${guideId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  function updatePaso(i: number, value: string) {
    const pasos = [...form.pasos];
    pasos[i] = value;
    setForm({ ...form, pasos });
  }

  function updateFaq(i: number, field: keyof Faq, value: string) {
    const faq = form.faq.map((f, idx) => (idx === i ? { ...f, [field]: value } : f));
    setForm({ ...form, faq });
  }

  function updateQuizField(i: number, field: "pregunta", value: string) {
    const quiz = form.quiz.map((q, idx) => (idx === i ? { ...q, [field]: value } : q));
    setForm({ ...form, quiz });
  }

  function updateQuizOption(qIndex: number, oIndex: number, value: string) {
    const quiz = form.quiz.map((q, idx) => {
      if (idx !== qIndex) return q;
      const opciones = [...q.opciones];
      opciones[oIndex] = value;
      return { ...q, opciones };
    });
    setForm({ ...form, quiz });
  }

  function updateQuizAnswer(qIndex: number, value: number) {
    const quiz = form.quiz.map((q, idx) =>
      idx === qIndex ? { ...q, respuesta_correcta_index: value } : q
    );
    setForm({ ...form, quiz });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded border border-neutral-200 bg-white p-5">
      <Link href={`/app/${companyId}/admin`} className="text-sm text-neutral-500 hover:underline">
        ← Volver a la biblioteca
      </Link>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">Guardado.</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Título</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Módulo</label>
          <input
            value={form.module}
            onChange={(e) => setForm({ ...form, module: e.target.value })}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Quick guide</label>
        <textarea
          rows={3}
          value={form.quick_guide}
          onChange={(e) => setForm({ ...form, quick_guide: e.target.value })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Objetivo</label>
        <textarea
          rows={2}
          value={form.objetivo}
          onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Precondiciones</label>
        <textarea
          rows={2}
          value={form.precondiciones}
          onChange={(e) => setForm({ ...form, precondiciones: e.target.value })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Pasos</label>
        <div className="space-y-2">
          {form.pasos.map((paso, i) => (
            <div key={i} className="flex gap-2">
              <span className="pt-2 text-sm text-neutral-400">{i + 1}.</span>
              <textarea
                rows={2}
                value={paso}
                onChange={(e) => updatePaso(i, e.target.value)}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Advertencias</label>
        <textarea
          rows={2}
          value={form.advertencias}
          onChange={(e) => setForm({ ...form, advertencias: e.target.value })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Resultado esperado
        </label>
        <textarea
          rows={2}
          value={form.resultado_esperado}
          onChange={(e) => setForm({ ...form, resultado_esperado: e.target.value })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">FAQ</label>
        <div className="space-y-3">
          {form.faq.map((f, i) => (
            <div key={i} className="rounded border border-neutral-200 p-3">
              <input
                value={f.pregunta}
                onChange={(e) => updateFaq(i, "pregunta", e.target.value)}
                placeholder="Pregunta"
                className="mb-2 w-full rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <textarea
                rows={2}
                value={f.respuesta}
                onChange={(e) => updateFaq(i, "respuesta", e.target.value)}
                placeholder="Respuesta"
                className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Quiz</label>
        <div className="space-y-3">
          {form.quiz.map((q, qi) => (
            <div key={qi} className="rounded border border-neutral-200 p-3">
              <input
                value={q.pregunta}
                onChange={(e) => updateQuizField(qi, "pregunta", e.target.value)}
                placeholder="Pregunta"
                className="mb-2 w-full rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              {q.opciones.map((op, oi) => (
                <label key={oi} className="mb-1 flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={q.respuesta_correcta_index === oi}
                    onChange={() => updateQuizAnswer(qi, oi)}
                  />
                  <input
                    value={op}
                    onChange={(e) => updateQuizOption(qi, oi, e.target.value)}
                    className="w-full rounded border border-neutral-300 px-2 py-1"
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
