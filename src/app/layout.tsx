// Layout raíz: envuelve TODA la aplicación (cada página pasa por acá primero).
// Es donde se define el <html>/<body>, la fuente de letra, y el título que aparece
// en la pestaña del navegador (metadata, más abajo). Casi nunca hace falta tocar
// este archivo salvo que quieran cambiar el título del sitio o la tipografía global.
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowGuide",
  description:
    "Document. Train. Support. Succeed. — Convierte procesos, conocimiento operativo y casos de soporte en guías paso a paso, flujos, checklists y artículos de ayuda.",
};

// Vercel llena estas variables solas en cada deploy (no hay que configurar nada) con
// el commit de git que está corriendo. DEPLOY_TIME se calcula una sola vez, cuando
// arranca el servidor (no en cada visita), así que marca aproximadamente "cuándo se
// publicó esta versión" — sirve para confirmar que se está viendo la última
// actualización y no una versión vieja en caché.
//
// Zona horaria fija en America/Santo_Domingo (Vercel corre sus servidores en UTC por
// defecto, que no es la hora local). Si en algún momento se usa desde otro país,
// cambiar el valor de TIMEZONE acá abajo.
const TIMEZONE = "America/Santo_Domingo";
const DEPLOY_SHA = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
const DEPLOY_TIME =
  new Intl.DateTimeFormat("es-DO", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(",", "") + " RD";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <div className="pointer-events-none fixed bottom-1 right-2 z-50 select-none text-[10px] text-neutral-400">
          v{DEPLOY_SHA} · {DEPLOY_TIME}
        </div>
      </body>
    </html>
  );
}
