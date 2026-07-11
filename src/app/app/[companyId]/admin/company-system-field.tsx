// Campo chiquito para que el admin de la empresa diga qué sistema (ERP/POS) usan
// (ej. "SAP Business One"). Ese valor es lo que hace que el contenido genérico de la
// plataforma para ese sistema aparezca automáticamente en la biblioteca de esta
// empresa — ver src/app/app/[companyId]/learn/page.tsx y
// supabase/migrations/0004_generic_content.sql.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompanySystemField({
  companyId,
  initialSystem,
}: {
  companyId: string;
  initialSystem: string;
}) {
  const router = useRouter();
  const [system, setSystem] = useState(initialSystem);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: system.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 flex items-end gap-2 rounded border border-neutral-200 bg-white p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">
          Sistema que usa esta empresa (ERP/POS)
        </label>
        <input
          type="text"
          value={system}
          onChange={(e) => {
            setSystem(e.target.value);
            setSaved(false); // si vuelve a tocar el campo, el "Guardado" anterior ya no aplica
          }}
          placeholder="ej. SAP Business One"
          className="w-64 rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-500 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
      {saved && <p className="text-xs text-green-600">Guardado ✓</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="ml-auto max-w-xs text-xs text-muted">
        Las guías genéricas de ese mismo sistema aparecen solas en &quot;Aprender&quot;.
      </p>
    </div>
  );
}
