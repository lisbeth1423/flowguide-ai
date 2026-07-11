// Página "Nueva guía genérica". Igual que src/app/app/[companyId]/admin/guides/new/page.tsx
// pero para contenido de la plataforma (sin empresa dueña) — el formulario en sí está
// en ./new-generic-guide-form.tsx.
import { requirePlatformAdmin } from "@/lib/auth";
import { NewGenericGuideForm } from "./new-generic-guide-form";

export default async function NewGenericGuidePage() {
  await requirePlatformAdmin();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold text-foreground">Nueva guía genérica</h1>
      <p className="mb-6 text-sm text-muted">
        Esta guía no pertenece a ninguna empresa: aparece sola en la biblioteca de
        cualquier empresa que tenga el mismo &quot;sistema&quot; configurado.
      </p>
      <NewGenericGuideForm />
    </div>
  );
}
