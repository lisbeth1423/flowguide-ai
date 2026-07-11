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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
