import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const filterGrabado = searchParams.get("grabado") || "";
  const filterEstado = searchParams.get("estado") || "";

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("alumnos" as any) as any)
    .select("id, nombre_completo, email, caso_exito, tipo_exito, descripcion_exito, fuente_caso_exito, fecha_caso_exito, grabado, enlace_drive, tags")
    .in("caso_exito", ["Sí", "Seguimiento"])
    .order("fecha_caso_exito", { ascending: false, nullsFirst: false });

  if (search) query = query.or(`nombre_completo.ilike.%${search}%,email.ilike.%${search}%`);
  if (filterGrabado === "true") query = query.eq("grabado", true);
  if (filterGrabado === "false") query = query.eq("grabado", false);
  if (filterEstado === "Sí") query = query.eq("caso_exito", "Sí");
  if (filterEstado === "Seguimiento") query = query.eq("caso_exito", "Seguimiento");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const confirmados = rows.filter((r: { caso_exito: string }) => r.caso_exito === "Sí").length;
  const seguimiento = rows.filter((r: { caso_exito: string }) => r.caso_exito === "Seguimiento").length;
  const grabados = rows.filter((r: { grabado: boolean; caso_exito: string }) => r.grabado && r.caso_exito === "Sí").length;
  const sinGrabar = confirmados - grabados;

  // Stage breakdown (solo confirmados)
  const porStage: Record<string, number> = {};
  for (const r of rows as { caso_exito: string; tipo_exito: string | null }[]) {
    if (r.caso_exito !== "Sí") continue;
    const stage = r.tipo_exito ?? "Sin stage";
    porStage[stage] = (porStage[stage] ?? 0) + 1;
  }

  return NextResponse.json({
    data: rows,
    stats: { total: rows.length, confirmados, seguimiento, grabados, sinGrabar, porStage },
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Intentar actualizar en alumnos
  const { data, error } = await sb
    .from("alumnos")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si no existe en alumnos, puede venir de purchase_approved
  if (!data) {
    const { data: purchase } = await sb
      .from("purchase_approved")
      .select("id, nombre_completo, correo_electronico, edicion, fecha_compra")
      .eq("id", id)
      .maybeSingle();

    if (!purchase) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });

    const newAlumno = {
      airtable_id: `purchase_${purchase.id}`,
      nombre_completo: purchase.nombre_completo,
      email: purchase.correo_electronico,
      fecha_union: purchase.fecha_compra,
      tags: purchase.edicion,
      ...updates,
    };

    const { data: inserted, error: insertErr } = await sb
      .from("alumnos")
      .insert(newAlumno)
      .select()
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    return NextResponse.json({ data: inserted });
  }

  return NextResponse.json({ data });
}
