"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Users, RefreshCw, AlertCircle, TrendingUp, Wallet, Receipt, PhoneCall, AlertTriangle,
  CreditCard, Building2, Sparkles, Filter,
} from "lucide-react";

type KPIs = {
  cash_collected: number;
  bruto_cobrado: number;
  importe_reembolsado: number;
  net_revenue: number;
  importe_overdue: number;
  importe_pendiente_aprobacion: number;
  importe_proximas_cuotas: number;
  prevision_bruta: number;
  prevision_ajustada: number;
  comision_total: number;
  num_alumnos_activos: number;
  num_reembolsadas: number;
  num_canceladas: number;
  num_total: number;
  refund_rate: number;
  tasa_impago: number;
  cuotas_cobradas_hist: number;
  cuotas_impagadas_hist: number;
};

type CohortRow = { cohort: string; nombre: string; ventas: number; reembolsos: number; cash: number; overdue: number; impagados: number };
type CohortOption = { value: string; label: string };
type BucketRow = { bucket: string; ventas: number; cash: number; reembolsadas: number; refund_rate: number };
type MetodoCuotasRow = { bucket: string; label: string; sort: number; ventas: number; completadas: number; reembolsadas: number; pdte_aprobacion: number; activas: number; cash: number; refund_rate: number; cash_avg: number };

type Recobro = {
  buyer_email: string | null;
  buyer_name: string | null;
  cohort: string | null;
  payment_method: string | null;
  cuotas_pagadas: number;
  installments_total: number | null;
  cuotas_overdue: number;
  importe_overdue: number;
  cash_collected: number;
  dias_overdue: number | null;
  ultimo_pago_at: string | null;
  status_orden: string;
};

type EstadoCuotas = {
  cobradas: number;
  en_proceso: number;
  overdue_recientes: number;
  pdte_aprobacion: number;
  perdidas: number;
  overdue_perdidas: number;
  perdidas_cerradas: number;
  reembolsadas: number;
  total: number;
};

type Resp = {
  cohorts: CohortOption[];
  por_bucket: BucketRow[];
  por_metodo_cuotas: MetodoCuotasRow[];
  total_ventas_reales: number;
  reservas_count: number;
  reservas_reembolsadas: number;
  estado_cuotas: EstadoCuotas;
  kpis: KPIs;
  cash_por_mes: { mes: string; cash: number }[];
  por_cohort: CohortRow[];
  recobros: Recobro[];
};

const fmtEur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);

const BUCKET_STYLE: Record<string, { bg: string; from: string; to: string; ring: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  "Sequra":         { bg: "bg-purple-500",  from: "from-purple-500",  to: "to-purple-600",  ring: "ring-purple-200",  icon: CreditCard },
  "Pago Hotmart":   { bg: "bg-blue-500",    from: "from-blue-500",    to: "to-blue-600",    ring: "ring-blue-200",    icon: Sparkles },
  "Transferencia":  { bg: "bg-emerald-500", from: "from-emerald-500", to: "to-emerald-600", ring: "ring-emerald-200", icon: Building2 },
  "Klarna":         { bg: "bg-rose-500",    from: "from-rose-500",    to: "to-rose-600",    ring: "ring-rose-200",    icon: CreditCard },
};

