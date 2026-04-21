import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// Cuenta "Soporte Revolutia"
const SOPORTE_USER_ID = "96872496-d067-45cd-ba22-1c470a079b1e";

export async function POST(req: NextRequest) {
  const { postId, content } = await req.json() as {
    postId: string;
    content: string;
  };

  if (!content?.trim()) {
    return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
  }

  if (!postId) {
    return NextResponse.json({ error: "postId requerido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Insertar comentario como "Soporte Revolutia"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: comment, error } = await (supabase.from("comments" as any) as any)
    .insert({
      post_id: postId,
      user_id: SOPORTE_USER_ID,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Marcar el post como "resolved" y registrar resolved_at
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("posts" as any) as any)
    .update({
      support_status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", postId);

  return NextResponse.json({
    success: true,
    comment_id: comment.id,
  });
}
