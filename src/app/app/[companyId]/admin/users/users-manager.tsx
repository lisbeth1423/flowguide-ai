// Componente interactivo de la pantalla "Usuarios de la empresa": el formulario para
// invitar gente nueva, y la tabla para editar rol/áreas o quitar acceso a alguien que
// ya está. Llama a los endpoints en src/app/api/companies/[companyId]/users/.
"use client";

import { useState } from "react";

type Role = "admin" | "editor" | "viewer" | "aprendiz";

type UserRow = {
  accessId: string;
  userId: string;
  email: string;
  role: Role;
  areas: string[];
};

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
  { value: "aprendiz", label: "Aprendiz" },
];

function AreaCheckboxes({
  availableAreas,
  selected,
  onChange,
}: {
  availableAreas: string[];
  selected: string[];
  onChange: (areas: string[]) => void;
}) {
  if (!availableAreas.length) {
    return (
      <p className="text-xs text-muted">
        Todavía no hay módulos definidos en ninguna guía de esta empresa.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {availableAreas.map((area) => {
        const checked = selected.includes(area);
        return (
          <label
            key={area}
            className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs ${
              checked ? "border-accent bg-accent-soft text-accent" : "border-neutral-300 text-neutral-600"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) =>
                onChange(e.target.checked ? [...selected, area] : selected.filter((a) => a !== area))
              }
              className="mr-1 align-middle"
            />
            {area}
          </label>
        );
      })}
    </div>
  );
}

export function UsersManager({
  companyId,
  initialUsers,
  availableAreas,
}: {
  companyId: string;
  initialUsers: UserRow[];
  availableAreas: string[];
}) {
  const [users, setUsers] = useState(initialUsers);

  // --- Formulario de invitación ---
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("aprendiz");
  const [inviteAreas, setInviteAreas] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastTempPassword, setLastTempPassword] = useState<{ email: string; password: string } | null>(
    null
  );

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setLastTempPassword(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole, areas: inviteAreas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo agregar el usuario.");
      setUsers([
        ...users,
        { accessId: data.userId, userId: data.userId, email: data.email, role: inviteRole, areas: inviteAreas },
      ]);
      if (data.tempPassword) {
        setLastTempPassword({ email: data.email, password: data.tempPassword });
      }
      setEmail("");
      setInviteRole("aprendiz");
      setInviteAreas([]);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setInviting(false);
    }
  }

  // --- Edición de un usuario existente ---
  async function updateUser(userId: string, patch: { role?: Role; areas?: string[] }) {
    setUsers(users.map((u) => (u.userId === userId ? { ...u, ...patch } : u)));
    await fetch(`/api/companies/${companyId}/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function removeUser(userId: string) {
    if (!confirm("¿Quitarle el acceso a esta empresa a este usuario?")) return;
    setUsers(users.filter((u) => u.userId !== userId));
    await fetch(`/api/companies/${companyId}/users/${userId}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleInvite} className="space-y-3 rounded border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-foreground">Agregar usuario</h2>
        {inviteError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{inviteError}</p>}
        {lastTempPassword && (
          <p className="rounded bg-accent-soft px-3 py-2 text-sm text-accent">
            Cuenta creada para {lastTempPassword.email}. Contraseña temporal:{" "}
            <strong>{lastTempPassword.password}</strong> — compartísela vos, no se vuelve a mostrar.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@empresa.com"
            className="min-w-64 flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {inviting ? "Agregando..." : "Agregar"}
          </button>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-700">
            Áreas (opcional — sin ninguna marcada, ve todas las guías)
          </p>
          <AreaCheckboxes availableAreas={availableAreas} selected={inviteAreas} onChange={setInviteAreas} />
        </div>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Con acceso hoy ({users.length})</h2>
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.userId} className="rounded border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{u.email}</span>
                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.userId, { role: e.target.value as Role })}
                    className="rounded border border-neutral-300 px-2 py-1 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeUser(u.userId)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <AreaCheckboxes
                availableAreas={availableAreas}
                selected={u.areas}
                onChange={(areas) => updateUser(u.userId, { areas })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
