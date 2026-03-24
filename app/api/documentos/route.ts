import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const categoria = searchParams.get("categoria") || "";

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("documentos" as any) as any)
    .select("*")
    .order("created_at", { ascending: true });

  if (search) query = query.ilike("nombre", `%${search}%`);
  if (categoria) query = query.eq("categoria", categoria);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, subelementos, archivo } = body;
  if (!nombre) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("documentos" as any) as any)
    .insert({ nombre, subelementos: subelementos ?? "", archivo: archivo ?? "" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("documentos" as any) as any)
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
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("documentos" as any) as any).delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
