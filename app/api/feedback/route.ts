import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const semana = searchParams.get("semana"); // "1"–"10" | null = all
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 20;
  const from = (page - 1) * pageSize;

  const supabase = createAdminClient();

  // Paginated responses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("course_feedback" as any) as any)
    .select("*", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (semana) query = query.eq("semana", parseInt(semana));

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregated stats (all records, not paginated)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allData } = await (supabase.from("course_feedback" as any) as any)
    .select("semana, rating, submitted_at");

  const all = allData ?? [];

  // Rating average per semana
  const semanaMap: Record<number, { sum: number; count: number }> = {};
  for (const r of all as { semana: number; rating: number }[]) {
    if (!semanaMap[r.semana]) semanaMap[r.semana] = { sum: 0, count: 0 };
    semanaMap[r.semana].sum += r.rating;
    semanaMap[r.semana].count += 1;
  }
  const semanaStats = Object.entries(semanaMap)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([s, { sum, count: c }]) => ({
      semana: parseInt(s),
      avg: parseFloat((sum / c).toFixed(2)),
      count: c,
    }));

  // Timeline: by day, calendar week, and month
  const byDay: Record<string, { sum: number; count: number }> = {};
  const byCalWeek: Record<string, { sum: number; count: number }> = {};
  const byMonth: Record<string, { sum: number; count: number }> = {};

  for (const r of all as { rating: number; submitted_at: string }[]) {
    const d = new Date(r.submitted_at);
    const day = d.toISOString().split("T")[0];
    const month = day.substring(0, 7);
    // ISO week
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const weekKey = `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;

    if (!byDay[day]) byDay[day] = { sum: 0, count: 0 };
    byDay[day].sum += r.rating; byDay[day].count++;

    if (!byCalWeek[weekKey]) byCalWeek[weekKey] = { sum: 0, count: 0 };
    byCalWeek[weekKey].sum += r.rating; byCalWeek[weekKey].count++;

    if (!byMonth[month]) byMonth[month] = { sum: 0, count: 0 };
    byMonth[month].sum += r.rating; byMonth[month].count++;
  }

  const toTimeline = (map: Record<string, { sum: number; count: number }>) =>
    Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { sum, count: c }]) => ({ key, avg: parseFloat((sum / c).toFixed(2)), count: c }));

  const ratingTimeline = {
    byDay: toTimeline(byDay),
    byWeek: toTimeline(byCalWeek),
    byMonth: toTimeline(byMonth),
  };

  const totalResponses = all.length;
  const globalAvg = totalResponses > 0
    ? parseFloat(((all as { rating: number }[]).reduce((s, r) => s + r.rating, 0) / totalResponses).toFixed(2))
    : 0;
  const semanasActivas = Object.keys(semanaMap).length;

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    totalResponses,
    globalAvg,
    semanasActivas,
    semanaStats,
    ratingTimeline,
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("course_feedback" as any) as any).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
