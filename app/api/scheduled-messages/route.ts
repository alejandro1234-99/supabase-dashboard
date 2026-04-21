import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const ALLOWED_SENDERS = [
  "96872496-d067-45cd-ba22-1c470a079b1e", // Soporte Revolutia
  "64daf2ce-b2ab-463c-9261-c410171036e1", // Erick
  "b3eb8fbc-6957-4187-b240-05fbd5469395", // María
];

export async function GET() {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("scheduled_messages" as any) as any)
    .select("*")
    .order("scheduled_for", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enriquecer con nombres de ediciones y remitente
  const senderIds = [...new Set((data ?? []).map((m: { sender_user_id: string }) => m.sender_user_id))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from("profiles" as any) as any)
    .select("user_id, name, avatar_url")
    .in("user_id", senderIds);

  const senderMap: Record<string, { name: string; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) senderMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: editions } = await (supabase.from("editions" as any) as any)
    .select("id, name");

  const editionMap: Record<string, string> = {};
  for (const e of editions ?? []) editionMap[e.id] = e.name;

  const enriched = (data ?? []).map((m: any) => ({
    ...m,
    sender_name: senderMap[m.sender_user_id]?.name ?? "Usuario",
    sender_avatar: senderMap[m.sender_user_id]?.avatar_url ?? null,
    edition_names: (m.target_edition_ids ?? []).map((id: string) => editionMap[id] ?? "?"),
  }));

  const now = new Date().toISOString();
  const stats = {
    total: enriched.length,
    pending: enriched.filter((m: any) => m.status === "pending" && m.scheduled_for > now).length,
    overdue: enriched.filter((m: any) => m.status === "pending" && m.scheduled_for <= now).length,
    published: enriched.filter((m: any) => m.status === "published").length,
    failed: enriched.filter((m: any) => m.status === "failed").length,
  };

  return NextResponse.json({ data: enriched, stats });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    content: string;
    sender_user_id: string;
    target_edition_ids: string[];
    scheduled_for: string;
  };

  if (!body.content?.trim()) return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });
  if (!body.sender_user_id || !ALLOWED_SENDERS.includes(body.sender_user_id)) {
    return NextResponse.json({ error: "Remitente no permitido" }, { status: 400 });
  }
  if (!body.target_edition_ids || body.target_edition_ids.length === 0) {
    return NextResponse.json({ error: "Elige al menos una edición" }, { status: 400 });
  }
  if (!body.scheduled_for) return NextResponse.json({ error: "Fecha obligatoria" }, { status: 400 });

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("scheduled_messages" as any) as any)
    .insert({
      content: body.content.trim(),
      sender_user_id: body.sender_user_id,
      target_edition_ids: body.target_edition_ids,
      scheduled_for: body.scheduled_for,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
