// Cliente de Supabase para usar EN EL SERVIDOR: Server Components (páginas .tsx que no
// llevan "use client" arriba), Server Actions ("use server") y API routes (route.ts).
//
// Es el que más se usa en este proyecto. Igual que el de client.ts, respeta las reglas
// de seguridad (RLS): actúa "como" el usuario que inició sesión, nunca como super-admin.
// Si necesitas saltarte esas reglas (por ejemplo, para invitar usuarios), usa admin.ts.
//
// La parte de "cookies" existe porque así es como Supabase sabe quién inició sesión:
// guarda un token en una cookie del navegador, y este cliente la lee/actualiza en cada
// request. No hace falta tocar esto salvo que cambie la librería @supabase/ssr.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Esto falla si se llama desde el render de un Server Component (Next.js no
            // deja modificar cookies ahí). No pasa nada: el archivo proxy.ts (antes se
            // llamaba middleware.ts) refresca la sesión en cada visita de todos modos.
          }
        },
      },
    }
  );
}
