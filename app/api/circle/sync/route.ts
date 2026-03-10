/**
 * Sync manual desde el dashboard — llama a Circle API y actualiza Supabase
 * POST /api/circle/sync
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const CIRCLE_KEY = process.env.CIRCLE_API_KEY!;
const COMMUNITY_ID = process.env.CIRCLE_COMMUNITY_ID!;
const BASE = "https://app.circle.so/api/v1";

async function circleGetAll(path: string, perPage = 100) {
  const all = [];
  let page = 1;
  while (true) {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set("community_id", COMMUNITY_ID);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    const res = await fetch(url.toString(), { headers: { Authorization: `Token ${CIRCLE_KEY}` } });
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < perPage) break;
    page++;
  }
  return all;
}

export async function POST() {
  const sb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Sync members
  const members = await circleGetAll("/community_members");
  const memberRecords = members.map((m: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    circle_member_id: m.id,
    user_id: m.user_id,
    name: m.name || null,
    first_name: m.first_name || null,
    last_name: m.last_name || null,
    email: m.email || null,
    headline: m.headline || null,
    bio: m.bio || null,
    location: m.location || null,
    avatar_url: m.avatar_url || null,
    profile_url: m.profile_url || null,
    public_uid: m.public_uid || null,
    website_url: m.website_url || null,
    instagram_url: m.instagram_url || null,
    twitter_url: m.twitter_url || null,
    linkedin_url: m.linkedin_url || null,
    posts_count: m.posts_count ?? 0,
    comments_count: m.comments_count ?? 0,
    topics_count: m.topics_count ?? 0,
    member_tags: Array.isArray(m.member_tags) ? m.member_tags.map((t: any) => t.name) : [], // eslint-disable-line @typescript-eslint/no-explicit-any
    active: m.active ?? true,
    accepted_invitation: m.accepted_invitation != null && m.accepted_invitation !== false,
    last_seen_at: m.last_seen_at || null,
    joined_at: m.created_at || null,
    updated_at: m.updated_at || null,
    synced_at: new Date().toISOString(),
  }));

  for (let i = 0; i < memberRecords.length; i += 200) {
    await sb.from("circle_members").upsert(memberRecords.slice(i, i + 200), { onConflict: "circle_member_id" });
  }

  // Sync posts
  const posts = await circleGetAll("/posts");
  const postRecords = posts.map((p: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    circle_post_id: p.id,
    title: p.name || null,
    slug: p.slug || null,
    url: p.url || null,
    space_id: p.space_id || null,
    space_name: p.space_name || null,
    space_slug: p.space_slug || null,
    user_id: p.user_id || null,
    user_email: p.user_email || null,
    user_name: p.user_name || null,
    comments_count: p.comments_count ?? 0,
    likes_count: p.likes_count ?? 0,
    status: p.status || null,
    published_at: p.published_at || null,
    created_at: p.created_at || null,
    updated_at: p.updated_at || null,
    synced_at: new Date().toISOString(),
  }));

  for (let i = 0; i < postRecords.length; i += 200) {
    await sb.from("circle_posts").upsert(postRecords.slice(i, i + 200), { onConflict: "circle_post_id" });
  }

  return NextResponse.json({
    ok: true,
    members: memberRecords.length,
    posts: postRecords.length,
  });
}
