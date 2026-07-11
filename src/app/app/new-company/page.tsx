// Página "Nueva empresa" (/app/new-company). Solo la puede usar alguien que sea
// "partner_admin" de al menos un partner (ver src/lib/auth.ts → getAdminPartners) —
// si no lo es, se lo manda de vuelta al selector de empresas. Vive fuera de
// /app/[companyId]/... a propósito: crear una empresa nueva no está atado a ninguna
// empresa existente.
import { redirect } from "next/navigation";
import { getAdminPartners } from "@/lib/auth";
import { NewCompanyForm } from "./new-company-form";

export default async function NewCompanyPage() {
  const partners = await getAdminPartners();
  if (!partners.length) redirect("/app");

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Nueva empresa</h1>
      <p className="mb-6 text-sm text-muted">
        Creá una empresa cliente nueva. Vas a quedar como admin automáticamente (los
        partner admins administran todas las empresas de su partner).
      </p>
      <NewCompanyForm partners={partners} />
    </main>
  );
}
