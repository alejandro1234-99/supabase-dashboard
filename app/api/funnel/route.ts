import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

/**
 * Fetch all rows from a table, paginating in chunks of 1000 to bypass Supabase default limit.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(query: any): Promise<any[]> {
  const PAGE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await query.range(from, from + PAGE - 1);
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

  // Paid = funnel CA
  if (funnel === "ca") return "Paid";

  // Afiliados = medium contains worldcast or vidascontadas
  if (medium.includes("worldcast") || medium.includes("vidascontadas")) return "Afiliados";

  // Organico: known organic mediums
  const organicMediums = ["winstagram", "wtiktok", "wyoutube", "bio", "leadmagnetx", "home", "winstagramrevolutia"];
  if (organicMediums.includes(medium) || medium.startsWith("reelp")) return "Organico";

  // Organico: known organic test values
  const organicTests = ["tiktok", "youtube", "instagram", "ig", "home", "fb", "fb_ad", "worldcast"];
  if (organicTests.includes(test)) return "Organico";

  // Organico: any other non-empty medium
  if (medium) return "Organico";

  // Organico: other known test values (bbdd, waitlist, com_anteriores, email*)
  if (test === "bbdd" || test === "waitlist" || test === "com_anteriores" || test.startsWith("email")) return "Organico";

  return "Untracked";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const edicion = searchParams.get("edicion");

  const supabase = createAdminClient();

  // Fetch leads (include medium and test for classification)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let leadsQuery = (supabase.from("leads" as any) as any)
    .select("email, edicion, funnel, medium, test, campaign, fuente_medio, fecha_registro");
  if (edicion) leadsQuery = leadsQuery.eq("edicion", edicion);
  const leadsData = await fetchAll(leadsQuery);
  const leads = leadsData as {
    email: string | null;
    edicion: string | null;
    funnel: string | null;
    medium: string | null;
    test: string | null;
    campaign: string | null;
    fuente_medio: string | null;
    fecha_registro: string | null;
  }[];

  // Fetch agendas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let agendasQuery = (supabase.from("agendas" as any) as any)
    .select("email, edicion, comercial, no_show, fecha_llamada");
  if (edicion) agendasQuery = agendasQuery.eq("edicion", edicion);
  const agendasData = await fetchAll(agendasQuery);
  const agendas = agendasData as {
    email: string | null;
    edicion: string | null;
    comercial: string | null;
    no_show: boolean;
    fecha_llamada: string | null;
  }[];

  // Fetch sales
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let salesQuery = (supabase.from("purchase_approved" as any) as any)
    .select("correo_electronico, edicion, status, cash_collected, nombre_comercial");
  if (edicion) salesQuery = salesQuery.eq("edicion", edicion);
  const salesData = await fetchAll(salesQuery);
  const sales = salesData as {
    correo_electronico: string | null;
    edicion: string | null;
    status: string | null;
    cash_collected: number | null;
    nombre_comercial: string | null;
  }[];

  // Build email → source map from leads
  type PaidCampaign = "AV0" | "AV1" | "AV2" | "untracked";
  function classifyPaidCampaign(lead: { campaign: string | null }): PaidCampaign {
    const campaign = (lead.campaign ?? "").toUpperCase();
    if (campaign.includes("AV2")) return "AV2";
    if (campaign.includes("AV1")) return "AV1";
    if (campaign.includes("AV0") || campaign.includes("AVO")) return "AV0";
    return "untracked";
  }

  type AffiliateType = "Worldcast" | "vidascontadas" | "No Limits" | "untracked";
  function classifyAffiliate(lead: { medium: string | null }): AffiliateType {
    const medium = (lead.medium ?? "").toLowerCase();
    if (medium.includes("worldcast")) return "Worldcast";
    if (medium.includes("vidascontadas")) return "vidascontadas";
    if (medium.includes("nolimits") || medium.includes("no limits") || medium.includes("no_limits")) return "No Limits";
    return "untracked";
  }

  const emailSource: Record<string, Source> = {};
  const emailPaidCampaign: Record<string, PaidCampaign> = {};
  const emailAffiliateType: Record<string, AffiliateType> = {};
  const leadsBySource: Record<Source, number> = { Paid: 0, Organico: 0, Afiliados: 0, Untracked: 0 };
  const paidLeadsByCampaign: Record<PaidCampaign, number> = { AV0: 0, AV1: 0, AV2: 0, untracked: 0 };
  const affiliateLeadsByType: Record<AffiliateType, number> = { Worldcast: 0, vidascontadas: 0, "No Limits": 0, untracked: 0 };
  for (const l of leads) {
    const src = classifyLead(l);
    leadsBySource[src]++;
    if (l.email) {
      emailSource[l.email.toLowerCase()] = src;
      if (src === "Paid") {
        const camp = classifyPaidCampaign(l);
        paidLeadsByCampaign[camp]++;
        emailPaidCampaign[l.email.toLowerCase()] = camp;
      }
      if (src === "Afiliados") {
        const aff = classifyAffiliate(l);
        affiliateLeadsByType[aff]++;
        emailAffiliateType[l.email.toLowerCase()] = aff;
      }
    }
  }

  // Classify agendas and sales via email lookup
  const agendasBySource: Record<Source, number> = { Paid: 0, Organico: 0, Afiliados: 0, Untracked: 0 };
  const agendasUnicasBySource: Record<Source, Set<string>> = {
    Paid: new Set(), Organico: new Set(), Afiliados: new Set(), Untracked: new Set(),
  };
  const paidAgendasByCampaign: Record<PaidCampaign, number> = { AV0: 0, AV2: 0, AV1: 0, untracked: 0 };
  const paidAgendasUnicasByCampaign: Record<PaidCampaign, Set<string>> = {
    AV0: new Set(), AV2: new Set(), AV1: new Set(), untracked: new Set(),
  };
  const affiliateAgendasByType: Record<AffiliateType, number> = { Worldcast: 0, vidascontadas: 0, "No Limits": 0, untracked: 0 };
  const affiliateAgendasUnicasByType: Record<AffiliateType, Set<string>> = {
    Worldcast: new Set(), vidascontadas: new Set(), "No Limits": new Set(), untracked: new Set(),
  };
  for (const a of agendas) {
    const email = (a.email ?? "").toLowerCase();
    const src = emailSource[email] ?? "Untracked";
    agendasBySource[src]++;
    if (a.email) agendasUnicasBySource[src].add(email);
    if (src === "Paid") {
      const camp = emailPaidCampaign[email] ?? "untracked";
      paidAgendasByCampaign[camp]++;
      paidAgendasUnicasByCampaign[camp].add(email);
    }
    if (src === "Afiliados") {
      const aff = emailAffiliateType[email] ?? "untracked";
      affiliateAgendasByType[aff]++;
      affiliateAgendasUnicasByType[aff].add(email);
    }
  }

  const ventasBySource: Record<Source, number> = { Paid: 0, Organico: 0, Afiliados: 0, Untracked: 0 };
  const paidVentasByCampaign: Record<PaidCampaign, number> = { AV0: 0, AV2: 0, AV1: 0, untracked: 0 };
  const affiliateVentasByType: Record<AffiliateType, number> = { Worldcast: 0, vidascontadas: 0, "No Limits": 0, untracked: 0 };
  for (const s of sales) {
    const email = (s.correo_electronico ?? "").toLowerCase();
    const src = emailSource[email] ?? "Untracked";
    ventasBySource[src]++;
    if (src === "Paid") {
      paidVentasByCampaign[emailPaidCampaign[email] ?? "untracked"]++;
    }
    if (src === "Afiliados") {
      affiliateVentasByType[emailAffiliateType[email] ?? "untracked"]++;
    }
  }

  // Global stats
  const totalLeads = leads.length;
  const totalAgendas = agendas.length;
  const agendasUnicas = new Set(agendas.map((r) => r.email?.toLowerCase()).filter(Boolean)).size;
  const totalVentas = sales.length;

  const convLeadAgenda = totalLeads > 0 ? ((agendasUnicas / totalLeads) * 100).toFixed(1) : "0";
  const convAgendaVenta = agendasUnicas > 0 ? ((totalVentas / agendasUnicas) * 100).toFixed(1) : "0";
  const convLeadVenta = totalLeads > 0 ? ((totalVentas / totalLeads) * 100).toFixed(1) : "0";

  // Source breakdown
  const sources = (["Paid", "Organico", "Afiliados", "Untracked"] as Source[]).map((src) => ({
    source: src,
    leads: leadsBySource[src],
    leadsPct: totalLeads > 0 ? ((leadsBySource[src] / totalLeads) * 100).toFixed(1) : "0",
    agendas: agendasBySource[src],
    agendasUnicas: agendasUnicasBySource[src].size,
    agendasPct: totalAgendas > 0 ? ((agendasBySource[src] / totalAgendas) * 100).toFixed(1) : "0",
    ventas: ventasBySource[src],
    ventasPct: totalVentas > 0 ? ((ventasBySource[src] / totalVentas) * 100).toFixed(1) : "0",
  }));

  // Paid media breakdown
  const totalPaidLeads = leadsBySource.Paid;
  const totalPaidAgendas = paidAgendasByCampaign.AV0 + paidAgendasByCampaign.AV1 + paidAgendasByCampaign.AV2 + paidAgendasByCampaign.untracked;
  const totalPaidVentas = paidVentasByCampaign.AV0 + paidVentasByCampaign.AV1 + paidVentasByCampaign.AV2 + paidVentasByCampaign.untracked;
  const paidCampaigns = (["AV0", "AV1", "AV2", "untracked"] as PaidCampaign[]).map((camp) => {
    const campLeads = paidLeadsByCampaign[camp];
    const campAgendas = paidAgendasByCampaign[camp];
    const campAgendasUnicas = paidAgendasUnicasByCampaign[camp].size;
    const campVentas = paidVentasByCampaign[camp];
    return {
      campaign: camp,
      leads: campLeads,
      leadsPct: totalPaidLeads > 0 ? ((campLeads / totalPaidLeads) * 100).toFixed(1) : "0",
      agendas: campAgendas,
      agendasUnicas: campAgendasUnicas,
      agendasPct: totalPaidAgendas > 0 ? ((campAgendas / totalPaidAgendas) * 100).toFixed(1) : "0",
      ventas: campVentas,
      ventasPct: totalPaidVentas > 0 ? ((campVentas / totalPaidVentas) * 100).toFixed(1) : "0",
      ratioAgenda: campLeads > 0 ? ((campAgendasUnicas / campLeads) * 100).toFixed(2) : "0",
      ratioVenta: campLeads > 0 ? ((campVentas / campLeads) * 100).toFixed(2) : "0",
      cierreAgenda: campAgendasUnicas > 0 ? ((campVentas / campAgendasUnicas) * 100).toFixed(2) : "0",
    };
  });

  // Affiliate breakdown
  const totalAffLeads = leadsBySource.Afiliados;
  const totalAffAgendas = Object.values(affiliateAgendasByType).reduce((s, n) => s + n, 0);
  const totalAffVentas = Object.values(affiliateVentasByType).reduce((s, n) => s + n, 0);
  const affiliateTypes = (["Worldcast", "vidascontadas", "No Limits", "untracked"] as AffiliateType[]).map((aff) => {
    const affLeads = affiliateLeadsByType[aff];
    const affAgendas = affiliateAgendasByType[aff];
    const affAgendasUnicas = affiliateAgendasUnicasByType[aff].size;
    const affVentas = affiliateVentasByType[aff];
    return {
      affiliate: aff,
      leads: affLeads,
      leadsPct: totalAffLeads > 0 ? ((affLeads / totalAffLeads) * 100).toFixed(1) : "0",
      agendas: affAgendas,
      agendasUnicas: affAgendasUnicas,
      agendasPct: totalAffAgendas > 0 ? ((affAgendas / totalAffAgendas) * 100).toFixed(1) : "0",
      ventas: affVentas,
      ventasPct: totalAffVentas > 0 ? ((affVentas / totalAffVentas) * 100).toFixed(1) : "0",
    };
  });

  // Commercial name normalization
  const COMERCIAL_MAP: Record<string, string> = {
    "Arnau Revolutia": "Arnau",
    "Arnau": "Arnau",
    "Alberto Equipo Revolutia": "Alberto",
    "Alberto": "Alberto",
    "Hector Soria": "Hector",
    "Hector": "Hector",
    "Héctor": "Hector",
    "Raúl García": "Raúl",
    "Raul García": "Raúl",
    "Raul Garcia": "Raúl",
    "Raúl": "Raúl",
    "Raul": "Raúl",
  };
  function normComercial(name: string | null): string {
    if (!name) return "Sin asignar";
    return COMERCIAL_MAP[name] ?? name;
  }

  // Commercial breakdown
  type ComercialStats = {
    agendas: number;
    agendasUnicas: Set<string>;
    ventas: number;
    paidAV0Agendas: number; paidAV2Agendas: number;
    paidAV0Ventas: number; paidAV2Ventas: number;
    orgAgendas: number; orgVentas: number;
  };
  const comercialMap: Record<string, ComercialStats> = {};
  function getComercial(name: string): ComercialStats {
    if (!comercialMap[name]) comercialMap[name] = {
      agendas: 0, agendasUnicas: new Set(), ventas: 0,
      paidAV0Agendas: 0, paidAV2Agendas: 0,
      paidAV0Ventas: 0, paidAV2Ventas: 0,
      orgAgendas: 0, orgVentas: 0,
    };
    return comercialMap[name];
  }

  for (const a of agendas) {
    const c = normComercial(a.comercial);
    const cm = getComercial(c);
    cm.agendas++;
    const email = (a.email ?? "").toLowerCase();
    if (email) {
      cm.agendasUnicas.add(email);
      const src = emailSource[email];
      if (src === "Paid") {
        const camp = emailPaidCampaign[email] ?? "untracked";
        if (camp === "AV0") cm.paidAV0Agendas++;
        if (camp === "AV2") cm.paidAV2Agendas++;
      }
      if (src === "Organico") cm.orgAgendas++;
    }
  }

  for (const s of sales) {
    const c = normComercial(s.nombre_comercial);
    const cm = getComercial(c);
    cm.ventas++;
    const email = (s.correo_electronico ?? "").toLowerCase();
    if (email) {
      const src = emailSource[email];
      if (src === "Paid") {
        const camp = emailPaidCampaign[email] ?? "untracked";
        if (camp === "AV0") cm.paidAV0Ventas++;
        if (camp === "AV2") cm.paidAV2Ventas++;
      }
      if (src === "Organico") cm.orgVentas++;
    }
  }

  const comerciales = Object.entries(comercialMap)
    .filter(([name]) => name !== "Sin asignar")
    .map(([name, d]) => ({
      comercial: name,
      agendas: d.agendas,
      agendasUnicas: d.agendasUnicas.size,
      ventas: d.ventas,
      cierre: d.agendasUnicas.size > 0 ? ((d.ventas / d.agendasUnicas.size) * 100).toFixed(1) : "0",
      paidAV0Agendas: d.paidAV0Agendas,
      paidAV2Agendas: d.paidAV2Agendas,
      paidAV0Ventas: d.paidAV0Ventas,
      paidAV2Ventas: d.paidAV2Ventas,
      cierreAV0: d.paidAV0Agendas > 0 ? ((d.paidAV0Ventas / d.paidAV0Agendas) * 100).toFixed(1) : "0",
      cierreAV2: d.paidAV2Agendas > 0 ? ((d.paidAV2Ventas / d.paidAV2Agendas) * 100).toFixed(1) : "0",
      orgAgendas: d.orgAgendas,
      orgVentas: d.orgVentas,
      cierreOrg: d.orgAgendas > 0 ? ((d.orgVentas / d.orgAgendas) * 100).toFixed(1) : "0",
    }))
    .sort((a, b) => b.ventas - a.ventas);

  return NextResponse.json({
    stats: {
      totalLeads,
      totalAgendas,
      agendasUnicas,
      totalVentas,
      convLeadAgenda,
      convAgendaVenta,
      convLeadVenta,
    },
    sources,
    paidMedia: {
      totalLeads: totalPaidLeads,
      totalAgendas: totalPaidAgendas,
      totalVentas: totalPaidVentas,
      campaigns: paidCampaigns,
    },
    affiliateMedia: {
      totalLeads: totalAffLeads,
      totalAgendas: totalAffAgendas,
      totalVentas: totalAffVentas,
      types: affiliateTypes,
    },
    comerciales,
  });
}
