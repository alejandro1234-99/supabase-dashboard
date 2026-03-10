import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stars = searchParams.get("stars");
  const search = searchParams.get("search")?.trim() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 20;
  const from = (page - 1) * pageSize;

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("trustpilot_reviews" as any) as any)
    .select("*", { count: "exact" })
    .order("review_date", { ascending: false })
    .range(from, from + pageSize - 1);

  if (stars) query = query.eq("stars", parseInt(stars));
  if (search) {
    query = query.or(
      `reviewer_name.ilike.%${search}%,review_body.ilike.%${search}%,headline.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Estadísticas agregadas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allReviews } = await (supabase.from("trustpilot_reviews" as any) as any)
    .select("stars, reviewer_name, review_date");

  const allStars = allReviews ?? [];

  const starCounts = [1, 2, 3, 4, 5].map((s) => ({
    stars: s,
    count: allStars.filter((r: { stars: number }) => r.stars === s).length,
  }));
  const avgRating = allStars.length
    ? ((allStars as { stars: number }[]).reduce((s, r) => s + r.stars, 0) / allStars.length).toFixed(2)
    : "0";

  // Unique reviewers = distinct names that appear ≤2 times
  // (reviewers with 3+ reviews are power-reviewers, not counted as unique)
  const nameCount: Record<string, number> = {};
  for (const r of allStars as { reviewer_name: string }[]) {
    const key = r.reviewer_name.trim().toLowerCase();
    nameCount[key] = (nameCount[key] ?? 0) + 1;
  }
  const uniqueReviewers = Object.values(nameCount).filter((c) => c <= 2).length;

  // Monthly breakdown
  const monthCount: Record<string, number> = {};
  for (const r of allStars as { review_date: string }[]) {
    const month = r.review_date?.slice(0, 7); // "2025-09"
    if (month) monthCount[month] = (monthCount[month] ?? 0) + 1;
  }
  const monthlyData = Object.entries(monthCount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  // Weekly breakdown (ISO week)
  function isoWeekKey(dateStr: string): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  const weekCount: Record<string, number> = {};
  for (const r of allStars as { review_date: string }[]) {
    const key = isoWeekKey(r.review_date);
    if (key) weekCount[key] = (weekCount[key] ?? 0) + 1;
  }
  const weeklyData = Object.entries(weekCount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  return NextResponse.json({
    data, count, page, pageSize, starCounts, avgRating,
    total: allStars.length,
    uniqueReviewers,
    monthlyData,
    weeklyData,
  });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("trustpilot_reviews" as any) as any).delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
