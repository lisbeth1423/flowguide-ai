// "Server Actions": son funciones que corren en el servidor pero se pueden llamar
// directo desde un <form action={...}> en la página, sin tener que armar una API
// route aparte. Acá viven las dos acciones de sesión: entrar y salir.
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Se ejecuta cuando alguien envía el formulario de src/app/login/page.tsx.
// "next" es la página a la que quería ir originalmente (la manda proxy.ts cuando
// redirige a alguien no logueado) — así después de loguearse cae justo ahí, no
// siempre al inicio.
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Si falla (contraseña incorrecta, usuario no existe, etc.), vuelve a /login
    // con el mensaje de error en la URL para que la página lo muestre.
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

// Botón "Salir" del menú (ver src/app/app/[companyId]/layout.tsx).
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
