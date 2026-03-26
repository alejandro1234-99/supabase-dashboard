import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

/**
 * Fetch all rows using a query builder function.
 * Creates a fresh query per page to avoid Supabase's .range() reuse issues.
 */
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

// --- Economic data (manual, from Meta Ads / Sheets reports) ---
// Each row mirrors the Excel structure: SIN RTG (inv, fac, roas) + CON RTG (inv, fac, cpa, roas)
type EcoRow = {
  sinRTG: { inversion: number; facturacion: number; roas: string };
  conRTG: { inversion: number; facturacion: number; cpa: number | null; roas: string };
  tiempoMedio?: string;
};

type EditionEconomics = {
  rtgCost?: number;
  general: {
    total: EcoRow;
    raw: Record<string, Partial<EcoRow>>;
    adjusted: Record<string, EcoRow>;
  };
  paid: {
    total: EcoRow;
    raw: Record<string, Partial<EcoRow>>;
    adjusted: Record<string, EcoRow>;
  };
  affiliates: {
    total: EcoRow;
    raw: Record<string, Partial<EcoRow>>;
    adjusted: Record<string, Partial<EcoRow>>;
  };
};

const ECONOMIC_DATA: Record<string, EditionEconomics> = {
  "Febrero 2026": {
    rtgCost: 1531.92,
    general: {
      total: {
        sinRTG: { inversion: 42320, facturacion: 165751, roas: "3.92" },
        conRTG: { inversion: 43852, facturacion: 165751, cpa: 528.34, roas: "3.78" },
      },
      raw: {
        Paid:      { sinRTG: { inversion: 42320, facturacion: 0, roas: "" }, conRTG: { inversion: 43285.74, facturacion: 0, cpa: null, roas: "" } },
        Organico:  { conRTG: { inversion: 530.95, facturacion: 0, cpa: null, roas: "" } },
        Afiliados: { conRTG: { inversion: 20.13, facturacion: 0, cpa: null, roas: "" } },
        Untracked: { conRTG: { inversion: 15.10, facturacion: 0, cpa: null, roas: "" } },
      },
      adjusted: {
        Paid: {
          sinRTG: { inversion: 42320, facturacion: 121645, roas: "2.87" },
          conRTG: { inversion: 43295, facturacion: 121645, cpa: 710.77, roas: "2.81" },
        },
        Organico: {
          sinRTG: { inversion: 0, facturacion: 43736, roas: "" },
          conRTG: { inversion: 536, facturacion: 43736, cpa: 24.49, roas: "81.56" },
        },
        Afiliados: {
          sinRTG: { inversion: 0, facturacion: 371, roas: "" },
          conRTG: { inversion: 20, facturacion: 371, cpa: 109, roas: "18.25" },
        },
      },
    },
    paid: {
      total: {
        sinRTG: { inversion: 42320, facturacion: 121645, roas: "2.87" },
        conRTG: { inversion: 43295, facturacion: 103844, cpa: 710.77, roas: "2.40" },
      },
      raw: {
        AV0: {
          sinRTG: { inversion: 23019, facturacion: 47928, roas: "2.08" },
          conRTG: { inversion: 23542, facturacion: 47928, cpa: 980.91, roas: "2.04" },
        },
        AVV: {
          sinRTG: { inversion: 0, facturacion: 0, roas: "" },
          conRTG: { inversion: 0, facturacion: 0, cpa: null, roas: "" },
        },
        AV2: {
          sinRTG: { inversion: 19301, facturacion: 55916, roas: "2.90" },
          conRTG: { inversion: 19726, facturacion: 55916, cpa: 704.52, roas: "2.83" },
        },
        untracked: { conRTG: { inversion: 27, facturacion: 0, cpa: null, roas: "" } },
      },
      adjusted: {
        AV0: {
          sinRTG: { inversion: 23019, facturacion: 56144, roas: "2.44" },
          conRTG: { inversion: 23557, facturacion: 56144, cpa: 837.90, roas: "2.38" },
          tiempoMedio: "7.20",
        },
        AVV: {
          sinRTG: { inversion: 0, facturacion: 0, roas: "" },
          conRTG: { inversion: 0, facturacion: 0, cpa: null, roas: "" },
        },
        AV2: {
          sinRTG: { inversion: 19301, facturacion: 65501, roas: "3.39" },
          conRTG: { inversion: 19739, facturacion: 65501, cpa: 601.79, roas: "3.32" },
          tiempoMedio: "6.96",
        },
      },
    },
    affiliates: {
      total: {
        sinRTG: { inversion: 5500, facturacion: 0, roas: "0.00" },
        conRTG: { inversion: 8196, facturacion: 0, cpa: null, roas: "0.00" },
      },
      raw: {
        Worldcast:     { sinRTG: { inversion: 0, facturacion: 0, roas: "" }, conRTG: { inversion: 2097, facturacion: 0, cpa: null, roas: "" } },
        vidascontadas: { sinRTG: { inversion: 4500, facturacion: 0, roas: "0.00" }, conRTG: { inversion: 5099, facturacion: 0, cpa: null, roas: "0.00" } },
        "No Limits":   { sinRTG: { inversion: 1000, facturacion: 0, roas: "0.00" }, conRTG: { inversion: 1000, facturacion: 0, cpa: null, roas: "0.00" } },
        untracked:     { conRTG: { inversion: 146, facturacion: 0, cpa: null, roas: "" } },
      },
      adjusted: {
        Worldcast:     { conRTG: { inversion: 282, facturacion: 0, cpa: null, roas: "" } },
        vidascontadas: { conRTG: { inversion: 58, facturacion: 0, cpa: null, roas: "" } },
        "No Limits":   { conRTG: { inversion: 2, facturacion: 0, cpa: null, roas: "" } },
      },
    },
  },
  "Enero 2026": {
    general: {
      total: {
        sinRTG: { inversion: 51424, facturacion: 217673, roas: "4.23" },
        conRTG: { inversion: 53751, facturacion: 217673, cpa: 493.13, roas: "4.05" },
      },
      raw: {
        Paid:      { sinRTG: { inversion: 0, facturacion: 0, roas: "" }, conRTG: { inversion: 0, facturacion: 0, cpa: null, roas: "" } },
        Organico:  {},
        Afiliados: {},
        Untracked: {},
      },
      adjusted: {
        Paid: {
          sinRTG: { inversion: 36924, facturacion: 149733, roas: "4.06" },
          conRTG: { inversion: 38548, facturacion: 149733, cpa: 514.12, roas: "3.88" },
        },
        Organico: {
          sinRTG: { inversion: 0, facturacion: 18790, roas: "" },
          conRTG: { inversion: 476, facturacion: 18790, cpa: 50.59, roas: "39.48" },
        },
        Afiliados: {
          sinRTG: { inversion: 14500, facturacion: 49150, roas: "3.39" },
          conRTG: { inversion: 17196, facturacion: 49150, cpa: 699, roas: "2.86" },
        },
      },
    },
    paid: {
      total: {
        sinRTG: { inversion: 36924, facturacion: 149775, roas: "4.06" },
        conRTG: { inversion: 38548, facturacion: 149775, cpa: 514.12, roas: "3.89" },
      },
      raw: {
        AV0: {
          sinRTG: { inversion: 30771, facturacion: 119820, roas: "3.89" },
          conRTG: { inversion: 32127, facturacion: 119820, cpa: 535.45, roas: "3.73" },
        },
        AVV: {
          sinRTG: { inversion: 2163, facturacion: 11982, roas: "5.54" },
          conRTG: { inversion: 2285, facturacion: 11982, cpa: 380.83, roas: "5.24" },
        },
        AV2: {
          sinRTG: { inversion: 3990, facturacion: 17973, roas: "4.50" },
          conRTG: { inversion: 4136, facturacion: 17973, cpa: 459.56, roas: "4.35" },
        },
        untracked: { conRTG: { inversion: 146, facturacion: 0, cpa: null, roas: "" } },
      },
      adjusted: {
        AV0: {
          sinRTG: { inversion: 30771, facturacion: 119787, roas: "3.89" },
          conRTG: { inversion: 32127, facturacion: 119787, cpa: 535.60, roas: "3.73" },
          tiempoMedio: "6.95",
        },
        AVV: {
          sinRTG: { inversion: 2163, facturacion: 11979, roas: "5.54" },
          conRTG: { inversion: 2285, facturacion: 11979, cpa: 380.93, roas: "5.24" },
          tiempoMedio: "5.43",
        },
        AV2: {
          sinRTG: { inversion: 3990, facturacion: 17968, roas: "4.50" },
          conRTG: { inversion: 4136, facturacion: 17968, cpa: 459.73, roas: "4.34" },
          tiempoMedio: "8.35",
        },
      },
    },
    affiliates: {
      total: {
        sinRTG: { inversion: 14500, facturacion: 49925, roas: "3.44" },
        conRTG: { inversion: 17196, facturacion: 49925, cpa: 687.84, roas: "2.90" },
      },
      raw: {
        Worldcast:        { sinRTG: { inversion: 9000, facturacion: 29955, roas: "3.33" }, conRTG: { inversion: 11223, facturacion: 29955, cpa: 748.22, roas: "2.67" } },
        "Vidas Contadas":  { sinRTG: { inversion: 4500, facturacion: 17973, roas: "3.99" }, conRTG: { inversion: 4957, facturacion: 17973, cpa: 550.79, roas: "3.63" } },
        "No Limits":       { sinRTG: { inversion: 1000, facturacion: 1997, roas: "2.00" }, conRTG: { inversion: 1016, facturacion: 1997, cpa: 1015.61, roas: "1.97" } },
        untracked:         { conRTG: { inversion: 146, facturacion: 0, cpa: null, roas: "" } },
      },
      adjusted: {
        Worldcast:        { sinRTG: { inversion: 10200, facturacion: 33949, roas: "3.33" }, conRTG: { inversion: 10505, facturacion: 33949, cpa: 617.96, roas: "3.23" } },
        "Vidas Contadas":  { sinRTG: { inversion: 4500, facturacion: 13979, roas: "3.11" }, conRTG: { inversion: 4563, facturacion: 13979, cpa: 651.83, roas: "3.06" } },
        "No Limits":       { sinRTG: { inversion: 1000, facturacion: 1997, roas: "2.00" }, conRTG: { inversion: 1002, facturacion: 1997, cpa: 1002.14, roas: "1.99" } },
      },
    },
  },
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const edicion = searchParams.get("edicion");

  const supabase = createAdminClient();

  // Fetch leads, agendas, sales IN PARALLEL
  const buildLeads = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from("leads" as any) as any)
      .select("email, edicion, funnel, medium, test, campaign, fuente_medio, fecha_registro");
    if (edicion) q = q.eq("edicion", edicion);
    return q;
  };
  const buildAgendas = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from("agendas" as any) as any)
      .select("email, edicion, comercial, no_show, fecha_llamada, creada, situacion_actual, objetivo, inversion");
    if (edicion) q = q.eq("edicion", edicion);
    return q;
  };
  const buildSales = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from("purchase_approved" as any) as any)
      .select("correo_electronico, edicion, status, cash_collected, nombre_comercial, fecha_compra, date_added");
    if (edicion) q = q.eq("edicion", edicion);
    return q;
  };

  const [leadsData, agendasData, salesData] = await Promise.all([
    fetchAll(buildLeads),
    fetchAll(buildAgendas),
    fetchAll(buildSales),
  ]);

  const leads = leadsData as {
    email: string | null; edicion: string | null; funnel: string | null;
    medium: string | null; test: string | null; campaign: string | null;
    fuente_medio: string | null; fecha_registro: string | null;
  }[];
  const agendas = agendasData as {
    email: string | null; edicion: string | null; comercial: string | null;
    no_show: boolean; fecha_llamada: string | null; creada: string | null;
    situacion_actual: string | null; objetivo: string | null; inversion: string | null;
  }[];
  const sales = salesData as {
    correo_electronico: string | null;
    edicion: string | null;
    status: string | null;
    cash_collected: number | null;
    nombre_comercial: string | null;
    fecha_compra: string | null;
    date_added: string | null;
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
    agendasPct: agendasUnicas > 0 ? ((agendasUnicasBySource[src].size / agendasUnicas) * 100).toFixed(1) : "0",
    ventas: ventasBySource[src],
    ventasPct: totalVentas > 0 ? ((ventasBySource[src] / totalVentas) * 100).toFixed(1) : "0",
  }));

  // Paid media breakdown
  const totalPaidLeads = leadsBySource.Paid;
  const totalPaidAgendas = paidAgendasUnicasByCampaign.AV0.size + paidAgendasUnicasByCampaign.AV1.size + paidAgendasUnicasByCampaign.AV2.size + paidAgendasUnicasByCampaign.untracked.size;
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
      agendasPct: totalPaidAgendas > 0 ? ((campAgendasUnicas / totalPaidAgendas) * 100).toFixed(1) : "0",
      ventas: campVentas,
      ventasPct: totalPaidVentas > 0 ? ((campVentas / totalPaidVentas) * 100).toFixed(1) : "0",
      ratioAgenda: campLeads > 0 ? ((campAgendasUnicas / campLeads) * 100).toFixed(2) : "0",
      ratioVenta: campLeads > 0 ? ((campVentas / campLeads) * 100).toFixed(2) : "0",
      cierreAgenda: campAgendasUnicas > 0 ? ((campVentas / campAgendasUnicas) * 100).toFixed(2) : "0",
    };
  });

  // Affiliate breakdown
  const totalAffLeads = leadsBySource.Afiliados;
  const totalAffAgendas = Object.values(affiliateAgendasUnicasByType).reduce((s, set) => s + set.size, 0);
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
      agendasPct: totalAffAgendas > 0 ? ((affAgendasUnicas / totalAffAgendas) * 100).toFixed(1) : "0",
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
    "Nacho": "Nacho",
    "Nacho Revolutia": "Nacho",
    "Nacho Laguna": "Nacho",
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
    paidAV0Agendas: Set<string>; paidAV2Agendas: Set<string>;
    paidAV0Ventas: number; paidAV2Ventas: number;
    orgAgendas: Set<string>; orgVentas: number;
    untrackedAgendas: Set<string>; untrackedVentas: number;
  };
  const COMERCIALES_FIJOS = ["Nacho", "Arnau", "Hector", "Alberto"];
  const EDITION_COMERCIALES: Record<string, string[]> = {
    "Enero 2026": ["Nacho", "Arnau", "Hector"],
    "Febrero 2026": ["Arnau", "Hector", "Alberto", "Raúl"],
    "Marzo 2026": ["Nacho", "Arnau", "Hector", "Alberto"],
  };
  const edicionComerciales = edicion ? (EDITION_COMERCIALES[edicion] ?? COMERCIALES_FIJOS) : COMERCIALES_FIJOS;
  const comercialMap: Record<string, ComercialStats> = {};
  function getComercial(name: string): ComercialStats {
    if (!comercialMap[name]) comercialMap[name] = {
      agendas: 0, agendasUnicas: new Set(), ventas: 0,
      paidAV0Agendas: new Set(), paidAV2Agendas: new Set(),
      paidAV0Ventas: 0, paidAV2Ventas: 0,
      orgAgendas: new Set(), orgVentas: 0,
      untrackedAgendas: new Set(), untrackedVentas: 0,
    };
    return comercialMap[name];
  }
  // Initialize edition commercials so they always appear
  for (const c of edicionComerciales) getComercial(c);

  // Build email → closer map: prioritize non-no_show agenda (the one that wasn't cancelled)
  const emailCloserMap: Record<string, string> = {};
  for (const a of agendas) {
    const email = (a.email ?? "").toLowerCase();
    if (!email) continue;
    const closer = normComercial(a.comercial);
    // Only overwrite if this agenda is NOT a no_show (non-cancelled takes priority)
    if (!a.no_show) {
      emailCloserMap[email] = closer;
    } else if (!emailCloserMap[email]) {
      emailCloserMap[email] = closer;
    }
  }

  // Count agendas using emailCloserMap so each email is attributed to ONE closer only
  const countedAgendaEmails = new Set<string>();
  for (const a of agendas) {
    const email = (a.email ?? "").toLowerCase();
    if (!email || countedAgendaEmails.has(email)) continue;

    // Attribute to the closer from emailCloserMap (prioritizes non-no_show)
    const assignedCloser = emailCloserMap[email] ?? normComercial(a.comercial);
    const cm = getComercial(assignedCloser);
    countedAgendaEmails.add(email);
    cm.agendas++;
    cm.agendasUnicas.add(email);
    const src = emailSource[email];
    if (src === "Paid") {
      const camp = emailPaidCampaign[email] ?? "untracked";
      if (camp === "AV0") cm.paidAV0Agendas.add(email);
      else cm.paidAV2Agendas.add(email);
    }
    if (src === "Organico") cm.orgAgendas.add(email);
    if (src === "Afiliados") cm.orgAgendas.add(email);
    if (src === "Untracked" || !src) cm.untrackedAgendas.add(email);
  }

  // Ventas: attribute to the closer from the non-cancelled agenda
  for (const s of sales) {
    const email = (s.correo_electronico ?? "").toLowerCase();
    const closerFromAgenda = email ? emailCloserMap[email] : null;
    const c = closerFromAgenda ?? normComercial(s.nombre_comercial);
    const cm = getComercial(c);
    cm.ventas++;
    if (email) {
      const src = emailSource[email];
      if (src === "Paid") {
        const camp = emailPaidCampaign[email] ?? "untracked";
        if (camp === "AV0") cm.paidAV0Ventas++;
        else cm.paidAV2Ventas++;
      }
      if (src === "Organico") cm.orgVentas++;
      if (src === "Afiliados") cm.orgVentas++;
      if (src === "Untracked" || !src) cm.untrackedVentas++;
    }
  }

  const comercialesIncluded = [...edicionComerciales, ...Object.keys(comercialMap).filter((name) => name !== "Sin asignar" && !edicionComerciales.includes(name) && comercialMap[name].ventas > 0)];
  const comerciales = Object.entries(comercialMap)
    .filter(([name]) => comercialesIncluded.includes(name))
    .map(([name, d]) => ({
      comercial: name,
      agendas: d.agendas,
      agendasUnicas: d.agendasUnicas.size,
      ventas: d.ventas,
      cierre: d.agendasUnicas.size > 0 ? ((d.ventas / d.agendasUnicas.size) * 100).toFixed(1) : "0",
      paidAV0Agendas: d.paidAV0Agendas.size,
      paidAV2Agendas: d.paidAV2Agendas.size,
      paidAV0Ventas: d.paidAV0Ventas,
      paidAV2Ventas: d.paidAV2Ventas,
      cierreAV0: d.paidAV0Agendas.size > 0 ? ((d.paidAV0Ventas / d.paidAV0Agendas.size) * 100).toFixed(1) : "0",
      cierreAV2: d.paidAV2Agendas.size > 0 ? ((d.paidAV2Ventas / d.paidAV2Agendas.size) * 100).toFixed(1) : "0",
      orgAgendas: d.orgAgendas.size,
      orgVentas: d.orgVentas,
      cierreOrg: d.orgAgendas.size > 0 ? ((d.orgVentas / d.orgAgendas.size) * 100).toFixed(1) : "0",
      untrackedAgendas: d.untrackedAgendas.size,
      untrackedVentas: d.untrackedVentas,
      cierreUntracked: d.untrackedAgendas.size > 0 ? ((d.untrackedVentas / d.untrackedAgendas.size) * 100).toFixed(1) : "0",
    }))
    .sort((a, b) => {
      const iA = comercialesIncluded.indexOf(a.comercial);
      const iB = comercialesIncluded.indexOf(b.comercial);
      return iA - iB;
    });

  // Daily timeline: ventas por dia, agendas creadas por dia, llamadas por dia
  // Fixed date ranges per edition so the chart always shows the launch window
  const EDITION_DATE_RANGES: Record<string, { start: string; days: number }> = {
    "Enero 2026": { start: "2026-01-27", days: 8 },
    "Febrero 2026": { start: "2026-02-24", days: 8 },
    "Marzo 2026": { start: "2026-03-24", days: 8 },
  };

  const dailyMap: Record<string, { ventas: number; agendasCreadas: number; agendasUnicas: number; llamadas: number; llamadasUnicas: number }> = {};
  const dailyEmailsSets: Record<string, { agendas: Set<string>; llamadas: Set<string> }> = {};

  // Pre-fill days for the edition
  const edRange = edicion ? EDITION_DATE_RANGES[edicion] : null;
  if (edRange) {
    const start = new Date(edRange.start);
    for (let i = 0; i < edRange.days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = { ventas: 0, agendasCreadas: 0, agendasUnicas: 0, llamadas: 0, llamadasUnicas: 0 };
      dailyEmailsSets[key] = { agendas: new Set(), llamadas: new Set() };
    }
  }

  const rangeStart = edRange ? edRange.start : null;
  const rangeEnd = edRange ? (() => { const d = new Date(edRange.start); d.setDate(d.getDate() + edRange.days - 1); return d.toISOString().split("T")[0]; })() : null;

  function getDay(map: typeof dailyMap, date: string) {
    if (!map[date]) {
      map[date] = { ventas: 0, agendasCreadas: 0, agendasUnicas: 0, llamadas: 0, llamadasUnicas: 0 };
      dailyEmailsSets[date] = { agendas: new Set(), llamadas: new Set() };
    }
    return map[date];
  }

  for (const s of sales) {
    const saleDate = s.date_added ?? s.fecha_compra;
    if (saleDate) {
      const day = saleDate.split("T")[0];
      getDay(dailyMap, day).ventas++;
    }
  }
  for (const a of agendas) {
    const email = (a.email ?? "").toLowerCase();
    if (a.creada) {
      const day = a.creada.split("T")[0];
      getDay(dailyMap, day).agendasCreadas++;
      if (email) dailyEmailsSets[day].agendas.add(email);
    }
    if (a.fecha_llamada) {
      const day = a.fecha_llamada.split("T")[0];
      getDay(dailyMap, day).llamadas++;
      if (email) dailyEmailsSets[day].llamadas.add(email);
    }
  }

  // Compute unique counts from sets (per-day, for tooltip)
  for (const [day, sets] of Object.entries(dailyEmailsSets)) {
    if (dailyMap[day]) {
      dailyMap[day].agendasUnicas = sets.agendas.size;
      dailyMap[day].llamadasUnicas = sets.llamadas.size;
    }
  }

  // Only include days within the edition range
  const timelineRaw = Object.entries(dailyMap)
    .filter(([date]) => {
      if (rangeStart && rangeEnd) return date >= rangeStart && date <= rangeEnd;
      return true;
    })
    .map(([date, d]) => ({ date, ...d }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute incremental uniques: only count new emails not seen in previous days
  // This ensures the sum of daily bars matches the global unique totals
  const seenAgendaEmails = new Set<string>();
  const seenLlamadaEmails = new Set<string>();
  const timeline = timelineRaw.map((d) => {
    const dayAgendaSets = dailyEmailsSets[d.date]?.agendas ?? new Set();
    const dayLlamadaSets = dailyEmailsSets[d.date]?.llamadas ?? new Set();
    let newAgendas = 0;
    for (const email of dayAgendaSets) {
      if (!seenAgendaEmails.has(email)) { seenAgendaEmails.add(email); newAgendas++; }
    }
    let newLlamadas = 0;
    for (const email of dayLlamadaSets) {
      if (!seenLlamadaEmails.has(email)) { seenLlamadaEmails.add(email); newLlamadas++; }
    }
    return { ...d, agendasUnicas: newAgendas, llamadasUnicas: newLlamadas };
  });

  // Closer daily performance: calls done, no-shows, ventas closed, close rate
  // We match agenda email → sale email to attribute conversions to the closer
  const saleEmails = new Set(sales.map((s) => (s.correo_electronico ?? "").toLowerCase()).filter(Boolean));

  type CloserDayStats = {
    llamadas: number;
    noShows: number;
    celebradas: number;
    ventas: number;
  };
  const closerDailyMap: Record<string, Record<string, CloserDayStats>> = {};
  const closerTotals: Record<string, CloserDayStats> = {};
  // Track unique emails per closer to deduplicate
  const closerSeenEmails: Record<string, Set<string>> = {};
  const closerDaySeenEmails: Record<string, Record<string, Set<string>>> = {};

  for (const c of edicionComerciales) {
    closerTotals[c] = { llamadas: 0, noShows: 0, celebradas: 0, ventas: 0 };
    closerSeenEmails[c] = new Set();
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  for (const a of agendas) {
    if (!a.fecha_llamada) continue;
    const day = a.fecha_llamada.split("T")[0];
    if (day > today) continue; // Futuro — no contar

    // Si es hoy y tiene hora real, solo contar si ya pasaron 30 min desde la hora
    if (day === today && a.fecha_llamada.includes("T") && !a.fecha_llamada.endsWith("T00:00:00")) {
      const callTime = new Date(a.fecha_llamada);
      const thirtyMinAfter = new Date(callTime.getTime() + 30 * 60 * 1000);
      if (now < thirtyMinAfter) continue; // Llamada aun no celebrada
    }
    const closer = normComercial(a.comercial);
    if (closer === "Sin asignar") continue;

    const email = (a.email ?? "").toLowerCase();
    // Deduplicate: only count each unique email once per closer
    if (!email || closerSeenEmails[closer]?.has(email)) continue;
    if (!closerSeenEmails[closer]) closerSeenEmails[closer] = new Set();
    closerSeenEmails[closer].add(email);

    if (!closerDailyMap[closer]) closerDailyMap[closer] = {};
    if (!closerDailyMap[closer][day]) closerDailyMap[closer][day] = { llamadas: 0, noShows: 0, celebradas: 0, ventas: 0 };
    if (!closerDaySeenEmails[closer]) closerDaySeenEmails[closer] = {};
    if (!closerDaySeenEmails[closer][day]) closerDaySeenEmails[closer][day] = new Set();
    if (!closerTotals[closer]) closerTotals[closer] = { llamadas: 0, noShows: 0, celebradas: 0, ventas: 0 };

    const cd = closerDailyMap[closer][day];
    const ct = closerTotals[closer];

    cd.llamadas++;
    ct.llamadas++;

    if (a.no_show) {
      cd.noShows++;
      ct.noShows++;
    } else {
      cd.celebradas++;
      ct.celebradas++;

      if (email && saleEmails.has(email)) {
        cd.ventas++;
        ct.ventas++;
      }
    }
  }

  const closerPerformance = edicionComerciales.map((closer) => {
    const t = closerTotals[closer];
    const daily = closerDailyMap[closer] ?? {};
    const days = Object.entries(daily)
      .filter(([date]) => {
        if (rangeStart && rangeEnd) return date >= rangeStart && date <= rangeEnd;
        return true;
      })
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      closer,
      llamadas: t.llamadas,
      noShows: t.noShows,
      celebradas: t.celebradas,
      ventas: t.ventas,
      cierre: t.llamadas > 0 ? ((t.ventas / t.llamadas) * 100).toFixed(1) : "0",
      days,
    };
  });

  // Qualification breakdown
  const qualFields = ["situacion_actual", "objetivo", "inversion"] as const;
  const qualLabels: Record<string, string> = {
    situacion_actual: "Situación actual",
    objetivo: "Objetivo",
    inversion: "Inversión",
  };

  function buildQualification(rows: typeof agendas) {
    const result: Record<string, { label: string; data: { name: string; value: number }[] }> = {};
    for (const field of qualFields) {
      const counts: Record<string, number> = {};
      for (const a of rows) {
        const val = a[field] || "(vacío)";
        counts[val] = (counts[val] || 0) + 1;
      }
      result[field] = {
        label: qualLabels[field],
        data: Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      };
    }
    return result;
  }

  // Deduplicate agendas by email for qualification (unique agendas only)
  const seenQualEmails = new Set<string>();
  const uniqueAgendas = agendas.filter((a) => {
    const email = (a.email ?? "").toLowerCase();
    if (!email || seenQualEmails.has(email)) return false;
    seenQualEmails.add(email);
    return true;
  });
  const cualificacion = buildQualification(uniqueAgendas);

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
    timeline,
    closerPerformance,
    cualificacion,
    economics: ECONOMIC_DATA[edicion ?? ""] ?? { general: { total: null, raw: {}, adjusted: {} }, paid: { total: null, raw: {}, adjusted: {} }, affiliates: { total: null, raw: {}, adjusted: {} } },
  });
}
