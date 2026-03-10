import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const sb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: membersRisk },
    { count: totalPosts },
    { count: postsThisWeek },
    { data: topContributors },
    { data: postsBySpace },
    { data: recentActivity },
    { data: memberGrowth },
  ] = await Promise.all([
    // Total miembros
    sb.from("circle_members").select("*", { count: "exact", head: true }),

    // Activos últimos 7 días
    sb.from("circle_members")
      .select("*", { count: "exact", head: true })
      .gte("last_seen_at", new Date(Date.now() - 7 * 86400000).toISOString()),

    // En riesgo: sin actividad 14+ días
    sb.from("circle_members")
      .select("*", { count: "exact", head: true })
      .lt("last_seen_at", new Date(Date.now() - 14 * 86400000).toISOString())
      .eq("active", true),

    // Total posts
    sb.from("circle_posts").select("*", { count: "exact", head: true }),

    // Posts esta semana
    sb.from("circle_posts")
      .select("*", { count: "exact", head: true })
      .gte("published_at", new Date(Date.now() - 7 * 86400000).toISOString()),

    // Top 10 contribuidores
    sb.from("circle_members")
      .select("name, email, avatar_url, profile_url, posts_count, comments_count, last_seen_at")
      .gt("posts_count", 0)
      .order("posts_count", { ascending: false })
      .limit(10),

    // Posts por espacio
    sb.from("circle_posts")
      .select("space_name, space_id")
      .not("space_name", "is", null),

    // Actividad reciente (últimos 30 eventos)
    sb.from("circle_activity")
      .select("*")
      .order("happened_at", { ascending: false })
      .limit(30),

    // Crecimiento: miembros por mes (últimos 8 meses)
    sb.from("circle_members")
      .select("joined_at")
      .not("joined_at", "is", null)
      .gte("joined_at", new Date(Date.now() - 240 * 86400000).toISOString()),
  ]);

  // Agrupar posts por espacio
  const spaceMap: Record<string, number> = {};
  for (const p of (postsBySpace ?? []) as { space_name: string }[]) {
    spaceMap[p.space_name] = (spaceMap[p.space_name] ?? 0) + 1;
  }
  const porEspacio = Object.entries(spaceMap)
    .map(([espacio, posts]) => ({ espacio, posts }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 8);

  // Crecimiento por mes
  const mesMap: Record<string, number> = {};
  for (const m of (memberGrowth ?? []) as { joined_at: string }[]) {
    const mes = m.joined_at.slice(0, 7);
    mesMap[mes] = (mesMap[mes] ?? 0) + 1;
  }
  const crecimiento = Object.entries(mesMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, nuevos]) => ({ mes, nuevos }));

  return NextResponse.json({
    stats: {
      totalMembers: totalMembers ?? 0,
      activeMembers: activeMembers ?? 0,
      membersRisk: membersRisk ?? 0,
      totalPosts: totalPosts ?? 0,
      postsThisWeek: postsThisWeek ?? 0,
      engagementRate: totalMembers
        ? Math.round(((activeMembers ?? 0) / (totalMembers as number)) * 100)
        : 0,
    },
    topContributors: topContributors ?? [],
    porEspacio,
    recentActivity: recentActivity ?? [],
    crecimiento,
  });
}
