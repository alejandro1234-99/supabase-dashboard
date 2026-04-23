// Validates the Panel aggregation logic by replicating the API's algorithm
// against real Supabase data. Confirms reconciliation holds and the new
// cierre-llamada formula matches across closers.
//
// Run desde la raíz del proyecto:  node scripts/verify-panel.mjs [edicion]

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchAll(table, columns, edicion) {
  const PAGE = 10000;
  const all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (edicion) q = q.eq("edicion", edicion);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// --- classification functions (same as API) ---
function classifyLead(lead) {
  const medium = (lead.medium ?? "").toLowerCase();
  const funnel = (lead.funnel ?? "").toLowerCase();
  const test = (lead.test ?? "").toLowerCase();
  if (funnel === "ca") return "Paid";
  if (medium.includes("worldcast") || medium.includes("vidascontadas")) return "Afiliados";
  const organicMediums = ["winstagram", "wtiktok", "wyoutube", "bio", "leadmagnetx", "home", "winstagramrevolutia"];
  if (organicMediums.includes(medium) || medium.startsWith("reelp")) return "Organico";
  const organicTests = ["tiktok", "youtube", "instagram", "ig", "home", "fb", "fb_ad", "worldcast"];
  if (organicTests.includes(test)) return "Organico";
  if (medium) return "Organico";
  if (test === "bbdd" || test === "waitlist" || test === "com_anteriores" || test.startsWith("email")) return "Organico";
  return "Untracked";
}

const COMERCIAL_MAP = {
  "Arnau Revolutia": "Arnau", "Arnau": "Arnau",
  "Alberto Equipo Revolutia": "Alberto", "Alberto": "Alberto",
  "Hector Soria": "Hector", "Hector": "Hector", "Héctor": "Hector",
  "Raúl García": "Raúl", "Raul García": "Raúl", "Raul Garcia": "Raúl", "Raúl": "Raúl", "Raul": "Raúl",
  "Nacho": "Nacho", "Nacho Revolutia": "Nacho", "Nacho Laguna": "Nacho",
};
function normComercial(name) {
  if (!name) return "Sin asignar";
  return COMERCIAL_MAP[name] ?? name;
}

const EDITION_COMERCIALES = {
  "Enero 2026": ["Nacho", "Arnau", "Hector"],
  "Febrero 2026": ["Arnau", "Hector", "Alberto", "Raúl"],
  "Marzo 2026": ["Nacho", "Arnau", "Hector", "Alberto"],
};

async function verify(edicion) {
  console.log(`\n=== Verificando edición: ${edicion} ===\n`);
  const [leads, agendas, salesRaw] = await Promise.all([
    fetchAll("leads", "email, edicion, funnel, medium, test, campaign, fuente_medio, fecha_registro", edicion),
    fetchAll("agendas", "email, edicion, comercial, no_show, fecha_llamada, creada", edicion),
    fetchAll("purchase_approved", "correo_electronico, edicion, status, nombre_comercial, fecha_compra, date_added", edicion),
  ]);
  console.log(`  leads=${leads.length} agendas=${agendas.length} sales(raw)=${salesRaw.length}`);

  // Deduplicate sales by email
  const seenEmails = new Set();
  const salesAll = salesRaw.filter((s) => {
    const email = (s.correo_electronico ?? "").toLowerCase().trim();
    if (!email || seenEmails.has(email)) return false;
    seenEmails.add(email);
    return true;
  });

  // Refund tracking
  const refundedEmails = new Set();
  const salesNetas = salesAll.filter((s) => {
    const status = (s.status ?? "").toLowerCase();
    if (status.includes("rembolsado") || status.includes("reembolsado")) {
      refundedEmails.add((s.correo_electronico ?? "").toLowerCase().trim());
      return false;
    }
    return true;
  });

  // email → source map
  const emailSource = {};
  for (const l of leads) if (l.email) emailSource[l.email.toLowerCase()] = classifyLead(l);

  // email → closer map (priority: non-no_show wins)
  const emailCloserMap = {};
  for (const a of agendas) {
    const email = (a.email ?? "").toLowerCase();
    if (!email) continue;
    const closer = normComercial(a.comercial);
    if (!a.no_show) emailCloserMap[email] = closer;
    else if (!emailCloserMap[email]) emailCloserMap[email] = closer;
  }

  // Global totals
  const totalLeads = leads.length;
  const totalAgendas = agendas.length;
  const agendasUnicas = new Set(agendas.map((r) => r.email?.toLowerCase()).filter(Boolean)).size;
  const totalVentas = salesAll.length;
  const totalVentasNetas = salesNetas.length;

  const saleEmails = new Set(salesAll.map((s) => (s.correo_electronico ?? "").toLowerCase()).filter(Boolean));

  // Replicate closerPerformance logic
  const edicionComerciales = EDITION_COMERCIALES[edicion] ?? ["Nacho", "Arnau", "Hector", "Alberto"];
  const closerTotals = {};
  for (const c of edicionComerciales) closerTotals[c] = { llamadas: 0, noShows: 0, celebradas: 0, ventas: 0, ventasNetas: 0 };

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const emailCallStatus = {};
  for (const a of agendas) {
    if (!a.fecha_llamada) continue;
    const day = a.fecha_llamada.split("T")[0];
    if (day > today) continue;
    if (day === today && a.fecha_llamada.includes("T") && !a.fecha_llamada.endsWith("T00:00:00")) {
      const callTime = new Date(a.fecha_llamada);
      const thirtyMinAfter = new Date(callTime.getTime() + 30 * 60 * 1000);
      if (now < thirtyMinAfter) continue;
    }
    const email = (a.email ?? "").toLowerCase();
    if (!email) continue;
    const closer = emailCloserMap[email] ?? normComercial(a.comercial);
    const existing = emailCallStatus[email];
    if (!existing) {
      emailCallStatus[email] = { closer, celebrated: !a.no_show, day };
    } else if (!a.no_show && !existing.celebrated) {
      existing.celebrated = true;
      existing.day = day;
      existing.closer = closer;
    }
  }

  let totalLlamadas = 0, totalCelebradas = 0, totalNoShows = 0;
  let totalVentasEnCelebradas = 0, totalVentasEnCelebradasNetas = 0;

  for (const [email, s] of Object.entries(emailCallStatus)) {
    const { closer, celebrated } = s;
    totalLlamadas++;
    if (celebrated) totalCelebradas++;
    else totalNoShows++;
    const hasSale = saleEmails.has(email);
    const isRefund = refundedEmails.has(email);
    if (celebrated && hasSale) {
      totalVentasEnCelebradas++;
      if (!isRefund) totalVentasEnCelebradasNetas++;
    }
    if (closer === "Sin asignar") continue;
    if (!closerTotals[closer]) closerTotals[closer] = { llamadas: 0, noShows: 0, celebradas: 0, ventas: 0, ventasNetas: 0 };
    const ct = closerTotals[closer];
    ct.llamadas++;
    if (!celebrated) ct.noShows++;
    else {
      ct.celebradas++;
      if (hasSale) {
        ct.ventas++;
        if (!isRefund) ct.ventasNetas++;
      }
    }
  }

  const closerPerf = Object.entries(closerTotals).map(([closer, t]) => ({
    closer,
    llamadas: t.llamadas, noShows: t.noShows, celebradas: t.celebradas,
    ventas: t.ventas, ventasNetas: t.ventasNetas,
    cierre: t.celebradas > 0 ? ((t.ventas / t.celebradas) * 100).toFixed(1) : "0",
    cierreNeto: t.celebradas > 0 ? ((t.ventasNetas / t.celebradas) * 100).toFixed(1) : "0",
    showRate: t.llamadas > 0 ? ((t.celebradas / t.llamadas) * 100).toFixed(1) : "0",
  }));

  // Sums for reconciliation
  const sum = (k) => closerPerf.reduce((s, c) => s + c[k], 0);
  const includedLlamadas = sum("llamadas");
  const includedCelebradas = sum("celebradas");
  const includedVentas = sum("ventas");
  const includedVentasNetas = sum("ventasNetas");
  const sinAsignarLlamadas = totalLlamadas - includedLlamadas;
  const sinAsignarCelebradas = totalCelebradas - includedCelebradas;
  const sinAsignarVentas = totalVentasEnCelebradas - includedVentas;
  const sinAsignarVentasNetas = totalVentasEnCelebradasNetas - includedVentasNetas;

  const cierreLlamada = totalCelebradas > 0 ? ((totalVentasEnCelebradas / totalCelebradas) * 100).toFixed(1) : "0";
  const cierreLlamadaNeto = totalCelebradas > 0 ? ((totalVentasEnCelebradasNetas / totalCelebradas) * 100).toFixed(1) : "0";
  const showRate = totalLlamadas > 0 ? ((totalCelebradas / totalLlamadas) * 100).toFixed(1) : "0";
  const convAgendaVenta = agendasUnicas > 0 ? ((totalVentas / agendasUnicas) * 100).toFixed(1) : "0";

  // Report
  console.log(`\nGlobales:`);
  console.log(`  leads=${totalLeads}  agendasUnicas=${agendasUnicas}/${totalAgendas} reg  ventas=${totalVentas}  ventasNetas=${totalVentasNetas}`);
  console.log(`  llamadas=${totalLlamadas}  celebradas=${totalCelebradas}  no-shows=${totalNoShows}`);
  console.log(`  ventasEnCelebradas=${totalVentasEnCelebradas}  netas=${totalVentasEnCelebradasNetas}`);
  console.log(`  cierreLlamada=${cierreLlamada}%  cierreLlamadaNeto=${cierreLlamadaNeto}%  showRate=${showRate}%`);
  console.log(`  cierreAgenda (conv agenda→venta)=${convAgendaVenta}%`);

  console.log(`\nPor closer:`);
  console.log(`  ${"closer".padEnd(10)}  ll  ns  cel   v   vn  cierre  showRate`);
  for (const c of closerPerf) {
    console.log(`  ${c.closer.padEnd(10)}  ${String(c.llamadas).padStart(2)}  ${String(c.noShows).padStart(2)}  ${String(c.celebradas).padStart(3)}  ${String(c.ventas).padStart(3)}  ${String(c.ventasNetas).padStart(3)}  ${c.cierre.padStart(5)}%  ${c.showRate.padStart(5)}%`);
  }

  console.log(`\nReconciliation:`);
  const checks = [
    ["Llamadas     ", includedLlamadas, sinAsignarLlamadas, totalLlamadas],
    ["Celebradas   ", includedCelebradas, sinAsignarCelebradas, totalCelebradas],
    ["Ventas (cel) ", includedVentas, sinAsignarVentas, totalVentasEnCelebradas],
    ["VentasN (cel)", includedVentasNetas, sinAsignarVentasNetas, totalVentasEnCelebradasNetas],
  ];
  let allOk = true;
  for (const [label, sumv, sa, total] of checks) {
    const ok = sumv + sa === total;
    if (!ok) allOk = false;
    console.log(`  ${label}  Σ=${String(sumv).padStart(3)}  +sa=${String(sa).padStart(3)}  =${String(sumv + sa).padStart(3)}  vs total=${String(total).padStart(3)}  ${ok ? "✓" : "✗"}`);
  }

  // Additional sanity: cierreLlamada (global) should match weighted per-closer when sinAsignar=0
  const weightedCierre = totalCelebradas > 0
    ? ((closerPerf.reduce((s, c) => s + c.ventas, 0) + sinAsignarVentas) / totalCelebradas * 100).toFixed(1)
    : "0";
  const cierreMatch = weightedCierre === cierreLlamada;
  console.log(`\n  weighted cierre from closers = ${weightedCierre}% vs global ${cierreLlamada}%  ${cierreMatch ? "✓" : "✗"}`);
  if (!cierreMatch) allOk = false;

  // Extra: what Juan saw (30% vs 25.8%)
  console.log(`\n  Juan ve en KPI card:         "Cierre llamada" = ${cierreLlamada}%`);
  console.log(`  Juan ve en tabla Total:      "Cierre llamada" = ${includedCelebradas > 0 ? (includedVentas/includedCelebradas*100).toFixed(1) : "0"}%`);
  const kpiVsTabla = cierreLlamada === (includedCelebradas > 0 ? (includedVentas/includedCelebradas*100).toFixed(1) : "0");
  console.log(`  ¿Coinciden?                  ${kpiVsTabla ? "✓ SÍ (ahora cuadran)" : "✗ NO — difieren por sinAsignar"}`);

  console.log(`\n${allOk ? "✅ Todos los cuadres pasan" : "❌ Algún cuadre falla"}`);
  return allOk;
}

const edicion = process.argv[2] ?? "Febrero 2026";

// List available editions
const { data: eds } = await supabase.from("agendas").select("edicion").not("edicion", "is", null);
const uniqueEds = [...new Set(eds.map((r) => r.edicion))].sort();
console.log("Ediciones disponibles:", uniqueEds);

let allPass = true;
for (const ed of ["Enero 2026", "Febrero 2026"].filter((e) => uniqueEds.includes(e))) {
  const ok = await verify(ed);
  if (!ok) allPass = false;
}

process.exit(allPass ? 0 : 1);
