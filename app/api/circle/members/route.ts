/**
 * GET /api/circle/members
 * Lista paginada de miembros con métricas + snapshot más reciente
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { searchParams } = new URL(req.url);

  const search  = searchParams.get("search") ?? "";
  const sort    = searchParams.get("sort") ?? "posts_count";
  const order   = searchParams.get("order") === "asc";
  const page    = parseInt(searchParams.get("page") ?? "1");
  const limit   = parseInt(searchParams.get("limit") ?? "50");
  const offset  = (page - 1) * limit;

  let query = sb
    .from("circle_members")
    .select(
      "circle_member_id, name, email, avatar_url, profile_url, posts_count, comments_count, topics_count, connections_count, last_seen_at, joined_at, active, member_tags",
      { count: "exact" }
    );

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  query = query
    .order(sort, { ascending: order })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}
