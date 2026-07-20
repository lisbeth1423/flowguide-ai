// Dibuja el contenido de una guía: primero SIEMPRE el "quick guide" (resumen corto),
// y un botón "Ver guía completa..." que expande el resto (objetivo, precondiciones,
// pasos, advertencias, resultado esperado, FAQ). Empieza colapsado a propósito, para
// que el usuario final no se enfrente a un muro de texto si el resumen ya le alcanza.
"use client";

import { useState } from "react";
import { MermaidDiagram } from "./mermaid-diagram";
import { pasosToMermaid } from "@/lib/mermaid";

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
      <div className="rounded border border-accent/30 bg-accent-soft p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
          Quick guide
        </p>
        <p className="whitespace-pre-line text-sm text-neutral-800">{quickGuide}</p>
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm font-medium text-accent hover:underline"
        >
          Ver guía completa y preguntas frecuentes →
        </button>
      ) : (
        <div className="space-y-5 rounded border border-neutral-200 bg-white p-5">
          {objetivo && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-foreground">Objetivo</h2>
              <p className="whitespace-pre-line text-sm text-neutral-700">{objetivo}</p>
            </section>
          )}
          {precondiciones && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-foreground">Precondiciones</h2>
              <p className="whitespace-pre-line text-sm text-neutral-700">{precondiciones}</p>
            </section>
          )}
          {pasos.length > 0 && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-foreground">Pasos</h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-700">
                {pasos.map((paso, i) => (
                  <li key={i}>{paso}</li>
                ))}
              </ol>
              {pasos.length > 1 && <MermaidDiagram chart={pasosToMermaid(pasos)} />}
            </section>
          )}
          {advertencias && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-foreground">Advertencias</h2>
              <p className="whitespace-pre-line text-sm text-amber-800">{advertencias}</p>
            </section>
          )}
          {resultadoEsperado && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-foreground">Resultado esperado</h2>
              <p className="whitespace-pre-line text-sm text-neutral-700">{resultadoEsperado}</p>
            </section>
          )}
          {faq.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-foreground">
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
