// Formulario de edición de una guía GENÉRICA. Es el mismo formulario que
// src/app/app/[companyId]/admin/guides/[guideId]/edit-guide-form.tsx, con dos
// diferencias: agrega el campo "Sistema" (a qué ERP/POS aplica) y el link de "volver"
// apunta a /platform-admin/guides en vez de a una empresa puntual.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Faq = { pregunta: string; respuesta: string };
type QuizQuestion = { pregunta: string; opciones: string[]; respuesta_correcta_index: number };

type Initial = {
  title: string;
  module: string;
  system: string;
  objetivo: string;
  precondiciones: string;
  pasos: string[];
  advertencias: string;
  resultado_esperado: string;
  quick_guide: string;
  faq: Faq[];
  quiz: QuizQuestion[];
};

export function EditGenericGuideForm({ guideId, initial }: { guideId: string; initial: Initial }) {
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
      <Link href="/platform-admin/guides" className="text-sm text-muted hover:underline">
        ← Volver a guías genéricas
      </Link>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">Guardado.</p>}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Título</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Sistema</label>
          <input
            value={form.system}
            onChange={(e) => setForm({ ...form, system: e.target.value })}
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
              <span className="pt-2 text-sm text-muted">{i + 1}.</span>
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
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
