// Sube un PDF DIRECTO del navegador a Supabase Storage, sin pasar por una función de
// Vercel — necesario porque Vercel corta pedidos a /api/* en ~4.5 MB y los manuales
// completos (ej. documentación de SAP) suelen pesar más que eso. Lo usan los dos
// formularios de "nueva guía" (empresa y genérico): ver
// src/app/app/[companyId]/admin/guides/new/new-guide-form.tsx y
// src/app/platform-admin/guides/new/new-generic-guide-form.tsx.
//
// Cómo funciona (ver también src/app/api/uploads/pdf-url/route.ts):
//   1. Le pedimos al servidor una "URL de subida firmada" — un permiso temporal para
//      subir UN archivo a UNA ruta puntual del bucket, sin exponer nuestra clave
//      secreta de Supabase al navegador.
//   2. Con ese permiso, el navegador sube el archivo directo a Supabase Storage.
//   3. Devolvemos solo la ruta (un texto cortito) para que el formulario se la mande
//      después a /api/guides/generate, que la usa para leer el PDF del lado del
//      servidor y sacarle el texto.
import { createClient } from "@/lib/supabase/client";

export async function uploadPdfDirect(
  file: File,
  options: { clientCompanyId?: string; isGeneric?: boolean }
): Promise<string> {
  const res = await fetch("/api/uploads/pdf-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      clientCompanyId: options.clientCompanyId,
      isGeneric: options.isGeneric ?? false,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo preparar la subida del PDF.");

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("knowledge-files")
    .uploadToSignedUrl(data.path, data.token, file, { contentType: "application/pdf" });
  if (error) throw new Error(`No se pudo subir el PDF: ${error.message}`);

  return data.path as string;
}
