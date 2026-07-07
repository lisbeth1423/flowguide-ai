// Dibuja el contenido de una guía: primero SIEMPRE el "quick guide" (resumen corto),
// y un botón "Ver guía completa..." que expande el resto (objetivo, precondiciones,
// pasos, advertencias, resultado esperado, FAQ). Empieza colapsado a propósito, para
// que el usuario final no se enfrente a un muro de texto si el resumen ya le alcanza.
"use client";

import { useState } from "react";

type Faq = { pregunta: string; respuesta: string };

export function GuideBody({
  quickGuide,
  objetivo,
  precondiciones,
  pasos,
  advertencias,
  resultadoEsperado,
  faq,
}: {
  quickGuide: string;
  objetivo: string;
  precondiciones: string;
  pasos: string[];
  advertencias: string;
  resultadoEsperado: string;
  faq: Faq[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="rounded border border-neutral-200 bg-white p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Quick guide
        </p>
        <p className="whitespace-pre-line text-sm text-neutral-800">{quickGuide}</p>
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm font-medium text-neutral-700 hover:underline"
        >
          Ver guía completa y preguntas frecuentes →
        </button>
      ) : (
        <div className="space-y-5 rounded border border-neutral-200 bg-white p-5">
          {objetivo && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-neutral-900">Objetivo</h2>
              <p className="whitespace-pre-line text-sm text-neutral-700">{objetivo}</p>
            </section>
          )}
          {precondiciones && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-neutral-900">Precondiciones</h2>
              <p className="whitespace-pre-line text-sm text-neutral-700">{precondiciones}</p>
            </section>
          )}
          {pasos.length > 0 && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-neutral-900">Pasos</h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-700">
                {pasos.map((paso, i) => (
                  <li key={i}>{paso}</li>
                ))}
              </ol>
            </section>
          )}
          {advertencias && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-neutral-900">Advertencias</h2>
              <p className="whitespace-pre-line text-sm text-amber-800">{advertencias}</p>
            </section>
          )}
          {resultadoEsperado && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-neutral-900">Resultado esperado</h2>
              <p className="whitespace-pre-line text-sm text-neutral-700">{resultadoEsperado}</p>
            </section>
          )}
          {faq.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-neutral-900">
                Preguntas frecuentes
              </h2>
              <div className="space-y-3">
                {faq.map((f, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-neutral-800">{f.pregunta}</p>
                    <p className="text-sm text-neutral-600">{f.respuesta}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
