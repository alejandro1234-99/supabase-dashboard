import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const edicion = searchParams.get("edicion");

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("notas" as any) as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (edicion) query = query.eq("edicion", edicion);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { edicion, titulo, contenido, tipo } = body;

  if (!edicion || !titulo) {
    return NextResponse.json({ error: "edicion y titulo son obligatorios" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("notas" as any) as any)
    .insert({ edicion, titulo, contenido: contenido ?? "", tipo: tipo ?? "nota" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, titulo, contenido, tipo } = body;

  if (!id) return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });

  const supabase = createAdminClient();

  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  if (titulo !== undefined) updates.titulo = titulo;
  if (contenido !== undefined) updates.contenido = contenido;
  if (tipo !== undefined) updates.tipo = tipo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("notas" as any) as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("notas" as any) as any).delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
