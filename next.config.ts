import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (y su dependencia pdfjs-dist) cargan un archivo "worker" en tiempo de
  // ejecución de una forma que el empaquetador de Next.js (Turbopack) no logra
  // resolver bien, tirando el error "Setting up fake worker failed: Cannot find
  // module ...pdf.worker.mjs". Al marcarlo como "externo", Next.js deja de intentar
  // empaquetarlo y lo carga directo desde node_modules en tiempo de ejecución, que es
  // donde el archivo del worker sí existe.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
