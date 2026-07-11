// Página "Usuarios de la empresa" (/app/[companyId]/admin/users). Solo entra el rol
// "admin" (ni siquiera "editor" — gestionar quién entra y qué ve es más sensible que
// gestionar guías).
//
// Trae dos cosas del servidor y se las pasa al componente interactivo (UsersManager):
//   1. La lista de usuarios con acceso a esta empresa (vía GET /api/companies/.../users,
//      llamado del lado del servidor acá mismo para el primer render).
//   2. Los módulos que ya existen entre las guías de esta empresa — son las opciones
//      que se pueden marcar como "área" de un usuario (ver
//      supabase/migrations/0005_areas.sql). Se usan los módulos YA EXISTENTES en vez
//      de dejar escribir texto libre, para que nunca haya un desajuste de tipeo entre
//      el módulo de una guía y el área de un usuario.
import { redirect } from "next/navigation";
import { requireCompanyAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersManager } from "./users-manager";

export default async function CompanyUsersPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { supabase, role } = await requireCompanyAccess(companyId);
  if (role !== "admin") redirect(`/app/${companyId}/admin`);

  const [{ data: accessRows }, { data: guideModules }] = await Promise.all([
    supabase
      .from("user_client_access")
      .select("id, user_id, role, areas, created_at")
      .eq("client_company_id", companyId)
      .order("created_at"),
    supabase.from("guides").select("module").eq("client_company_id", companyId).not("module", "is", null),
  ]);

  const admin = createAdminClient();
  const initialUsers = await Promise.all(
    (accessRows ?? []).map(async (row) => {
      const { data } = await admin.auth.admin.getUserById(row.user_id);
      return {
        accessId: row.id,
        userId: row.user_id,
        email: data.user?.email ?? row.user_id,
        role: row.role as "admin" | "editor" | "viewer" | "aprendiz",
        areas: (row.areas as string[] | null) ?? [],
      };
    })
  );

  const availableAreas = Array.from(
    new Set((guideModules ?? []).map((g) => g.module).filter((m): m is string => Boolean(m)))
  ).sort();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-lg font-semibold text-foreground">Usuarios de la empresa</h1>
      <p className="mb-6 text-sm text-muted">
        Quién puede entrar, con qué rol, y a qué áreas tiene acceso (si no se le marca
        ningún área, ve todas las guías).
      </p>
      <UsersManager companyId={companyId} initialUsers={initialUsers} availableAreas={availableAreas} />
    </div>
  );
}
