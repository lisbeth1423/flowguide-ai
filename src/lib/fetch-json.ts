// Lee la respuesta de un fetch como JSON, con un mensaje claro para el caso de que el
// servidor haya devuelto otra cosa (típicamente una página de error en HTML, no JSON,
// cuando Vercel corta una función de servidor por tardar demasiado — ver maxDuration
// en src/app/api/guides/generate/route.ts). Sin esto, ese caso se ve en pantalla como
// el mensaje técnico "Unexpected token '<' ... is not valid JSON", que no dice nada
// útil a quien lo usa.
export async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (text.trim().startsWith("<")) {
      throw new Error(
        "El servidor tardó demasiado en responder (probable con un PDF muy grande) y se cortó a mitad de camino. Probá con un documento más chico, o dividí el PDF en partes más cortas."
      );
    }
    throw new Error("Respuesta inesperada del servidor. Intentá de nuevo en un momento.");
  }
}
