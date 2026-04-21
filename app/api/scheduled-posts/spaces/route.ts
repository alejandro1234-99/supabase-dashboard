import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// Canales donde se pueden publicar posts (mismo orden que CreatePost.tsx en la plataforma)
const ALLOWED_SLUGS = [
  "anuncios",
  "networking",
  "logros",
  "soporte-tecnico",
  "banco-empleo",
  "presentaciones",
];

export async function GET() {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("spaces" as any) as any)
    .select("id, name, slug, icon")
    .in("slug", ALLOWED_SLUGS);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ordenar según el orden de ALLOWED_SLUGS
  const ordered = (data ?? []).sort((a: { slug: string }, b: { slug: string }) => {
    return ALLOWED_SLUGS.indexOf(a.slug) - ALLOWED_SLUGS.indexOf(b.slug);
  });

  return NextResponse.json({ data: ordered });
}

