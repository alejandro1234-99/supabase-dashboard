import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// Space "Soporte técnico" del Hub
const SOPORTE_SPACE_ID = "c62f3adc-de3c-45d5-85bc-be1a4905ccb1";
// Cuenta "Soporte Revolutia"
const SOPORTE_USER_ID = "96872496-d067-45cd-ba22-1c470a079b1e";

export { SOPORTE_SPACE_ID, SOPORTE_USER_ID };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim() ?? "";

  const supabase = createAdminClient();

  // Traer posts del space "Soporte técnico" con datos del autor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("posts" as any) as any)
    .select(`
      id,
      content,
      image_url,
      is_pinned,
      support_status,
      assigned_to,
      created_at,
      updated_at,
      resolved_at,
      user_id,
      migrated_author_name,
      migrated_author_avatar
    `)
    .eq("space_id", SOPORTE_SPACE_ID)
    .order("created_at", { ascending: false });

  if (status === "pending") query = query.eq("support_status", "pending");
  else if (status === "escalated") query = query.eq("support_status", "escalated");
  else if (status === "resolved") query = query.eq("support_status", "resolved");
  else if (status === "null") query = query.is("support_status", null);

  if (search) query = query.ilike("content", `%${search}%`);

  const { data: rawPosts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const posts = rawPosts ?? [];

  // IDs de usuarios para buscar perfiles
  const userIds = [...new Set(posts.map((p: { user_id: string }) => p.user_id))];

  // Traer perfiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from("profiles" as any) as any)
    .select("user_id, name, avatar_url")
    .in("user_id", userIds);

  const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
  }

  // Traer conteo de comentarios y likes por post
  const postIds = posts.map((p: { id: string }) => p.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: comments } = await (supabase.from("comments" as any) as any)
    .select("post_id")
    .in("post_id", postIds);

  const commentCountMap: Record<string, number> = {};
  for (const c of comments ?? []) {
    commentCountMap[c.post_id] = (commentCountMap[c.post_id] ?? 0) + 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: likes } = await (supabase.from("post_likes" as any) as any)
    .select("post_id")
    .in("post_id", postIds);

  const likeCountMap: Record<string, number> = {};
  for (const l of likes ?? []) {
    likeCountMap[l.post_id] = (likeCountMap[l.post_id] ?? 0) + 1;
  }

  // Check which posts have a reply from soporte
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: soporteComments } = await (supabase.from("comments" as any) as any)
    .select("post_id")
    .in("post_id", postIds)
    .eq("user_id", SOPORTE_USER_ID);

  const soporteRepliedSet = new Set((soporteComments ?? []).map((c: { post_id: string }) => c.post_id));

  // Enrich posts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = posts.map((p: any) => {
    const profile = profileMap[p.user_id];
    // Extract title (first line) from content
    const plainContent = p.content?.replace(/<[^>]*>/g, "") ?? "";
    const lines = plainContent.split("\n").filter((l: string) => l.trim());
    const title = lines[0]?.trim().slice(0, 120) ?? "Sin título";
    const excerpt = lines.slice(1).join(" ").trim().slice(0, 200) ?? "";

    // Calcular tiempo de resolución en horas
    let resolution_hours: number | null = null;
    if (p.resolved_at && p.created_at) {
      resolution_hours = Math.round(
        (new Date(p.resolved_at).getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60) * 10
      ) / 10;
    }

    return {
      id: p.id,
      user_id: p.user_id,
      content: p.content,
      title,
      excerpt,
      image_url: p.image_url,
      is_pinned: p.is_pinned,
      support_status: p.support_status,
      assigned_to: p.assigned_to,
      created_at: p.created_at,
      updated_at: p.updated_at,
      resolved_at: p.resolved_at,
      resolution_hours,
      author_name: profile?.name ?? p.migrated_author_name ?? "Usuario",
      author_avatar: profile?.avatar_url ?? p.migrated_author_avatar ?? null,
      comment_count: commentCountMap[p.id] ?? 0,
      like_count: likeCountMap[p.id] ?? 0,
      has_soporte_reply: soporteRepliedSet.has(p.id),
    };
  });

  // Stats
  const resolvedWithTime = enriched.filter(
    (p: { resolution_hours: number | null }) => p.resolution_hours !== null
  );
  const avgResolutionHours =
    resolvedWithTime.length > 0
      ? Math.round(
          resolvedWithTime.reduce(
            (sum: number, p: { resolution_hours: number | null }) => sum + (p.resolution_hours ?? 0),
            0
          ) / resolvedWithTime.length * 10
        ) / 10
      : null;

  const stats = {
    total: enriched.length,
    sinAtender: enriched.filter((p: { support_status: string | null; has_soporte_reply: boolean }) => !p.support_status && !p.has_soporte_reply).length,
    pendientes: enriched.filter((p: { support_status: string | null }) => p.support_status === "pending").length,
    escalados: enriched.filter((p: { support_status: string | null }) => p.support_status === "escalated").length,
    resueltos: enriched.filter((p: { support_status: string | null }) => p.support_status === "resolved").length,
    avgResolutionHours,
  };

  return NextResponse.json({ data: enriched, stats });
}
