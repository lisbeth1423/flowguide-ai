// Endpoint: GET /api/guides/[guideId]/export
//
// Genera un archivo .md (Markdown, un formato de texto plano con formato simple)
// para descargar la guía. Lo usa el botón "Descargar Markdown" en la vista de guía
// (src/app/app/[companyId]/learn/guide/[guideId]/page.tsx).
//
// Si en el futuro quieren cambiar el formato del archivo exportado (por ejemplo,
// agregar un logo o cambiar el orden de las secciones), es acá donde se arma el
// texto "markdown" de abajo. La otra forma de exportar (a PDF) es la vista imprimible
// en src/app/print/[guideId]/page.tsx — son dos caminos separados para el mismo
// contenido, no hace falta tocar los dos si solo quieren cambiar uno.
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guideId: string }> }
) {
  const { guideId } = await params;
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data: guide, error } = await supabase
    .from("guides")
    .select(
      "title, module, language, guide_versions:current_version_id(objetivo, precondiciones, pasos, advertencias, resultado_esperado, quick_guide, faq)"
    )
    .eq("id", guideId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!guide) return NextResponse.json({ error: "Guía no encontrada." }, { status: 404 });

  const version = Array.isArray(guide.guide_versions) ? guide.guide_versions[0] : guide.guide_versions;
  if (!version) return NextResponse.json({ error: "La guía no tiene contenido todavía." }, { status: 404 });

  const pasos = (version.pasos as string[]) ?? [];
  const faq = (version.faq as { pregunta: string; respuesta: string }[]) ?? [];

  const markdown = `# ${guide.title}

${guide.module ? `**Módulo:** ${guide.module}\n` : ""}
## Quick guide

${version.quick_guide ?? ""}

## Objetivo

${version.objetivo ?? ""}

## Precondiciones

${version.precondiciones ?? ""}

## Pasos

${pasos.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## Advertencias

${version.advertencias ?? ""}

## Resultado esperado

${version.resultado_esperado ?? ""}

## Preguntas frecuentes

${faq.map((f) => `**${f.pregunta}**\n\n${f.respuesta}`).join("\n\n")}
`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${guide.title.replace(/[^a-z0-9-_ ]/gi, "")}.md"`,
    },
  });
}
