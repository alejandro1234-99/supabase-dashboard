/**
 * Cron diario: snapshot de métricas de todos los miembros de Circle
 * Ejecutado por Vercel Cron: 0 3 * * * (3:00 AM UTC cada día)
 * Protegido con CRON_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const CIRCLE_KEY    = process.env.CIRCLE_API_KEY!;
const COMMUNITY_ID  = process.env.CIRCLE_COMMUNITY_ID!;
const BASE          = "https://app.circle.so/api/v1";
const CRON_SECRET   = process.env.CRON_SECRET;

async function fetchAllMembers() {
  const all = [];
  let page = 1;
  while (true) {
    const url = new URL(`${BASE}/community_members`);
    url.searchParams.set("community_id", COMMUNITY_ID);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Token ${CIRCLE_KEY}` },
    });
    if (!res.ok) break;
    const data = await res.json() as Record<string, unknown>[];
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

export async function GET(req: NextRequest) {
  // Verificar secret
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const today = new Date().toISOString().slice(0, 10);

  // 1. Fetch miembros de Circle
  const members = await fetchAllMembers();

  // 2. Leer connections_count actuales de Supabase
  const { data: existingMembers } = await sb
    .from("circle_members")
    .select("circle_member_id, connections_count")
    .limit(10000);

  const connectionsMap: Record<number, number> = {};
  for (const m of (existingMembers ?? []) as { circle_member_id: number; connections_count: number }[]) {
    connectionsMap[m.circle_member_id] = m.connections_count ?? 0;
  }

  // 3. Preparar snapshots
  const snapshots = members.map((m) => ({
    circle_member_id:  m.id as number,
    snapshot_date:     today,
    posts_count:       (m.posts_count as number) ?? 0,
    comments_count:    (m.comments_count as number) ?? 0,
    topics_count:      (m.topics_count as number) ?? 0,
    connections_count: connectionsMap[m.id as number] ?? 0,
    last_seen_at:      (m.last_seen_at as string) || null,
  }));

  // 4. Upsert snapshots por batches de 200
  let saved = 0;
  for (let i = 0; i < snapshots.length; i += 200) {
    const { error } = await sb
      .from("circle_member_snapshots")
      .upsert(snapshots.slice(i, i + 200), { onConflict: "circle_member_id,snapshot_date" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    saved += snapshots.slice(i, i + 200).length;
  }

  // 5. Actualizar circle_members con datos frescos
  const memberUpdates = members.map((m) => ({
    circle_member_id: m.id as number,
    posts_count:      (m.posts_count as number) ?? 0,
    comments_count:   (m.comments_count as number) ?? 0,
    topics_count:     (m.topics_count as number) ?? 0,
    last_seen_at:     (m.last_seen_at as string) || null,
    synced_at:        new Date().toISOString(),
  }));

  for (let i = 0; i < memberUpdates.length; i += 200) {
    await sb
      .from("circle_members")
      .upsert(memberUpdates.slice(i, i + 200), { onConflict: "circle_member_id" });
  }

  const activos7d = snapshots.filter((r) => {
    if (!r.last_seen_at) return false;
    return (Date.now() - new Date(r.last_seen_at).getTime()) < 7 * 86400000;
  }).length;

  console.log(`[cron] circle-snapshot ${today}: ${saved} snapshots, ${activos7d} activos 7d`);

  return NextResponse.json({
    ok: true,
    date: today,
    members: members.length,
    snapshots: saved,
    active7d: activos7d,
  });
}
