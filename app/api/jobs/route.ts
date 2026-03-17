import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const search = searchParams.get("search")?.trim() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 20;
  const from = (page - 1) * pageSize;

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("job_offers" as any) as any)
    .select("*", { count: "exact" })
    .order("found_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (search) query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allRows } = await (supabase.from("job_offers" as any) as any)
    .select("status, category, budget_min, budget_max, found_at");

  const rows = (allRows ?? []) as {
    status: string; category: string;
    budget_min: number | null; budget_max: number | null;
    found_at: string;
  }[];

  const total = rows.length;
  const pending = rows.filter(r => r.status === "pending_review").length;
  const published = rows.filter(r => r.status === "published").length;
  const rejected = rows.filter(r => r.status === "rejected").length;
  const categories = [...new Set(rows.map(r => r.category).filter(Boolean))].sort();

  // Tickets por semana (últimas 8 semanas)
  const now = new Date();
  const weekMap: Record<string, number> = {};
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const label = `S${getISOWeek(d)}`;
    weekMap[label] = 0;
  }
  rows.forEach(r => {
    if (!r.found_at) return;
    const d = new Date(r.found_at);
    const label = `S${getISOWeek(d)}`;
    if (label in weekMap) weekMap[label]++;
  });
  const porSemana = Object.entries(weekMap).map(([label, count]) => ({ label, count }));

  return NextResponse.json({
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
    stats: { total, pending, published, rejected },
    categories,
    porSemana,
  });
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "Missing id or status" }, { status: 400 });

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: offer, error: fetchError } = await (supabase.from("job_offers" as any) as any)
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("job_offers" as any) as any)
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si se publica, postear en Circle "Bolsa de trabajo" (space_id: 2123036)
  if (status === "published" && offer?.html_body) {
    const circleResult = await postToCircle(offer);
    if (!circleResult.ok) {
      console.error("Error publicando en Circle:", circleResult.error);
      return NextResponse.json({ ok: true, circle_error: circleResult.error });
    }
  }

  return NextResponse.json({ ok: true });
}

async function postToCircle(offer: {
  title: string;
  html_body: string;
  url: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const CIRCLE_KEY = process.env.CIRCLE_API_KEY;
  const COMMUNITY_ID = process.env.CIRCLE_COMMUNITY_ID;
  const SPACE_ID = 2123036; // Bolsa de trabajo

  if (!CIRCLE_KEY || !COMMUNITY_ID) {
    return { ok: false, error: "Missing CIRCLE_API_KEY or CIRCLE_COMMUNITY_ID" };
  }

  const res = await fetch("https://app.circle.so/api/v1/posts", {
    method: "POST",
    headers: {
      "Authorization": `Token ${CIRCLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      community_id: parseInt(COMMUNITY_ID),
      space_id: SPACE_ID,
      name: offer.title,
      body: offer.html_body,
      status: "published",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Circle API ${res.status}: ${text}` };
  }

  return { ok: true };
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
