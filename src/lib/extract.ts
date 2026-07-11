// Funciones para sacar texto "limpio" de dos tipos de fuente que NO son texto pegado
// a mano: una página web (URL) o un PDF subido. El texto que devuelven estas funciones
// se usa exactamente igual que el texto pegado manualmente: se lo pasamos a
// generateGuide() en src/lib/anthropic.ts.
//
// Ambas son server-only (usan `fetch` a sitios externos y parsean archivos) — solo se
// importan desde API routes, nunca desde un componente "use client".
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { PDFParse } from "pdf-parse";

// Descarga una URL y le saca el "texto legible" (el artículo/contenido principal,
// sin menús, publicidad ni barras laterales) usando Readability — la misma librería
// que usa Firefox para su "modo lectura". Si el sitio bloquea el acceso automático o
// no tiene contenido claro, tira un error con un mensaje que se puede mostrar tal cual
// al usuario.
export async function extractTextFromUrl(url: string): Promise<{ title: string; text: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FlowGuideBot/1.0)" },
  });
  if (!res.ok) {
    throw new Error(`No se pudo acceder a esa URL (el sitio respondió con error ${res.status}).`);
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  if (!article?.textContent?.trim()) {
    throw new Error("No se pudo extraer texto legible de esa página. Probá pegando el texto a mano.");
  }

  return { title: article.title ?? url, text: article.textContent.trim() };
}

// Extrae el texto de un PDF (no extrae imágenes — eso se maneja aparte, subiendo
// capturas de pantalla sueltas, ver ADMIN "Nueva guía"; la librería pdf-parse SÍ sabe
// extraer imágenes embebidas de un PDF con .getImage() si en el futuro quieren esa
// función completa, pero no la usamos todavía). Si el PDF es un escaneo sin texto real
// (solo fotos de páginas), pdf-parse no encuentra texto y tiramos error.
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text?.trim();

  if (!text) {
    throw new Error(
      "No se pudo extraer texto del PDF (puede ser un PDF escaneado sin texto real, solo imágenes)."
    );
  }

  return text;
}
