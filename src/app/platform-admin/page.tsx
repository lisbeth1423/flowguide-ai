// /platform-admin redirige directo a /platform-admin/guides — no hay nada más que
// mostrar en esta raíz por ahora.
import { redirect } from "next/navigation";

export default function PlatformAdminRootPage() {
  redirect("/platform-admin/guides");
}
