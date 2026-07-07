// Este archivo se ejecuta ANTES de cualquier página, en TODAS las visitas al sitio
// (con las excepciones que se ven en "config.matcher" al final: imágenes, etc.).
// Hace dos cosas:
//   1. Mantiene la sesión de Supabase "viva" (renueva la cookie de login si hace falta).
//   2. Si alguien intenta entrar a /app/... o /print/... sin haber iniciado sesión,
//      lo manda a /login en vez de dejarlo pasar.
//
// ⚠️ Nota rara pero importante: en versiones viejas de Next.js este archivo se llamaba
// "middleware.ts". Desde Next.js 16 se renombró a "proxy.ts" (la función adentro también
// se llama "proxy" en vez de "middleware"). Hace exactamente lo mismo, solo cambió el
// nombre — si buscan tutoriales en internet y ven "middleware.ts", es este archivo.
//
// Si agregan una sección nueva del sitio que también deba requerir login (por ejemplo
// "/reportes"), hay que agregarla a la condición "isAppRoute" de más abajo.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Le pregunta a Supabase "¿hay alguien logueado en esta visita?" (y de paso renueva
  // la sesión si estaba por vencer).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas que requieren estar logueado. Si agregan una carpeta nueva bajo src/app/
  // que también deba protegerse, hay que sumarla acá.
  const isAppRoute =
    request.nextUrl.pathname.startsWith("/app") || request.nextUrl.pathname.startsWith("/print");
  if (isAppRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    // Guarda a dónde quería ir, para poder mandarlo ahí mismo después de loguearse
    // (ver src/app/login/page.tsx y actions.ts, campo "next").
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// Le dice a Next.js en qué rutas correr este archivo. La expresión de abajo dice
// "en todas MENOS archivos estáticos de Next (_next/...) e imágenes" — no hace falta
// tocar esto salvo que agreguen otro tipo de archivo estático a excluir.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
