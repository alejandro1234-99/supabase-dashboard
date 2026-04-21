import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as {
    support_status?: string | null;
  };

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};

  if (body.support_status !== undefined) {
    updates.support_status = body.support_status;
    // Registrar resolved_at al mover a resuelto, limpiar al mover a otro estado
    if (body.support_status === "resolved") {
      updates.resolved_at = new Date().toISOString();
    } else {
      updates.resolved_at = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("posts" as any) as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
