import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const edicion = searchParams.get("edicion");
  const avatar = searchParams.get("avatar");
  const riesgo = searchParams.get("riesgo");
  const search = searchParams.get("search")?.trim() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 30;
  const from = (page - 1) * pageSize;

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("onboarding" as any) as any)
    .select("*", { count: "exact" })
    .order("fecha_registro", { ascending: false })
    .range(from, from + pageSize - 1);

  if (edicion) query = query.eq("edicion", edicion);
  if (avatar) query = query.eq("tipo_avatar", avatar);
  if (riesgo) query = query.eq("riesgo_reembolso", riesgo);
  if (search) query = query.or(`nombre_completo.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allData } = await (supabase.from("onboarding" as any) as any)
    .select("edicion, tipo_avatar, riesgo_reembolso, factores_riesgo, situacion_laboral, nivel_ia, tiempo_semana, contrato_firmado, acceso_enviado");

  const all = (allData ?? []) as {
    edicion: string | null;
    tipo_avatar: string | null;
    riesgo_reembolso: string | null;
    factores_riesgo: number | null;
    situacion_laboral: string | null;
    nivel_ia: string | null;
    tiempo_semana: string | null;
    contrato_firmado: boolean;
    acceso_enviado: boolean;
  }[];

  const total = all.length;

  // Distribución por avatar
  const avatarMap: Record<string, number> = {};
  for (const r of all) {
    const a = r.tipo_avatar ?? "Sin clasificar";
    avatarMap[a] = (avatarMap[a] ?? 0) + 1;
  }
  const porAvatar = Object.entries(avatarMap).map(([avatar, count]) => ({ avatar, count })).sort((a, b) => b.count - a.count);

  // Distribución por riesgo
  const riesgoMap: Record<string, number> = {};
  for (const r of all) {
    const rv = r.riesgo_reembolso ?? "Sin evaluar";
    riesgoMap[rv] = (riesgoMap[rv] ?? 0) + 1;
  }
  const porRiesgo = Object.entries(riesgoMap).map(([riesgo, count]) => ({ riesgo, count })).sort((a, b) => b.count - a.count);

  // Distribución por edición
  const edicionMap: Record<string, number> = {};
  for (const r of all) {
    const ed = r.edicion ?? "Sin edición";
    edicionMap[ed] = (edicionMap[ed] ?? 0) + 1;
  }
  const porEdicion = Object.entries(edicionMap).map(([edicion, count]) => ({ edicion, count })).sort((a, b) => b.count - a.count);

  // Nivel IA
  const nivelIaMap: Record<string, number> = {};
  for (const r of all) {
    const n = r.nivel_ia ?? "Sin datos";
    nivelIaMap[n] = (nivelIaMap[n] ?? 0) + 1;
  }
  const porNivelIa = Object.entries(nivelIaMap).map(([nivel, count]) => ({ nivel, count })).sort((a, b) => b.count - a.count);

  // Situación laboral
  const laboralMap: Record<string, number> = {};
  for (const r of all) {
    const l = r.situacion_laboral ?? "Sin datos";
    laboralMap[l] = (laboralMap[l] ?? 0) + 1;
  }
  const porLaboral = Object.entries(laboralMap).map(([laboral, count]) => ({ laboral, count })).sort((a, b) => b.count - a.count);

  const ediciones = [...new Set(all.map((r) => r.edicion).filter(Boolean))].sort();
  const avatares = [...new Set(all.map((r) => r.tipo_avatar).filter(Boolean))].sort();
  const riesgos = [...new Set(all.map((r) => r.riesgo_reembolso).filter(Boolean))].sort();

  const conContrato = all.filter((r) => r.contrato_firmado).length;
  const conAcceso = all.filter((r) => r.acceso_enviado).length;

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    stats: { total, conContrato, conAcceso },
    porAvatar,
    porRiesgo,
    porEdicion,
    porNivelIa,
    porLaboral,
    ediciones,
    avatares,
    riesgos,
  });
}