export default function PagosRecobrosTab() {
  const [cohort, setCohort] = useState("Global");
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/administracion/pagos-recobros?cohort=${encodeURIComponent(cohort)}&currency=EUR`)
      .then((r) => r.json())
      .then((d: Resp & { error?: string }) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [cohort]);

  const recobrosFiltrados = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    if (!s) return data.recobros;
    return data.recobros.filter(
      (r) =>
        (r.buyer_name ?? "").toLowerCase().includes(s) ||
        (r.buyer_email ?? "").toLowerCase().includes(s) ||
        (r.cohort ?? "").toLowerCase().includes(s)
    );
  }, [data, search]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-amber-600" size={32} />
      </div>
    );
  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
        <p className="font-semibold">Error cargando datos</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  if (!data) return null;

  const k = data.kpis;
  const totalOverdueCuotas = data.recobros.reduce((s, r) => s + r.cuotas_overdue, 0);
  const totalRecobros = data.recobros.length;
  const previsionImpactoPct = k.prevision_bruta > 0 ? ((k.prevision_bruta - k.prevision_ajustada) / k.prevision_bruta) * 100 : 0;

  return (
    <div className="space-y-10">
      {/* Filtros sticky */}
      <div className="sticky top-0 z-10 -mx-8 px-8 py-3 bg-gradient-to-b from-white via-white to-white/0 backdrop-blur flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter size={14} className="text-gray-400" />
          <span>Cohort:</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white shadow-sm hover:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200 transition"
          >
            {data.cohorts.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Caja real — cards limpias con accent lateral */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CleanCard
            icon={<Wallet size={18} />}
            label="Cash collected"
            value={fmtEur(k.cash_collected)}
            subtitle={`Bruto ${fmtEur(k.bruto_cobrado)} − comisión ${fmtEur(k.comision_total)}`}
            accent="emerald"
            highlight
          />
          <CleanCard
            icon={<TrendingUp size={18} />}
            label="Net revenue"
            value={fmtEur(k.net_revenue)}
            subtitle="Cash − reembolsos"
            accent="blue"
          />
          <CleanCard
            icon={<RefreshCw size={18} />}
            label="Reembolsado"
            value={fmtEur(k.importe_reembolsado)}
            subtitle={`Refund rate ${k.refund_rate.toFixed(1)}%`}
            accent="rose"
          />
          <CleanCard
            icon={<Users size={18} />}
            label="Alumnos activos"
            value={fmtNum(k.num_alumnos_activos)}
            subtitle={`${fmtNum(k.num_reembolsadas)} reembolsadas · ${fmtNum(k.num_canceladas)} canceladas`}
            accent="amber"
          />
        </div>
      </section>

      {/* ESTADO GLOBAL DE CUOTAS — pirámide explícita para evitar confusiones */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt size={20} className="text-blue-600" />
              Estado de cuotas
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Total de {fmtNum(data.estado_cuotas.total)} cuotas detectadas en órdenes activas/reembolsadas (sin canceladas globales)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CuotaCard
            color="emerald"
            label="Cobradas"
            value={data.estado_cuotas.cobradas}
            total={data.estado_cuotas.total}
            description="Pago confirmado (COMPLETE)"
          />
          <CuotaCard
            color="amber"
            label="En proceso"
            value={data.estado_cuotas.en_proceso}
            total={data.estado_cuotas.total}
            description={`${fmtNum(data.estado_cuotas.overdue_recientes)} overdue ≤60d · ${fmtNum(data.estado_cuotas.pdte_aprobacion)} pdte. aprobación`}
          />
          <CuotaCard
            color="rose"
            label="Perdidas"
            value={data.estado_cuotas.perdidas}
            total={data.estado_cuotas.total}
            description={`${fmtNum(data.estado_cuotas.overdue_perdidas)} overdue >60d · ${fmtNum(data.estado_cuotas.perdidas_cerradas)} cancelled/expired`}
          />
          <CuotaCard
            color="purple"
            label="Reembolsadas"
            value={data.estado_cuotas.reembolsadas}
            total={data.estado_cuotas.total}
            description="Devolución procesada"
          />
        </div>
      </section>

      {/* PREVISIÓN destacada */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-purple-600" />
              Previsión de caja
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Tasa de impago: <strong className="text-rose-700">{k.tasa_impago.toFixed(1)}%</strong>
              <span className="text-gray-400"> sobre cuotas con destino final cerrado (cobradas o perdidas)</span>
            </p>
          </div>
        </div>

        {/* 4 cards alineados */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <MiniCard icon={<PhoneCall size={16} />} label="Por cobrar (overdue)" value={fmtEur(k.importe_overdue)}
            subtitle={`${totalRecobros} alumnos con cuotas atrasadas`} accent="orange" />
          <MiniCard icon={<AlertCircle size={16} />} label="Pdte. aprobación" value={fmtEur(k.importe_pendiente_aprobacion)}
            subtitle="Esperando confirmación" accent="yellow" />
          <MiniCard icon={<Receipt size={16} />} label="Próximas cuotas" value={fmtEur(k.importe_proximas_cuotas)}
            subtitle="Planificadas no vencidas" accent="indigo" />
          <MiniCard icon={<AlertTriangle size={16} />} label="Tasa impago" value={`${k.tasa_impago.toFixed(1)}%`}
            subtitle="Histórico resuelto" accent="rose" />
        </div>

        {/* Cards previsión — más sutiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border-l-4 border-purple-500 border-t border-r border-b border-gray-100 p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">Previsión bruta</div>
            <div className="text-3xl font-bold text-gray-900">{fmtEur(k.prevision_bruta)}</div>
            <div className="text-xs text-gray-500 mt-1">Overdue + pdte. aprobación + próximas</div>
          </div>
          <div className="bg-white rounded-2xl border-l-4 border-emerald-500 border-t border-r border-b border-gray-100 p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-2">
              Previsión ajustada
              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold">−{previsionImpactoPct.toFixed(1)}%</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{fmtEur(k.prevision_ajustada)}</div>
            <div className="text-xs text-gray-500 mt-1">Restando tasa de impago histórica</div>
          </div>
        </div>
      </section>

      {/* MÉTODOS DE PAGO con barras */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-600" />
              Ventas por método de pago
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{fmtNum(data.total_ventas_reales)} ventas reales (sin canceladas)</p>
          </div>
        </div>

        {/* Cards bucket con progress bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {data.por_bucket.map((b) => {
            const pct = data.total_ventas_reales > 0 ? (b.ventas / data.total_ventas_reales) * 100 : 0;
            const style = BUCKET_STYLE[b.bucket] ?? BUCKET_STYLE["Pago Hotmart"];
            const Icon = style.icon;
            return (
              <div key={b.bucket} className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl ${style.bg} text-white shadow-sm`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-2xl font-black text-gray-900">{pct.toFixed(0)}%</span>
                </div>
                <div className="text-sm font-bold text-gray-900">{b.bucket}</div>
                <div className="text-xs text-gray-500 mt-0.5">{fmtNum(b.ventas)} ventas · {fmtEur(b.cash)}</div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${style.from} ${style.to}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Refund</span>
                  <span className={b.refund_rate > 15 ? "text-rose-600 font-semibold" : "text-gray-600 font-medium"}>
                    {b.refund_rate.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabla detalle por método + cuotas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="font-bold text-gray-900 text-base">Detalle método · plan</h3>
            <p className="text-xs text-gray-500 mt-0.5">Pagos Hotmart agrupan Visa/Mastercard/PayPal/AMEX. Sequra paga al contado a Hotmart aunque cobre al cliente en cuotas.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/40">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Método · Plan</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Ventas</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">% Total</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Reemb.</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">% Reemb.</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Cash</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Cash medio</th>
                </tr>
              </thead>
              <tbody>
                {data.por_metodo_cuotas.map((m, i) => {
                  const pct = data.total_ventas_reales > 0 ? (m.ventas / data.total_ventas_reales) * 100 : 0;
                  const style = BUCKET_STYLE[m.bucket] ?? BUCKET_STYLE["Pago Hotmart"];
                  return (
                    <tr key={m.label} className={`border-b border-gray-50 hover:bg-gray-50/60 ${i % 2 === 1 ? "bg-gray-50/20" : ""}`}>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${style.bg}`} />
                          {m.label}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-gray-900">{fmtNum(m.ventas)}</td>
                      <td className="px-3 py-3 text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${style.from} ${style.to}`} style={{ width: `${Math.min(pct * 2, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-10">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-rose-700">{fmtNum(m.reembolsadas)}</td>
                      <td className="px-3 py-3 text-right text-sm">
                        <span className={`px-2 py-0.5 rounded ${m.refund_rate > 15 ? "bg-rose-50 text-rose-700" : "bg-gray-50 text-gray-600"}`}>
                          {m.refund_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{fmtEur(m.cash)}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-500">{fmtEur(m.cash_avg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* POR EDICIÓN */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={20} className="text-amber-600" />
              Resultado por edición
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Ventas totales (incluyen reembolsadas) por lanzamiento.
              {data.reservas_count > 0 && (
                <span className="text-gray-400"> · Excluidas {fmtNum(data.reservas_count)} reservas (€50-€500) que no son del curso.</span>
              )}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gradient-to-r from-amber-50/40 to-white">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Edición</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide" title="Total de ventas (incluyendo las que pidieron reembolso)">Ventas tot.</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Reemb.</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide" title="Ventas que NO han pedido reembolso">Net</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">% Ref.</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide" title="Cuotas que no se han cobrado: overdue (en proceso) + cancelled + expired + chargeback">Cuotas pdtes.</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Cash</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {data.por_cohort.map((c, i) => {
                  const tasa = c.ventas > 0 ? (c.reembolsos / c.ventas) * 100 : 0;
                  const net = c.ventas - c.reembolsos;
                  return (
                    <tr key={c.cohort} className={`border-b border-gray-50 hover:bg-amber-50/20 ${i % 2 === 1 ? "bg-gray-50/30" : ""}`}>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">{c.nombre}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{fmtNum(c.ventas)}</td>
                      <td className="px-4 py-3 text-right text-sm text-rose-700">{fmtNum(c.reembolsos)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{fmtNum(net)}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={`px-2 py-0.5 rounded ${tasa > 15 ? "bg-rose-50 text-rose-700 font-semibold" : "bg-gray-50 text-gray-600"}`}>
                          {tasa.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-rose-600">{fmtNum(c.impagados)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{fmtEur(c.cash)}</td>
                      <td className="px-6 py-3 text-right text-sm">
                        {c.overdue > 0 ? <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-semibold">{fmtEur(c.overdue)}</span> : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {(() => {
                const totVentas = data.por_cohort.reduce((s, c) => s + c.ventas, 0);
                const totReemb = data.por_cohort.reduce((s, c) => s + c.reembolsos, 0);
                const totImp = data.por_cohort.reduce((s, c) => s + c.impagados, 0);
                const totCash = data.por_cohort.reduce((s, c) => s + c.cash, 0);
                const totOverdue = data.por_cohort.reduce((s, c) => s + c.overdue, 0);
                const totNet = totVentas - totReemb;
                const tasaTot = totVentas > 0 ? (totReemb / totVentas) * 100 : 0;
                return (
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                      <td className="px-6 py-3 text-sm text-gray-900">TOTAL</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{fmtNum(totVentas)}</td>
                      <td className="px-4 py-3 text-right text-sm text-rose-700">{fmtNum(totReemb)}</td>
                      <td className="px-4 py-3 text-right text-sm text-emerald-700">{fmtNum(totNet)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{tasaTot.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right text-sm text-rose-600">{fmtNum(totImp)}</td>
                      <td className="px-4 py-3 text-right text-sm text-emerald-700">{fmtEur(totCash)}</td>
                      <td className="px-6 py-3 text-right text-sm text-orange-700">{totOverdue > 0 ? fmtEur(totOverdue) : "—"}</td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      </section>

      {/* RECOBROS */}
      <section>
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <PhoneCall size={20} className="text-orange-600" />
              Recobros pendientes
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Total a cobrar: <strong className="text-orange-700">{fmtEur(k.importe_overdue)}</strong>
              <span className="text-gray-400"> · ajustado por impago: {fmtEur(k.importe_overdue * (1 - k.tasa_impago / 100))}</span>
            </p>
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, email o cohort"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
          />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {recobrosFiltrados.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-3">
                <Sparkles size={28} className="text-emerald-600" />
              </div>
              <p className="text-gray-600 font-medium">Sin recobros pendientes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gradient-to-r from-orange-50/40 to-white">
                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Alumno</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Cohort</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Método</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Pagadas</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Overdue</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Importe</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Días</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recobrosFiltrados.map((r, i) => (
                    <tr key={`${r.buyer_email}-${i}`} className={`border-b border-gray-50 hover:bg-orange-50/30 transition ${i % 2 === 1 ? "bg-gray-50/30" : ""}`}>
                      <td className="px-6 py-3">
                        <div className="text-sm font-semibold text-gray-900">{r.buyer_name ?? "—"}</div>
                        <div className="text-xs text-gray-500">{r.buyer_email ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.cohort ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.payment_method ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{r.cuotas_pagadas}/{r.installments_total ?? "?"}</td>
                      <td className="px-4 py-3 text-right text-sm text-rose-600 font-bold">{r.cuotas_overdue}</td>
                      <td className="px-4 py-3 text-right text-sm text-orange-700 font-bold">{fmtEur(r.importe_overdue)}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        {r.dias_overdue !== null ? (
                          <span className={`px-2 py-0.5 rounded ${r.dias_overdue > 30 ? "bg-rose-50 text-rose-700 font-semibold" : "bg-gray-50 text-gray-700"}`}>
                            {r.dias_overdue}d
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-3"><StatusBadge status={r.status_orden} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CleanCard({ icon, label, value, subtitle, accent, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  accent: "emerald" | "blue" | "rose" | "amber";
  highlight?: boolean;
}) {
  const map: Record<string, { border: string; iconBg: string; iconText: string }> = {
    emerald: { border: "border-l-emerald-500", iconBg: "bg-emerald-50",  iconText: "text-emerald-600" },
    blue:    { border: "border-l-blue-500",    iconBg: "bg-blue-50",     iconText: "text-blue-600" },
    rose:    { border: "border-l-rose-500",    iconBg: "bg-rose-50",     iconText: "text-rose-600" },
    amber:   { border: "border-l-amber-500",   iconBg: "bg-amber-50",    iconText: "text-amber-600" },
  };
  const s = map[accent];
  return (
    <div className={`bg-white rounded-2xl border-l-4 ${s.border} border-t border-r border-b border-gray-100 p-5 shadow-sm ${highlight ? "lg:col-span-1" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
        <span className={`p-1.5 rounded-lg ${s.iconBg} ${s.iconText}`}>{icon}</span>
      </div>
      <div className={`${highlight ? "text-3xl" : "text-2xl"} font-bold text-gray-900`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function CuotaCard({ color, label, value, total, description }: {
  color: "emerald" | "amber" | "rose" | "purple";
  label: string;
  value: number;
  total: number;
  description: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const map: Record<string, { bg: string; bar: string; text: string; ring: string }> = {
    emerald: { bg: "bg-emerald-50/40", bar: "from-emerald-400 to-emerald-600", text: "text-emerald-700", ring: "ring-emerald-100" },
    amber:   { bg: "bg-amber-50/40",   bar: "from-amber-400 to-orange-500",   text: "text-amber-700",   ring: "ring-amber-100" },
    rose:    { bg: "bg-rose-50/40",    bar: "from-rose-400 to-rose-600",      text: "text-rose-700",    ring: "ring-rose-100" },
    purple:  { bg: "bg-purple-50/40",  bar: "from-purple-400 to-purple-600",  text: "text-purple-700",  ring: "ring-purple-100" },
  };
  const s = map[color];
  return (
    <div className={`relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:ring-4 ${s.ring} transition p-5`}>
      <div className="flex items-baseline justify-between mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${s.text}`}>{label}</span>
        <span className="text-xs text-gray-400 font-medium">{pct.toFixed(1)}%</span>
      </div>
      <div className="text-3xl font-black text-gray-900">{new Intl.NumberFormat("es-ES").format(value)}</div>
      <div className="text-[11px] text-gray-500 mt-1 leading-tight">{description}</div>
      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${s.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniCard({
  icon, label, value, subtitle, accent,
}: { icon: React.ReactNode; label: string; value: string; subtitle?: string; accent: "orange" | "yellow" | "indigo" | "rose"; }) {
  const map: Record<string, { ring: string; iconBg: string; iconText: string }> = {
    orange: { ring: "ring-orange-100", iconBg: "bg-orange-100", iconText: "text-orange-600" },
    yellow: { ring: "ring-yellow-100", iconBg: "bg-yellow-100", iconText: "text-yellow-700" },
    indigo: { ring: "ring-indigo-100", iconBg: "bg-indigo-100", iconText: "text-indigo-600" },
    rose:   { ring: "ring-rose-100",   iconBg: "bg-rose-100",   iconText: "text-rose-600" },
  };
  const s = map[accent];
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:ring-4 ${s.ring} transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
        <span className={`p-1.5 rounded-lg ${s.iconBg} ${s.iconText}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-[11px] text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    ACTIVA: { bg: "bg-blue-100 text-blue-700", label: "Activa" },
    ACTIVA_CON_RETRASO: { bg: "bg-orange-100 text-orange-700", label: "Activa con retraso" },
    COMPLETADA: { bg: "bg-emerald-100 text-emerald-700", label: "Completada" },
    REEMBOLSADA: { bg: "bg-rose-100 text-rose-700", label: "Reembolsada" },
    REEMBOLSADA_PARCIAL: { bg: "bg-rose-100 text-rose-700", label: "Reemb. parcial" },
    CANCELADA: { bg: "bg-gray-100 text-gray-600", label: "Cancelada" },
    PENDIENTE_APROBACION: { bg: "bg-yellow-100 text-yellow-700", label: "Pdte. aprob." },
    OTRO: { bg: "bg-gray-100 text-gray-600", label: "Otro" },
  };
  const c = map[status] ?? map.OTRO;
  return <span className={`px-2 py-1 rounded-md text-xs font-medium ${c.bg}`}>{c.label}</span>;
}
