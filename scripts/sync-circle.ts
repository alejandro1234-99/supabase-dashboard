/**
 * Sincroniza miembros y posts de Circle → Supabase
 * Uso: npm run sync:circle
 *
 * ANTES: ejecuta scripts/create-circle-tables.sql en el Supabase SQL Editor
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

async function circleGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("community_id", COMMUNITY_ID);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Token ${CIRCLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Circle API error ${res.status}: ${path}`);
  return res.json();
}

async function fetchAllPages<T>(
  path: string,
  extra: Record<string, string> = {},
  perPage = 100
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  while (true) {
    const data = await circleGet(path, { per_page: String(perPage), page: String(page), ...extra });
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    process.stdout.write(`  Página ${page} (${all.length} registros)\r`);
    if (data.length < perPage) break;
    page++;
  }
  return all;
}

// ─── SYNC MEMBERS ──────────────────────────────────────────────────────────

async function syncMembers() {
  console.log("\n👥 Sincronizando miembros...");
  const raw = await fetchAllPages<Record<string, unknown>>("/community_members");
  console.log(`\n   ${raw.length} miembros obtenidos de Circle`);

  const records = raw.map((m) => ({
    circle_member_id:   m.id as number,
    user_id:            m.user_id as number | null,
    name:               (m.name as string) || null,
    first_name:         (m.first_name as string) || null,
    last_name:          (m.last_name as string) || null,
    email:              (m.email as string) || null,
    headline:           (m.headline as string) || null,
    bio:                (m.bio as string) || null,
    location:           (m.location as string) || null,
    avatar_url:         (m.avatar_url as string) || null,
    profile_url:        (m.profile_url as string) || null,
    public_uid:         (m.public_uid as string) || null,
    website_url:        (m.website_url as string) || null,
    instagram_url:      (m.instagram_url as string) || null,
    twitter_url:        (m.twitter_url as string) || null,
    linkedin_url:       (m.linkedin_url as string) || null,
    posts_count:        (m.posts_count as number) ?? 0,
    comments_count:     (m.comments_count as number) ?? 0,
    topics_count:       (m.topics_count as number) ?? 0,
    member_tags:        Array.isArray(m.member_tags)
      ? (m.member_tags as { name: string }[]).map((t) => t.name)
      : [],
    active:             (m.active as boolean) ?? true,
    accepted_invitation: m.accepted_invitation != null && m.accepted_invitation !== false,
    last_seen_at:       (m.last_seen_at as string) || null,
    joined_at:          (m.created_at as string) || null,
    updated_at:         (m.updated_at as string) || null,
    synced_at:          new Date().toISOString(),
  }));

  let total = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("circle_members" as any) as any)
      .upsert(batch, { onConflict: "circle_member_id" });
    if (error) throw new Error(`Supabase error (members): ${error.message}`);
    total += batch.length;
  }

  const activos = records.filter((r) => r.active).length;
  const conActividad = records.filter((r) => r.posts_count > 0 || r.comments_count > 0).length;
  const sinActividad = records.filter((r) => {
    if (!r.last_seen_at) return true;
    const dias = (Date.now() - new Date(r.last_seen_at).getTime()) / 86400000;
    return dias > 14;
  }).length;

  console.log(`   ✅ ${total} miembros sincronizados`);
  console.log(`   🟢 ${activos} activos`);
  console.log(`   📝 ${conActividad} con actividad publicada`);
  console.log(`   ⚠️  ${sinActividad} sin actividad en +14 días`);
}

// ─── SYNC POSTS ────────────────────────────────────────────────────────────

async function syncPosts() {
  console.log("\n📝 Sincronizando posts...");
  const raw = await fetchAllPages<Record<string, unknown>>("/posts", { sort: "created_at", order: "desc" });
  console.log(`\n   ${raw.length} posts obtenidos de Circle`);

  const records = raw.map((p) => ({
    circle_post_id: p.id as number,
    title:          (p.name as string) || null,
    slug:           (p.slug as string) || null,
    url:            (p.url as string) || null,
    space_id:       (p.space_id as number) || null,
    space_name:     (p.space_name as string) || null,
    space_slug:     (p.space_slug as string) || null,
    user_id:        (p.user_id as number) || null,
    user_email:     (p.user_email as string) || null,
    user_name:      (p.user_name as string) || null,
    comments_count: (p.comments_count as number) ?? 0,
    likes_count:    (p.likes_count as number) ?? 0,
    status:         (p.status as string) || null,
    published_at:   (p.published_at as string) || null,
    created_at:     (p.created_at as string) || null,
    updated_at:     (p.updated_at as string) || null,
    synced_at:      new Date().toISOString(),
  }));

  let total = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("circle_posts" as any) as any)
      .upsert(batch, { onConflict: "circle_post_id" });
    if (error) throw new Error(`Supabase error (posts): ${error.message}`);
    total += batch.length;
  }

  const spaces: Record<string, number> = {};
  for (const r of records) {
    if (r.space_name) spaces[r.space_name] = (spaces[r.space_name] ?? 0) + 1;
  }
  const topSpaces = Object.entries(spaces).sort((a, b) => b[1] - a[1]).slice(0, 5);

  console.log(`   ✅ ${total} posts sincronizados`);
  console.log(`   🏆 Top espacios:`);
  for (const [name, count] of topSpaces) console.log(`      ${name}: ${count}`);
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔵 Circle → Supabase sync\n");
  await syncMembers();
  await syncPosts();
  console.log("\n🎉 Sync completado");
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
