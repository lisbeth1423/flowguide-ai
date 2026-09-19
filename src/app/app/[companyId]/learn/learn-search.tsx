// Buscador de texto libre del usuario final ("Camino A"). Al escribir su pregunta y
// enviarla, llama a POST /api/guides/match (src/app/api/guides/match/route.ts), que
// hace DOS pasos con la IA:
//   1. matchGuide: compara la pregunta contra título/resumen de todas las guías
//      disponibles, para decidir CUÁLES son candidatas (barato, se hace sobre pocas
//      líneas de texto por guía).
//   2. answerFromGuides: le da a Claude el CONTENIDO COMPLETO de esas pocas
//      candidatas y le pide una respuesta directa y concreta, citando el paso exacto
//      — en vez de mostrar solo una lista de links para que el usuario lea entero.
// Esto importa sobre todo cuando una guía grande quedó partida en varias piezas
// ("Parte N de M"): antes solo se comparaba por título, y una pregunta puntual podía
// no matchear con ninguna parte aunque la respuesta estuviera adentro.
"use client";

import { useState } from "react";
import Link from "next/link";

type MatchedGuide = { id: string; title: string; quick_guide: string | null };
type SynthesizedAnswer = { encontrado: boolean; respuesta: string; guia_id: string };

export function LearnSearch({
  companyId,
  suggestions = [],
}: {
  companyId: string;
  suggestions?: string[];
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<MatchedGuide[] | null>(null);
  const [answer, setAnswer] = useState<SynthesizedAnswer | null>(null);
  const [searchedNone, setSearchedNone] = useState(false);

  async function runSearch(q: string) {
    setLoading(true);
    setError(null);
    setCandidates(null);
    setAnswer(null);
    setSearchedNone(false);

    try {
      const res = await fetch("/api/guides/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientCompanyId: companyId, query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al buscar.");

      const foundAnswer: SynthesizedAnswer | null = data.answer ?? null;
      // Guardamos las guías candidatas siempre que vengan (single o multiple): para
      // "single" sirve para poder linkear "Ver guía completa" desde la respuesta; para
      // "multiple" además se listan como alternativas debajo.
      if (data.guides?.length) setCandidates(data.guides);

      if (data.match === "none" || !foundAnswer?.encontrado) {
        setSearchedNone(true);
        return;
      }

      setAnswer(foundAnswer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  // Click en una "pregunta clave": la pone en el buscador y busca directo, como si
  // el usuario la hubiera escrito y apretado Buscar.
  function handleSuggestionClick(suggestion: string) {
    setQuery(suggestion);
    runSearch(suggestion);
  }

  const answerSourceGuide = answer ? candidates?.find((c) => c.id === answer.guia_id) : null;

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ej. el cliente me pide una nota de crédito y no sé cómo cargarla"
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {suggestions.length > 0 && !candidates && !answer && !searchedNone && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              disabled={loading}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-600 hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {answer?.encontrado && (
        <div className="mt-4 rounded border border-accent/30 bg-accent-soft p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
            Respuesta
          </p>
          <p className="whitespace-pre-line text-sm text-neutral-800">{answer.respuesta}</p>
          {answerSourceGuide && (
            <Link
              href={`/app/${companyId}/learn/guide/${answerSourceGuide.id}`}
              className="mt-3 inline-block text-xs font-medium text-accent hover:underline"
            >
              Ver guía completa: {answerSourceGuide.title} →
            </Link>
          )}
        </div>
      )}

      {searchedNone && (
        <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No encontramos una respuesta directa a esto todavía. Prueba con los módulos de abajo,
          revisá las guías candidatas si aparecen debajo, o avisa a un administrador.
        </p>
      )}

      {candidates && candidates.filter((c) => c.id !== answer?.guia_id).length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-neutral-600">
            {answer?.encontrado ? "Otras guías relacionadas:" : "¿Te refieres a alguna de estas?"}
          </p>
          <ul className="space-y-2">
            {candidates
              .filter((c) => c.id !== answer?.guia_id)
              .map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/${companyId}/learn/guide/${c.id}`}
                    className="block rounded border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-400"
                  >
                    <span className="text-sm font-medium text-foreground">{c.title}</span>
                    {c.quick_guide && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{c.quick_guide}</p>
                    )}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
