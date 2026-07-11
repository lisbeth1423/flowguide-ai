// Botón que abre el diálogo de impresión del navegador (window.print()). El propio
// navegador ofrece "Guardar como PDF" ahí — no generamos el PDF nosotros, aprovechamos
// esa función que ya trae Chrome/Edge/Firefox. El botón se oculta al imprimir de verdad
// (ver la clase "print:hidden" en page.tsx) para que no salga en la hoja/PDF final.
"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
    >
      Guardar como PDF
    </button>
  );
}
