/**
 * Listado de alumnos con su estado de contrato (Zoho/DocuSign) y factura (Holded).
 * Hoy lee de `onboarding` (lo que el equipo registra a mano).
 * Pendiente: sincronización directa con Holded + Zoho Sign + DocuSign.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

type OrderRow = {
  buyer_email: string | null;
  buyer_name: string | null;
  cohort: string | null;
  status_orden: string;
  source?: string | null;
  offer_code: string | null;
  installments_total: number | null;
  bruto_cobrado: number;
  importe_overdue: number;
  importe_pendiente_aprobacion: number;
  importe_reembolsado: number;
  currency: string | null;
};

type OnboardingRow = {
  email: string | null;
  contrato_enviado: boolean | null;
  contrato_firmado: boolean | null;
  acceso_enviado: boolean | null;
  factura_enviada: boolean | null;
  id_contrato: string | null;
  id_factura: string | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cohort = searchParams.get("cohort");
  const filter = searchParams.get("filter"); // "missing_contract" | "missing_invoice" | "missing_both" | "all"

  const supabase = createAdminClient();

  // Cargar alumnos (excluye reservas + canceladas globales — los reembolsados sí entran)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase.from("client_orders_metrics" as any) as any).select(
    "buyer_email,buyer_name,cohort,status_orden,source,offer_code,installments_total,bruto_cobrado,importe_overdue,importe_pendiente_aprobacion,importe_reembolsado,currency"
  );
  if (cohort && cohort !== "Global") q = q.eq("cohort", cohort);
  const { data: ordersRaw, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const isReserva = (r: OrderRow): boolean => {
    if ((r.installments_total ?? 1) !== 1) return false;
    const total =
      Number(r.bruto_cobrado ?? 0) +
      Number(r.importe_overdue ?? 0) +
      Number(r.importe_pendiente_aprobacion ?? 0) +
      Number(r.importe_reembolsado ?? 0);
    return total > 0 && total < 800;
  };

  // Offers de prueba/test que NO son alumnos reales
  const TEST_OFFERS = new Set(["mb98un0m"]); // €1 test

  const orders: OrderRow[] = ((ordersRaw ?? []) as OrderRow[]).filter(
    (r) =>
      !isReserva(r) &&
      r.status_orden !== "CANCELADA" &&
      r.status_orden !== "OTRO" &&
      !TEST_OFFERS.has(r.offer_code ?? "")
  );

  // Cargar onboarding completo (case-insensitive lookup más adelante)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: obData } = await (supabase.from("onboarding" as any) as any).select(
    "email,contrato_enviado,contrato_firmado,acceso_enviado,factura_enviada,id_contrato,id_factura"
  );
  const obByEmail: Record<string, OnboardingRow> = {};
  for (const r of (obData ?? []) as OnboardingRow[]) {
    if (r.email) obByEmail[r.email.toLowerCase().trim()] = r;
  }

  // Cargar purchase_approved para id_factura (legacy/asignado, NO equivale a "emitida")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paData } = await (supabase.from("purchase_approved" as any) as any).select(
    "correo_electronico,id_factura"
  );
  const paFacturaByEmail: Record<string, string> = {};
  for (const r of (paData ?? []) as { correo_electronico: string | null; id_factura: string | null }[]) {
    if (r.correo_electronico && r.id_factura) {
      paFacturaByEmail[r.correo_electronico.toLowerCase().trim()] = r.id_factura;
    }
  }

  // Lookup nombres bonitos editions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: editionsRaw } = await (supabase.from("editions" as any) as any)
    .select("cohort,name,sales_open_at")
    .order("sales_open_at", { ascending: false });
  const editionsByCohort: Record<string, string> = {};
  const cleanName = (n: string): string => {
    if (!n) return n;
    const cleaned = n.replace(/^Edici[oó]n\s+/i, "");
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };
  for (const e of editionsRaw ?? []) editionsByCohort[e.cohort] = cleanName(e.name);

  type FacturaState = "emitida" | "asignada" | "no";
  type ContratoState = "firmado" | "enviado" | "no";

  type Row = {
    buyer_email: string;
    buyer_name: string | null;
    cohort: string | null;
    cohort_label: string;
    status_orden: string;
    contrato_state: ContratoState;
    id_contrato: string | null;
    factura_state: FacturaState;
    id_factura: string | null;
    en_onboarding: boolean;
  };

  const rows: Row[] = orders
    .filter((r) => r.buyer_email)
    .map((r) => {
      const email = r.buyer_email!.toLowerCase().trim();
      const ob = obByEmail[email];
      const id_contrato = ob?.id_contrato ?? null;
      const id_factura_pa = paFacturaByEmail[email] ?? null;
      const id_factura = ob?.id_factura ?? id_factura_pa;
      const factura_enviada = ob?.factura_enviada === true;
      const contrato_firmado = ob?.contrato_firmado === true;

      const contrato_state: ContratoState = contrato_firmado
        ? "firmado"
        : id_contrato
        ? "enviado"
        : "no";
      const factura_state: FacturaState = factura_enviada
        ? "emitida"
        : id_factura
        ? "asignada"
        : "no";

      return {
        buyer_email: r.buyer_email!,
        buyer_name: r.buyer_name,
        cohort: r.cohort,
        cohort_label: r.cohort ? editionsByCohort[r.cohort] ?? r.cohort : "Sin edición",
        status_orden: r.status_orden,
        contrato_state,
        id_contrato,
        factura_state,
        id_factura,
        en_onboarding: !!ob,
      };
    });

  // Filtro
  let filtered = rows;
  if (filter === "missing_contract") filtered = rows.filter((r) => r.contrato_state !== "firmado");
  else if (filter === "missing_invoice") filtered = rows.filter((r) => r.factura_state !== "emitida");
  else if (filter === "missing_both") filtered = rows.filter((r) => r.contrato_state !== "firmado" && r.factura_state !== "emitida");

  // Stats: distinguen "emitida/firmado" (verificado) de "asignada/enviado" (en proceso)
  const stats = {
    total: rows.length,
    contrato_firmado: rows.filter((r) => r.contrato_state === "firmado").length,
    contrato_enviado: rows.filter((r) => r.contrato_state === "enviado").length,
    contrato_no: rows.filter((r) => r.contrato_state === "no").length,
    factura_emitida: rows.filter((r) => r.factura_state === "emitida").length,
    factura_asignada: rows.filter((r) => r.factura_state === "asignada").length,
    factura_no: rows.filter((r) => r.factura_state === "no").length,
    sin_ambos_confirmados: rows.filter((r) => r.contrato_state !== "firmado" && r.factura_state !== "emitida").length,
    sin_onboarding: rows.filter((r) => !r.en_onboarding).length,
  };

  // Cohorts disponibles
  const cohortsSet = new Set<string>();
  for (const r of rows) if (r.cohort) cohortsSet.add(r.cohort);
  const cohorts = [
    { value: "Global", label: "Global" },
    ...[...cohortsSet]
      .sort()
      .reverse()
      .map((c) => ({ value: c, label: editionsByCohort[c] ?? c })),
  ];

  return NextResponse.json({
    cohorts,
    stats,
    rows: filtered.sort((a, b) => (b.cohort || "").localeCompare(a.cohort || "")),
  });
}
