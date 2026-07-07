// Página raíz del sitio (lo que se ve al entrar a "/"). No muestra nada por sí
// misma: solo redirige a /app. Desde ahí, src/proxy.ts decide si mandar a /login
// (si no hay sesión) o dejar pasar al selector de empresa.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/app");
}
