import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

type NotaInsert = { alumno_id: string; contenido: string; autor: string | null };
type NotaUpdate = { contenido?: string; autor?: string | null; updated_at: string };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const alumnoId = searchParams.get("alumno_id");
  if (!alumnoId) return NextResponse.json({ error: "alumno_id es obligatorio" }, { status: 400 });

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("alumno_notas" as any) as any)
    .select("*")
    .eq("alumno_id", alumnoId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { alumno_id, contenido, autor } = body as Partial<NotaInsert>;

  if (!alumno_id || !contenido?.trim()) {
    return NextResponse.json({ error: "alumno_id y contenido son obligatorios" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const insert: NotaInsert = { alumno_id, contenido: contenido.trim(), autor: autor?.trim() || null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("alumno_notas" as any) as any)
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, contenido, autor } = body as { id?: string; contenido?: string; autor?: string | null };

  if (!id) return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });

  const updates: NotaUpdate = { updated_at: new Date().toISOString() };
  if (contenido !== undefined) updates.contenido = contenido;
  if (autor !== undefined) updates.autor = autor?.trim() || null;

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("alumno_notas" as any) as any)
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
  const { error } = await (supabase.from("alumno_notas" as any) as any).delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
