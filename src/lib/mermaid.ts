// Convierte los pasos de una guía en un diagrama de flujo (sintaxis Mermaid), SIN
// llamar a la IA — es puramente mecánico: paso 1 -> paso 2 -> paso 3, en orden. No
// gasta crédito de Anthropic ni tarda nada.
//
// Por ahora solo soporta procesos LINEALES (una flecha detrás de otra). Procesos con
// ramas (ej. "aprobado" / "rechazado") necesitarían que cada paso pudiera apuntar a
// más de un "siguiente paso" — eso es una extensión futura del modelo de datos de
// guide_versions.pasos (hoy son strings sueltos, no objetos con esa relación), no algo
// para resolver acá.
export function pasosToMermaid(pasos: string[]): string {
  if (!pasos.length) return "flowchart TD\n  sin_pasos[Esta guía todavía no tiene pasos]";

  const lines = ["flowchart TD"];
  pasos.forEach((paso, i) => {
    const id = `p${i}`;
    // Mermaid usa comillas dobles para el texto de cada casillero — hay que escapar
    // las que vengan en el texto del paso para no romper la sintaxis.
    const texto = paso.replace(/"/g, "&quot;").slice(0, 120);
    lines.push(`  ${id}["${texto}"]`);
    if (i > 0) lines.push(`  p${i - 1} --> ${id}`);
  });

  return lines.join("\n");
}
