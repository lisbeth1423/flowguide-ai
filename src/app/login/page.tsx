// Pantalla de login (/login). No hay "crear cuenta" acá a propósito: en este Sprint 1
// los usuarios se crean por invitación desde Supabase (ver README.md, sección 4), no
// con un formulario público de registro.
//
// Si quieren cambiar el texto, logo o colores de esta pantalla, es este archivo.
// Los estilos (className="...") son clases de Tailwind CSS: por ejemplo "bg-neutral-900"
// es un color de fondo, "text-sm" es tamaño de letra chico, etc.
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">FlowGuide AI</h1>
        <p className="mb-6 text-sm text-neutral-500">Ingresa con tu email y contraseña.</p>

        {error && (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form action={login} className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/app"} />
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
