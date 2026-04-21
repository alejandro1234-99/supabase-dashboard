import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createAdminClient();

  // Lee directamente de qa_questions (tabla del hub donde los alumnos envían consultas)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw, error } = await (supabase.from("qa_questions" as any) as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mapear campos de qa_questions al formato que espera el frontend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (raw ?? []).map((r: any) => ({
    id: r.id,
    nombre: [r.name, r.surname].filter(Boolean).join(" ") || null,
    email: r.email || null,
    consulta: r.question || null,
    loom_url: r.loom_url || null,
    attachment_url: r.file_url || null,
    attachment_thumb: null,
    attachment_nombre: r.file_url ? r.file_url.split("/").pop() : null,
    status: r.status ?? "Pendiente",
    respuesta_preparada: r.respuesta_preparada || null,
    creada: r.created_at,
    fecha_en_progreso: r.fecha_en_progreso || null,
    fecha_resuelta: r.fecha_resuelta || null,
    tiempo_resolucion_min: r.tiempo_resolucion_min ?? null,
  }));

  const total = data.length;
  const pendientes = data.filter((r: { status: string }) => r.status === "Pendiente").length;
  const enProgreso = data.filter((r: { status: string }) => r.status === "En progreso").length;
  const resueltas = data.filter((r: { status: string }) => r.status === "Resuelta").length;
  const descartadas = data.filter((r: { status: string }) => r.status === "Descartada").length;

  const tiempos = data
    .filter((r: { tiempo_resolucion_min: number | null }) => r.tiempo_resolucion_min != null)
    .map((r: { tiempo_resolucion_min: number | null }) => r.tiempo_resolucion_min as number);
  const avgResolucion = tiempos.length > 0
    ? Math.round(tiempos.reduce((s: number, t: number) => s + t, 0) / tiempos.length)
    : null;

  return NextResponse.json({
    data,
    stats: { total, pendientes, enProgreso, resueltas, descartadas, avgResolucion },
  });
}
