"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, TrendingUp, Euro, Users, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Sale = {
  id: string;
  nombre_completo: string | null;
  correo_electronico: string | null;
  edicion: string | null;
  status: string | null;
  metodo_pago: string | null;
  precio: number | null;
  cash_collected: number | null;
  en_reserva: number | null;
  cuotas_restantes: number | null;
  importe_cuotas_futuras: number | null;
  fecha_compra: string | null;
  id_factura: string | null;
  nombre_comercial: string | null;
};

type Stats = {
  totalVentas: number;
  totalReembolsos: number;
  totalCash: number;
  totalReserva: number;
  totalCuotas: number;
  tasaReembolso: string;
};

type PorEdicion = { edicion: string; ventas: number; cash: number };
type PorComercial = { comercial: string; ventas: number; cash: number };

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    "En orden": "bg-emerald-50 text-emerald-700",
    "Rembolsado": "bg-red-50 text-red-600",
    "Pendiente": "bg-amber-50 text-amber-700",
    "En proceso": "bg-blue-50 text-blue-700",
  };
  const cls = colors[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [porEdicion, setPorEdicion] = useState<PorEdicion[]>([]);
  const [porComercial, setPorComercial] = useState<PorComercial[]>([]);
  const [ediciones, setEdiciones] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [edicionFilter, setEdicionFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (edicionFilter) params.set("edicion", edicionFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    fetch(`/api/sales?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setSales(d.data ?? []);
        setCount(d.count ?? 0);
        setStats(d.stats);
        setPorEdicion(d.porEdicion ?? []);
        setPorComercial(d.porComercial ?? []);
        setEdiciones(d.ediciones ?? []);
        setStatuses(d.statuses ?? []);
      })
      .finally(() => setLoading(false));
  }, [page, edicionFilter, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(count / 30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-gray-400 text-sm mt-0.5">Purchase Approved · Airtable → Supabase</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ventas</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalVentas}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <Euro className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cash Collected</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{fmt(stats.totalCash)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">En reserva</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{fmt(stats.totalReserva)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <Euro className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cuotas futuras</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{fmt(stats.totalCuotas)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-400 flex items-center justify-center shrink-0">
              <RefreshCw className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Reembolsos</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">
                {stats.totalReembolsos}
                <span className="text-sm font-medium text-gray-400 ml-1">{stats.tasaReembolso}%</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas */}
      {porEdicion.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Por edición */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 text-sm mb-1">Cash Collected por edición</h2>
            <p className="text-xs text-gray-400 mb-4">Solo ventas activas</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porEdicion} barCategoryGap="35%">
                <XAxis dataKey="edicion" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as PorEdicion;
                    return (
                      <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                        <p className="font-semibold text-gray-700">{label}</p>
                        <p className="font-bold text-emerald-600">{fmt(d.cash)}</p>
                        <p className="text-gray-400">{d.ventas} ventas</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="cash" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Por comercial */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 text-sm mb-1">Por comercial</h2>
            <p className="text-xs text-gray-400 mb-4">Ventas y cash collected</p>
            <div className="space-y-2.5">
              {porComercial.slice(0, 6).map((c) => {
                const maxCash = porComercial[0]?.cash ?? 1;
                const pct = Math.round((c.cash / maxCash) * 100);
                return (
                  <div key={c.comercial}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{c.comercial}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-400">{c.ventas} ventas</span>
                        <span className="text-xs font-bold text-gray-900">{fmt(c.cash)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Nombre, email o factura..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 w-52"
          />
        </div>

        {/* Edición */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-gray-400">Edición:</span>
          <button
            onClick={() => { setEdicionFilter(null); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!edicionFilter ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}
          >
            Todas
          </button>
          {ediciones.map((ed) => (
            <button
              key={ed}
              onClick={() => { setEdicionFilter(ed); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${edicionFilter === ed ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}
            >
              {ed}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-medium text-gray-400">Estado:</span>
          <button
            onClick={() => { setStatusFilter(null); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!statusFilter ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}
          >
            Todos
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === s
                  ? s === "Rembolsado" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
                  : s === "Rembolsado" ? "bg-red-50 border border-red-200 text-red-600" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">{count} registros</span>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Alumno</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Edición</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Precio</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Cobrado</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Método</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Comercial</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800 text-xs">{s.nombre_completo ?? "—"}</p>
                    <p className="text-[11px] text-gray-400">{s.correo_electronico ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{s.edicion ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-gray-700">
                    {s.precio != null ? fmt(s.precio) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-emerald-600">
                    {s.cash_collected != null ? fmt(s.cash_collected) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{s.metodo_pago ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{s.nombre_comercial ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {s.fecha_compra ? new Date(s.fecha_compra).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">No hay resultados</div>
          )}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-400">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full" disabled={page === 1}
              onClick={() => { setPage((p) => p - 1); window.scrollTo(0, 0); }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={page === p ? "default" : "outline"} size="sm"
                className={`rounded-full w-9 ${page === p ? "bg-indigo-500 hover:bg-indigo-600 border-indigo-500" : ""}`}
                onClick={() => { setPage(p); window.scrollTo(0, 0); }}>
                {p}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="rounded-full" disabled={page === totalPages}
              onClick={() => { setPage((p) => p + 1); window.scrollTo(0, 0); }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
