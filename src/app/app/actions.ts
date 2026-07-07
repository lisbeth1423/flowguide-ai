// Server Action que se dispara al elegir una empresa en el selector (src/app/app/page.tsx).
// Guarda cuál fue la última empresa elegida en una cookie (así la próxima vez que el
// usuario entre, si sigue teniendo acceso a esa empresa, salta directo a "Aprender" sin
// tener que elegir de nuevo) y lo manda para allá.
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function selectCompany(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return;

  const cookieStore = await cookies();
  cookieStore.set("active_company_id", companyId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });

  redirect(`/app/${companyId}/learn`);
}
