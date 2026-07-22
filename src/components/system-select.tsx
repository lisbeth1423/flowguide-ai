// Selector de "Sistema" reutilizable: un <select> con la lista fija de
// src/lib/catalog.ts, más una opción "Otro" que revela un campo de texto libre para
// casos no contemplados. Lo usan los 4 lugares donde se elige/edita el sistema de una
// empresa o de una guía genérica (ver grep de "SystemSelect" en el repo).
//
// Si el valor que llega no está en la lista (ej. algo que se guardó antes de este
// cambio, con mayúsculas distintas), se muestra como "Otro" con el texto tal cual
// estaba — así quien lo edite lo ve y puede corregirlo eligiendo la opción correcta.
"use client";

import { useState } from "react";
import { SYSTEMS } from "@/lib/catalog";

const OTHER = "__otro__";

export function SystemSelect({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const isKnown = (SYSTEMS as readonly string[]).includes(value);
  const [showCustom, setShowCustom] = useState(value !== "" && !isKnown);

  return (
    <div>
      <select
        required={required}
        value={showCustom ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setShowCustom(true);
            onChange("");
          } else {
            setShowCustom(false);
            onChange(e.target.value);
          }
        }}
        className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
      >
        <option value="">— Elegir sistema —</option>
        {SYSTEMS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
        <option value={OTHER}>Otro (especificar)</option>
      </select>
      {showCustom && (
        <input
          type="text"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribí el nombre del sistema"
          className="mt-2 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
