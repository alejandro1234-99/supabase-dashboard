import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(buildQuery: () => any): Promise<any[]> {
  const PAGE = 50000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await buildQuery().range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

type Source = "Paid" | "Organico" | "Afiliados" | "Untracked";

function classifyLead(lead: { funnel: string | null; medium: string | null; test: string | null }): Source {
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

const EDICIONES = ["Noviembre 2025", "Enero 2026", "Febrero 2026", "Marzo 2026", "Abril 2026"];

// Ediciones con datos resumidos (sin detalle por filas en Supabase)
// Se inyectan directamente cuando no hay datos suficientes en las tablas
const HISTORICAL_OVERRIDES: Record<string, {
  leads: number; agendas: number; agendasUnicas: number; ventas: number; cash: number;
  convLeadAgenda: string; convAgendaVenta: string; convLeadVenta: string;
  leadsBySource: Record<Source, number>;
  agendasBySource: Record<Source, number>;
  ventasBySource: Record<Source, number>;
}> = {
  "Noviembre 2025": {
    leads: 6853, agendas: 180, agendasUnicas: 180, ventas: 60, cash: 0,
    convLeadAgenda: "2.6", convAgendaVenta: "33.3", convLeadVenta: "0.9",
    leadsBySource: { Paid: 5628, Organico: 467, Afiliados: 732, Untracked: 26 },
    agendasBySource: { Paid: 98, Organico: 11, Afiliados: 23, Untracked: 48 },
    ventasBySource: { Paid: 29, Organico: 2, Afiliados: 10, Untracked: 19 },
  },
};

export async function GET() {
  const supabase = createAdminClient();

  // Fetch ALL data in PARALLEL
  const [leads, agendas, sales] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchAll(() => (supabase.from("leads" as any) as any).select("email, edicion, funnel, medium, test")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchAll(() => (supabase.from("agendas" as any) as any).select("email, edicion, situacion_actual, objetivo, inversion")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchAll(() => (supabase.from("purchase_approved" as any) as any).select("correo_electronico, edicion, cash_collected, status")),
  ]);

  // Build email→source per edition
  const emailSourceByEd: Record<string, Record<string, Source>> = {};
  for (const l of leads) {
    const ed = l.edicion;
    if (!ed || !l.email) continue;
    if (!emailSourceByEd[ed]) emailSourceByEd[ed] = {};
    emailSourceByEd[ed][l.email.toLowerCase()] = classifyLead(l);
  }

  const ediciones = EDICIONES.map((ed) => {
    // Use historical override if available and no real data
    const override = HISTORICAL_OVERRIDES[ed];
    const edLeads = leads.filter((r: { edicion: string }) => r.edicion === ed);
    if (override && edLeads.length === 0) {
      return { edicion: ed, ...override };
    }

    const edAgendas = agendas.filter((r: { edicion: string }) => r.edicion === ed);
    const edSales = sales.filter((r: { edicion: string }) => r.edicion === ed);
    const edAgendasUnicas = new Set(edAgendas.map((r: { email: string }) => r.email?.toLowerCase()).filter(Boolean)).size;

    const leadsBySource: Record<Source, number> = { Paid: 0, Organico: 0, Afiliados: 0, Untracked: 0 };
    for (const l of edLeads) leadsBySource[classifyLead(l)]++;

    const emailSrc = emailSourceByEd[ed] ?? {};
    const agendasBySource: Record<Source, number> = { Paid: 0, Organico: 0, Afiliados: 0, Untracked: 0 };
    for (const a of edAgendas) agendasBySource[emailSrc[(a.email ?? "").toLowerCase()] ?? "Untracked"]++;

    const ventasBySource: Record<Source, number> = { Paid: 0, Organico: 0, Afiliados: 0, Untracked: 0 };
    for (const s of edSales) ventasBySource[emailSrc[(s.correo_electronico ?? "").toLowerCase()] ?? "Untracked"]++;

    const totalCash = edSales.reduce((s: number, r: { cash_collected: number | null }) => s + (r.cash_collected ?? 0), 0);

    return {
      edicion: ed,
      leads: edLeads.length,
      agendas: edAgendas.length,
      agendasUnicas: edAgendasUnicas,
      ventas: edSales.length,
      cash: totalCash,
      convLeadAgenda: edLeads.length > 0 ? ((edAgendasUnicas / edLeads.length) * 100).toFixed(1) : "0",
      convAgendaVenta: edAgendasUnicas > 0 ? ((edSales.length / edAgendasUnicas) * 100).toFixed(1) : "0",
      convLeadVenta: edLeads.length > 0 ? ((edSales.length / edLeads.length) * 100).toFixed(1) : "0",
      leadsBySource,
      agendasBySource,
      ventasBySource,
    };
  });

  // Qualification breakdown per edition (except Noviembre which has no data)
  const qualFields = ["situacion_actual", "objetivo", "inversion"] as const;
  const qualLabels: Record<string, string> = {
    situacion_actual: "Situación actual",
    objetivo: "Objetivo",
    inversion: "Inversión",
  };
  const cualificacionPorEdicion: Record<string, Record<string, { label: string; data: { name: string; value: number }[] }>> = {};
  for (const ed of EDICIONES) {
    if (ed === "Noviembre 2025") continue;
    const edAgendas = agendas.filter((r: { edicion: string }) => r.edicion === ed);
    if (edAgendas.length === 0) continue;
    const qual: Record<string, { label: string; data: { name: string; value: number }[] }> = {};
    for (const field of qualFields) {
      const counts: Record<string, number> = {};
      for (const a of edAgendas) {
        const val = (a as Record<string, string | null>)[field] || "(vacío)";
        counts[val] = (counts[val] || 0) + 1;
      }
      qual[field] = {
        label: qualLabels[field],
        data: Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      };
    }
    cualificacionPorEdicion[ed] = qual;
  }

  return NextResponse.json({ ediciones, cualificacionPorEdicion });
}
