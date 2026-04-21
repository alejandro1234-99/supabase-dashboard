import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const STAFF_IDS = [
  "96872496-d067-45cd-ba22-1c470a079b1e",
  "64daf2ce-b2ab-463c-9261-c410171036e1",
  "b3eb8fbc-6957-4187-b240-05fbd5469395",
];

export async function GET() {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: editions, error } = await (supabase.from("editions" as any) as any)
    .select("id, name, group_chat_conversation_id, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Contar alumnos (participantes del chat grupal, excluyendo staff) de cada edición
  const result = await Promise.all(
    (editions ?? []).map(async (ed: { id: string; name: string; group_chat_conversation_id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: parts } = await (supabase.from("conversation_participants" as any) as any)
        .select("user_id")
        .eq("conversation_id", ed.group_chat_conversation_id);

      const students = (parts ?? []).filter((p: { user_id: string }) => !STAFF_IDS.includes(p.user_id));
      return { ...ed, student_count: students.length };
    })
  );

  return NextResponse.json({ data: result });
}
