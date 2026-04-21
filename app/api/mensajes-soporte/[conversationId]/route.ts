import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const supabase = createAdminClient();

  // Traer todos los mensajes de la conversacion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages, error } = await (supabase.from("messages" as any) as any)
    .select("id, conversation_id, sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Traer perfiles de todos los senders
  const senderIds = [...new Set((messages ?? []).map((m: { sender_id: string }) => m.sender_id))];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from("profiles" as any) as any)
    .select("user_id, name, avatar_url")
    .in("user_id", senderIds);

  const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
  for (const p of (profiles ?? [])) {
    profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
  }

  const enriched = (messages ?? []).map((m: any) => ({
    ...m,
    sender_name: profileMap[m.sender_id]?.name ?? "Usuario",
    sender_avatar: profileMap[m.sender_id]?.avatar_url ?? null,
  }));

  return NextResponse.json({ data: enriched });
}
