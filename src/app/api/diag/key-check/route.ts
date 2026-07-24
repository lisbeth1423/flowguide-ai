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

  return NextResponse.json({
    length: key.length,
    startsWithSkAnt: key.startsWith("sk-ant-"),
    badChars,
  });
}
