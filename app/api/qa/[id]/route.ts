import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as {
    status?: string;
    respuesta_preparada?: string;
  };

  const supabase = createAdminClient();

  // Fetch current record to calculate resolution time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabase.from("qa_questions" as any) as any)
    .select("status, created_at, fecha_en_progreso")
    .eq("id", id)
    .single();

  const updates: Record<string, unknown> = {};

  if (body.respuesta_preparada !== undefined) {
    updates.respuesta_preparada = body.respuesta_preparada;
  }

  if (body.status !== undefined) {
    updates.status = body.status;
    const now = new Date().toISOString();

    if (body.status === "En progreso" && current?.status !== "En progreso") {
      updates.fecha_en_progreso = now;
    }

    if (body.status === "Resuelta") {
      updates.fecha_resuelta = now;
      // Tiempo desde creada hasta resuelta en minutos
      if (current?.created_at) {
        const inicio = new Date(current.created_at).getTime();
        const fin = new Date(now).getTime();
        updates.tiempo_resolucion_min = Math.round((fin - inicio) / 60000);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw, error } = await (supabase.from("qa_questions" as any) as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mapear al formato que espera el frontend
  const data = {
    id: raw.id,
    nombre: [raw.name, raw.surname].filter(Boolean).join(" ") || null,
    email: raw.email || null,
    consulta: raw.question || null,
    loom_url: raw.loom_url || null,
    attachment_url: raw.file_url || null,
    attachment_thumb: null,
    attachment_nombre: raw.file_url ? raw.file_url.split("/").pop() : null,
    status: raw.status ?? "Pendiente",
    respuesta_preparada: raw.respuesta_preparada || null,
    creada: raw.created_at,
    fecha_en_progreso: raw.fecha_en_progreso || null,
    fecha_resuelta: raw.fecha_resuelta || null,
    tiempo_resolucion_min: raw.tiempo_resolucion_min ?? null,
  };

  return NextResponse.json({ data });
}
