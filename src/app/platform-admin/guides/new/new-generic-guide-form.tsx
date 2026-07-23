// Formulario "Nueva guía genérica". Es casi idéntico al de
// src/app/app/[companyId]/admin/guides/new/new-guide-form.tsx (mismas 3 pestañas de
// fuente: Texto/Link/PDF + capturas opcionales) pero sin empresa: en su lugar pide
// "Sistema" (obligatorio, ej. "SAP Business One") y manda isGeneric=true a
// /api/guides/generate.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPdfDirect } from "@/lib/upload-pdf";
import { readJsonResponse } from "@/lib/fetch-json";
import { generateGuidesFromText } from "@/lib/generate-guide-parts";
import { SystemSelect } from "@/components/system-select";

type SourceType = "text" | "url" | "document";

const TABS: { value: SourceType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "url", label: "Link" },
  { value: "document", label: "PDF" },
];

export function NewGenericGuideForm() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [rawText, setRawText] = useState("");
  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [system, setSystem] = useState("");
  const [module, setModule] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [generatingPart, setGeneratingPart] = useState<{ index: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !loading &&
    system.trim() &&
    ((sourceType === "text" && rawText.trim()) ||
      (sourceType === "url" && url.trim()) ||
      (sourceType === "document" && pdfFile));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // "url" sigue el camino directo de siempre: una sola llamada a
      // /api/guides/generate (el servidor extrae el texto del link), con el recorte
      // de respaldo del servidor si resulta muy largo (truncated: true).
      if (sourceType === "url") {
        const formData = new FormData();
        formData.set("isGeneric", "true");
        formData.set("system", system);
        formData.set("language", language);
        formData.set("module", module);
        formData.set("sourceType", "url");
        formData.set("url", url);
        images.forEach((img) => formData.append("images", img));

        const res = await fetch("/api/guides/generate", { method: "POST", body: formData });
        const data = await readJsonResponse(res);
        if (!res.ok) throw new Error((data.error as string) ?? "Error al generar la guía.");
        if (data.truncated) {
          alert(
            "El contenido de ese link era muy largo, así que la guía se generó solo con la primera parte."
          );
        }
        router.push(`/platform-admin/guides/${data.guideId}`);
        return;
      }

      // Para "texto pegado" y "PDF": conseguimos el texto completo primero (pegado a
      // mano, o extraído del PDF vía /api/guides/extract — rápido, sin IA), y recién
      // ahí decidimos si hace falta partirlo en varias guías (generateGuidesFromText,
      // ver src/lib/generate-guide-parts.ts).
      let fullText: string;
      if (sourceType === "document" && pdfFile) {
        setUploadingPdf(true);
        const pdfStoragePath = await uploadPdfDirect(pdfFile, { isGeneric: true });
        setUploadingPdf(false);

        setExtracting(true);
        const extractRes = await fetch("/api/guides/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfStoragePath }),
        });
        const extractData = await readJsonResponse(extractRes);
        setExtracting(false);
        if (!extractRes.ok) throw new Error((extractData.error as string) ?? "No se pudo leer el PDF.");
        fullText = extractData.text as string;
      } else {
        fullText = rawText;
      }

      const { guideIds, parts } = await generateGuidesFromText(
        fullText,
        { isGeneric: true, system, language, module, images },
        (info) => setGeneratingPart(info)
      );

      if (parts > 1) {
        alert(
          `El contenido era grande, así que se generaron ${parts} guías (una por parte) — las vas a ver en la lista con "(Parte N de ${parts})" en el título.`
        );
        router.push("/platform-admin/guides");
      } else {
        router.push(`/platform-admin/guides/${guideIds[0]}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setUploadingPdf(false);
      setExtracting(false);
      setGeneratingPart(null);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Sistema (obligatorio)
        </label>
        <div className="max-w-sm">
          <SystemSelect value={system} onChange={setSystem} required />
        </div>
        <p className="mt-1 text-xs text-muted">
          Tiene que ser el mismo sistema que cada empresa tiene configurado en su panel
          admin para que le llegue esta guía.
        </p>
      </div>

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
        </div>
      )}

      {sourceType === "document" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Archivo PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
          />
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
          className="block w-full text-sm text-muted file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
        />
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
        {uploadingPdf
          ? "Subiendo PDF..."
          : extracting
          ? "Leyendo PDF..."
          : generatingPart
          ? `Generando parte ${generatingPart.index} de ${generatingPart.total}...`
          : loading
          ? "Generando guía..."
          : "Generar guía genérica"}
      </button>
    </form>
  );
}
