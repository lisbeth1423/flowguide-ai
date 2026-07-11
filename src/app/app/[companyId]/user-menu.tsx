// Menú desplegable con las acciones "de cuenta/administración" (Admin, Contenido
// genérico, Nueva empresa, Cambiar empresa, Salir). Antes estaban todas sueltas y
// siempre visibles en la barra de arriba, mezcladas con la navegación normal — eso
// hacía que acciones sensibles (crear una empresa, entrar al panel admin) quedaran
// tan a la vista como "Inicio". Ahora solo "Inicio" queda fijo en la barra; el resto
// vive acá adentro, un clic más lejos.
"use client";

import { useState } from "react";
import Link from "next/link";
import { logout } from "@/app/login/actions";

export function UserMenu({
  email,
  companyId,
  canManageGuides,
  isPlatformAdmin,
  isPartnerAdmin,
}: {
  email: string;
  companyId: string;
  canManageGuides: boolean;
  isPlatformAdmin: boolean;
  isPartnerAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    // onBlur con relatedTarget: cierra el menú cuando el foco se va fuera de este
    // <div> (por ejemplo, al hacer clic afuera), pero no cuando el foco se mueve
    // ENTRE los links de adentro del menú.
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-600 hover:border-neutral-400"
      >
        <span className="max-w-[160px] truncate">{email}</span>
        <span aria-hidden className="text-xs text-muted">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded border border-neutral-200 bg-white py-1 text-sm shadow-md">
          {canManageGuides && (
            <Link
              href={`/app/${companyId}/admin`}
              className="block px-3 py-2 text-neutral-700 hover:bg-background"
            >
              Admin
            </Link>
          )}
          {isPlatformAdmin && (
            <Link
              href="/platform-admin/guides"
              className="block px-3 py-2 text-neutral-700 hover:bg-background"
            >
              Contenido genérico
            </Link>
          )}
          {isPartnerAdmin && (
            <Link
              href="/app/new-company"
              className="block px-3 py-2 text-neutral-700 hover:bg-background"
            >
              + Nueva empresa
            </Link>
          )}
          <Link href="/app" className="block px-3 py-2 text-neutral-700 hover:bg-background">
            Cambiar empresa
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="block w-full px-3 py-2 text-left text-muted hover:bg-background"
            >
              Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
