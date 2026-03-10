import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const edicion = searchParams.get("edicion");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 30;
  const from = (page - 1) * pageSize;

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("purchase_approved" as any) as any)
    .select("*", { count: "exact" })
    .order("fecha_compra", { ascending: false })
    .range(from, from + pageSize - 1);

  if (edicion) query = query.eq("edicion", edicion);
  if (status) query = query.eq("status", status);
  if (search) query = query.or(`nombre_completo.ilike.%${search}%,correo_electronico.ilike.%${search}%,id_factura.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregated stats (all records, sin paginar)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allData } = await (supabase.from("purchase_approved" as any) as any)
    .select("edicion, status, cash_collected, en_reserva, precio, comision, importe_cuotas_futuras, nombre_comercial");

  const all = (allData ?? []) as {
    edicion: string;
    status: string;
    cash_collected: number | null;
    en_reserva: number | null;
    precio: number | null;
    comision: number | null;
    importe_cuotas_futuras: number | null;
    nombre_comercial: string | null;
  }[];

  const ventas = all.filter((r) => r.status !== "Rembolsado");
  const reembolsos = all.filter((r) => r.status === "Rembolsado");
  const totalCash = ventas.reduce((s, r) => s + (r.cash_collected ?? 0), 0);
  const totalReserva = ventas.reduce((s, r) => s + (r.en_reserva ?? 0), 0);
  const totalCuotas = ventas.reduce((s, r) => s + (r.importe_cuotas_futuras ?? 0), 0);

  // Por edición
  const edicionMap: Record<string, { ventas: number; cash: number }> = {};
  for (const r of all) {
    const ed = r.edicion ?? "Sin edición";
    if (!edicionMap[ed]) edicionMap[ed] = { ventas: 0, cash: 0 };
    if (r.status !== "Rembolsado") {
      edicionMap[ed].ventas += 1;
      edicionMap[ed].cash += r.cash_collected ?? 0;
    }
  }
  const porEdicion = Object.entries(edicionMap)
    .map(([edicion, v]) => ({ edicion, ...v }))
    .sort((a, b) => b.cash - a.cash);

  // Por comercial
  const comercialMap: Record<string, { ventas: number; cash: number }> = {};
  for (const r of ventas) {
    const c = r.nombre_comercial ?? "Sin asignar";
    if (!comercialMap[c]) comercialMap[c] = { ventas: 0, cash: 0 };
    comercialMap[c].ventas += 1;
    comercialMap[c].cash += r.cash_collected ?? 0;
  }
  const porComercial = Object.entries(comercialMap)
    .map(([comercial, v]) => ({ comercial, ...v }))
    .sort((a, b) => b.cash - a.cash);

  const ediciones = [...new Set(all.map((r) => r.edicion).filter(Boolean))].sort();
  const statuses = [...new Set(all.map((r) => r.status).filter(Boolean))].sort();

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    stats: {
      totalVentas: ventas.length,
      totalReembolsos: reembolsos.length,
      totalCash,
      totalReserva,
      totalCuotas,
      tasaReembolso: all.length > 0 ? ((reembolsos.length / all.length) * 100).toFixed(1) : "0",
    },
    porEdicion,
    porComercial,
    ediciones,
    statuses,
  });
}
