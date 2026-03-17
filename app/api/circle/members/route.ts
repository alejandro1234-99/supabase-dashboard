/**
 * GET /api/circle/members
 * Lista paginada de miembros con métricas + datos de venta cruzados
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { searchParams } = new URL(req.url);

  const search  = searchParams.get("search") ?? "";
  const sort    = searchParams.get("sort") ?? "posts_count";
  const order   = searchParams.get("order") === "asc";
  const page    = parseInt(searchParams.get("page") ?? "1");
  const limit   = parseInt(searchParams.get("limit") ?? "50");
  const offset  = (page - 1) * limit;

  let query = sb
    .from("circle_members")
    .select(
      "circle_member_id, name, email, avatar_url, profile_url, posts_count, comments_count, topics_count, connections_count, last_seen_at, joined_at, active, member_tags",
      { count: "exact" }
    );

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  query = query
    .order(sort, { ascending: order })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cruzar con purchase_approved para obtener edición y fecha de entrada
  const emails = (data ?? [])
    .map((m: { email: string | null }) => m.email)
    .filter(Boolean) as string[];

  const { data: purchases } = emails.length > 0
    ? await sb
        .from("purchase_approved")
        .select("correo_electronico, edicion, fecha_compra, status")
        .in("correo_electronico", emails)
        .neq("status", "Rembolsado")
        .order("fecha_compra", { ascending: false })
    : { data: [] };

  // Un alumno puede tener varias compras — tomamos la más reciente no reembolsada
  const purchaseMap: Record<string, { edicion: string | null; fecha_compra: string | null }> = {};
  for (const p of (purchases ?? []) as { correo_electronico: string; edicion: string | null; fecha_compra: string | null }[]) {
    if (!purchaseMap[p.correo_electronico]) {
      purchaseMap[p.correo_electronico] = { edicion: p.edicion, fecha_compra: p.fecha_compra };
    }
  }

  const dataWithPurchase = (data ?? []).map((m: { email: string | null; [key: string]: unknown }) => ({
    ...m,
    edicion: m.email ? (purchaseMap[m.email]?.edicion ?? null) : null,
    fecha_compra_venta: m.email ? (purchaseMap[m.email]?.fecha_compra ?? null) : null,
  }));

  return NextResponse.json({ data: dataWithPurchase, total: count ?? 0, page, limit });
}
