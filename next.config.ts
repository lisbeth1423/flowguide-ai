import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom (usado para "Link" -> extraer texto de una URL) tiene una dependencia
  // (html-encoding-sniffer -> @exodus/bytes) que Turbopack no logra empaquetar bien
  // en el servidor y tira "ERR_REQUIRE_ESM". Marcarlo como externo hace que Node lo
  // cargue directo de node_modules en vez de que Turbopack intente empaquetarlo.
  //
  // (El PDF ya no usa pdf-parse/pdfjs-dist — ver src/lib/extract.ts — así que no
  // hace falta marcarlos acá.)
  serverExternalPackages: ["jsdom"],
};

export default nextConfig;
