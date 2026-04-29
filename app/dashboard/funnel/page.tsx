"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { swr, invalidateCache } from "@/lib/cached-fetch";
import { distributeMultiPhase, distribute } from "@/lib/distribute-untracked";
import { Loader2, Users, CalendarDays, ShoppingCart, ChevronDown, TrendingUp, Plus, Save, Edit3, Trash2, X, FileText, Lightbulb, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList, PieChart, Pie, Cell } from "recharts";

type Stats = {
  totalLeads: number;
  totalAgendas: number;
  agendasUnicas: number;
  totalVentas: number;
  totalVentasNetas: number;
  totalReembolsos: number;
  tasaReembolso: string;
  convLeadAgenda: string;
  convAgendaVenta: string;
  convLeadVenta: string;
  convAgendaVentaNeta: string;
  convLeadVentaNeta: string;
  totalLlamadas?: number;
  totalCelebradas?: number;
  totalNoShows?: number;
  totalVentasEnCelebradas?: number;
  totalVentasEnCelebradasNetas?: number;
  cierreLlamada?: string;
  cierreLlamadaNeto?: string;
  showRate?: string;
  coverage?: string;
  dataQualitySuspect?: boolean;
  sinAsignarLlamadas?: number;
  sinAsignarCelebradas?: number;
  sinAsignarVentasCelebradas?: number;
  sinAsignarVentasCelebradasNetas?: number;
};

type SourceRow = {
  source: string;
  leads: number;
  leadsPct: string;
  agendas: number;
  agendasUnicas: number;
  agendasPct: string;
  ventas: number;
  ventasPct: string;
  ventasNetas: number;
  ventasNetasPct: string;
};

type PaidCampaignRow = {
  campaign: string;
  leads: number;
  leadsPct: string;
  agendas: number;
  agendasUnicas: number;
  agendasPct: string;
  ventas: number;
  ventasPct: string;
  ratioAgenda: string;
  ratioVenta: string;
  cierreAgenda: string;
};

type PaidMedia = {
  totalLeads: number;
  totalAgendas: number;
  totalVentas: number;
  campaigns: PaidCampaignRow[];
};

type AffiliateRow = {
  affiliate: string;
  leads: number;
  leadsPct: string;
  agendas: number;
  agendasUnicas: number;
  agendasPct: string;
  ventas: number;
  ventasPct: string;
};

type AffiliateMedia = {
  totalLeads: number;
  totalAgendas: number;
  totalVentas: number;
  types: AffiliateRow[];
};

type OrganicChannelRow = {
  channel: string;
  leads: number;
  leadsPct: string;
  agendas: number;
  agendasUnicas: number;
  agendasPct: string;
  ventas: number;
  ventasPct: string;
};

type OrganicMedia = {
  totalLeads: number;
  totalAgendas: number;
  totalVentas: number;
  channels: OrganicChannelRow[];
};

type ComercialRow = {
  comercial: string;
  agendas: number;
  agendasUnicas: number;
  ventas: number;
  cierre: string;
  paidAV0Agendas: number;
  paidAV2Agendas: number;
  paidAV0Ventas: number;
  paidAV2Ventas: number;
  cierreAV0: string;
  cierreAV2: string;
  orgAgendas: number;
  orgVentas: number;
  cierreOrg: string;
  affAgendas: number;
  affVentas: number;
  cierreAff: string;
  untrackedAgendas: number;
  untrackedVentas: number;
  cierreUntracked: string;
};

type EcoRow = {
  sinRTG: { inversion: number; facturacion: number; roas: string };
  conRTG: { inversion: number; facturacion: number; cpa: number | null; roas: string };
  tiempoMedio?: string;
};

type EditionEconomics = {
  rtgCost?: number;
  general: { total: EcoRow | null; raw: Record<string, Partial<EcoRow>>; adjusted: Record<string, EcoRow> };
  paid: { total: EcoRow | null; raw: Record<string, Partial<EcoRow>>; adjusted: Record<string, EcoRow> };
  affiliates: { total: EcoRow | null; raw: Record<string, Partial<EcoRow>>; adjusted: Record<string, Partial<EcoRow>> };
};

function fmtEur(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + "€";
}

function fmtRoas(r: string | undefined): string {
  if (!r) return "—";
  return r + "x";
}

const ECO_CLS = "text-right px-2 py-0.5 text-xs";
const ECO_BORDER = "border-l-2 border-amber-200";

function EcoCells({ eco, bold, showTiempo }: { eco?: Partial<EcoRow> | null; bold?: boolean; showTiempo?: boolean }) {
  const c = bold ? `${ECO_CLS} font-bold text-amber-800` : `${ECO_CLS} text-amber-700`;
  const dash = `${ECO_CLS} text-gray-300`;
  if (!eco) return <>
    <td className={`${dash} ${ECO_BORDER}`}>—</td><td className={dash}>—</td><td className={dash}>—</td>
    <td className={dash}>—</td><td className={dash}>—</td><td className={dash}>—</td><td className={dash}>—</td>
    {showTiempo && <td className={dash}>—</td>}
  </>;
  const s = eco.sinRTG;
  const r = eco.conRTG;
  return <>
    <td className={`${c} ${ECO_BORDER}`}>{s ? fmtEur(s.inversion) : "—"}</td>
    <td className={c}>{s ? fmtEur(s.facturacion) : "—"}</td>
    <td className={c}>{s ? fmtRoas(s.roas) : "—"}</td>
    <td className={c}>{r ? fmtEur(r.inversion) : "—"}</td>
    <td className={c}>{r ? fmtEur(r.facturacion) : "—"}</td>
    <td className={c}>{r?.cpa != null ? fmtEur(r.cpa) : "—"}</td>
    <td className={c}>{r ? fmtRoas(r.roas) : "—"}</td>
    {showTiempo && <td className={c}>{eco.tiempoMedio ?? "—"}</td>}
  </>;
}

const SOURCE_COLORS: Record<string, string> = {
  Paid: "bg-blue-500",
  Organico: "bg-emerald-500",
  Afiliados: "bg-purple-500",
  Untracked: "bg-gray-400",
};

const SOURCE_TEXT: Record<string, string> = {
  Paid: "text-blue-600",
  Organico: "text-emerald-600",
  Afiliados: "text-purple-600",
  Untracked: "text-gray-500",
};

