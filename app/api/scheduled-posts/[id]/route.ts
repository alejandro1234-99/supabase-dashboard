import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as {
    title?: string;
    body?: string;
    space_id?: string;
    image_url?: string | null;
    author_user_id?: string;
    scheduled_for?: string;
    status?: string;
  };

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.body !== undefined) updates.body = body.body.trim();
  if (body.space_id !== undefined) updates.space_id = body.space_id;
  if (body.image_url !== undefined) updates.image_url = body.image_url;
  if (body.author_user_id !== undefined) updates.author_user_id = body.author_user_id;
  if (body.scheduled_for !== undefined) updates.scheduled_for = body.scheduled_for;
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "pending") {
      updates.error_message = null;
      updates.published_at = null;
      updates.published_post_id = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("scheduled_posts" as any) as any)
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
  const { error } = await (supabase.from("scheduled_posts" as any) as any)
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
