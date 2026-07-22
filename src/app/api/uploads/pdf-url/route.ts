// Endpoint: POST /api/uploads/pdf-url
//
// Vercel corta los pedidos a rutas /api/* en ~4.5 MB — un PDF de manual completo
// (ej. documentación de SAP) se pasa de eso fácil. Para evitarlo, el PDF NUNCA viaja
// a través de esta ruta: acá solo se pide "permiso" (una URL firmada) para subir
// directo desde el navegador a Supabase Storage, que no tiene ese límite. El flujo
// completo queda así:
//   1. El navegador llama a ESTA ruta con el nombre del archivo -> recibe {path, token}.
//   2. El navegador sube el PDF directo a Supabase Storage con ese token (ver
//      new-guide-form.tsx / new-generic-guide-form.tsx).
//   3. El navegador llama a /api/guides/generate mandando solo el "path" (texto
//      cortito), no el archivo -> esa ruta lo descarga de Storage del lado del
//      servidor para sacarle el texto (ver extractTextFromPdf en src/lib/extract.ts).
//
// Los mismos permisos que ya validaba /api/guides/generate para subir un PDF
// (admin/editor de la empresa, o platform admin si es contenido genérico) se validan
// acá también — si no, cualquier usuario logueado podría pedir una URL de subida.
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Ver el comentario de la misma función en src/app/api/guides/generate/route.ts —
// Supabase Storage rechaza nombres con tildes/espacios/símbolos.
function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(request: Request) {
  const { supabase } = await requireUser();
  const body = await request.json();
  const fileName = String(body.fileName ?? "documento.pdf");
  const clientCompanyId = body.clientCompanyId ? String(body.clientCompanyId) : null;
  const isGeneric = body.isGeneric === true;

  if (isGeneric) {
    const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
    if (!isPlatformAdmin) {
      return NextResponse.json({ error: "No tienes permiso para crear contenido genérico." }, { status: 403 });
    }
  } else {
    if (!clientCompanyId) {
      return NextResponse.json({ error: "clientCompanyId es obligatorio." }, { status: 400 });
    }
    const { data: role } = await supabase.rpc("my_role", { target_company_id: clientCompanyId });
    if (role !== "admin" && role !== "editor") {
      return NextResponse.json({ error: "No tienes permiso para subir archivos en esta empresa." }, { status: 403 });
    }
  }

  const path = `${clientCompanyId ?? "generic"}/${randomUUID()}-${sanitizeFilename(fileName)}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("knowledge-files").createSignedUploadUrl(path);
  if (error) {
    return NextResponse.json({ error: `No se pudo preparar la subida: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
