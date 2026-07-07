// Página "Nueva guía desde texto". Es solo el título/descripción de arriba: el
// formulario en sí (donde está toda la lógica de pegar texto y llamar a la IA) es
// el componente NewGuideForm, en ./new-guide-form.tsx.
import { redirect } from "next/navigation";
import { requireCompanyAccess, canManageGuides } from "@/lib/auth";
import { NewGuideForm } from "./new-guide-form";

export default async function NewGuidePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { role } = await requireCompanyAccess(companyId);
  if (!canManageGuides(role)) redirect(`/app/${companyId}/learn`);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold text-neutral-900">Nueva guía desde texto</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Pega el texto desordenado (chat, notas, transcripción) y la IA genera la guía, el quick
        guide, el FAQ y el quiz.
      </p>
      <NewGuideForm companyId={companyId} />
    </div>
  );
}
