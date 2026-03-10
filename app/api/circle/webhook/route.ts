/**
 * Webhook de Circle vía Make.com
 * Make.com envía eventos de Circle aquí en tiempo real
 * URL: POST /api/circle/webhook
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;

  const supabase = createAdminClient();

  // Normalizar distintos formatos que puede mandar Make
  const event_type   = (body.event_type ?? body.type ?? "unknown") as string;
  const member_id    = (body.member_id ?? body.user_id ?? null) as number | null;
  const member_email = (body.member_email ?? body.email ?? null) as string | null;
  const member_name  = (body.member_name ?? body.name ?? null) as string | null;
  const post_id      = (body.post_id ?? null) as number | null;
  const post_title   = (body.post_title ?? body.post_name ?? null) as string | null;
  const space_id     = (body.space_id ?? null) as number | null;
  const space_name   = (body.space_name ?? null) as string | null;
  const happened_at  = (body.happened_at ?? body.created_at ?? new Date().toISOString()) as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("circle_activity" as any) as any).insert({
    event_type,
    member_id,
    member_email,
    member_name,
    post_id,
    post_title,
    space_id,
    space_name,
    metadata: body,
    happened_at,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sb = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Nuevo miembro → upsert en circle_members
  if (event_type === "member_joined" && member_id) {
    await sb.from("circle_members").upsert({
      circle_member_id: member_id,
      name: member_name,
      email: member_email,
      joined_at: happened_at,
      synced_at: new Date().toISOString(),
    }, { onConflict: "circle_member_id" });
  }

  // Nueva conexión → incrementar connections_count del miembro receptor
  // Make.com debe enviar: event_type="member_connected", member_id=ID del receptor
  if (event_type === "member_connected" && member_id) {
    // Fetch current count
    const { data: current } = await sb.from("circle_members")
      .select("connections_count")
      .eq("circle_member_id", member_id)
      .single();

    const newCount = ((current?.connections_count ?? 0) as number) + 1;
    await sb.from("circle_members")
      .update({ connections_count: newCount, synced_at: new Date().toISOString() })
      .eq("circle_member_id", member_id);

    // Actualizar también el snapshot de hoy si existe
    const today = new Date().toISOString().slice(0, 10);
    await sb.from("circle_member_snapshots")
      .update({ connections_count: newCount })
      .eq("circle_member_id", member_id)
      .eq("snapshot_date", today);
  }

  return NextResponse.json({ ok: true });
}
