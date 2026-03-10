import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const edicion = searchParams.get("edicion");
  const comercial = searchParams.get("comercial");
  const noShow = searchParams.get("no_show");
  const search = searchParams.get("search")?.trim() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 30;
  const from = (page - 1) * pageSize;

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("agendas" as any) as any)
    .select("*", { count: "exact" })
    .order("creada", { ascending: false })
    .range(from, from + pageSize - 1);

  if (edicion) query = query.eq("edicion", edicion);
  if (comercial) query = query.eq("comercial", comercial);
  if (noShow === "true") query = query.eq("no_show", true);
  if (noShow === "false") query = query.eq("no_show", false);
  if (search) query = query.or(`nombre.ilike.%${search}%,email.ilike.%${search}%,whatsapp.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregated stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allData } = await (supabase.from("agendas" as any) as any)
    .select("edicion, comercial, no_show, inversion, fecha_llamada, situacion_actual");

  const all = (allData ?? []) as {
    edicion: string | null;
    comercial: string | null;
    no_show: boolean;
    inversion: string | null;
    fecha_llamada: string | null;
    situacion_actual: string | null;
  }[];

  const total = all.length;
  const conLlamada = all.filter((r) => r.fecha_llamada).length;
  const noShows = all.filter((r) => r.no_show).length;
  const sinLlamada = total - conLlamada;

  // Por comercial
  const comercialMap: Record<string, { total: number; noShow: number; conLlamada: number }> = {};
  for (const r of all) {
    const c = r.comercial ?? "Sin asignar";
    if (!comercialMap[c]) comercialMap[c] = { total: 0, noShow: 0, conLlamada: 0 };
    comercialMap[c].total += 1;
    if (r.no_show) comercialMap[c].noShow += 1;
    if (r.fecha_llamada) comercialMap[c].conLlamada += 1;
  }
  const porComercial = Object.entries(comercialMap)
    .map(([comercial, v]) => ({ comercial, ...v }))
    .sort((a, b) => b.total - a.total);

  // Por edición
  const edicionMap: Record<string, number> = {};
  for (const r of all) {
    const ed = r.edicion ?? "Sin edición";
    edicionMap[ed] = (edicionMap[ed] ?? 0) + 1;
  }
  const porEdicion = Object.entries(edicionMap)
    .map(([edicion, total]) => ({ edicion, total }))
    .sort((a, b) => b.total - a.total);

  // Por inversión
  const inversionMap: Record<string, number> = {};
  for (const r of all) {
    const inv = r.inversion ?? "No indicado";
    inversionMap[inv] = (inversionMap[inv] ?? 0) + 1;
  }
  const porInversion = Object.entries(inversionMap)
    .map(([inversion, total]) => ({ inversion, total }))
    .sort((a, b) => b.total - a.total);

  const ediciones = [...new Set(all.map((r) => r.edicion).filter(Boolean))].sort();
  const comerciales = [...new Set(all.map((r) => r.comercial).filter(Boolean))].sort();

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    stats: { total, conLlamada, noShows, sinLlamada },
    porComercial,
    porEdicion,
    porInversion,
    ediciones,
    comerciales,
  });
}
