// Ruta TEMPORAL de diagnóstico — NO revela la clave, solo dice si tiene algún
// carácter fuera del rango normal (0-255) y en qué posición, para confirmar o
// descartar que ANTHROPIC_API_KEY tenga un carácter invisible pegado por error.
// Borrar este archivo una vez resuelto el problema (ver conversación sobre el error
// "Cannot convert argument to a ByteString").
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const key = process.env.ANTHROPIC_API_KEY ?? "";
  const badChars: { index: number; code: number }[] = [];
  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i);
    if (code > 255) badChars.push({ index: i, code });
  }

  // La clave sola dio limpia — puede que el caracter raro esté en OTRA variable de
  // entorno (ej. una que pone Vercel sola, como el mensaje del último commit) y que
  // el SDK de Anthropic la use igual al armar el pedido. Revisamos TODAS, mostrando
  // solo el NOMBRE de la variable afectada y la posición del carácter — nunca el
  // valor real, para no exponer nada sensible por accidente.
  const suspiciousEnvVars: { name: string; index: number; code: number }[] = [];
  for (const [name, value] of Object.entries(process.env)) {
    if (!value) continue;
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code > 255) {
        suspiciousEnvVars.push({ name, index: i, code });
        break;
      }
    }
  }

  return NextResponse.json({
    length: key.length,
    startsWithSkAnt: key.startsWith("sk-ant-"),
    badChars,
    suspiciousEnvVars,
  });
}
