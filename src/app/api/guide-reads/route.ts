import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  const body = await request.json();
  const guideId = String(body.guideId ?? "");
  const clientCompanyId = String(body.clientCompanyId ?? "");

  if (!guideId || !clientCompanyId) {
    return NextResponse.json({ error: "guideId y clientCompanyId son obligatorios." }, { status: 400 });
  }

  const { error } = await supabase.from("guide_reads").insert({
    guide_id: guideId,
    client_company_id: clientCompanyId,
    user_id: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
