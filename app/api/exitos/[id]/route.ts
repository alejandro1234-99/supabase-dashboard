import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();
  const allowed = ["caso_exito", "tipo_exito", "descripcion_exito", "fuente_caso_exito", "fecha_caso_exito"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key] ?? null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Intentar actualizar en alumnos
  const { data: updated, error } = await sb
    .from("alumnos")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si no existe en alumnos, puede venir de purchase_approved
  if (!updated) {
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
      ...update,
    };

    const { error: insertErr } = await sb.from("alumnos").insert(newAlumno);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
