// Formulario "Nueva guía". Es un componente de CLIENTE ("use client": corre en el
// navegador, no en el servidor) porque necesita mostrar el estado de "Generando
// guía..." mientras espera la respuesta de la IA — eso solo se puede hacer con
// interactividad del lado del navegador.
//
// Tiene 3 pestañas para elegir de dónde sale el contenido (sourceType): texto pegado,
// un link, o un PDF. En cualquiera de los 3 casos se pueden sumar capturas de pantalla
// sueltas como referencia extra para la IA.
//
// Al enviar el formulario, arma un FormData (no JSON, porque puede llevar archivos) y
// llama a POST /api/guides/generate (ver src/app/api/guides/generate/route.ts), que es
// donde realmente se habla con Claude y se guarda todo en la base de datos. Este
// archivo solo arma el pedido y muestra el resultado/error.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SourceType = "text" | "url" | "document";

const TABS: { value: SourceType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "url", label: "Link" },
  { value: "document", label: "PDF" },
];

export function NewGuideForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [rawText, setRawText] = useState("");
  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [module, setModule] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !loading &&
    ((sourceType === "text" && rawText.trim()) ||
      (sourceType === "url" && url.trim()) ||
      (sourceType === "document" && pdfFile));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // FormData en vez de JSON porque puede llevar un archivo PDF y/o imágenes.
      // No hace falta poner el header "Content-Type": el navegador arma uno solo
      // con el "boundary" correcto (el separador entre campos) cuando el body es
      // un FormData.
      const formData = new FormData();
      formData.set("clientCompanyId", companyId);
      formData.set("language", language);
      formData.set("module", module);
      formData.set("sourceType", sourceType);
      if (sourceType === "text") formData.set("rawText", rawText);
      if (sourceType === "url") formData.set("url", url);
      if (sourceType === "document" && pdfFile) formData.set("pdfFile", pdfFile);
      images.forEach((img) => formData.append("images", img));

      const res = await fetch("/api/guides/generate", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al generar la guía.");
      router.push(`/app/${companyId}/admin/guides/${data.guideId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-1 rounded border border-neutral-200 bg-white p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSourceType(tab.value)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              sourceType === tab.value ? "bg-primary text-white" : "text-neutral-600 hover:bg-background"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sourceType === "text" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Texto desordenado
          </label>
          <textarea
            rows={12}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Pega aquí la explicación, chat, o notas de cómo se hace el proceso..."
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      {sourceType === "url" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Link a la página con la información
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted">
            El sistema entra al link y saca el texto solo. Si el sitio bloquea el acceso
            automático, vas a tener que pegar el texto a mano (pestaña &quot;Texto&quot;).
          </p>
        </div>
      )}

      {sourceType === "document" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Archivo PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <p className="mt-1 text-xs text-muted">
            Se extrae el texto del PDF. Si el PDF tiene imágenes que necesitás que la IA
            vea (por ejemplo capturas de pantalla), subilas abajo en &quot;Capturas de
            pantalla&quot;.
          </p>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Capturas de pantalla (opcional, hasta 5)
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(e) => setImages(Array.from(e.target.files ?? []).slice(0, 5))}
          className="block w-full text-sm"
        />
        <p className="mt-1 text-xs text-muted">
          La IA las usa como referencia visual para precisar botones/menús, pero no
          reemplazan al texto. No quedan guardadas — solo se usan para esta generación.
        </p>
      </div>

      <div className="flex gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Idioma</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "es" | "en")}
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Módulo (opcional)
          </label>
          <input
            type="text"
            value={module}
            onChange={(e) => setModule(e.target.value)}
            placeholder="ej. Facturación, Inventario, Compras..."
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Generando guía..." : "Generar guía"}
      </button>
    </form>
  );
}
