// Dibuja el diagrama de flujo de los pasos de la guía. Usa la librería "mermaid" para
// convertir el texto (armado por src/lib/mermaid.ts) en un SVG, directo en el navegador
// del usuario — no hay llamada a servidor ni a la IA acá, es solo dibujo.
"use client";

import { useEffect, useId, useRef, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramId = useId().replace(/:/g, "");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: "neutral" });
      try {
        const { svg } = await mermaid.render(`mermaid-${diagramId}`, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled) setError(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chart, diagramId]);

  if (error) return null;

  return <div ref={containerRef} className="overflow-x-auto py-2" />;
}
