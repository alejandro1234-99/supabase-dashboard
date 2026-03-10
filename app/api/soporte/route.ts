import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const canal = searchParams.get("canal");
  const responsable = searchParams.get("responsable");
  const estado = searchParams.get("estado"); // "cerrada" | "pendiente" | "escalada"
  const search = searchParams.get("search")?.trim() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 40;
  const from = (page - 1) * pageSize;

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("soporte" as any) as any)
    .select("*", { count: "exact" })
    .order("fecha", { ascending: false })
    .range(from, from + pageSize - 1);

  if (tipo) query = query.eq("tipo_consulta", tipo);
  if (canal) query = query.eq("medio_canal", canal);
  if (responsable) query = query.eq("responsable", responsable);
  if (estado === "cerrada") query = query.eq("cerrada", true);
  if (estado === "pendiente") query = query.eq("cerrada", false);
  if (estado === "escalada") query = query.not("escalado_a", "is", null);
  if (search) query = query.or(`alumno.ilike.%${search}%,consulta.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Agregados via RPC / queries de conteo — evita el límite 1000 de PostgREST
  const sb = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [
    { count: total },
    { count: totalCerradas },
    { count: totalEscaladas },
    { data: rawTipo },
    { data: rawCanal },
    { data: rawResp },
    { data: rawMes },
  ] = await Promise.all([
    sb.from("soporte").select("*", { count: "exact", head: true }),
    sb.from("soporte").select("*", { count: "exact", head: true }).eq("cerrada", true),
    sb.from("soporte").select("*", { count: "exact", head: true }).not("escalado_a", "is", null),
    sb.from("soporte").select("tipo_consulta").neq("tipo_consulta", null),
    sb.from("soporte").select("medio_canal").neq("medio_canal", null),
    sb.from("soporte").select("responsable, cerrada").neq("responsable", null),
    sb.from("soporte").select("fecha").neq("fecha", null),
  ]);

  const totalNum = total ?? 0;
  const totalCerradasNum = totalCerradas ?? 0;
  const totalPendientes = totalNum - totalCerradasNum;
  const tasaCierre = totalNum > 0 ? Math.round((totalCerradasNum / totalNum) * 100) : 0;

  // Por tipo
  const tipoMap: Record<string, number> = {};
  for (const r of (rawTipo ?? []) as { tipo_consulta: string }[]) {
    const t = r.tipo_consulta ?? "Otro";
    tipoMap[t] = (tipoMap[t] ?? 0) + 1;
  }
  const porTipo = Object.entries(tipoMap).map(([tipo, count]) => ({ tipo, count })).sort((a, b) => b.count - a.count);

  // Por canal
  const canalMap: Record<string, number> = {};
  for (const r of (rawCanal ?? []) as { medio_canal: string }[]) {
    const c = r.medio_canal ?? "Otro";
    canalMap[c] = (canalMap[c] ?? 0) + 1;
  }
  const porCanal = Object.entries(canalMap).map(([canal, count]) => ({ canal, count })).sort((a, b) => b.count - a.count);

  // Por responsable
  const respMap: Record<string, { total: number; cerradas: number }> = {};
  for (const r of (rawResp ?? []) as { responsable: string; cerrada: boolean }[]) {
    const resp = r.responsable ?? "Sin asignar";
    if (!respMap[resp]) respMap[resp] = { total: 0, cerradas: 0 };
    respMap[resp].total += 1;
    if (r.cerrada) respMap[resp].cerradas += 1;
  }
  const porResponsable = Object.entries(respMap)
    .map(([responsable, v]) => ({ responsable, ...v }))
    .sort((a, b) => b.total - a.total);

  // Por mes
  const mesMap: Record<string, number> = {};
  for (const r of (rawMes ?? []) as { fecha: string }[]) {
    if (!r.fecha) continue;
    const mes = r.fecha.slice(0, 7);
    mesMap[mes] = (mesMap[mes] ?? 0) + 1;
  }
  const porMes = Object.entries(mesMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([mes, count]) => ({ mes, count }));

  const tipos = [...new Set(Object.keys(tipoMap))].sort();
  const canales = [...new Set(Object.keys(canalMap))].sort();
  const responsables = [...new Set(Object.keys(respMap))].sort();

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    stats: { total: totalNum, totalCerradas: totalCerradasNum, totalPendientes, totalEscaladas: totalEscaladas ?? 0, tasaCierre },
    porTipo,
    porCanal,
    porResponsable,
    porMes,
    tipos,
    canales,
    responsables,
  });
}
