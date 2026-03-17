import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo    = searchParams.get("tipo");
  const edicion = searchParams.get("edicion");
  const search  = searchParams.get("search")?.trim() ?? "";

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const estado = searchParams.get("estado") ?? "Sí"; // "Sí" | "Seguimiento" | "todos"

  // Si hay filtro por edición, obtener primero los emails de esa edición en ventas
  let emailFilter: string[] | null = null;
  if (edicion) {
    const { data: edPurchases } = await sb
      .from("purchase_approved")
      .select("correo_electronico")
      .eq("edicion", edicion)
      .neq("status", "Rembolsado");
    emailFilter = ((edPurchases ?? []) as { correo_electronico: string }[])
      .map((p) => p.correo_electronico)
      .filter(Boolean);
  }

  let query = sb
    .from("alumnos")
    .select("*")
    .order("fecha_caso_exito", { ascending: false, nullsFirst: false });

  if (estado === "todos") {
    query = query.in("caso_exito", ["Sí", "Seguimiento"]);
  } else {
    query = query.eq("caso_exito", estado);
  }

  if (tipo) query = query.eq("tipo_exito", tipo);
  if (search) query = query.or(`nombre_completo.ilike.%${search}%,descripcion_exito.ilike.%${search}%`);
  if (emailFilter !== null) {
    query = emailFilter.length > 0
      ? query.in("email", emailFilter)
      : query.in("email", ["__no_results__"]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const alumnos = (data ?? []) as { id_circle: string | null; email: string | null; [key: string]: unknown }[];

  // Cruzar con circle_members para avatar_url
  const circleIds = alumnos.map((a) => a.id_circle).filter(Boolean).map(Number);
  const { data: circleMembers } = circleIds.length > 0
    ? await sb
        .from("circle_members")
        .select("circle_member_id, avatar_url")
        .in("circle_member_id", circleIds)
    : { data: [] };

  const avatarMap: Record<number, string> = {};
  for (const m of (circleMembers ?? []) as { circle_member_id: number; avatar_url: string | null }[]) {
    if (m.avatar_url) avatarMap[m.circle_member_id] = m.avatar_url;
  }

  // Cruzar con purchase_approved para edición, fecha de compra
  const emails = alumnos.map((a) => a.email).filter(Boolean) as string[];
  const { data: purchases } = emails.length > 0
    ? await sb
        .from("purchase_approved")
        .select("correo_electronico, edicion, fecha_compra")
        .in("correo_electronico", emails)
        .neq("status", "Rembolsado")
        .order("fecha_compra", { ascending: false })
    : { data: [] };

  const purchaseMap: Record<string, { edicion: string | null; fecha_compra: string | null }> = {};
  for (const p of (purchases ?? []) as { correo_electronico: string; edicion: string | null; fecha_compra: string | null }[]) {
    if (!purchaseMap[p.correo_electronico]) {
      purchaseMap[p.correo_electronico] = { edicion: p.edicion, fecha_compra: p.fecha_compra };
    }
  }

  const dataWithAll = alumnos.map((a) => ({
    ...a,
    avatar_url: a.id_circle ? (avatarMap[Number(a.id_circle)] ?? null) : null,
    edicion: a.email ? (purchaseMap[a.email]?.edicion ?? null) : null,
    fecha_entrada: a.email ? (purchaseMap[a.email]?.fecha_compra ?? null) : null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const casos = dataWithAll as unknown as {
    tipo_exito: string | null;
    fuente_caso_exito: string | null;
    tags: string | null;
    edicion: string | null;
    conexiones_circle: number | null;
    posts_publicados: number | null;
    comentarios_totales: number | null;
    fecha_caso_exito: string | null;
  }[];

  const total = casos.length;

  // Por tipo (Stage)
  const tipoMap: Record<string, number> = {};
  for (const r of casos) {
    const t = r.tipo_exito ?? "Sin tipo";
    tipoMap[t] = (tipoMap[t] ?? 0) + 1;
  }
  const porTipo = Object.entries(tipoMap)
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo));

  // Por fuente
  const fuenteMap: Record<string, number> = {};
  for (const r of casos) {
    const f = r.fuente_caso_exito ?? "Sin fuente";
    fuenteMap[f] = (fuenteMap[f] ?? 0) + 1;
  }
  const porFuente = Object.entries(fuenteMap)
    .map(([fuente, count]) => ({ fuente, count }))
    .sort((a, b) => b.count - a.count);

  // Por edición (datos reales de ventas)
  const edicionMap: Record<string, number> = {};
  for (const r of casos) {
    const ed = r.edicion ?? "Sin edición";
    edicionMap[ed] = (edicionMap[ed] ?? 0) + 1;
  }
  const porEdicion = Object.entries(edicionMap)
    .map(([edicion, count]) => ({ edicion, count }))
    .sort((a, b) => a.edicion.localeCompare(b.edicion));

  // Lista de ediciones disponibles (para filtros)
  const { data: allEdiciones } = await sb
    .from("purchase_approved")
    .select("edicion")
    .neq("status", "Rembolsado")
    .not("edicion", "is", null);

  const ediciones = [...new Set(
    ((allEdiciones ?? []) as { edicion: string }[]).map((r) => r.edicion).filter(Boolean)
  )].sort() as string[];

  // Actividad media
  const avgPosts = total > 0 ? parseFloat((casos.reduce((s, r) => s + (r.posts_publicados ?? 0), 0) / total).toFixed(1)) : 0;
  const avgComentarios = total > 0 ? parseFloat((casos.reduce((s, r) => s + (r.comentarios_totales ?? 0), 0) / total).toFixed(1)) : 0;
  const avgConexiones = total > 0 ? parseFloat((casos.reduce((s, r) => s + (r.conexiones_circle ?? 0), 0) / total).toFixed(1)) : 0;

  const tipos = [...new Set(casos.map((r) => r.tipo_exito).filter(Boolean))].sort() as string[];

  return NextResponse.json({
    data: dataWithAll,
    total,
    stats: { total, avgPosts, avgComentarios, avgConexiones },
    porTipo,
    porFuente,
    porEdicion,
    ediciones,
    tipos,
  });
}
