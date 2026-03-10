import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("qa_consultas" as any) as any)
    .select("*")
    .order("creada", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = (data ?? []) as { status: string; creada: string; fecha_resuelta: string | null; tiempo_resolucion_min: number | null }[];

  const total = all.length;
  const pendientes = all.filter((r) => r.status === "Pendiente").length;
  const enProgreso = all.filter((r) => r.status === "En progreso").length;
  const resueltas = all.filter((r) => r.status === "Resuelta").length;
  const descartadas = all.filter((r) => r.status === "Descartada").length;

  const tiempos = all
    .filter((r) => r.tiempo_resolucion_min != null)
    .map((r) => r.tiempo_resolucion_min as number);
  const avgResolucion = tiempos.length > 0
    ? Math.round(tiempos.reduce((s, t) => s + t, 0) / tiempos.length)
    : null;

  return NextResponse.json({
    data,
    stats: { total, pendientes, enProgreso, resueltas, descartadas, avgResolucion },
  });
}
