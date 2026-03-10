import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createAdminClient();
  const now = new Date();
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: newUsersWeek },
    { count: newUsersMonth },
    { count: totalLessonsCompleted },
    { count: totalEventRegs },
    { count: totalPosts },
    { count: totalQaPending },
    { count: totalCourses },
    { count: totalEvents },
    { data: topSpaces },
    { data: recentUsers },
    { data: dailySignups },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", last7),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", last30),
    supabase.from("lesson_progress").select("*", { count: "exact", head: true }).eq("completed", true),
    supabase.from("event_registrations").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("qa_questions").select("*", { count: "exact", head: true }).eq("is_answered", false),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("posts").select("space_id, spaces(name)").limit(500),
    supabase.from("profiles").select("id, name, avatar_url, created_at, public_role").order("created_at", { ascending: false }).limit(5),
    supabase.from("profiles").select("created_at").gte("created_at", last30).order("created_at", { ascending: true }),
  ]);

  // Agrupar registros por día (últimos 30 días)
  const signupsByDay: Record<string, number> = {};
  (dailySignups ?? []).forEach((u: { created_at: string }) => {
    const day = u.created_at.slice(0, 10);
    signupsByDay[day] = (signupsByDay[day] ?? 0) + 1;
  });
  const signupChart = Object.entries(signupsByDay).map(([date, count]) => ({ date, count }));

  // Top espacios por posts
  const spaceCount: Record<string, { name: string; posts: number }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (topSpaces ?? []).forEach((p: any) => {
    if (!p.space_id) return;
    const spaceName = Array.isArray(p.spaces) ? p.spaces[0]?.name : p.spaces?.name;
    const name = spaceName ?? p.space_id;
    if (!spaceCount[p.space_id]) spaceCount[p.space_id] = { name: name as string, posts: 0 };
    spaceCount[p.space_id].posts++;
  });
  const topSpacesChart = Object.values(spaceCount)
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 6);

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    newUsersWeek: newUsersWeek ?? 0,
    newUsersMonth: newUsersMonth ?? 0,
    totalLessonsCompleted: totalLessonsCompleted ?? 0,
    totalEventRegs: totalEventRegs ?? 0,
    totalPosts: totalPosts ?? 0,
    totalQaPending: totalQaPending ?? 0,
    totalCourses: totalCourses ?? 0,
    totalEvents: totalEvents ?? 0,
    topSpacesChart,
    recentUsers: recentUsers ?? [],
    signupChart,
  });
}
