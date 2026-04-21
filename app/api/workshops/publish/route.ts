import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workshopId } = body;
  if (!workshopId) return NextResponse.json({ error: "workshopId requerido" }, { status: 400 });

  const supabase = createAdminClient();

  // Get workshop data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workshop, error: wErr } = await (supabase.from("workshops" as any) as any)
    .select("*")
    .eq("id", workshopId)
    .single();

  if (wErr || !workshop) return NextResponse.json({ error: "Workshop no encontrado" }, { status: 404 });

  if (!workshop.nombre || !workshop.fecha) {
    return NextResponse.json({ error: "El workshop necesita nombre y fecha para publicarse" }, { status: 400 });
  }

  // Check if already published (avoid duplicates)
  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("title", workshop.nombre)
    .eq("starts_at", `${workshop.fecha}T17:00:00.000Z`)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Este workshop ya está publicado en el Hub" }, { status: 409 });
  }

  // Determine event type
  const tipo = workshop.tipo || "Técnico";

  // Calculate duration based on type (Q&A on Tue/Thu = 90min, rest = 60min)
  const startDate = new Date(`${workshop.fecha}T17:00:00.000Z`);
  const dayOfWeek = startDate.getUTCDay(); // 0=Sun, 2=Tue, 4=Thu
  const isQA = tipo.includes("Q&A");
  const durationMin = (isQA && (dayOfWeek === 2 || dayOfWeek === 4)) ? 90 : 60;
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

  // Get zoom link from cuenta_zoom field or use default
  const meetingUrl = workshop.cuenta_zoom || null;

  // Insert into events table
  const { data: event, error: eErr } = await supabase
    .from("events")
    .insert({
      title: workshop.nombre,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      meeting_url: meetingUrl,
      is_published: true,
      event_type: tipo,
      speaker: workshop.persona || null,
      description: workshop.descripcion || null,
    })
    .select()
    .single();

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

  return NextResponse.json({ data: event, message: "Workshop publicado en Revolutia Hub" });
}
