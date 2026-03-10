import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tags = searchParams.get("tags");
  const caso_exito = searchParams.get("caso_exito");
  const search = searchParams.get("search")?.trim() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 30;
  const from = (page - 1) * pageSize;

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("alumnos" as any) as any)
    .select("*", { count: "exact" })
    .order("fecha_union", { ascending: false })
    .range(from, from + pageSize - 1);

  if (tags) query = query.ilike("tags", `%${tags}%`);
  if (caso_exito) query = query.eq("caso_exito", caso_exito);
  if (search) query = query.or(`nombre_completo.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allData } = await (supabase.from("alumnos" as any) as any)
    .select("tags, caso_exito, tipo_exito, conexiones_circle, posts_publicados, comentarios_totales, localizacion");

  const all = (allData ?? []) as {
    tags: string | null;
    caso_exito: string | null;
    tipo_exito: string | null;
    conexiones_circle: number | null;
    posts_publicados: number | null;
    comentarios_totales: number | null;
    localizacion: string | null;
  }[];

  const total = all.length;
  const casosExito = all.filter((r) => r.caso_exito === "Sí").length;
  const conActividad = all.filter((r) => (r.posts_publicados ?? 0) > 0 || (r.comentarios_totales ?? 0) > 0).length;
  const totalPosts = all.reduce((s, r) => s + (r.posts_publicados ?? 0), 0);
  const totalComentarios = all.reduce((s, r) => s + (r.comentarios_totales ?? 0), 0);
  const avgConexiones = total > 0
    ? parseFloat((all.reduce((s, r) => s + (r.conexiones_circle ?? 0), 0) / total).toFixed(1))
    : 0;

  // Por tags
  const tagsMap: Record<string, number> = {};
  for (const r of all) {
    if (r.tags) {
      r.tags.split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => {
        tagsMap[t] = (tagsMap[t] ?? 0) + 1;
      });
    }
  }
  const porTags = Object.entries(tagsMap).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);

  // Por tipo de éxito
  const exitoMap: Record<string, number> = {};
  for (const r of all.filter((r) => r.caso_exito === "Sí")) {
    const t = r.tipo_exito ?? "Sin tipo";
    exitoMap[t] = (exitoMap[t] ?? 0) + 1;
  }
  const porTipoExito = Object.entries(exitoMap).map(([tipo, count]) => ({ tipo, count })).sort((a, b) => b.count - a.count);

  // Top localización (país/ciudad)
  const locMap: Record<string, number> = {};
  for (const r of all) {
    if (r.localizacion) {
      const parts = r.localizacion.split(",");
      const country = parts[parts.length - 1]?.trim();
      if (country) locMap[country] = (locMap[country] ?? 0) + 1;
    }
  }
  const porPais = Object.entries(locMap).map(([pais, count]) => ({ pais, count })).sort((a, b) => b.count - a.count).slice(0, 8);

  const allTags = [...new Set(
    all.flatMap((r) => (r.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean))
  )].sort();

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    stats: { total, casosExito, conActividad, totalPosts, totalComentarios, avgConexiones },
    porTags,
    porTipoExito,
    porPais,
    allTags,
  });
}
