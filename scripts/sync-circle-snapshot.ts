/**
 * Captura snapshot diario de métricas de todos los miembros de Circle
 * Uso: npm run sync:circle:snapshot
 * Ejecutar una vez al día (cron, Make.com schedule, etc.)
 *
 * ANTES: ejecuta scripts/create-circle-snapshots.sql en Supabase
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CIRCLE_KEY = process.env.CIRCLE_API_KEY!;
const COMMUNITY_ID = process.env.CIRCLE_COMMUNITY_ID!;
const BASE = "https://app.circle.so/api/v1";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
    process.stdout.write(`  Descargando... ${all.length} miembros\r`);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10); // "2026-03-10"
  console.log(`📸 Snapshot diario Circle — ${today}\n`);

  // 1. Fetch todos los miembros de Circle
  const members = await fetchAllMembers();
  console.log(`\n   ${members.length} miembros obtenidos`);

  // 2. Obtener connections_count actuales de Supabase (no lo da Circle API)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingMembers } = await (supabase.from("circle_members" as any) as any)
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

  // 4. Upsert snapshots (uno por miembro por día)
  let saved = 0;
  for (let i = 0; i < snapshots.length; i += 200) {
    const batch = snapshots.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("circle_member_snapshots" as any) as any)
      .upsert(batch, { onConflict: "circle_member_id,snapshot_date" });
    if (error) throw new Error(`Error guardando snapshots: ${error.message}`);
    saved += batch.length;
  }

  // 5. Actualizar también circle_members con los datos frescos
  const memberUpdates = members.map((m) => ({
    circle_member_id: m.id as number,
    posts_count:      (m.posts_count as number) ?? 0,
    comments_count:   (m.comments_count as number) ?? 0,
    topics_count:     (m.topics_count as number) ?? 0,
    last_seen_at:     (m.last_seen_at as string) || null,
    synced_at:        new Date().toISOString(),
  }));

  for (let i = 0; i < memberUpdates.length; i += 200) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("circle_members" as any) as any)
      .upsert(memberUpdates.slice(i, i + 200), { onConflict: "circle_member_id" });
  }

  // 6. Stats del snapshot
  const totalPosts = snapshots.reduce((s, r) => s + r.posts_count, 0);
  const totalComments = snapshots.reduce((s, r) => s + r.comments_count, 0);
  const activos7d = snapshots.filter((r) => {
    if (!r.last_seen_at) return false;
    return (Date.now() - new Date(r.last_seen_at).getTime()) < 7 * 86400000;
  }).length;

  console.log(`\n✅ ${saved} snapshots guardados para ${today}`);
  console.log(`   📝 ${totalPosts} posts totales acumulados`);
  console.log(`   💬 ${totalComments} comentarios totales`);
  console.log(`   🟢 ${activos7d} activos últimos 7 días`);
  console.log(`\n💡 Para actualizar conexiones: el webhook /api/circle/webhook`);
  console.log(`   recibe eventos "member_connected" de Make.com`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
