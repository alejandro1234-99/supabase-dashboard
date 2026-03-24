import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const ALLOWED_TABLES = ["purchase_approved", "onboarding"];

export async function PATCH(req: NextRequest) {
  const { table, id, field, value } = await req.json();
  if (!table || !id || !field) return NextResponse.json({ error: "table, id y field requeridos" }, { status: 400 });
  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: "tabla no permitida" }, { status: 400 });

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table as any) as any)
    .update({ [field]: value })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");
  const id = searchParams.get("id");
  if (!table || !id) return NextResponse.json({ error: "table e id requeridos" }, { status: 400 });
  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: "tabla no permitida" }, { status: 400 });

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