export default function FunnelPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [paidMedia, setPaidMedia] = useState<PaidMedia | null>(null);
  const [affiliateMedia, setAffiliateMedia] = useState<AffiliateMedia | null>(null);
  const [organicMedia, setOrganicMedia] = useState<OrganicMedia | null>(null);
  const [comerciales, setComerciales] = useState<ComercialRow[]>([]);
  const [economics, setEconomics] = useState<EditionEconomics>({ general: { total: null, raw: {}, adjusted: {} }, paid: { total: null, raw: {}, adjusted: {} }, affiliates: { total: null, raw: {}, adjusted: {} } });
  const [timeline, setTimeline] = useState<{ date: string; ventas: number; agendasCreadas: number; agendasUnicas: number; llamadas: number; llamadasUnicas: number }[]>([]);
  type QualData = Record<string, { label: string; data: { name: string; value: number }[] }>;
  const [cualificacion, setCualificacion] = useState<QualData>({});
  const [closerPerformance, setCloserPerformance] = useState<{
    closer: string; llamadas: number; noShows: number; celebradas: number; ventas: number; ventasNetas: number;
    cierre: string; cierreNeto: string; showRate: string;
    days: { date: string; llamadas: number; noShows: number; celebradas: number; ventas: number; ventasNetas: number }[];
  }[]>([]);
  const [notas, setNotas] = useState<{ id: string; titulo: string; contenido: string; tipo: string; created_at: string }[]>([]);
  const [showNewNota, setShowNewNota] = useState(false);
  const [newTitulo, setNewTitulo] = useState("");
  const [newContenido, setNewContenido] = useState("");
  const [newTipo, setNewTipo] = useState("conclusion");
  const [editingNotaId, setEditingNotaId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editContenido, setEditContenido] = useState("");
  const [editTipo, setEditTipo] = useState("conclusion");
  const [ediciones, setEdiciones] = useState<string[]>([]);
  const [edicionFilter, setEdicionFilter] = useState<string | null>(null);
  const [quarterFilter, setQuarterFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"Todos" | "Organico" | "Paid" | "Afiliados">("Todos");
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const MONTH_ORDER: Record<string, number> = {
      Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
      Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
    };
    function edicionToDate(ed: string): number {
      const parts = ed.split(" ");
      const month = MONTH_ORDER[parts[0]] ?? 0;
      const year = parseInt(parts[1] ?? "0");
      return year * 100 + month;
    }

    fetch("/api/funnel/ediciones")
      .then((r) => r.json())
      .then((d) => {
        const eds = (d.ediciones ?? []) as string[];
        eds.sort((a, b) => edicionToDate(a) - edicionToDate(b));
        setEdiciones(eds);
        if (eds.length > 0) setEdicionFilter(eds[eds.length - 1]);
        setInitialized(true);
      });
  }, []);

  const QUARTER_MONTHS: Record<string, string[]> = {
    Q1: ["Enero", "Febrero", "Marzo"],
    Q2: ["Abril", "Mayo", "Junio"],
    Q3: ["Julio", "Agosto", "Septiembre"],
    Q4: ["Octubre", "Noviembre", "Diciembre"],
  };

  const availableQuarters = useMemo(() => {
    const qs = new Set<string>();
    for (const ed of ediciones) {
      const month = ed.split(" ")[0];
      for (const [q, months] of Object.entries(QUARTER_MONTHS)) {
        if (months.includes(month)) { qs.add(q); break; }
      }
    }
    // Siempre incluir el quarter siguiente al último con datos
    const all = ["Q1", "Q2", "Q3", "Q4"];
    const lastIdx = all.findLastIndex((q) => qs.has(q));
    if (lastIdx >= 0 && lastIdx < 3) qs.add(all[lastIdx + 1]);
    return all.filter((q) => qs.has(q));
  }, [ediciones]);

  const quarterEdiciones = useMemo(() => {
    if (!quarterFilter) return [];
    const months = QUARTER_MONTHS[quarterFilter] ?? [];
    return ediciones.filter((ed) => months.includes(ed.split(" ")[0]));
  }, [quarterFilter, ediciones]);

  const cancelRef = useRef<(() => void)[]>([]);

  const fetchData = useCallback(() => {
    if (!edicionFilter && !quarterFilter) return;
    // Cancel previous SWR subscriptions
    cancelRef.current.forEach((c) => c());
    cancelRef.current = [];

    const sourceParam = sourceFilter !== "Todos" ? `&source=${encodeURIComponent(sourceFilter)}` : "";
    const subParam = subFilter ? `&sub=${encodeURIComponent(subFilter)}` : "";
    const edParam = quarterFilter
      ? `ediciones=${encodeURIComponent(quarterEdiciones.join(","))}`
      : `edicion=${encodeURIComponent(edicionFilter!)}`;
    const funnelUrl = `/api/funnel?${edParam}${sourceParam}${subParam}`;
    const notasUrl = quarterFilter
      ? `/api/notas?edicion=${encodeURIComponent(quarterEdiciones[quarterEdiciones.length - 1] ?? "")}`
      : `/api/notas?edicion=${encodeURIComponent(edicionFilter!)}`;

    setRefreshing(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cancelRef.current.push(swr<any>(funnelUrl, (d, isStale) => {
      setStats(d.stats);
      setSources(d.sources ?? []);
      setPaidMedia(d.paidMedia ?? null);
      setAffiliateMedia(d.affiliateMedia ?? null);
      setOrganicMedia(d.organicMedia ?? null);
      setComerciales(d.comerciales ?? []);
      setTimeline(d.timeline ?? []);
      setCloserPerformance(d.closerPerformance ?? []);
      setCualificacion(d.cualificacion ?? {});
      setEconomics(d.economics);
      setLoading(false);
      if (!isStale) setRefreshing(false);
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cancelRef.current.push(swr<any>(notasUrl, (d) => {
      setNotas(d.data ?? []);
    }));
  }, [edicionFilter, quarterFilter, quarterEdiciones, sourceFilter, subFilter]);

  useEffect(() => { if (initialized) fetchData(); }, [fetchData, initialized]);

  // Adjusted sources (untracked distributed)
  const adjustedSources = useMemo(() => {
    if (!sources.length) return [];
    return distributeMultiPhase(
      sources.map((s) => ({ key: s.source, leads: s.leads, agendas: s.agendasUnicas, ventas: s.ventas }))
    );
  }, [sources]);

  // Adjusted Paid campaigns (includes global untracked assigned to Paid)
  const adjustedPaidCampaigns = useMemo(() => {
    if (!paidMedia) return [];
    const tracked = paidMedia.campaigns.filter((c) => c.campaign !== "untracked");
    const paidInternalUntracked = paidMedia.campaigns.find((c) => c.campaign === "untracked");
    const paidAdj = adjustedSources.find((s) => s.key === "Paid");
    const globalExtraLeads = paidAdj ? paidAdj.adjLeads - paidMedia.totalLeads : 0;
    const globalExtraAgendas = paidAdj ? paidAdj.adjAgendas - paidMedia.totalAgendas : 0;
    const globalExtraVentas = paidAdj ? paidAdj.adjVentas - paidMedia.totalVentas : 0;
    const totalUntrackedL = (paidInternalUntracked?.leads ?? 0) + globalExtraLeads;
    const totalUntrackedA = (paidInternalUntracked?.agendasUnicas ?? 0) + globalExtraAgendas;
    const totalUntrackedV = (paidInternalUntracked?.ventas ?? 0) + globalExtraVentas;
    if (totalUntrackedL === 0 && totalUntrackedA === 0 && totalUntrackedV === 0) {
      return tracked.map((c) => ({ ...c, adjLeads: c.leads, adjAgendas: c.agendasUnicas, adjVentas: c.ventas }));
    }
    const adjL = distribute(tracked.map((c) => ({ key: c.campaign, value: c.leads })), totalUntrackedL);
    const adjA = distribute(tracked.map((c) => ({ key: c.campaign, value: c.agendasUnicas })), totalUntrackedA);
    const adjV = distribute(tracked.map((c) => ({ key: c.campaign, value: c.ventas })), totalUntrackedV);
    return tracked.map((c) => ({
      ...c,
      adjLeads: adjL.find((a) => a.key === c.campaign)?.adjusted ?? c.leads,
      adjAgendas: adjA.find((a) => a.key === c.campaign)?.adjusted ?? c.agendasUnicas,
      adjVentas: adjV.find((a) => a.key === c.campaign)?.adjusted ?? c.ventas,
    }));
  }, [paidMedia, adjustedSources]);

  // Adjusted Affiliates (includes global untracked assigned to Afiliados)
  const adjustedAffiliates = useMemo(() => {
    if (!affiliateMedia) return [];
    const tracked = affiliateMedia.types.filter((t) => t.affiliate !== "untracked");
    const affInternalUntracked = affiliateMedia.types.find((t) => t.affiliate === "untracked");
    const affAdj = adjustedSources.find((s) => s.key === "Afiliados");
    const globalExtraLeads = affAdj ? affAdj.adjLeads - affiliateMedia.totalLeads : 0;
    const globalExtraAgendas = affAdj ? affAdj.adjAgendas - affiliateMedia.totalAgendas : 0;
    const globalExtraVentas = affAdj ? affAdj.adjVentas - affiliateMedia.totalVentas : 0;
    const totalUntrackedL = (affInternalUntracked?.leads ?? 0) + globalExtraLeads;
    const totalUntrackedA = (affInternalUntracked?.agendasUnicas ?? 0) + globalExtraAgendas;
    const totalUntrackedV = (affInternalUntracked?.ventas ?? 0) + globalExtraVentas;
    if (totalUntrackedL === 0 && totalUntrackedA === 0 && totalUntrackedV === 0) {
      return tracked.map((t) => ({ ...t, adjLeads: t.leads, adjAgendas: t.agendasUnicas, adjVentas: t.ventas }));
    }
    const adjL = distribute(tracked.map((t) => ({ key: t.affiliate, value: t.leads })), totalUntrackedL);
    const adjA = distribute(tracked.map((t) => ({ key: t.affiliate, value: t.agendasUnicas })), totalUntrackedA);
    const adjV = distribute(tracked.map((t) => ({ key: t.affiliate, value: t.ventas })), totalUntrackedV);
    return tracked.map((t) => ({
      ...t,
      adjLeads: adjL.find((a) => a.key === t.affiliate)?.adjusted ?? t.leads,
      adjAgendas: adjA.find((a) => a.key === t.affiliate)?.adjusted ?? t.agendasUnicas,
      adjVentas: adjV.find((a) => a.key === t.affiliate)?.adjusted ?? t.ventas,
    }));
  }, [affiliateMedia, adjustedSources]);

  // Stats filtradas por fuente y sub-filtro
  const filteredStats = useMemo((): Stats | null => {
    if (!stats) return null;
    if (sourceFilter === "Todos") return stats;

    // Si hay sub-filtro, buscar datos del sub-desglose
    if (subFilter) {
      let leads = 0, agendas = 0, agendasTotal = 0, ventas = 0, ventasNetas = 0;
      if (sourceFilter === "Paid" && paidMedia) {
        const camp = paidMedia.campaigns.find((c) => c.campaign === subFilter);
        if (!camp) return null;
        leads = camp.leads; agendas = camp.agendasUnicas; agendasTotal = camp.agendas; ventas = camp.ventas; ventasNetas = (camp as any).ventasNetas ?? camp.ventas;
      } else if (sourceFilter === "Afiliados" && affiliateMedia) {
        const aff = affiliateMedia.types.find((t) => t.affiliate === subFilter);
        if (!aff) return null;
        leads = aff.leads; agendas = aff.agendasUnicas; agendasTotal = aff.agendas; ventas = aff.ventas; ventasNetas = (aff as any).ventasNetas ?? aff.ventas;
      } else if (sourceFilter === "Organico" && organicMedia) {
        const ch = organicMedia.channels.find((c) => c.channel === subFilter);
        if (!ch) return null;
        leads = ch.leads; agendas = ch.agendasUnicas; agendasTotal = ch.agendas; ventas = ch.ventas; ventasNetas = (ch as any).ventasNetas ?? ch.ventas;
      }
      const reembolsos = ventas - ventasNetas;
      return {
        totalLeads: leads,
        totalAgendas: agendasTotal,
        agendasUnicas: agendas,
        totalVentas: ventas,
        totalVentasNetas: ventasNetas,
        totalReembolsos: reembolsos,
        tasaReembolso: ventas > 0 ? ((reembolsos / ventas) * 100).toFixed(1) : "0",
        convLeadAgenda: leads > 0 ? ((agendas / leads) * 100).toFixed(1) : "0",
        convAgendaVenta: agendas > 0 ? ((ventas / agendas) * 100).toFixed(1) : "0",
        convLeadVenta: leads > 0 ? ((ventas / leads) * 100).toFixed(1) : "0",
        convAgendaVentaNeta: agendas > 0 ? ((ventasNetas / agendas) * 100).toFixed(1) : "0",
        convLeadVentaNeta: leads > 0 ? ((ventasNetas / leads) * 100).toFixed(1) : "0",
      };
    }

    const row = sources.find((s) => s.source === sourceFilter);
    if (!row) return null;
    const leads = row.leads;
    const agendas = row.agendasUnicas;
    const agendasTotal = row.agendas;
    const ventas = row.ventas;
    const ventasNetas = row.ventasNetas;
    const reembolsos = ventas - ventasNetas;
    return {
      totalLeads: leads,
      totalAgendas: agendasTotal,
      agendasUnicas: agendas,
      totalVentas: ventas,
      totalVentasNetas: ventasNetas,
      totalReembolsos: reembolsos,
      tasaReembolso: ventas > 0 ? ((reembolsos / ventas) * 100).toFixed(1) : "0",
      convLeadAgenda: leads > 0 ? ((agendas / leads) * 100).toFixed(1) : "0",
      convAgendaVenta: agendas > 0 ? ((ventas / agendas) * 100).toFixed(1) : "0",
      convLeadVenta: leads > 0 ? ((ventas / leads) * 100).toFixed(1) : "0",
      convAgendaVentaNeta: agendas > 0 ? ((ventasNetas / agendas) * 100).toFixed(1) : "0",
      convLeadVentaNeta: leads > 0 ? ((ventasNetas / leads) * 100).toFixed(1) : "0",
    };
  }, [stats, sources, sourceFilter, subFilter, paidMedia, affiliateMedia, organicMedia]);

  // Adjusted Comerciales (untracked distributed, no untracked columns)
  const adjustedComerciales = useMemo(() => {
    return comerciales.map((c) => {
      const untrackedAg = c.untrackedAgendas;
      const adjAg = distribute(
        [{ key: "paidAV0", value: c.paidAV0Agendas }, { key: "paidAV2", value: c.paidAV2Agendas }, { key: "org", value: c.orgAgendas }, { key: "aff", value: c.affAgendas }],
        untrackedAg
      );
      const untrackedVe = c.untrackedVentas;
      const adjVe = distribute(
        [{ key: "paidAV0", value: c.paidAV0Ventas }, { key: "paidAV2", value: c.paidAV2Ventas }, { key: "org", value: c.orgVentas }, { key: "aff", value: c.affVentas }],
        untrackedVe
      );
      const av0Ag = adjAg.find((a) => a.key === "paidAV0")?.adjusted ?? 0;
      const av2Ag = adjAg.find((a) => a.key === "paidAV2")?.adjusted ?? 0;
      const orgAg = adjAg.find((a) => a.key === "org")?.adjusted ?? 0;
      const affAg = adjAg.find((a) => a.key === "aff")?.adjusted ?? 0;
      const av0Ve = adjVe.find((a) => a.key === "paidAV0")?.adjusted ?? 0;
      const av2Ve = adjVe.find((a) => a.key === "paidAV2")?.adjusted ?? 0;
      const orgVe = adjVe.find((a) => a.key === "org")?.adjusted ?? 0;
      const affVe = adjVe.find((a) => a.key === "aff")?.adjusted ?? 0;
      return {
        ...c,
        paidAV0Agendas: av0Ag, paidAV2Agendas: av2Ag, orgAgendas: orgAg, affAgendas: affAg,
        paidAV0Ventas: av0Ve, paidAV2Ventas: av2Ve, orgVentas: orgVe, affVentas: affVe,
        cierreAV0: av0Ag > 0 ? ((av0Ve / av0Ag) * 100).toFixed(1) : "0",
        cierreAV2: av2Ag > 0 ? ((av2Ve / av2Ag) * 100).toFixed(1) : "0",
        cierreOrg: orgAg > 0 ? ((orgVe / orgAg) * 100).toFixed(1) : "0",
        cierreAff: affAg > 0 ? ((affVe / affAg) * 100).toFixed(1) : "0",
      };
    });
  }, [comerciales]);

  async function handleCreateNota() {
    if (!newTitulo.trim() || !edicionFilter) return;
    await fetch("/api/notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edicion: edicionFilter, titulo: newTitulo, contenido: newContenido, tipo: newTipo }),
    });
    setNewTitulo(""); setNewContenido(""); setNewTipo("conclusion"); setShowNewNota(false);
    invalidateCache("/api/notas"); fetchData();
  }

  async function handleUpdateNota(id: string) {
    await fetch("/api/notas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, titulo: editTitulo, contenido: editContenido, tipo: editTipo }),
    });
    setEditingNotaId(null);
    invalidateCache("/api/notas"); fetchData();
  }

  async function handleDeleteNota(id: string) {
    await fetch(`/api/notas?id=${id}`, { method: "DELETE" });
    invalidateCache("/api/notas"); fetchData();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Cruce de ventas</h1>
          {refreshing && !loading && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200">
              <Loader2 className="h-3 w-3 animate-spin" />
              Actualizando...
            </span>
          )}
        </div>
        <p className="text-gray-400 text-sm mt-0.5">Embudo completo: Leads → Agendas → Ventas</p>
      </div>

      {/* Selector de quarter */}
      {availableQuarters.length > 0 && (
        <div className="flex items-center gap-1.5">
          {availableQuarters.map((q) => (
            <button
              key={q}
              onClick={() => {
                if (quarterFilter === q) {
                  setQuarterFilter(null);
                  if (!edicionFilter && ediciones.length) setEdicionFilter(ediciones[ediciones.length - 1]);
                } else {
                  setQuarterFilter(q);
                  setEdicionFilter(null);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${quarterFilter === q
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-gray-400 hover:text-indigo-600"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Selector de edición */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          {ediciones.map((ed) => (
            <button
              key={ed}
              onClick={() => { setEdicionFilter(ed); setQuarterFilter(null); }}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${!quarterFilter && edicionFilter === ed
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-[1.02]"
                : quarterFilter && quarterEdiciones.includes(ed)
                  ? "bg-indigo-100 border border-indigo-300 text-indigo-700"
                  : "bg-gray-50 border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              {ed}
            </button>
          ))}
        </div>
      </div>


      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
        </div>
      ) : stats && (
        <>
          {/* Resumen general */}
          <div className="flex items-end justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-gray-900">1. Resumen general</h2>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1">
                {(["Todos", "Organico", "Paid", "Afiliados"] as const).map((s) => {
                  const active = sourceFilter === s;
                  const colors: Record<string, string> = {
                    Todos: "bg-gray-800 text-white shadow-sm",
                    Organico: "bg-emerald-500 text-white shadow-sm",
                    Paid: "bg-blue-500 text-white shadow-sm",
                    Afiliados: "bg-purple-500 text-white shadow-sm",
                  };
                  return (
                    <button
                      key={s}
                      onClick={() => { setSourceFilter(s); setSubFilter(null); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${active ? colors[s] : "text-gray-500 hover:text-gray-700"}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {sourceFilter !== "Todos" && (() => {
                let items: { key: string; label: string }[] = [];
                if (sourceFilter === "Organico" && organicMedia) {
                  items = organicMedia.channels.map((c) => ({ key: c.channel, label: c.channel }));
                } else if (sourceFilter === "Paid" && paidMedia) {
                  items = paidMedia.campaigns.filter((c) => c.campaign !== "untracked").map((c) => ({ key: c.campaign, label: c.campaign }));
                } else if (sourceFilter === "Afiliados" && affiliateMedia) {
                  items = affiliateMedia.types.filter((t) => t.affiliate !== "untracked").map((t) => ({ key: t.affiliate, label: t.affiliate }));
                }
                if (!items.length) return null;
                const sourceColor: Record<string, string> = {
                  Organico: "bg-emerald-500 text-white shadow-sm",
                  Paid: "bg-blue-500 text-white shadow-sm",
                  Afiliados: "bg-purple-500 text-white shadow-sm",
                };
                return (
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1">
                    <button
                      onClick={() => setSubFilter(null)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${!subFilter ? "bg-gray-700 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Todos
                    </button>
                    {items.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setSubFilter(item.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${subFilter === item.key ? sourceColor[sourceFilter] : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {filteredStats ? <div className="flex gap-6">
            {/* Funnel visual — izquierda */}
            <div className="flex flex-col items-center gap-0 w-72 shrink-0">
              <div className="w-full bg-emerald-500 rounded-3xl border-2 border-white shadow-sm px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-[11px] font-semibold text-white/70 uppercase">Leads</span>
                </div>
                <p className="text-lg font-black text-white">{filteredStats.totalLeads.toLocaleString("es-ES")}</p>
              </div>

              <div className="py-1 flex items-center gap-1">
                <ChevronDown className="h-3 w-3 text-gray-300" />
                <span className="text-[10px] font-bold text-emerald-600">{filteredStats.convLeadAgenda}%</span>
              </div>

              <div className="w-[78%] bg-indigo-500 rounded-3xl border-2 border-white shadow-sm px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-[11px] font-semibold text-white/70 uppercase">Agendas</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{filteredStats.totalAgendas}</p>
                  <p className="text-[9px] text-white/60">{filteredStats.agendasUnicas} únicas</p>
                </div>
              </div>

              <div className="py-1 flex items-center gap-1">
                <ChevronDown className="h-3 w-3 text-gray-300" />
                <span className="text-[10px] font-bold text-indigo-600">{filteredStats.convAgendaVenta}%</span>
              </div>

              <div className="w-[54%] bg-amber-400 rounded-3xl border-2 border-white shadow-sm px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-[11px] font-semibold text-white/70 uppercase">Ventas</span>
                </div>
                <p className="text-lg font-black text-white">{filteredStats.totalVentas}</p>
              </div>

              <div className="py-1 flex items-center gap-1">
                <ChevronDown className="h-3 w-3 text-gray-300" />
                <span className="text-[10px] font-bold text-rose-600">-{filteredStats.tasaReembolso}% reembolsos</span>
              </div>

              <div className="w-[54%] bg-rose-500 rounded-3xl border-2 border-white shadow-sm px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-[10px] font-semibold text-white/70 uppercase leading-tight">V. Netas</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{filteredStats.totalVentasNetas}</p>
                  <p className="text-[9px] text-white/60">{filteredStats.totalReembolsos} reemb.</p>
                </div>
              </div>
            </div>

            {/* Tarjetas KPI — derecha */}
            <div className="flex-1 grid grid-cols-2 gap-4 content-start">
              {/* Leads + Tasa lead→venta */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Leads</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{filteredStats.totalLeads.toLocaleString("es-ES")}</p>
                </div>
              </div>
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">%</span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Conv. lead → venta</p>
                  <p className="text-2xl font-black text-emerald-700 leading-tight">{filteredStats.convLeadVenta}% <span className="text-sm font-medium text-emerald-500">lead → venta</span></p>
                </div>
              </div>

              {/* Agendas + Tasa lead→agenda */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Agendas</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{filteredStats.totalAgendas} <span className="text-sm font-medium text-gray-400">· {filteredStats.agendasUnicas} únicas</span></p>
                </div>
              </div>
              <div className="bg-indigo-50 rounded-2xl border border-indigo-200 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">%</span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ratio agenda</p>
                  <p className="text-2xl font-black text-indigo-700 leading-tight">{filteredStats.convLeadAgenda}% <span className="text-sm font-medium text-indigo-500">lead → agenda</span></p>
                </div>
              </div>

              {/* Ventas + Tasa agenda→venta */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ventas</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{filteredStats.totalVentas}</p>
                </div>
              </div>
              <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">%</span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cierre llamada</p>
                  <p className="text-2xl font-black text-amber-700 leading-tight">
                    {filteredStats.cierreLlamada ?? filteredStats.convAgendaVenta}%
                    <span className="text-sm font-medium text-amber-500"> {filteredStats.cierreLlamada != null ? "ventas / celebradas" : "agenda → venta"}</span>
                  </p>
                  {filteredStats.cierreLlamada != null && (
                    <p className="text-[10px] text-gray-400 mt-0.5">Cierre agenda: <span className="font-semibold text-gray-600">{filteredStats.convAgendaVenta}%</span></p>
                  )}
                </div>
              </div>

              {/* Ventas Netas + Cierre neto */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ventas Netas</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{filteredStats.totalVentasNetas} <span className="text-sm font-medium text-gray-400">{filteredStats.totalReembolsos} reemb.</span></p>
                </div>
              </div>
              <div className="bg-rose-50 rounded-2xl border border-rose-200 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">%</span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cierre neto</p>
                  <p className="text-2xl font-black text-rose-700 leading-tight">
                    {filteredStats.cierreLlamadaNeto ?? filteredStats.convAgendaVentaNeta}%
                    <span className="text-sm font-medium text-rose-500"> {filteredStats.cierreLlamadaNeto != null ? "v. netas / celebradas" : "agenda → v. neta"}</span>
                  </p>
                  {filteredStats.cierreLlamadaNeto != null && (
                    <p className="text-[10px] text-gray-400 mt-0.5">Cierre agenda neto: <span className="font-semibold text-gray-600">{filteredStats.convAgendaVentaNeta}%</span></p>
                  )}
                </div>
              </div>
            </div>
          </div> : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-8 text-center text-sm text-gray-400">
              No hay datos para la fuente <span className="font-bold text-gray-600">{sourceFilter}</span> en esta edición.
            </div>
          )}



          {/* 2. Actividad diaria */}
          <>
            <h2 className="text-lg font-bold text-gray-900 mt-2">2. Actividad diaria</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="text-xs text-gray-400 mb-4">{quarterFilter ? "Media por día de lanzamiento entre ediciones del quarter" : "Ventas, nuevas agendas únicas y nuevas llamadas únicas por día (incrementales, suman al total)"}</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeline.map((d) => ({
                    dia: d.date.startsWith("Día") ? d.date : new Date(d.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
                    Ventas: d.ventas,
                    "Agendas únicas creadas": d.agendasUnicas,
                    _agendasTotal: d.agendasCreadas,
                    "Llamadas únicas": d.llamadasUnicas,
                    _llamadasTotal: d.llamadas,
                  }))} barCategoryGap="20%" margin={{ top: 20 }}>
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "#f3f4f6" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const row = payload[0]?.payload as any;
                        return (
                          <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                            <p className="font-semibold text-gray-700 mb-1">{label}</p>
                            {payload.map((p) => {
                              const key = String(p.dataKey);
                              if (key.startsWith("_")) return null;
                              if (key === "Agendas únicas creadas") {
                                return <p key={key} style={{ color: p.color }}>Agendas únicas creadas: {String(p.value)} ({row._agendasTotal} totales)</p>;
                              }
                              if (key === "Llamadas únicas") {
                                return <p key={key} style={{ color: p.color }}>Llamadas únicas: {String(p.value)} ({row._llamadasTotal} totales)</p>;
                              }
                              return <p key={key} style={{ color: p.color }}>{key}: {String(p.value)}</p>;
                            })}
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Ventas" radius={[3, 3, 0, 0]} fill="#f59e0b" />
                    <Bar dataKey="Agendas únicas creadas" radius={[3, 3, 0, 0]} fill="#6366f1">
                      <LabelList dataKey="Agendas únicas creadas" position="top" style={{ fontSize: 9, fill: "#6366f1", fontWeight: 700 }} formatter={(v) => { const n = Number(v); return n > 0 ? n : ""; }} />
                    </Bar>
                    <Bar dataKey="Llamadas únicas" radius={[3, 3, 0, 0]} fill="#10b981">
                      <LabelList dataKey="Llamadas únicas" position="top" style={{ fontSize: 9, fill: "#10b981", fontWeight: 700 }} formatter={(v) => { const n = Number(v); return n > 0 ? n : ""; }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Rendimiento closers */}
              <>
                  <h3 className="text-sm font-bold text-gray-700 mt-4">Rendimiento closers <span className="font-normal text-gray-400">(Cierre llamada = ventas / celebradas)</span></h3>

                  {/* Resumen por closer */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                          <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Closer</th>
                          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Llamadas</th>
                          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">No shows</th>
                          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Celebradas</th>
                          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">% Show</th>
                          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas</th>
                          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">V. Netas</th>
                          <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Cierre llamada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {closerPerformance.map((c) => {
                          const showPct = c.llamadas > 0 ? (c.celebradas / c.llamadas) * 100 : 0;
                          const showSuspect = showPct > 75;
                          return (
                            <tr key={c.closer} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3 text-sm font-semibold text-gray-800">{c.closer}</td>
                              <td className="text-right px-4 py-3 text-sm text-gray-600">{c.llamadas}</td>
                              <td className="text-right px-4 py-3 text-sm text-red-500 font-medium">{c.noShows}</td>
                              <td className="text-right px-4 py-3 text-sm font-bold text-gray-900">{c.celebradas}</td>
                              <td className={`text-right px-4 py-3 text-sm ${showSuspect ? "text-amber-600 font-semibold" : "text-gray-600"}`}>
                                <span className="inline-flex items-center gap-1 justify-end">
                                  {showSuspect && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                                  {showPct.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-right px-4 py-3 text-sm font-bold text-emerald-600">{c.ventas}</td>
                              <td className="text-right px-4 py-3 text-sm font-bold text-rose-600">{c.ventasNetas}</td>
                              <td className="text-right px-5 py-3 text-sm font-black text-gray-900">{c.cierre}%</td>
                            </tr>
                          );
                        })}
                        {(() => {
                          const tLlamadas = closerPerformance.reduce((s, c) => s + c.llamadas, 0);
                          const tNoShows = closerPerformance.reduce((s, c) => s + c.noShows, 0);
                          const tCelebradas = closerPerformance.reduce((s, c) => s + c.celebradas, 0);
                          const tVentas = closerPerformance.reduce((s, c) => s + c.ventas, 0);
                          const tVentasNetas = closerPerformance.reduce((s, c) => s + c.ventasNetas, 0);
                          const tShowPct = tLlamadas > 0 ? (tCelebradas / tLlamadas) * 100 : 0;
                          return (
                            <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                              <td className="px-5 py-3 text-sm font-black text-gray-900">Total</td>
                              <td className="text-right px-4 py-3 text-sm font-bold text-gray-900">{tLlamadas}</td>
                              <td className="text-right px-4 py-3 text-sm font-bold text-red-500">{tNoShows}</td>
                              <td className="text-right px-4 py-3 text-sm font-black text-gray-900">{tCelebradas}</td>
                              <td className="text-right px-4 py-3 text-sm font-bold text-gray-600">{tShowPct.toFixed(1)}%</td>
                              <td className="text-right px-4 py-3 text-sm font-black text-emerald-600">{tVentas}</td>
                              <td className="text-right px-4 py-3 text-sm font-black text-rose-600">{tVentasNetas}</td>
                              <td className="text-right px-5 py-3 text-sm font-black text-gray-900">{tCelebradas > 0 ? ((tVentas / tCelebradas) * 100).toFixed(1) : "0"}%</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                    <p className="text-[11px] text-gray-400 italic px-5 py-2">*Cierre llamada = ventas / celebradas. Las llamadas se suman 30 min después de la hora de inicio. <span className="text-amber-600">⚠ en % Show &gt; 75%</span> suele indicar que no se está marcando no-show en Go High Level.</p>
                  </div>

                  {/* Bloque de reconciliación */}
                  {stats && stats.totalLlamadas != null && (() => {
                    const sumLl = closerPerformance.reduce((s, c) => s + c.llamadas, 0);
                    const sumCe = closerPerformance.reduce((s, c) => s + c.celebradas, 0);
                    const sumVe = closerPerformance.reduce((s, c) => s + c.ventas, 0);
                    const sumVn = closerPerformance.reduce((s, c) => s + c.ventasNetas, 0);
                    const ok = (a: number, b: number) => a === b;
                    const rows: { label: string; sum: number; total: number; sinAsignar: number }[] = [
                      { label: "Llamadas",         sum: sumLl, total: stats.totalLlamadas ?? 0,                  sinAsignar: stats.sinAsignarLlamadas ?? 0 },
                      { label: "Celebradas",       sum: sumCe, total: stats.totalCelebradas ?? 0,                sinAsignar: stats.sinAsignarCelebradas ?? 0 },
                      { label: "Ventas (en celebradas)",      sum: sumVe, total: stats.totalVentasEnCelebradas ?? 0,      sinAsignar: stats.sinAsignarVentasCelebradas ?? 0 },
                      { label: "Ventas netas (en celebradas)", sum: sumVn, total: stats.totalVentasEnCelebradasNetas ?? 0, sinAsignar: stats.sinAsignarVentasCelebradasNetas ?? 0 },
                    ];
                    const ventasSinLlamada = (stats.totalVentas ?? 0) - (stats.totalVentasEnCelebradas ?? 0);
                    return (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-3">
                        <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cuadre de métricas</p>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left px-5 py-2 text-[10px] font-bold text-gray-400 uppercase">Métrica</th>
                              <th className="text-right px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Σ closers</th>
                              <th className="text-right px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Sin asignar</th>
                              <th className="text-right px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Total global</th>
                              <th className="text-center px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Cuadre</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {rows.map((r) => {
                              const cuadra = ok(r.sum + r.sinAsignar, r.total);
                              return (
                                <tr key={r.label}>
                                  <td className="px-5 py-1.5 text-gray-600">{r.label}</td>
                                  <td className="text-right px-4 py-1.5 font-bold text-gray-900">{r.sum}</td>
                                  <td className="text-right px-4 py-1.5 text-gray-500">{r.sinAsignar}</td>
                                  <td className="text-right px-4 py-1.5 font-bold text-gray-900">{r.total}</td>
                                  <td className={`text-center px-4 py-1.5 font-bold ${cuadra ? "text-emerald-600" : "text-red-600"}`}>
                                    {cuadra ? "✓" : `✗ (${r.sum + r.sinAsignar} ≠ ${r.total})`}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="bg-gray-50/60">
                              <td className="px-5 py-1.5 text-gray-600 italic" colSpan={3}>Ventas sin llamada celebrada (compraron sin show)</td>
                              <td className="text-right px-4 py-1.5 font-bold text-gray-700">{ventasSinLlamada}</td>
                              <td className="text-center px-4 py-1.5 text-gray-400">—</td>
                            </tr>
                            <tr className="bg-gray-50/60">
                              <td className="px-5 py-1.5 text-gray-600 italic" colSpan={3}>Total ventas brutas (todas las fuentes)</td>
                              <td className="text-right px-4 py-1.5 font-bold text-gray-900">{stats.totalVentas}</td>
                              <td className="text-center px-4 py-1.5 text-gray-400">—</td>
                            </tr>
                            <tr className="bg-gray-50/60">
                              <td className="px-5 py-1.5 text-gray-600 italic" colSpan={3}>Agendas únicas (sin filtrar por fecha de llamada)</td>
                              <td className="text-right px-4 py-1.5 font-bold text-gray-900">{stats.agendasUnicas} <span className="text-gray-400 font-normal">({stats.totalAgendas} registros)</span></td>
                              <td className="text-center px-4 py-1.5 text-gray-400">—</td>
                            </tr>
                            <tr className="bg-gray-50/60">
                              <td className="px-5 py-1.5 text-gray-600 italic" colSpan={3}>Cobertura (agendas únicas con fecha de llamada pasada)</td>
                              <td className={`text-right px-4 py-1.5 font-bold ${parseFloat(stats.coverage ?? "0") < 50 ? "text-amber-700" : "text-gray-900"}`}>
                                {stats.totalLlamadas}/{stats.agendasUnicas} <span className="font-normal">({stats.coverage}%)</span>
                              </td>
                              <td className="text-center px-4 py-1.5 text-gray-400">—</td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-[11px] text-gray-400 italic px-5 py-2">*Las columnas &quot;Σ closers + Sin asignar&quot; deben igualar &quot;Total global&quot;. Si alguna fila sale ✗, hay un problema de data quality (closer mal asignado, email repetido, etc.).</p>
                      </div>
                    );
                  })()}

              </>
          </>

          {/* 3. Cualificación de agendas */}
          {Object.keys(cualificacion).length > 0 && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mt-2">3. Cualificación de agendas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(cualificacion).map(([key, q]) => {
                  const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
                  const total = q.data.reduce((s, d) => s + d.value, 0);
                  return (
                    <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <p className="text-xs font-bold text-gray-700 mb-1 text-center">{q.label}</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={q.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} stroke="none">
                            {q.data.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0];
                            const pct = total > 0 ? ((Number(d.value) / total) * 100).toFixed(1) : "0";
                            return (
                              <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                                <p className="font-semibold text-gray-700">{String(d.name)}</p>
                                <p className="text-gray-500">{String(d.value)} ({pct}%)</p>
                              </div>
                            );
                          }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1 mt-1">
                        {q.data.map((d, i) => {
                          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                          return (
                            <div key={d.name} className="flex items-center gap-2 text-[10px]">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-gray-600 truncate flex-1">{d.name}</span>
                              <span className="font-bold text-gray-800">{d.value}</span>
                              <span className="text-gray-400">({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 italic">*Los valores reflejan agendas únicas.</p>
            </>
          )}

          {/* 4. Desglose por fuente */}
          {sources.length > 0 && (<>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto mt-0.5">
              <table className="w-full min-w-[1200px]" style={{ fontSize: "11px" }}>
                <thead>
                  <tr className="bg-gray-800"><td colSpan={17} className="px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest">4. Desglose por fuente</td></tr>
                  <tr className="bg-amber-50 border-b border-amber-200">
                    <th colSpan={10} /><th colSpan={3} className="text-center px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase border-l-2 border-amber-200">Sin RTG</th><th colSpan={4} className="text-center px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase border-l border-amber-200">Con RTG</th>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Fuente</th>
                    <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Leads</th>
                    <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">%</th>
                    <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Agendas</th>
                    <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">%</th>
                    <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Ventas</th>
                    <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">%</th>
                    <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Ratio agenda</th>
                    <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Cierre</th>
                    <th className="text-right px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Conv. lead</th>
                    <>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase border-l-2 border-amber-200">Inv.</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">Fact.</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">ROAS</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase border-l border-amber-200">Inv.</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">Fact.</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">CPA</th>
                      <th className="text-right px-3 py-0.5 text-[10px] font-bold text-amber-600 uppercase">ROAS</th>
                    </>
                  </tr>
                </thead>
                <tbody>
                  {/* Datos brutos */}
                  <tr className="bg-gray-50/30"><td colSpan={17} className="px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Datos brutos (con untracked)</td></tr>
                  {sources.map((s) => (
                    <tr key={s.source} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${SOURCE_COLORS[s.source] ?? "bg-gray-300"}`} />
                          <span className="text-xs font-semibold text-gray-700">{s.source}</span>
                        </div>
                      </td>
                      <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{s.leads.toLocaleString("es-ES")}</td>
                      <td className={`text-right px-2 py-0.5 text-xs font-semibold ${SOURCE_TEXT[s.source]}`}>{s.leadsPct}%</td>
                      <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{s.agendasUnicas}</td>
                      <td className={`text-right px-2 py-0.5 text-xs font-semibold ${SOURCE_TEXT[s.source]}`}>{s.agendasPct}%</td>
                      <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{s.ventas}</td>
                      <td className={`text-right px-2 py-0.5 text-xs font-semibold ${SOURCE_TEXT[s.source]}`}>{s.ventasPct}%</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-400">{s.leads > 0 ? ((s.agendasUnicas / s.leads) * 100).toFixed(1) : "0"}%</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-400">{s.agendasUnicas > 0 ? ((s.ventas / s.agendasUnicas) * 100).toFixed(1) : "0"}%</td>
                      <td className="text-right px-3 py-0.5 text-xs text-gray-400">{s.leads > 0 ? ((s.ventas / s.leads) * 100).toFixed(1) : "0"}%</td>
                      <EcoCells eco={economics.general.raw[s.source]} />
                    </tr>
                  ))}
                  {/* Total bruto */}
                  <tr className="border-t border-gray-200 bg-gray-50/80 font-bold">
                    <td className="px-3 py-0.5 text-xs text-gray-700">Total</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-900">{stats.totalLeads.toLocaleString("es-ES")}</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-900">{stats.agendasUnicas}</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-900">{stats.totalVentas}</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-600">{stats.convLeadAgenda}%</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-600">{stats.convAgendaVenta}%</td>
                    <td className="text-right px-3 py-0.5 text-xs text-gray-600">{stats.convLeadVenta}%</td>
                    <EcoCells eco={economics.general.total} bold />
                  </tr>

                  {/* Separador + datos ajustados */}
                  <tr className="bg-emerald-50/50 border-t-2 border-emerald-200"><td colSpan={17} className="px-3 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Datos ajustados (untracked distribuido)</td></tr>
                  {adjustedSources.map((s) => {
                    const tL = adjustedSources.reduce((sum, r) => sum + r.adjLeads, 0);
                    const tA = adjustedSources.reduce((sum, r) => sum + r.adjAgendas, 0);
                    const tV = adjustedSources.reduce((sum, r) => sum + r.adjVentas, 0);
                    return (
                      <tr key={`adj-${s.key}`} className="border-t border-emerald-100 hover:bg-emerald-50/30 transition-colors">
                        <td className="px-3 py-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${SOURCE_COLORS[s.key] ?? "bg-gray-300"}`} />
                            <span className="text-xs font-semibold text-gray-700">{s.key}</span>
                          </div>
                        </td>
                        <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{s.adjLeads.toLocaleString("es-ES")}</td>
                        <td className={`text-right px-2 py-0.5 text-xs font-semibold ${SOURCE_TEXT[s.key]}`}>{tL > 0 ? ((s.adjLeads / tL) * 100).toFixed(1) : "0"}%</td>
                        <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{s.adjAgendas}</td>
                        <td className={`text-right px-2 py-0.5 text-xs font-semibold ${SOURCE_TEXT[s.key]}`}>{tA > 0 ? ((s.adjAgendas / tA) * 100).toFixed(1) : "0"}%</td>
                        <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{s.adjVentas}</td>
                        <td className={`text-right px-2 py-0.5 text-xs font-semibold ${SOURCE_TEXT[s.key]}`}>{tV > 0 ? ((s.adjVentas / tV) * 100).toFixed(1) : "0"}%</td>
                        <td className="text-right px-2 py-0.5 text-xs font-semibold text-emerald-600">{s.adjLeads > 0 ? ((s.adjAgendas / s.adjLeads) * 100).toFixed(1) : "0"}%</td>
                        <td className="text-right px-2 py-0.5 text-xs font-semibold text-emerald-600">{s.adjAgendas > 0 ? ((s.adjVentas / s.adjAgendas) * 100).toFixed(1) : "0"}%</td>
                        <td className="text-right px-3 py-0.5 text-xs font-semibold text-emerald-600">{s.adjLeads > 0 ? ((s.adjVentas / s.adjLeads) * 100).toFixed(1) : "0"}%</td>
                        <EcoCells eco={economics.general.adjusted[s.key]} />
                      </tr>
                    );
                  })}
                  {/* Total ajustado */}
                  <tr className="border-t border-emerald-200 bg-emerald-50/50 font-bold">
                    <td className="px-3 py-0.5 text-xs text-emerald-800">Total</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-900">{stats.totalLeads.toLocaleString("es-ES")}</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-900">{stats.agendasUnicas}</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-900">{stats.totalVentas}</td>
                    <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                    <td className="text-right px-2 py-0.5 text-xs text-emerald-700">{stats.convLeadAgenda}%</td>
                    <td className="text-right px-2 py-0.5 text-xs text-emerald-700">{stats.convAgendaVenta}%</td>
                    <td className="text-right px-3 py-0.5 text-xs text-emerald-700">{stats.convLeadVenta}%</td>
                    <td colSpan={7} className="border-l-2 border-amber-200" />
                  </tr>
                </tbody>
              </table>
            </div>
          </>)}

          {/* 5. Paid Media */}
          {paidMedia && paidMedia.campaigns.length > 0 && (
            <>
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto mt-0.5">
                <table className="w-full min-w-[1300px]" style={{ fontSize: "11px" }}>
                  <thead>
                    <tr className="bg-blue-800"><td colSpan={18} className="px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest">5. Paid Media</td></tr>
                    <tr className="bg-amber-50 border-b border-amber-200">
                      <th colSpan={10} /><th colSpan={3} className="text-center px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase border-l-2 border-amber-200">Sin RTG</th><th colSpan={4} className="text-center px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase border-l border-amber-200">Con RTG</th><th className="text-center px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase" />
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Fuente</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Captacion</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">%</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Agendas</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">%</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Ventas</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">%</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Ratio agenda</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Conv. lead</th>
                      <th className="text-right px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Cierre llamada</th>
                      <>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase border-l-2 border-amber-200">Inv.</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">Fact.</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">ROAS</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase border-l border-amber-200">Inv.</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">Fact.</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">CPA</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">ROAS</th>
                        <th className="text-right px-3 py-0.5 text-[10px] font-bold text-amber-600 uppercase">t medio</th>
                      </>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Bruto */}
                    <tr className="bg-gray-50/30"><td colSpan={18} className="px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Datos brutos (con untracked)</td></tr>
                    {paidMedia.campaigns.map((c) => (
                      <tr key={c.campaign} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-0.5 text-xs font-semibold text-gray-700">{c.campaign}</td>
                        <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{c.leads.toLocaleString("es-ES")}</td>
                        <td className="text-right px-2 py-0.5 text-xs font-semibold text-blue-600">{c.leadsPct}%</td>
                        <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{c.agendasUnicas}</td>
                        <td className="text-right px-2 py-0.5 text-xs font-semibold text-blue-600">{c.agendasPct}%</td>
                        <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{c.ventas}</td>
                        <td className="text-right px-2 py-0.5 text-xs font-semibold text-blue-600">{c.ventasPct}%</td>
                        <td className="text-right px-2 py-0.5 text-xs text-gray-400">{c.ratioAgenda}%</td>
                        <td className="text-right px-2 py-0.5 text-xs text-gray-400">{c.ratioVenta}%</td>
                        <td className="text-right px-3 py-0.5 text-xs text-gray-400">{c.cierreAgenda}%</td>
                        <EcoCells eco={economics.paid.raw[c.campaign]} showTiempo />
                      </tr>
                    ))}
                    <tr className="border-t border-gray-200 bg-gray-50/80 font-bold">
                      <td className="px-3 py-0.5 text-xs text-gray-700">Total</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-900">{paidMedia.totalLeads.toLocaleString("es-ES")}</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-900">{paidMedia.totalAgendas}</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-900">{paidMedia.totalVentas}</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-600">{paidMedia.totalLeads > 0 ? ((paidMedia.totalAgendas / paidMedia.totalLeads) * 100).toFixed(1) : "0"}%</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-600">{paidMedia.totalLeads > 0 ? ((paidMedia.totalVentas / paidMedia.totalLeads) * 100).toFixed(1) : "0"}%</td>
                      <td className="text-right px-3 py-0.5 text-xs text-gray-600">{paidMedia.totalAgendas > 0 ? ((paidMedia.totalVentas / paidMedia.totalAgendas) * 100).toFixed(1) : "0"}%</td>
                      <EcoCells eco={economics.paid.total} bold showTiempo />
                    </tr>
                    {/* Ajustado */}
                    <tr className="bg-blue-50/50 border-t-2 border-blue-200"><td colSpan={18} className="px-3 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-widest">Datos ajustados (untracked distribuido)</td></tr>
                    {(() => {
                      const tL = adjustedPaidCampaigns.reduce((s, c) => s + c.adjLeads, 0);
                      const tA = adjustedPaidCampaigns.reduce((s, c) => s + c.adjAgendas, 0);
                      const tV = adjustedPaidCampaigns.reduce((s, c) => s + c.adjVentas, 0);
                      return adjustedPaidCampaigns.map((c) => (
                        <tr key={`adj-${c.campaign}`} className="border-t border-blue-100 hover:bg-blue-50/30">
                          <td className="px-3 py-0.5 text-xs font-semibold text-gray-700">{c.campaign}</td>
                          <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{c.adjLeads.toLocaleString("es-ES")}</td>
                          <td className="text-right px-2 py-0.5 text-xs font-semibold text-blue-600">{tL > 0 ? ((c.adjLeads / tL) * 100).toFixed(1) : "0"}%</td>
                          <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{c.adjAgendas}</td>
                          <td className="text-right px-2 py-0.5 text-xs font-semibold text-blue-600">{tA > 0 ? ((c.adjAgendas / tA) * 100).toFixed(1) : "0"}%</td>
                          <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{c.adjVentas}</td>
                          <td className="text-right px-2 py-0.5 text-xs font-semibold text-blue-600">{tV > 0 ? ((c.adjVentas / tV) * 100).toFixed(1) : "0"}%</td>
                          <td className="text-right px-2 py-0.5 text-xs font-semibold text-blue-600">{c.adjLeads > 0 ? ((c.adjAgendas / c.adjLeads) * 100).toFixed(1) : "0"}%</td>
                          <td className="text-right px-2 py-0.5 text-xs font-semibold text-blue-600">{c.adjLeads > 0 ? ((c.adjVentas / c.adjLeads) * 100).toFixed(1) : "0"}%</td>
                          <td className="text-right px-3 py-0.5 text-xs font-semibold text-blue-600">{c.adjAgendas > 0 ? ((c.adjVentas / c.adjAgendas) * 100).toFixed(1) : "0"}%</td>
                          <EcoCells eco={economics.paid.adjusted[c.campaign]} showTiempo />
                        </tr>
                      ));
                    })()}
                    {(() => {
                      const tL = adjustedPaidCampaigns.reduce((s, c) => s + c.adjLeads, 0);
                      const tA = adjustedPaidCampaigns.reduce((s, c) => s + c.adjAgendas, 0);
                      const tV = adjustedPaidCampaigns.reduce((s, c) => s + c.adjVentas, 0);
                      return (
                        <tr className="border-t border-blue-200 bg-blue-50/50 font-bold">
                          <td className="px-3 py-0.5 text-xs text-blue-800">Total</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-900">{tL.toLocaleString("es-ES")}</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-900">{tA}</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-900">{tV}</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                          <td className="text-right px-2 py-0.5 text-xs text-blue-700">{tL > 0 ? ((tA / tL) * 100).toFixed(1) : "0"}%</td>
                          <td className="text-right px-2 py-0.5 text-xs text-blue-700">{tL > 0 ? ((tV / tL) * 100).toFixed(1) : "0"}%</td>
                          <td className="text-right px-3 py-0.5 text-xs text-blue-700">{tA > 0 ? ((tV / tA) * 100).toFixed(1) : "0"}%</td>
                          <td colSpan={8} className="border-l-2 border-amber-200" />
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {/* 6. Afiliados */}
          {affiliateMedia && affiliateMedia.types.length > 0 && (
            <>
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto mt-0.5">
                <table className="w-full min-w-[1100px]" style={{ fontSize: "11px" }}>
                  <thead>
                    <tr className="bg-purple-800"><td colSpan={14} className="px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest">6. Afiliados</td></tr>
                    <tr className="bg-amber-50 border-b border-amber-200">
                      <th colSpan={7} /><th colSpan={3} className="text-center px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase border-l-2 border-amber-200">Sin RTG</th><th colSpan={4} className="text-center px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase border-l border-amber-200">Con RTG</th>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Fuente</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Captacion</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">%</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Agendas</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">%</th>
                      <th className="text-right px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase">Ventas</th>
                      <th className="text-right px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase">%</th>
                      <>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase border-l-2 border-amber-200">Inv.</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">Fact.</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">ROAS</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase border-l border-amber-200">Inv.</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">Fact.</th>
                        <th className="text-right px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">CPA</th>
                        <th className="text-right px-3 py-0.5 text-[10px] font-bold text-amber-600 uppercase">ROAS</th>
                      </>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Bruto */}
                    <tr className="bg-gray-50/30"><td colSpan={14} className="px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Datos brutos (con untracked)</td></tr>
                    {affiliateMedia.types.map((a) => (
                      <tr key={a.affiliate} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-0.5 text-xs font-semibold text-gray-700">{a.affiliate}</td>
                        <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{a.leads.toLocaleString("es-ES")}</td>
                        <td className="text-right px-2 py-0.5 text-xs font-semibold text-purple-600">{a.leadsPct}%</td>
                        <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{a.agendasUnicas}</td>
                        <td className="text-right px-2 py-0.5 text-xs font-semibold text-purple-600">{a.agendasPct}%</td>
                        <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{a.ventas}</td>
                        <td className="text-right px-3 py-0.5 text-xs font-semibold text-purple-600">{a.ventasPct}%</td>
                        <EcoCells eco={economics.affiliates.raw[a.affiliate]} />
                      </tr>
                    ))}
                    <tr className="border-t border-gray-200 bg-gray-50/80 font-bold">
                      <td className="px-3 py-0.5 text-xs text-gray-700">Total</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-900">{affiliateMedia.totalLeads.toLocaleString("es-ES")}</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-900">{affiliateMedia.totalAgendas}</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                      <td className="text-right px-2 py-0.5 text-xs text-gray-900">{affiliateMedia.totalVentas}</td>
                      <td className="text-right px-3 py-0.5 text-xs text-gray-400">100%</td>
                      <EcoCells eco={economics.affiliates.total} bold />
                    </tr>
                    {/* Ajustado */}
                    <tr className="bg-purple-50/50 border-t-2 border-purple-200"><td colSpan={14} className="px-3 py-0.5 text-[10px] font-bold text-purple-700 uppercase tracking-widest">Datos ajustados (untracked distribuido)</td></tr>
                    {(() => {
                      const tL = adjustedAffiliates.reduce((s, t) => s + t.adjLeads, 0);
                      const tA = adjustedAffiliates.reduce((s, t) => s + t.adjAgendas, 0);
                      const tV = adjustedAffiliates.reduce((s, t) => s + t.adjVentas, 0);
                      return adjustedAffiliates.map((t) => (
                        <tr key={`adj-${t.affiliate}`} className="border-t border-purple-100 hover:bg-purple-50/30">
                          <td className="px-3 py-0.5 text-xs font-semibold text-gray-700">{t.affiliate}</td>
                          <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{t.adjLeads.toLocaleString("es-ES")}</td>
                          <td className="text-right px-2 py-0.5 text-xs font-semibold text-purple-600">{tL > 0 ? ((t.adjLeads / tL) * 100).toFixed(1) : "0"}%</td>
                          <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{t.adjAgendas}</td>
                          <td className="text-right px-2 py-0.5 text-xs font-semibold text-purple-600">{tA > 0 ? ((t.adjAgendas / tA) * 100).toFixed(1) : "0"}%</td>
                          <td className="text-right px-2 py-0.5 text-xs font-bold text-gray-900">{t.adjVentas}</td>
                          <td className="text-right px-3 py-0.5 text-xs font-semibold text-purple-600">{tV > 0 ? ((t.adjVentas / tV) * 100).toFixed(1) : "0"}%</td>
                          <EcoCells eco={economics.affiliates.adjusted[t.affiliate]} />
                        </tr>
                      ));
                    })()}
                    {(() => {
                      const tL = adjustedAffiliates.reduce((s, t) => s + t.adjLeads, 0);
                      const tA = adjustedAffiliates.reduce((s, t) => s + t.adjAgendas, 0);
                      const tV = adjustedAffiliates.reduce((s, t) => s + t.adjVentas, 0);
                      return (
                        <tr className="border-t border-purple-200 bg-purple-50/50 font-bold">
                          <td className="px-3 py-0.5 text-xs text-purple-800">Total</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-900">{tL.toLocaleString("es-ES")}</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-900">{tA}</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-400">100%</td>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-900">{tV}</td>
                          <td className="text-right px-3 py-0.5 text-xs text-gray-400">100%</td>
                          <td colSpan={7} className="border-l-2 border-amber-200" />
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {/* 6. Estudio por comercial */}
          {adjustedComerciales.length > 0 && (() => {
            const t = adjustedComerciales.reduce((acc, c) => ({
              agendas: acc.agendas + c.agendas,
              agendasUnicas: acc.agendasUnicas + c.agendasUnicas, ventas: acc.ventas + c.ventas,
              av0Ag: acc.av0Ag + c.paidAV0Agendas, av2Ag: acc.av2Ag + c.paidAV2Agendas,
              av0Ve: acc.av0Ve + c.paidAV0Ventas, av2Ve: acc.av2Ve + c.paidAV2Ventas,
              orgAg: acc.orgAg + c.orgAgendas, orgVe: acc.orgVe + c.orgVentas,
              affAg: acc.affAg + c.affAgendas, affVe: acc.affVe + c.affVentas,
            }), { agendas: 0, agendasUnicas: 0, ventas: 0, av0Ag: 0, av2Ag: 0, av0Ve: 0, av2Ve: 0, orgAg: 0, orgVe: 0, affAg: 0, affVe: 0 });

            type MetricRow = { label: string; group?: string; values: (string | number)[]; bold?: boolean; color?: string };
            const cols = [...adjustedComerciales];
            const rows: MetricRow[] = [
              { label: "Agendas", values: cols.map((c) => c.agendas), bold: true },
              { label: "Agendas únicas", values: cols.map((c) => c.agendasUnicas) },
              { label: "Ventas", values: cols.map((c) => c.ventas), bold: true },
              { label: "Cierre agenda", values: cols.map((c) => c.cierre + "%"), bold: true },
              { label: "Ag. AV0", group: "Paid", values: cols.map((c) => c.paidAV0Agendas), color: "text-blue-600" },
              { label: "Ag. AV2", group: "Paid", values: cols.map((c) => c.paidAV2Agendas), color: "text-blue-600" },
              { label: "V. AV0", group: "Paid", values: cols.map((c) => c.paidAV0Ventas), color: "text-blue-600" },
              { label: "V. AV2", group: "Paid", values: cols.map((c) => c.paidAV2Ventas), color: "text-blue-600" },
              { label: "Total Ag", group: "Paid", values: cols.map((c) => c.paidAV0Agendas + c.paidAV2Agendas), bold: true, color: "text-blue-700" },
              { label: "Total V", group: "Paid", values: cols.map((c) => c.paidAV0Ventas + c.paidAV2Ventas), bold: true, color: "text-blue-700" },
              { label: "Cierre AV0/AV2", group: "Paid", values: cols.map((c) => c.cierreAV0 + "% / " + c.cierreAV2 + "%"), color: "text-blue-600" },
              { label: "Agendas", group: "Orgánico", values: cols.map((c) => c.orgAgendas), color: "text-emerald-600" },
              { label: "Ventas", group: "Orgánico", values: cols.map((c) => c.orgVentas), color: "text-emerald-600" },
              { label: "Cierre", group: "Orgánico", values: cols.map((c) => c.cierreOrg + "%"), bold: true, color: "text-emerald-600" },
              { label: "Agendas", group: "Afiliados", values: cols.map((c) => c.affAgendas), color: "text-purple-600" },
              { label: "Ventas", group: "Afiliados", values: cols.map((c) => c.affVentas), color: "text-purple-600" },
              { label: "Cierre", group: "Afiliados", values: cols.map((c) => c.cierreAff + "%"), bold: true, color: "text-purple-600" },
            ];
            let lastGroup = "";
            return (<>
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto mt-0.5">
                <table className="w-full min-w-[700px]" style={{ fontSize: "12px" }}>
                  <thead>
                    <tr className="bg-amber-700">
                      <td colSpan={cols.length + 1} className="px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest">6. Estudio por comercial <span className="font-normal opacity-70">· untracked distribuido</span></td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50/60">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase w-[110px]"></th>
                      {cols.map((c) => (
                        <th key={c.comercial} className="text-center py-2.5 text-sm font-bold text-gray-700 uppercase border-l border-gray-100">{c.comercial}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const showGroupHeader = row.group && row.group !== lastGroup;
                      if (row.group) lastGroup = row.group;
                      const groupColors: Record<string, string> = { Paid: "bg-blue-50/50 text-blue-700", "Orgánico": "bg-emerald-50/50 text-emerald-700", Afiliados: "bg-purple-50/50 text-purple-700" };
                      return (
                        <React.Fragment key={i}>
                          {showGroupHeader && (
                            <tr><td colSpan={cols.length + 1} className={`px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest ${groupColors[row.group!] ?? "text-gray-500"}`}>{row.group}</td></tr>
                          )}
                          <tr className={`border-t border-gray-50 hover:bg-gray-50/50 ${!row.group && i === 3 ? "border-b-2 border-gray-200" : ""}`}>
                            <td className={`px-4 py-1.5 text-xs text-gray-500 whitespace-nowrap ${row.bold ? "font-bold" : ""}`}>{row.label}</td>
                            {row.values.map((v, j) => (
                              <td key={j} className={`text-center px-6 py-1.5 text-sm border-l border-gray-100 ${row.bold ? "font-bold" : ""} ${row.color ?? "text-gray-900"}`}>{v}</td>
                            ))}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>);
          })()}

          {/* Detalle por dia y closer */}
          <h3 className="text-sm font-bold text-gray-700 mt-2">Detalle por dia</h3>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[700px]" style={{ fontSize: "11px" }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">Dia</th>
                  {closerPerformance.map((c) => (
                    <th key={c.closer} colSpan={3} className="text-center px-2 py-1 text-[10px] font-bold text-gray-500 uppercase border-l border-gray-100">
                      {c.closer}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50/40">
                  <th />
                  {closerPerformance.map((c) => (
                    <React.Fragment key={c.closer}>
                      <th className="text-right px-2 py-0.5 text-[9px] font-bold text-gray-400 uppercase border-l border-gray-100">Cel</th>
                      <th className="text-right px-2 py-0.5 text-[9px] font-bold text-gray-400 uppercase">Vent</th>
                      <th className="text-right px-2 py-0.5 text-[9px] font-bold text-gray-400 uppercase">%</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {timeline.map((t) => (
                  <tr key={t.date} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-0.5 text-xs font-semibold text-gray-600">
                      {new Date(t.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", weekday: "short" })}
                    </td>
                    {closerPerformance.map((c) => {
                      const dayData = c.days.find((d) => d.date === t.date);
                      const cel = dayData ? dayData.celebradas : 0;
                      const ven = dayData ? dayData.ventas : 0;
                      const pct = cel > 0 ? ((ven / cel) * 100).toFixed(0) : "—";
                      return (
                        <React.Fragment key={c.closer}>
                          <td className="text-right px-2 py-0.5 text-xs text-gray-600 border-l border-gray-100">{cel || <span className="text-gray-300">—</span>}</td>
                          <td className="text-right px-2 py-0.5 text-xs font-bold text-emerald-600">{ven || <span className="text-gray-300 font-normal">—</span>}</td>
                          <td className="text-right px-2 py-0.5 text-xs font-semibold text-gray-500">{pct === "—" ? <span className="text-gray-300">—</span> : `${pct}%`}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 7. Conclusiones del lanzamiento */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">7. Conclusiones del lanzamiento</h2>
              <button
                onClick={() => setShowNewNota(true)}
                className="flex items-center gap-1.5 px-3 py-0.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir
              </button>
            </div>

            {showNewNota && (
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Titulo..."
                    value={newTitulo}
                    onChange={(e) => setNewTitulo(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300"
                  />
                  <select
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300"
                  >
                    <option value="conclusion">Conclusion</option>
                    <option value="nota">Nota</option>
                    <option value="mejora">Mejora</option>
                  </select>
                </div>
                <textarea
                  placeholder="Contenido..."
                  value={newContenido}
                  onChange={(e) => setNewContenido(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300 resize-none"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => setShowNewNota(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                  <button
                    onClick={handleCreateNota}
                    disabled={!newTitulo.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {notas.length === 0 && !showNewNota ? (
              <div className="text-center py-10 text-gray-400 text-sm">No hay conclusiones para esta edicion</div>
            ) : (
              <div className="space-y-3">
                {notas.map((nota) => (
                  <div key={nota.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    {editingNotaId === nota.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <input type="text" value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300" />
                          <select value={editTipo} onChange={(e) => setEditTipo(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300">
                            <option value="conclusion">Conclusion</option>
                            <option value="nota">Nota</option>
                            <option value="mejora">Mejora</option>
                          </select>
                        </div>
                        <textarea value={editContenido} onChange={(e) => setEditContenido(e.target.value)} rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300 resize-none" />
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setEditingNotaId(null)} className="p-1.5 text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
                          <button onClick={() => handleUpdateNota(nota.id)}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
                            <Save className="h-3.5 w-3.5" />Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {nota.tipo === "conclusion" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-emerald-500"><FileText className="h-3 w-3" />Conclusion</span>}
                            {nota.tipo === "nota" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-blue-500"><Lightbulb className="h-3 w-3" />Nota</span>}
                            {nota.tipo === "mejora" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-amber-500"><AlertTriangle className="h-3 w-3" />Mejora</span>}
                            <span className="text-[11px] text-gray-400">
                              {new Date(nota.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-900">{nota.titulo}</h3>
                          {nota.contenido && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{nota.contenido}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditingNotaId(nota.id); setEditTitulo(nota.titulo); setEditContenido(nota.contenido); setEditTipo(nota.tipo); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"><Edit3 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDeleteNota(nota.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
