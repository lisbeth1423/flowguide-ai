// Formulario de "Nueva empresa". Si el usuario es partner_admin de un solo partner,
// ni se muestra el selector (se manda ese directo). Si administra más de uno, elige.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewCompanyForm({ partners }: { partners: { id: string; name: string }[] }) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [name, setName] = useState("");
  const [system, setSystem] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, name, system: system.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la empresa.");
      router.push(`/app/${data.companyId}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border border-neutral-200 bg-white p-5">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {partners.length > 1 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Partner</label>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Nombre de la empresa</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. Ferretería El Tornillo Feliz"
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Sistema (opcional, se puede completar después)
        </label>
        <input
          type="text"
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          placeholder="ej. SAP Business One"
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim() || !partnerId}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear empresa"}
      </button>
    </form>
  );
}
