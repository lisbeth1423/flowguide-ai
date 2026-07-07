"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function selectCompany(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return;

  const cookieStore = await cookies();
  cookieStore.set("active_company_id", companyId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(`/app/${companyId}/learn`);
}
