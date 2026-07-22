// Endpoint que no hace nada útil para el usuario — su único trabajo es hacerle una
// consulta mínima a Supabase para que el proyecto registre actividad. Supabase pausa
// automáticamente los proyectos del plan gratuito después de 7 días sin actividad; un
// cron de Vercel llama a esta ruta una vez al día (ver vercel.json) para que eso nunca
// pase, sin necesidad de pasar a un plan pago.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const { error } = await supabase.from("partners").select("id").limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
