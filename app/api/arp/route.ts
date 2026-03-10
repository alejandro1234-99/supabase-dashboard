import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter"); // "aprobado" | "suspenso" | null
  const search = searchParams.get("search")?.trim() ?? "";

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("arp_certificates" as any) as any)
    .select("*")
    .order("fecha", { ascending: false });

  if (filter === "aprobado") query = query.eq("aprobado", true);
  if (filter === "suspenso") query = query.eq("aprobado", false);
  if (search) query = query.or(`nombre.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const records = data ?? [];
  const total = records.length;
  const aprobados = records.filter((r: { aprobado: boolean }) => r.aprobado).length;
  const suspensos = total - aprobados;
  const avgPct = total > 0
    ? records.reduce((s: number, r: { porcentaje: number }) => s + r.porcentaje, 0) / total
    : 0;

  // Distribución de notas en rangos
  const rangos = [
    { label: "< 50%", min: 0, max: 0.5 },
    { label: "50–70%", min: 0.5, max: 0.7 },
    { label: "70–85%", min: 0.7, max: 0.85 },
    { label: "85–95%", min: 0.85, max: 0.95 },
    { label: "95–100%", min: 0.95, max: 1.01 },
  ].map((r) => ({
    label: r.label,
    count: records.filter((rec: { porcentaje: number }) => rec.porcentaje >= r.min && rec.porcentaje < r.max).length,
    aprobado: r.min >= 0.7,
  }));

  return NextResponse.json({ data: records, total, aprobados, suspensos, avgPct, rangos });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("arp_certificates" as any) as any).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
