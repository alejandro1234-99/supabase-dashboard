import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria");
  const modulo = searchParams.get("modulo");
  const search = searchParams.get("search")?.trim() ?? "";
  const sort = searchParams.get("sort") ?? "views";

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("vimeo_stats" as any) as any)
    .select("*")
    .order(sort, { ascending: false });

  if (categoria) query = query.eq("categoria", categoria);
  if (modulo) query = query.eq("modulo", modulo);
  if (search) query = query.ilike("video_title", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = (data ?? []) as {
    views: number | null;
    impressions: number | null;
    unique_viewers: number | null;
    total_time_watched_seconds: number | null;
    tiempo_reproduccion_min: number | null;
    avg_pct_watched: number | null;
    finishes: number | null;
    categoria: string | null;
    modulo: string | null;
  }[];

  const totalViews = all.reduce((s, r) => s + (r.views ?? 0), 0);
  const totalMinutos = Math.round(all.reduce((s, r) => s + (r.tiempo_reproduccion_min ?? 0), 0));
  const totalUnique = all.reduce((s, r) => s + (r.unique_viewers ?? 0), 0);
  const totalFinishes = all.reduce((s, r) => s + (r.finishes ?? 0), 0);
  const avgPct = all.length > 0
    ? Math.round(all.reduce((s, r) => s + (r.avg_pct_watched ?? 0), 0) / all.length * 100)
    : 0;

  // Por módulo
  const moduloMap: Record<string, { views: number; minutos: number; videos: number }> = {};
  for (const r of all) {
    const m = r.modulo || "Sin módulo";
    if (!moduloMap[m]) moduloMap[m] = { views: 0, minutos: 0, videos: 0 };
    moduloMap[m].views += r.views ?? 0;
    moduloMap[m].minutos += r.tiempo_reproduccion_min ?? 0;
    moduloMap[m].videos += 1;
  }
  const porModulo = Object.entries(moduloMap)
    .map(([modulo, v]) => ({ modulo, ...v, minutos: Math.round(v.minutos) }))
    .sort((a, b) => b.views - a.views);

  // Por categoría
  const catMap: Record<string, number> = {};
  for (const r of all) {
    const c = r.categoria || "Sin categoría";
    catMap[c] = (catMap[c] ?? 0) + 1;
  }
  const porCategoria = Object.entries(catMap).map(([categoria, count]) => ({ categoria, count }));

  // Categorías y módulos únicos para filtros
  const categorias = [...new Set(all.map((r) => r.categoria).filter(Boolean))].sort() as string[];
  const modulos = [...new Set(all.map((r) => r.modulo).filter(Boolean))].sort() as string[];

  return NextResponse.json({
    data,
    stats: { totalViews, totalMinutos, totalUnique, totalFinishes, avgPct, total: all.length },
    porModulo,
    porCategoria,
    categorias,
    modulos,
  });
}
