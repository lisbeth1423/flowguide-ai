"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type MatchedGuide = { id: string; title: string; quick_guide: string | null };

export function LearnSearch({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<MatchedGuide[] | null>(null);
  const [searchedNone, setSearchedNone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCandidates(null);
    setSearchedNone(false);

    try {
      const res = await fetch("/api/guides/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientCompanyId: companyId, query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al buscar.");

      if (data.match === "single" && data.guides?.[0]) {
        router.push(`/app/${companyId}/learn/guide/${data.guides[0].id}`);
        return;
      }
      if (data.match === "multiple" && data.guides?.length) {
        setCandidates(data.guides);
      } else {
        setSearchedNone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

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
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {searchedNone && (
        <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No encontramos ninguna guía que resuelva esto todavía. Prueba con los módulos de abajo o
          avisa a un administrador.
        </p>
      )}

      {candidates && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-neutral-600">¿Te refieres a alguna de estas?</p>
          <ul className="space-y-2">
            {candidates.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/${companyId}/learn/guide/${c.id}`}
                  className="block rounded border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-400"
                >
                  <span className="text-sm font-medium text-neutral-900">{c.title}</span>
                  {c.quick_guide && (
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{c.quick_guide}</p>
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
