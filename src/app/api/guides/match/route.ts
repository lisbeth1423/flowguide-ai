import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { matchGuide } from "@/lib/anthropic";

export async function POST(request: Request) {
  const { supabase } = await requireUser();
  const body = await request.json();
  const clientCompanyId = String(body.clientCompanyId ?? "");
  const query = String(body.query ?? "").trim();

  if (!clientCompanyId || !query) {
    return NextResponse.json({ error: "clientCompanyId y query son obligatorios." }, { status: 400 });
  }

  const { data: guides, error } = await supabase
    .from("guides")
    .select("id, title, guide_versions:current_version_id(quick_guide)")
    .eq("client_company_id", clientCompanyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const guideSummaries = (guides ?? []).map((g) => {
    const version = Array.isArray(g.guide_versions) ? g.guide_versions[0] : g.guide_versions;
    return { id: g.id, title: g.title, quick_guide: version?.quick_guide ?? null };
  });

  const result = await matchGuide(query, guideSummaries);
  const matchedGuides = guideSummaries.filter((g) => result.guide_ids.includes(g.id));

  return NextResponse.json({ ...result, guides: matchedGuides });
}
