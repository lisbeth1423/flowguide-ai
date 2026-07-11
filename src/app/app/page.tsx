// Pantalla "Elige una empresa" (/app). Aparece cuando un usuario tiene acceso a más
// de una empresa cliente (un partner que atiende a varios clientes, por ejemplo).
//
// Reglas de "atajo" para no mostrar esta pantalla innecesariamente:
//   - Si el usuario solo tiene UNA empresa, lo mandamos derecho a esa (nunca ve esta
//     pantalla).
//   - Si tiene varias pero ya había elegido una antes (guardada en la cookie
//     "active_company_id" por selectCompany en ./actions.ts) y todavía tiene acceso
//     a ella, lo mandamos ahí directo también.
//   - Si no aplica ninguna de las anteriores, recién ahí se muestra la lista para elegir.
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAccessibleCompanies } from "@/lib/auth";
import { selectCompany } from "./actions";

export default async function CompanyPickerPage() {
  const companies = await getAccessibleCompanies();

  const cookieStore = await cookies();
  const lastCompanyId = cookieStore.get("active_company_id")?.value;
  const lastCompanyStillAccessible =
    lastCompanyId && companies.some((c) => c.id === lastCompanyId);

  if (companies.length === 1) {
    redirect(`/app/${companies[0].id}/learn`);
  }
  if (lastCompanyStillAccessible) {
    redirect(`/app/${lastCompanyId}/learn`);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <Image src="/logo-horizontal.png" alt="FlowGuide" width={140} height={37} priority className="mb-6" />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Elige una empresa</h1>
      <p className="mb-6 text-sm text-muted">
        Tienes acceso a varias empresas cliente. Selecciona con cuál quieres trabajar.
      </p>

      {companies.length === 0 && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tu usuario todavía no tiene acceso a ninguna empresa. Pide a un administrador que te
          agregue.
        </p>
      )}

      <ul className="space-y-2">
        {companies.map((company) => (
          <li key={company.id}>
            <form action={selectCompany}>
              <input type="hidden" name="companyId" value={company.id} />
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded border border-neutral-200 bg-white px-4 py-3 text-left text-sm hover:border-neutral-400"
              >
                <span className="font-medium text-foreground">{company.name}</span>
                <span className="text-xs uppercase tracking-wide text-muted">
                  {company.role}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
