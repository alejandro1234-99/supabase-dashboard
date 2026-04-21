import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// Autores disponibles para publicar posts programados
export const AVAILABLE_AUTHORS = [
  { id: "96872496-d067-45cd-ba22-1c470a079b1e", name: "Soporte Revolutia" },
  { id: "64daf2ce-b2ab-463c-9261-c410171036e1", name: "Erick Gutierrez" },
  { id: "b3eb8fbc-6957-4187-b240-05fbd5469395", name: "María Perea" },
];

export async function GET() {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("scheduled_posts" as any) as any)
    .select(`
      id, title, body, space_id, image_url, author_user_id,
      scheduled_for, status, published_at, published_post_id,
      error_message, created_at, updated_at
    `)
    .order("scheduled_for", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with space names and author names
  const spaceIds = [...new Set((data ?? []).map((p: { space_id: string }) => p.space_id))];
  const authorIds = [...new Set((data ?? []).map((p: { author_user_id: string }) => p.author_user_id))];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: spaces } = await (supabase.from("spaces" as any) as any)
    .select("id, name, slug")
    .in("id", spaceIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from("profiles" as any) as any)
    .select("user_id, name, avatar_url")
    .in("user_id", authorIds);

  const spaceMap: Record<string, { name: string; slug: string }> = {};
  for (const s of spaces ?? []) spaceMap[s.id] = { name: s.name, slug: s.slug };

  const authorMap: Record<string, { name: string; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) authorMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };

  const enriched = (data ?? []).map((p: any) => ({
    ...p,
    space_name: spaceMap[p.space_id]?.name ?? "Canal desconocido",
    space_slug: spaceMap[p.space_id]?.slug ?? "",
    author_name: authorMap[p.author_user_id]?.name ?? "Usuario",
    author_avatar: authorMap[p.author_user_id]?.avatar_url ?? null,
  }));

  // Stats
  const now = new Date().toISOString();
  const stats = {
    total: enriched.length,
    pending: enriched.filter((p: any) => p.status === "pending" && p.scheduled_for > now).length,
    overdue: enriched.filter((p: any) => p.status === "pending" && p.scheduled_for <= now).length,
    published: enriched.filter((p: any) => p.status === "published").length,
    failed: enriched.filter((p: any) => p.status === "failed").length,
  };

  return NextResponse.json({ data: enriched, stats });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    title: string;
    body?: string;
    space_id: string;
    image_url?: string | null;
    author_user_id: string;
    scheduled_for: string; // ISO
  };

  if (!body.title?.trim()) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  if (!body.space_id) return NextResponse.json({ error: "El canal es obligatorio" }, { status: 400 });
  if (!body.author_user_id) return NextResponse.json({ error: "El autor es obligatorio" }, { status: 400 });
  if (!body.scheduled_for) return NextResponse.json({ error: "La fecha es obligatoria" }, { status: 400 });
  if (!AVAILABLE_AUTHORS.find((a) => a.id === body.author_user_id)) {
    return NextResponse.json({ error: "Autor no permitido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("scheduled_posts" as any) as any)
    .insert({
      title: body.title.trim(),
      body: (body.body ?? "").trim(),
      space_id: body.space_id,
      image_url: body.image_url ?? null,
      author_user_id: body.author_user_id,
      scheduled_for: body.scheduled_for,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
