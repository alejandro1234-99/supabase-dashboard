import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

type OrderRow = {
  buyer_ucode: string;
  offer_code: string | null;
  buyer_email: string | null;
  buyer_name: string | null;
  currency: string | null;
  installments_total: number | null;
  payment_mode: string | null;
  payment_method: string | null;
  cuotas_pagadas: number;
  cuotas_overdue: number;
  cuotas_refunded: number;
  cuotas_canceladas: number;
  cuotas_expired: number;
  cuotas_approved: number;
  cuotas_waiting: number;
  cuotas_chargeback: number;
  cuotas_total_detectadas: number | null;
  bruto_cobrado: number;
  comision_total: number;
  cash_collected: number;
  importe_reembolsado: number;
  importe_overdue: number;
  importe_pendiente_aprobacion: number;
  net_revenue: number;
  fecha_compra_inicial: string | null;
  ultimo_pago_at: string | null;
  fecha_reembolso: string | null;
  primer_overdue_at: string | null;
  cohort: string | null;
  dias_overdue: number | null;
  status_orden: string;
  source?: string | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cohort = searchParams.get("cohort");
  // Currency: filtra los IMPORTES (cash, overdue, etc.) pero NO los conteos de alumnos.
  // Default EUR para importes; alumnos siempre se cuentan todos.
  const currencyForAmounts = searchParams.get("currency") ?? "EUR";

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase.from("client_orders_metrics" as any) as any).select("*");
  if (cohort && cohort !== "Global") q = q.eq("cohort", cohort);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Excluir offers de prueba (mb98un0m = €1 test)
  const TEST_OFFERS = new Set(["mb98un0m"]);
  const allOrders = ((data ?? []) as OrderRow[]).filter(
    (r) => !TEST_OFFERS.has(r.offer_code ?? "")
  );

  // === Rescatar huérfanos: transferencias sin cohort heredan edicion de purchase_approved ===
  const editionNameToCohort: Record<string, string> = {
    "enero 2025": "2025-01",
    "marzo 2025": "2025-03",
    "abril 2025": "2025-04",
    "mayo 2025": "2025-05",
    "julio 2025": "2025-07",
    "agosto 2025": "2025-08",
    "septiembre 2025": "2025-09",
    "octubre 2025": "2025-10",
    "noviembre 2025": "2025-11",
    "enero 2026": "2026-01",
    "febrero 2026": "2026-02",
    "marzo 2026": "2026-03",
    "abril 2026": "2026-04",
    "mayo 2026": "2026-05",
    "agosto 2024": "2024-08",
    "octubre 2024": "2024-10",
    "noviembre 2024": "2024-11",
  };
  const orphanEmails = allOrders
    .filter((r) => !r.cohort && r.source === "transferencia" && r.buyer_email)
    .map((r) => r.buyer_email!.toLowerCase().trim());

  if (orphanEmails.length > 0) {
    // Para transferencias sin fecha, respetar la asignación manual del equipo
    // (purchase_approved.edicion) — verificado contra Circle.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: paAll } = await (supabase.from("purchase_approved" as any) as any)
      .select("correo_electronico,edicion")
      .ilike("metodo_pago", "%transfer%");
    const emailToCohort: Record<string, string> = {};
    for (const r of paAll ?? []) {
      const e = (r.correo_electronico ?? "").toLowerCase().trim();
      const k = (r.edicion ?? "").toLowerCase().trim();
      if (e && editionNameToCohort[k]) emailToCohort[e] = editionNameToCohort[k];
    }
    for (const r of allOrders) {
      if (!r.cohort && r.source === "transferencia" && r.buyer_email) {
        const c = emailToCohort[r.buyer_email.toLowerCase().trim()];
        if (c) r.cohort = c;
      }
    }
  }

  // RESERVAS: pago único de importe pequeño (<800€). NO son ventas del curso.
  // Se excluyen de todos los cálculos de ventas, reembolsos y métricas.
  const isReserva = (r: OrderRow): boolean => {
    if ((r.installments_total ?? 1) !== 1) return false;
    const total = Number(r.bruto_cobrado ?? 0)
      + Number(r.importe_overdue ?? 0)
      + Number(r.importe_pendiente_aprobacion ?? 0)
      + Number(r.importe_reembolsado ?? 0);
    return total > 0 && total < 800;
  };
  const reservas = allOrders.filter(isReserva);
  const orders = allOrders.filter((r) => !isReserva(r));
  const reservas_count = reservas.length;
  const reservas_reembolsadas = reservas.filter((r) =>
    ["REEMBOLSADA", "REEMBOLSADA_PARCIAL"].includes(r.status_orden)
  ).length;

  // Importes SOLO se suman para la divisa pedida (EUR por defecto)
  const sumEur = (key: keyof OrderRow) =>
    orders.reduce(
      (s, r) => (r.currency === currencyForAmounts ? s + Number(r[key] ?? 0) : s),
      0
    );

  const cash_collected = sumEur("cash_collected");
  const importe_reembolsado = sumEur("importe_reembolsado");
  const net_revenue = cash_collected - importe_reembolsado;
  const importe_overdue = sumEur("importe_overdue");
  const importe_pendiente_aprobacion = sumEur("importe_pendiente_aprobacion");
  const comision_total = sumEur("comision_total");
  const bruto_cobrado = sumEur("bruto_cobrado");

  const isActive = (s: string) =>
    ["ACTIVA", "ACTIVA_CON_RETRASO", "COMPLETADA", "PENDIENTE_APROBACION"].includes(s);
  const isRefunded = (s: string) =>
    ["REEMBOLSADA", "REEMBOLSADA_PARCIAL"].includes(s);

  const num_alumnos_activos = orders.filter((r) => isActive(r.status_orden)).length;
  const num_reembolsadas = orders.filter((r) => isRefunded(r.status_orden)).length;
  const num_canceladas = orders.filter((r) => r.status_orden === "CANCELADA").length;
  const num_total = orders.length;
  const num_relevantes = num_alumnos_activos + num_reembolsadas;
  const refund_rate = num_relevantes > 0 ? (num_reembolsadas / num_relevantes) * 100 : 0;

  // === TASA DE IMPAGO ===
  // De cuotas resueltas (cobradas o de facto incobrables), % no cobradas.
  // Cobradas = COMPLETE.
  // Incobrables de facto = CANCELLED + EXPIRED + CHARGEBACK + OVERDUE viejo (>60d sin cobrarse).
  // Solo en órdenes activas/completadas/reembolsadas (no canceladas globales).
  let cuotas_cobradas_hist = 0;
  let cuotas_impagadas_hist = 0;
  for (const r of orders) {
    if (!isActive(r.status_orden) && !isRefunded(r.status_orden)) continue;
    cuotas_cobradas_hist += r.cuotas_pagadas;
    cuotas_impagadas_hist += r.cuotas_canceladas + r.cuotas_expired + r.cuotas_chargeback;
    if (r.dias_overdue !== null && r.dias_overdue > 60) {
      cuotas_impagadas_hist += r.cuotas_overdue;
    }
  }
  const tasa_impago = (cuotas_cobradas_hist + cuotas_impagadas_hist) > 0
    ? (cuotas_impagadas_hist / (cuotas_cobradas_hist + cuotas_impagadas_hist)) * 100
    : 0;

  // === PREVISIÓN ===
  // Bruta: lo que en teoría debería entrar (overdue + approved + cuotas planificadas no vencidas)
  // Ajustada: bruta × (1 - tasa_impago)
  const importe_proximas_cuotas = orders.reduce((s, r) => {
    if (!r.installments_total || r.installments_total <= 0) return s;
    if (r.cuotas_pagadas >= r.installments_total) return s;
    if (isRefunded(r.status_orden)) return s;
    const cuotas_pendientes = r.installments_total - r.cuotas_pagadas - r.cuotas_overdue - r.cuotas_canceladas - r.cuotas_expired;
    if (cuotas_pendientes <= 0) return s;
    const bruto_total_estimado = Number(r.bruto_cobrado ?? 0) + Number(r.importe_overdue ?? 0) + Number(r.importe_pendiente_aprobacion ?? 0);
    const cuotas_finales_o_intentadas = r.cuotas_pagadas + r.cuotas_overdue + r.cuotas_approved;
    const por_cuota = cuotas_finales_o_intentadas > 0 ? bruto_total_estimado / cuotas_finales_o_intentadas : 0;
    return s + por_cuota * cuotas_pendientes;
  }, 0);

  const prevision_bruta = importe_overdue + importe_pendiente_aprobacion + importe_proximas_cuotas;
  const prevision_ajustada = prevision_bruta * (1 - tasa_impago / 100);

  // Editions: lookup cohort → name (para mostrar "Abril 2026" en lugar de "2026-04")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: editionsRaw } = await (supabase.from("editions" as any) as any)
    .select("cohort,name,sales_open_at")
    .order("sales_open_at", { ascending: false });
  const editionsByCohort: Record<string, string> = {};
  const cleanName = (n: string): string => {
    if (!n) return n;
    // Quita "Edición " inicial (cualquier capitalización) y capitaliza la primera letra
    const cleaned = n.replace(/^Edici[oó]n\s+/i, "");
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };
  for (const e of editionsRaw ?? []) editionsByCohort[e.cohort] = cleanName(e.name);

  // Cash por mes (solo EUR)
  const byMonth: Record<string, number> = {};
  for (const o of orders) {
    if (!o.fecha_compra_inicial) continue;
    if (o.currency !== currencyForAmounts) continue;
    const ym = o.fecha_compra_inicial.slice(0, 7);
    byMonth[ym] = (byMonth[ym] ?? 0) + Number(o.cash_collected ?? 0);
  }
  const cash_por_mes = Object.entries(byMonth)
    .map(([mes, cash]) => ({ mes, cash: Math.round(cash * 100) / 100 }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  // Por cohort (cuenta TODOS los alumnos sin filtrar por moneda; sumas solo en EUR)
  // "Impagos" = cuotas no cobradas (overdue todos + cancelled + expired + chargeback).
  // Cuadra con la tabla "Recobros pendientes" que muestra órdenes con cuotas_overdue > 0.
  const byCohort: Record<string, { cohort: string; nombre: string; ventas: number; reembolsos: number; cash: number; overdue: number; impagados: number }> = {};
  for (const o of orders) {
    const k = o.cohort || "Sin cohort";
    if (!byCohort[k]) byCohort[k] = { cohort: k, nombre: editionsByCohort[k] ?? k, ventas: 0, reembolsos: 0, cash: 0, overdue: 0, impagados: 0 };
    if (isActive(o.status_orden) || isRefunded(o.status_orden)) {
      byCohort[k].ventas++;
      byCohort[k].impagados +=
        o.cuotas_overdue
        + o.cuotas_canceladas
        + o.cuotas_expired
        + o.cuotas_chargeback;
    }
    if (isRefunded(o.status_orden)) byCohort[k].reembolsos++;
    if (o.currency === currencyForAmounts) {
      byCohort[k].cash += Number(o.cash_collected ?? 0);
      byCohort[k].overdue += Number(o.importe_overdue ?? 0);
    }
  }
  const por_cohort = Object.values(byCohort)
    .filter((c) => c.ventas > 0)
    .map((c) => c.cohort === "Sin cohort"
      ? { ...c, nombre: "Sin edición asignada" }
      : c
    )
    .sort((a, b) => {
      // "Sin edición asignada" siempre al final
      if (a.cohort === "Sin cohort") return 1;
      if (b.cohort === "Sin cohort") return -1;
      return (b.cohort || "").localeCompare(a.cohort || "");
    });

  // === BUCKET MÉTODO + CUOTAS (excluyendo canceladas) ===
  // Sequra requiere cruce con purchase_approved
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sequraRows } = await (supabase.from("purchase_approved" as any) as any)
    .select("correo_electronico")
    .ilike("metodo_pago", "%Sequra%");
  const sequraEmails = new Set<string>(
    (sequraRows ?? []).map((r: { correo_electronico: string | null }) =>
      (r.correo_electronico ?? "").toLowerCase().trim()
    ).filter(Boolean)
  );

  const bucketOf = (r: OrderRow): string => {
    if ((r.payment_method ?? "") === "TRANSFERENCIA") return "Transferencia";
    if ((r.payment_method ?? "") === "KLARNA") return "Klarna";
    if (r.buyer_email && sequraEmails.has(r.buyer_email.toLowerCase().trim())) return "Sequra";
    return "Pago Hotmart";
  };

  const cuotasLabelOf = (r: OrderRow): { label: string; sort: number } => {
    const isContado = r.payment_mode === "PAY_IN_FULL" || (r.installments_total ?? 1) === 1;
    if (isContado) return { label: "Contado", sort: 1 };
    return { label: `${r.installments_total} cuotas`, sort: Number(r.installments_total ?? 99) };
  };

  type GroupRow = {
    bucket: string;
    label: string;
    sort: number;
    ventas: number;
    completadas: number;
    reembolsadas: number;
    pdte_aprobacion: number;
    activas: number;
    cash: number;
    refund_rate: number;
    cash_avg: number;
  };

  const groups: Record<string, GroupRow> = {};
  // Total ventas reales para %
  let totalVentasReales = 0;
  for (const r of orders) {
    if (r.status_orden === "CANCELADA" || r.status_orden === "OTRO") continue;
    totalVentasReales++;
    const bucket = bucketOf(r);
    const { label: cuotasLabel, sort: cuotasSort } = cuotasLabelOf(r);
    const fullLabel = `${bucket} · ${cuotasLabel}`;
    const key = fullLabel;
    const bucketSort =
      bucket === "Pago Hotmart" ? 1 :
      bucket === "Sequra" ? 2 :
      bucket === "Klarna" ? 3 :
      bucket === "Transferencia" ? 4 : 9;
    if (!groups[key]) groups[key] = {
      bucket, label: fullLabel,
      sort: bucketSort * 100 + cuotasSort,
      ventas: 0, completadas: 0, reembolsadas: 0, pdte_aprobacion: 0, activas: 0,
      cash: 0, refund_rate: 0, cash_avg: 0,
    };
    groups[key].ventas++;
    if (r.status_orden === "COMPLETADA") groups[key].completadas++;
    else if (isRefunded(r.status_orden)) groups[key].reembolsadas++;
    else if (r.status_orden === "PENDIENTE_APROBACION") groups[key].pdte_aprobacion++;
    else groups[key].activas++;
    if (r.currency === currencyForAmounts) groups[key].cash += Number(r.cash_collected ?? 0);
  }
  for (const v of Object.values(groups)) {
    v.refund_rate = v.ventas > 0 ? Math.round((v.reembolsadas / v.ventas) * 1000) / 10 : 0;
    v.cash_avg = v.ventas > 0 ? Math.round(v.cash / v.ventas) : 0;
    v.cash = Math.round(v.cash * 100) / 100;
  }
  const por_metodo_cuotas = Object.values(groups).sort((a, b) => a.sort - b.sort);

  // Resumen por bucket (sin desglosar cuotas)
  const buckets: Record<string, { bucket: string; ventas: number; cash: number; reembolsadas: number; refund_rate: number }> = {};
  for (const g of por_metodo_cuotas) {
    if (!buckets[g.bucket]) buckets[g.bucket] = { bucket: g.bucket, ventas: 0, cash: 0, reembolsadas: 0, refund_rate: 0 };
    buckets[g.bucket].ventas += g.ventas;
    buckets[g.bucket].cash += g.cash;
    buckets[g.bucket].reembolsadas += g.reembolsadas;
  }
  for (const v of Object.values(buckets)) {
    v.refund_rate = v.ventas > 0 ? Math.round((v.reembolsadas / v.ventas) * 1000) / 10 : 0;
    v.cash = Math.round(v.cash * 100) / 100;
  }
  const por_bucket = Object.values(buckets).sort((a, b) => b.ventas - a.ventas);

  // Recobros: alumnos con cuotas pendientes (solo EUR para los importes mostrados)
  const recobros = orders
    .filter((r) => r.cuotas_overdue > 0 && r.currency === currencyForAmounts)
    .sort((a, b) => Number(b.importe_overdue ?? 0) - Number(a.importe_overdue ?? 0))
    .map((r) => ({
      buyer_email: r.buyer_email,
      buyer_name: r.buyer_name,
      cohort: r.cohort,
      payment_method: r.payment_method,
      cuotas_pagadas: r.cuotas_pagadas,
      installments_total: r.installments_total,
      cuotas_overdue: r.cuotas_overdue,
      importe_overdue: Number(r.importe_overdue ?? 0),
      cash_collected: Number(r.cash_collected ?? 0),
      dias_overdue: r.dias_overdue,
      ultimo_pago_at: r.ultimo_pago_at,
      status_orden: r.status_orden,
    }));

  // Cohorts disponibles
  const cohortsSet = new Set<string>();
  for (const o of orders) if (o.cohort) cohortsSet.add(o.cohort);
  const cohorts = [
    { value: "Global", label: "Global" },
    ...[...cohortsSet]
      .sort()
      .reverse()
      .map((c) => ({ value: c, label: editionsByCohort[c] ?? c })),
  ];

  // === ESTADO GLOBAL DE CUOTAS (sin solapamiento) ===
  let q_cobradas = 0;        // COMPLETE
  let q_overdue_recientes = 0; // OVERDUE <=60d (en proceso reintento)
  let q_overdue_perdidas = 0;  // OVERDUE >60d (de facto perdidas)
  let q_perdidas_cerradas = 0; // CANCELLED + EXPIRED + CHARGEBACK
  let q_aprobacion = 0;        // APPROVED + WAITING
  let q_refunded = 0;          // REFUNDED
  for (const r of orders) {
    if (!isActive(r.status_orden) && !isRefunded(r.status_orden)) continue;
    q_cobradas += r.cuotas_pagadas;
    q_perdidas_cerradas += r.cuotas_canceladas + r.cuotas_expired + r.cuotas_chargeback;
    q_aprobacion += r.cuotas_approved + r.cuotas_waiting;
    q_refunded += r.cuotas_refunded;
    if (r.dias_overdue !== null && r.dias_overdue > 60) {
      q_overdue_perdidas += r.cuotas_overdue;
    } else {
      q_overdue_recientes += r.cuotas_overdue;
    }
  }
  const estado_cuotas = {
    cobradas: q_cobradas,
    en_proceso: q_overdue_recientes + q_aprobacion,
    overdue_recientes: q_overdue_recientes,
    pdte_aprobacion: q_aprobacion,
    perdidas: q_overdue_perdidas + q_perdidas_cerradas,
    overdue_perdidas: q_overdue_perdidas,
    perdidas_cerradas: q_perdidas_cerradas,
    reembolsadas: q_refunded,
    total: q_cobradas + q_overdue_recientes + q_overdue_perdidas + q_perdidas_cerradas + q_aprobacion + q_refunded,
  };

  return NextResponse.json({
    cohorts,
    por_bucket,
    por_metodo_cuotas,
    total_ventas_reales: totalVentasReales,
    reservas_count,
    reservas_reembolsadas,
    estado_cuotas,
    kpis: {
      cash_collected: Math.round(cash_collected * 100) / 100,
      bruto_cobrado: Math.round(bruto_cobrado * 100) / 100,
      importe_reembolsado: Math.round(importe_reembolsado * 100) / 100,
      net_revenue: Math.round(net_revenue * 100) / 100,
      importe_overdue: Math.round(importe_overdue * 100) / 100,
      importe_pendiente_aprobacion: Math.round(importe_pendiente_aprobacion * 100) / 100,
      importe_proximas_cuotas: Math.round(importe_proximas_cuotas * 100) / 100,
      prevision_bruta: Math.round(prevision_bruta * 100) / 100,
      prevision_ajustada: Math.round(prevision_ajustada * 100) / 100,
      comision_total: Math.round(comision_total * 100) / 100,
      num_alumnos_activos,
      num_reembolsadas,
      num_canceladas,
      num_total,
      refund_rate: Math.round(refund_rate * 10) / 10,
      tasa_impago: Math.round(tasa_impago * 10) / 10,
      cuotas_cobradas_hist,
      cuotas_impagadas_hist,
    },
    cash_por_mes,
    por_cohort,
    recobros,
  });
}
