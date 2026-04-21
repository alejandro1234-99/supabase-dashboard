import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const STAFF_IDS = [
  "96872496-d067-45cd-ba22-1c470a079b1e",
  "64daf2ce-b2ab-463c-9261-c410171036e1",
  "b3eb8fbc-6957-4187-b240-05fbd5469395",
];

export async function POST(req: NextRequest) {
  const { conversationId, content, staffUserId } = (await req.json()) as {
    conversationId: string;
    content: string;
    staffUserId: string;
  };

  if (!content?.trim()) {
    return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
  }
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requerido" }, { status: 400 });
  }
  if (!staffUserId || !STAFF_IDS.includes(staffUserId)) {
    return NextResponse.json({ error: "staffUserId inválido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verificar que el staff es participante de esta conversacion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: participant } = await (supabase.from("conversation_participants" as any) as any)
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", staffUserId)
    .single();

  if (!participant) {
    return NextResponse.json({ error: "El staff no es participante de esta conversación" }, { status: 403 });
  }

  // Insertar mensaje como el staff (admin client bypasea RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message, error } = await (supabase.from("messages" as any) as any)
    .insert({
      conversation_id: conversationId,
      sender_id: staffUserId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Actualizar last_read_at del staff
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("conversation_participants" as any) as any)
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", staffUserId);

  // Actualizar updated_at de la conversacion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("conversations" as any) as any)
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ success: true, message_id: message.id });
}
