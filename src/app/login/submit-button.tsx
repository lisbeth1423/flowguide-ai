// Botón de "Entrar" con feedback visual mientras procesa. El formulario de login usa
// una Server Action (action={login} en page.tsx) — eso significa que el botón normal
// no tiene forma de saber "estoy cargando" por sí solo (esa información vive del lado
// del servidor). React tiene un hook justo para esto: useFormStatus(), que SOLO
// funciona en un componente de cliente que esté DENTRO de un <form>. Por eso este
// botón vive en su propio archivito en vez de estar directo en page.tsx.
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
    >
      {pending ? "Entrando..." : children}
    </button>
  );
}
