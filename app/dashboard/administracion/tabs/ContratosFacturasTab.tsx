"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, FileText, Receipt, AlertTriangle, CheckCircle2, XCircle, Filter } from "lucide-react";

type Stats = {
  total: number;
  contrato_firmado: number;
  contrato_enviado: number;
  contrato_no: number;
  factura_emitida: number;
  factura_asignada: number;
  factura_no: number;
  sin_ambos_confirmados: number;
  sin_onboarding: number;
};

type ContratoState = "firmado" | "enviado" | "no";
type FacturaState = "emitida" | "asignada" | "no";

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

type Resp = {
  cohorts: { value: string; label: string }[];
  stats: Stats;
  rows: Row[];
};

const fmtNum = (n: number) => new Intl.NumberFormat("es-ES").format(n);

export default function ContratosFacturasTab() {
  const [cohort, setCohort] = useState("Global");
  const [filter, setFilter] = useState<"all" | "missing_contract" | "missing_invoice" | "missing_both">("all");
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/administracion/contratos-facturas?cohort=${encodeURIComponent(cohort)}&filter=${filter}`)
      .then((r) => r.json())
      .then((d: Resp & { error?: string }) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [cohort, filter]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    if (!s) return data.rows;
    return data.rows.filter(
      (r) =>
        (r.buyer_name ?? "").toLowerCase().includes(s) ||
        r.buyer_email.toLowerCase().includes(s) ||
        r.cohort_label.toLowerCase().includes(s)
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

  return (
    <div className="space-y-8">
      {/* Banner aviso conexiones pendientes */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
        <div><strong>Datos preliminares.</strong> Hoy se cruzan 3 tablas locales: <code>onboarding</code>, <code>purchase_approved</code> y <code>billing_info</code>.</div>
        <div className="text-xs">
          <strong>Contrato</strong> · 🟢 Firmado (verificado en OB) · 🟡 Enviado (id asignado, sin firmar) · 🔴 No
        </div>
        <div className="text-xs">
          <strong>Factura</strong> · 🟢 Emitida (factura_enviada en OB) · 🟡 Asignada (id_factura en BD pero no confirmado en Holded) · 🔴 No
        </div>
        <div className="text-xs text-amber-700 mt-1">Pendiente: integrar Holded API + Zoho Sign + DocuSign para verificar estados reales y traer datos de ediciones antiguas desde Airtable.</div>
      </div>

      {/* Filtros y stats */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter size={14} className="text-gray-400" />
          <select
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          >
            {data.cohorts.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="all">Todos</option>
            <option value="missing_contract">Sin contrato</option>
            <option value="missing_invoice">Sin factura</option>
            <option value="missing_both">Sin contrato ni factura</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, email o edición"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm w-72"
        />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileText size={18} />} accent="emerald" label="Total alumnos" value={fmtNum(data.stats.total)} subtitle="Activos + reembolsados (sin tests)" />
        <StatCard icon={<CheckCircle2 size={18} />} accent="blue" label="Contratos firmados" value={fmtNum(data.stats.contrato_firmado)} subtitle={`${data.stats.contrato_enviado} enviados sin firmar · ${data.stats.contrato_no} no`} />
        <StatCard icon={<Receipt size={18} />} accent="purple" label="Facturas emitidas" value={fmtNum(data.stats.factura_emitida)} subtitle={`${data.stats.factura_asignada} con id asignado · ${data.stats.factura_no} no`} />
        <StatCard icon={<AlertTriangle size={18} />} accent="rose" label="Sin confirmar ambos" value={fmtNum(data.stats.sin_ambos_confirmados)} subtitle={`${data.stats.sin_onboarding} sin OB rellenado`} />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Listado de alumnos</h3>
            <p className="text-xs text-gray-500 mt-0.5">{fmtNum(filteredRows.length)} alumnos · ordenados por edición</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase">Alumno</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Edición</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Estado</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase">Contrato</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">ID contrato</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase">Factura</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase">ID factura</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={`${r.buyer_email}-${i}`} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i % 2 === 1 ? "bg-gray-50/20" : ""}`}>
                  <td className="px-6 py-3">
                    <div className="text-sm font-semibold text-gray-900">{r.buyer_name ?? "—"}</div>
                    <div className="text-xs text-gray-500">{r.buyer_email}</div>
                    {!r.en_onboarding && (
                      <div className="text-[10px] text-amber-700 mt-1">⚠ sin OB</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.cohort_label}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status_orden} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.contrato_state === "firmado" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium">
                        <CheckCircle2 size={14} /> Firmado
                      </span>
                    ) : r.contrato_state === "enviado" ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 text-sm font-medium">
                        <FileText size={14} /> Enviado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 text-sm font-medium">
                        <XCircle size={14} /> No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{r.id_contrato || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {r.factura_state === "emitida" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium">
                        <CheckCircle2 size={14} /> Emitida
                      </span>
                    ) : r.factura_state === "asignada" ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 text-sm font-medium">
                        <Receipt size={14} /> Asignada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 text-sm font-medium">
                        <XCircle size={14} /> No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500 font-mono">{r.id_factura || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, subtitle, accent,
}: { icon: React.ReactNode; label: string; value: string; subtitle?: string; accent: "emerald" | "blue" | "purple" | "rose" | "amber"; }) {
  const map: Record<string, { border: string; iconBg: string; iconText: string }> = {
    emerald: { border: "border-l-emerald-500", iconBg: "bg-emerald-50", iconText: "text-emerald-600" },
    blue: { border: "border-l-blue-500", iconBg: "bg-blue-50", iconText: "text-blue-600" },
    purple: { border: "border-l-purple-500", iconBg: "bg-purple-50", iconText: "text-purple-600" },
    rose: { border: "border-l-rose-500", iconBg: "bg-rose-50", iconText: "text-rose-600" },
    amber: { border: "border-l-amber-500", iconBg: "bg-amber-50", iconText: "text-amber-600" },
  };
  const s = map[accent];
  return (
    <div className={`bg-white rounded-2xl border-l-4 ${s.border} border-t border-r border-b border-gray-100 p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
        <span className={`p-1.5 rounded-lg ${s.iconBg} ${s.iconText}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    ACTIVA: { bg: "bg-blue-100 text-blue-700", label: "Activa" },
    ACTIVA_CON_RETRASO: { bg: "bg-orange-100 text-orange-700", label: "Activa retraso" },
    COMPLETADA: { bg: "bg-emerald-100 text-emerald-700", label: "Completada" },
    REEMBOLSADA: { bg: "bg-rose-100 text-rose-700", label: "Reembolsada" },
    REEMBOLSADA_PARCIAL: { bg: "bg-rose-100 text-rose-700", label: "Reemb. parcial" },
    PENDIENTE_APROBACION: { bg: "bg-yellow-100 text-yellow-700", label: "Pdte. aprob." },
    OTRO: { bg: "bg-gray-100 text-gray-600", label: "Otro" },
  };
  const c = map[status] ?? map.OTRO;
  return <span className={`px-2 py-1 rounded-md text-xs font-medium ${c.bg}`}>{c.label}</span>;
}
