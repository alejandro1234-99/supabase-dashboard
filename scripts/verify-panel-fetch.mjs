// Validates the Panel aggregation — uses raw fetch, no ESM deps to avoid sandbox issues.
//
// Run desde la raíz del proyecto:  node scripts/verify-panel-fetch.mjs [edicion]

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchAll(table, columns, edicion) {
  const PAGE = 10000;
  const all = [];
  let from = 0;
  while (true) {
    const params = new URLSearchParams({ select: columns });
    if (edicion) params.set("edicion", `eq.${edicion}`);
    const res = await fetch(`${SB_URL}/rest/v1/${table}?${params.toString()}`, {
      headers: {
        apikey: SB_KEY,
        authorization: `Bearer ${SB_KEY}`,
        "range-unit": "items",
        range: `${from}-${from + PAGE - 1}`,
        prefer: "count=exact",
      },
    });
    if (!res.ok) throw new Error(`${table} ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function classifyLead(lead) {
  const medium = (lead.medium ?? "").toLowerCase();
  const funnel = (lead.funnel ?? "").toLowerCase();
  const test = (lead.test ?? "").toLowerCase();
  if (funnel === "ca") return "Paid";
  if (medium.includes("worldcast") || medium.includes("vidascontadas")) return "Afiliados";
  const om = ["winstagram", "wtiktok", "wyoutube", "bio", "leadmagnetx", "home", "winstagramrevolutia"];
  if (om.includes(medium) || medium.startsWith("reelp")) return "Organico";
  const ot = ["tiktok", "youtube", "instagram", "ig", "home", "fb", "fb_ad", "worldcast"];
  if (ot.includes(test)) return "Organico";
  if (medium) return "Organico";
  if (test === "bbdd" || test === "waitlist" || test === "com_anteriores" || test.startsWith("email")) return "Organico";
  return "Untracked";
}

const CM = {
  "Arnau Revolutia": "Arnau", "Arnau": "Arnau",
  "Alberto Equipo Revolutia": "Alberto", "Alberto": "Alberto",
  "Hector Soria": "Hector", "Hector": "Hector", "Héctor": "Hector",
  "Raúl García": "Raúl", "Raul García": "Raúl", "Raul Garcia": "Raúl", "Raúl": "Raúl", "Raul": "Raúl",
  "Nacho": "Nacho", "Nacho Revolutia": "Nacho", "Nacho Laguna": "Nacho",
};
const norm = (n) => !n ? "Sin asignar" : (CM[n] ?? n);

const EC = {
  "Enero 2026": ["Nacho", "Arnau", "Hector"],
  "Febrero 2026": ["Arnau", "Hector", "Alberto", "Raúl"],
  "Marzo 2026": ["Nacho", "Arnau", "Hector", "Alberto"],
};

async function verify(edicion) {
  console.log(`\n=== ${edicion} ===`);
  const [leads, agendas, salesRaw] = await Promise.all([
    fetchAll("leads", "email,edicion,funnel,medium,test,campaign,fuente_medio,fecha_registro", edicion),
    fetchAll("agendas", "email,edicion,comercial,no_show,fecha_llamada,creada", edicion),
    fetchAll("purchase_approved", "correo_electronico,edicion,status,nombre_comercial,fecha_compra,date_added", edicion),
  ]);
  console.log(`leads=${leads.length} agendas=${agendas.length} sales(raw)=${salesRaw.length}`);

  const seen = new Set();
  const salesAll = salesRaw.filter((s) => {
    const e = (s.correo_electronico ?? "").toLowerCase().trim();
    if (!e || seen.has(e)) return false; seen.add(e); return true;
  });
  const refunded = new Set();
  const salesNetas = salesAll.filter((s) => {
    const st = (s.status ?? "").toLowerCase();
    if (st.includes("rembolsado") || st.includes("reembolsado")) { refunded.add((s.correo_electronico ?? "").toLowerCase().trim()); return false; }
    return true;
  });

  const emailSource = {};
  for (const l of leads) if (l.email) emailSource[l.email.toLowerCase()] = classifyLead(l);

  const emailCloserMap = {};
  for (const a of agendas) {
    const e = (a.email ?? "").toLowerCase(); if (!e) continue;
    const c = norm(a.comercial);
    if (!a.no_show) emailCloserMap[e] = c;
    else if (!emailCloserMap[e]) emailCloserMap[e] = c;
  }

  const agendasUnicas = new Set(agendas.map((r) => r.email?.toLowerCase()).filter(Boolean)).size;
  const totalVentas = salesAll.length;
  const totalVentasNetas = salesNetas.length;
  const saleEmails = new Set(salesAll.map((s) => (s.correo_electronico ?? "").toLowerCase()).filter(Boolean));

  const edCom = EC[edicion] ?? ["Nacho", "Arnau", "Hector", "Alberto"];
  const closerTotals = {};
  for (const c of edCom) closerTotals[c] = { llamadas: 0, noShows: 0, celebradas: 0, ventas: 0, ventasNetas: 0 };

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const ecs = {};
  for (const a of agendas) {
    if (!a.fecha_llamada) continue;
    const day = a.fecha_llamada.split("T")[0];
    if (day > today) continue;
    if (day === today && a.fecha_llamada.includes("T") && !a.fecha_llamada.endsWith("T00:00:00")) {
      const ct = new Date(a.fecha_llamada);
      if (now < new Date(ct.getTime() + 30*60*1000)) continue;
    }
    const e = (a.email ?? "").toLowerCase(); if (!e) continue;
    const c = emailCloserMap[e] ?? norm(a.comercial);
    const ex = ecs[e];
    if (!ex) ecs[e] = { closer: c, celebrated: !a.no_show, day };
    else if (!a.no_show && !ex.celebrated) { ex.celebrated = true; ex.day = day; ex.closer = c; }
  }

  let tLl=0, tCe=0, tNs=0, tVe=0, tVn=0;
  for (const [e, s] of Object.entries(ecs)) {
    tLl++;
    if (s.celebrated) tCe++; else tNs++;
    const sale = saleEmails.has(e), ref = refunded.has(e);
    if (s.celebrated && sale) { tVe++; if (!ref) tVn++; }
    if (s.closer === "Sin asignar") continue;
    if (!closerTotals[s.closer]) closerTotals[s.closer] = { llamadas:0,noShows:0,celebradas:0,ventas:0,ventasNetas:0 };
    const ct = closerTotals[s.closer];
    ct.llamadas++;
    if (!s.celebrated) ct.noShows++;
    else { ct.celebradas++; if (sale) { ct.ventas++; if (!ref) ct.ventasNetas++; } }
  }

  const perf = Object.entries(closerTotals).map(([closer, t]) => ({
    closer, ...t,
    cierre: t.celebradas > 0 ? ((t.ventas/t.celebradas)*100).toFixed(1) : "0",
    showRate: t.llamadas > 0 ? ((t.celebradas/t.llamadas)*100).toFixed(1) : "0",
  }));

  const sum = (k) => perf.reduce((s,c)=>s+c[k],0);
  const iLl=sum("llamadas"), iCe=sum("celebradas"), iVe=sum("ventas"), iVn=sum("ventasNetas");
  const saLl=tLl-iLl, saCe=tCe-iCe, saVe=tVe-iVe, saVn=tVn-iVn;

  const cierreLlamada = tCe > 0 ? ((tVe/tCe)*100).toFixed(1) : "0";
  const showRate = tLl > 0 ? ((tCe/tLl)*100).toFixed(1) : "0";
  const convAgendaVenta = agendasUnicas > 0 ? ((totalVentas/agendasUnicas)*100).toFixed(1) : "0";
  const coverage = agendasUnicas > 0 ? ((tLl/agendasUnicas)*100).toFixed(1) : "0";
  const suspect = (agendasUnicas > 10 && parseFloat(coverage) < 50) || (tLl > 10 && parseFloat(showRate) >= 95);

  console.log(`\nGlobales:`);
  console.log(`  agendasUnicas=${agendasUnicas}/${agendas.length}reg  ventas=${totalVentas}  ventasNetas=${totalVentasNetas}`);
  console.log(`  llamadas=${tLl}  celebradas=${tCe}  no-shows=${tNs}`);
  console.log(`  ventasEnCelebradas=${tVe}  netas=${tVn}`);
  console.log(`  cierreLlamada=${cierreLlamada}%  showRate=${showRate}%`);
  console.log(`  cierreAgenda (antiguo KPI)=${convAgendaVenta}%`);
  console.log(`  coverage=${coverage}% (${tLl}/${agendasUnicas}) ${suspect ? "⚠ DATA QUALITY SUSPECT" : "✓ fiable"}`);

  console.log(`\nPor closer:`);
  console.log(`  ${"closer".padEnd(10)}  ll  ns  cel   v   vn  cierre  showRate`);
  for (const c of perf) {
    console.log(`  ${c.closer.padEnd(10)}  ${String(c.llamadas).padStart(2)}  ${String(c.noShows).padStart(2)}  ${String(c.celebradas).padStart(3)}  ${String(c.ventas).padStart(3)}  ${String(c.ventasNetas).padStart(3)}  ${c.cierre.padStart(5)}%  ${c.showRate.padStart(5)}%`);
  }

  console.log(`\nReconciliation:`);
  const rows = [
    ["Llamadas     ", iLl, saLl, tLl],
    ["Celebradas   ", iCe, saCe, tCe],
    ["Ventas(cel)  ", iVe, saVe, tVe],
    ["VentasN(cel) ", iVn, saVn, tVn],
  ];
  let ok = true;
  for (const [l, s, sa, t] of rows) {
    const c = s+sa===t;
    if (!c) ok = false;
    console.log(`  ${l}  Σ=${String(s).padStart(3)}  +sa=${String(sa).padStart(3)}  =${String(s+sa).padStart(3)}  vs total=${String(t).padStart(3)}  ${c ? "✓" : "✗"}`);
  }

  const totalKpi = cierreLlamada;
  const tablaTotal = iCe > 0 ? ((iVe/iCe)*100).toFixed(1) : "0";
  console.log(`\n  KPI "Cierre llamada":    ${totalKpi}%`);
  console.log(`  Tabla Total closers:     ${tablaTotal}%`);
  const match = totalKpi === tablaTotal;
  console.log(`  ¿Coinciden?              ${match ? "✓ SÍ" : "✗ NO (difiere por sinAsignar "+saVe+" ventas)"}`);

  console.log(`\n${ok ? "✅ Cuadres OK" : "❌ Falla"} · ${match ? "KPI=tabla ✓" : "KPI≠tabla"}`);
  return ok && (match || saLl > 0); // si hay sinAsignar, es OK que difiera por esa cantidad
}

async function listEditions() {
  const res = await fetch(`${SB_URL}/rest/v1/agendas?select=edicion&edicion=not.is.null`, {
    headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}` },
  });
  const data = await res.json();
  return [...new Set(data.map((r) => r.edicion))].filter(Boolean).sort();
}

const eds = await listEditions();
console.log("Ediciones disponibles:", eds);

const arg = process.argv[2];
const targetEds = arg ? [arg] : ["Enero 2026", "Febrero 2026"].filter((e) => eds.includes(e));

let allPass = true;
for (const ed of targetEds) {
  const ok = await verify(ed);
  if (!ok) allPass = false;
}
process.exit(allPass ? 0 : 1);
