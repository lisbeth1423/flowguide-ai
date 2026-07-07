// Cliente de Supabase para usar DENTRO DEL NAVEGADOR (componentes marcados "use client").
//
// Usa la "anon key" (clave pública, segura de exponer) y respeta siempre las reglas
// de seguridad (RLS) de la base de datos: cada consulta que hagas con este cliente
// solo puede ver/editar lo que la política de RLS le permita al usuario que inició sesión.
//
// Si necesitas hacer una consulta desde un Server Component o una API route (backend),
// NO uses este archivo — usa `src/lib/supabase/server.ts` en su lugar.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
