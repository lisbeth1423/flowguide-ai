import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "editor" | "viewer" | "aprendiz";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return { supabase, user };
}

export type AccessibleCompany = {
  id: string;
  name: string;
  partner_id: string;
  role: Role;
};

// Companies the current user can see, each annotated with their effective role.
// Relies on RLS (has_company_access) to scope client_companies, then resolves
// role per company via the my_role() SQL helper (partner_admins => 'admin').
export async function getAccessibleCompanies(): Promise<AccessibleCompany[]> {
  const { supabase } = await requireUser();

  const { data: companies, error } = await supabase
    .from("client_companies")
    .select("id, name, partner_id")
    .order("name");

  if (error) throw error;
  if (!companies?.length) return [];

  const withRoles = await Promise.all(
    companies.map(async (company) => {
      const { data: role } = await supabase.rpc("my_role", {
        target_company_id: company.id,
      });
      return { ...company, role: (role as Role) ?? "viewer" };
    })
  );

  return withRoles;
}

// Verifies the current user has access to companyId and returns their role.
// Redirects to the company picker if they don't have access.
export async function requireCompanyAccess(companyId: string) {
  const { supabase, user } = await requireUser();

  const { data: company, error } = await supabase
    .from("client_companies")
    .select("id, name, partner_id")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw error;
  if (!company) redirect("/app");

  const { data: role } = await supabase.rpc("my_role", {
    target_company_id: companyId,
  });

  if (!role) redirect("/app");

  return { supabase, user, company, role: role as Role };
}

export function canManageGuides(role: Role) {
  return role === "admin" || role === "editor";
}
