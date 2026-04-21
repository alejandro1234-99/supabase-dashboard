import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as {
    content?: string;
    sender_user_id?: string;
    target_edition_ids?: string[];
    scheduled_for?: string;
    status?: string;
  };

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.content !== undefined) updates.content = body.content.trim();
  if (body.sender_user_id !== undefined) updates.sender_user_id = body.sender_user_id;
  if (body.target_edition_ids !== undefined) updates.target_edition_ids = body.target_edition_ids;
  if (body.scheduled_for !== undefined) updates.scheduled_for = body.scheduled_for;
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "pending") {
      updates.error_message = null;
      updates.published_at = null;
      updates.delivered_count = 0;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("scheduled_messages" as any) as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("scheduled_messages" as any) as any)
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
