// Parte un texto largo en pedazos de como máximo maxChars cada uno, cortando en un
// salto de línea o punto cercano al límite (no a mitad de una palabra) para que cada
// parte se entienda por sí sola cuando se genere una guía con ella. Se usa para
// documentos grandes que no entrarían en un solo pedido a Claude dentro del límite de
// tiempo de Vercel (ver new-guide-form.tsx / new-generic-guide-form.tsx).
export function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf("\n\n", maxChars);
    if (cut < maxChars * 0.5) cut = rest.lastIndexOf("\n", maxChars);
    if (cut < maxChars * 0.5) cut = rest.lastIndexOf(". ", maxChars);
    if (cut < maxChars * 0.5) cut = maxChars;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
