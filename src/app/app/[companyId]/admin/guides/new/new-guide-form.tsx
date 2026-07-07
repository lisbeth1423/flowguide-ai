// Formulario "Nueva guía desde texto". Es un componente de CLIENTE ("use client":
// corre en el navegador, no en el servidor) porque necesita mostrar el estado de
// "Generando guía..." mientras espera la respuesta de la IA — eso solo se puede
// hacer con interactividad del lado del navegador.
//
// Al enviar el formulario, llama a POST /api/guides/generate (ver
// src/app/api/guides/generate/route.ts), que es donde realmente se habla con Claude
// y se guarda todo en la base de datos. Este archivo solo arma el pedido y muestra
// el resultado/error.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewGuideForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [module, setModule] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/guides/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientCompanyId: companyId, rawText, language, module }),
      });
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

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Texto desordenado
        </label>
        <textarea
          required
          rows={12}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Pega aquí la explicación, chat, o notas de cómo se hace el proceso..."
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
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
        disabled={loading || !rawText.trim()}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? "Generando guía..." : "Generar guía"}
      </button>
    </form>
  );
}
