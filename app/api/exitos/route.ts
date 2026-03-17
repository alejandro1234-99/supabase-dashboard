import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const search = searchParams.get("search")?.trim() ?? "";

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const estado = searchParams.get("estado") ?? "Sí"; // "Sí" | "Seguimiento" | "todos"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("alumnos" as any) as any)
    .select("*")
    .order("fecha_caso_exito", { ascending: false, nullsFirst: false });

  if (estado === "todos") {
    query = query.in("caso_exito", ["Sí", "Seguimiento"]);
  } else {
    query = query.eq("caso_exito", estado);
  }

  if (tipo) query = query.eq("tipo_exito", tipo);
  if (search) query = query.or(`nombre_completo.ilike.%${search}%,descripcion_exito.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const casos = (data ?? []) as {
    tipo_exito: string | null;
    fuente_caso_exito: string | null;
    tags: string | null;
    conexiones_circle: number | null;
    posts_publicados: number | null;
    comentarios_totales: number | null;
    fecha_caso_exito: string | null;
  }[];

  const total = casos.length;

  // Por tipo (Stage 0 / 1 / 2)
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

  // Por lanzamiento
  const launchMap: Record<string, number> = {};
  for (const r of casos) {
    const tag = r.tags?.split(",")[0].trim() ?? "Sin tag";
    launchMap[tag] = (launchMap[tag] ?? 0) + 1;
  }
  const porLanzamiento = Object.entries(launchMap)
    .map(([lanzamiento, count]) => ({ lanzamiento, count }))
    .sort((a, b) => b.count - a.count);

  // Actividad media de casos de éxito vs todos los alumnos
  const avgPosts = total > 0 ? parseFloat((casos.reduce((s, r) => s + (r.posts_publicados ?? 0), 0) / total).toFixed(1)) : 0;
  const avgComentarios = total > 0 ? parseFloat((casos.reduce((s, r) => s + (r.comentarios_totales ?? 0), 0) / total).toFixed(1)) : 0;
  const avgConexiones = total > 0 ? parseFloat((casos.reduce((s, r) => s + (r.conexiones_circle ?? 0), 0) / total).toFixed(1)) : 0;

  const tipos = [...new Set(casos.map((r) => r.tipo_exito).filter(Boolean))].sort() as string[];

  return NextResponse.json({
    data,
    total,
    stats: { total, avgPosts, avgComentarios, avgConexiones },
    porTipo,
    porFuente,
    porLanzamiento,
    tipos,
  });
}
