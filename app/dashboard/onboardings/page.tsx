"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { swr, invalidateCache } from "@/lib/cached-fetch";
import { Loader2, ShoppingCart, ClipboardList, AlertTriangle, FileCheck, FileText, Users, RefreshCw, Clock, Search, Link2, Check, X, Trash2, Download, Filter, Plus } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type Stats = {
  totalVentas: number;
  totalOnboardings: number;
  ventasDuplicados: number;
  onboardingsDuplicados: number;
  ventasSinOnboarding: number;
  contratoEnviado: number;
  contratoFirmado: number;
  accesoEnviado: number;
  facturaEnviada: number;
  edadMedia: number;
  reembolsosSolicitados: number;
  reembolsosEjecutados: number;
  mediaDiasReembolso: number | null;
};

const EDICIONES = ["Global", "Enero 2026", "Febrero 2026", "Marzo 2026", "Abril 2026"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Venta = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Onboarding = Record<string, any>;

const VENTA_FIELDS = [
  { key: "nombre_completo", label: "Nombre" },
  { key: "correo_electronico", label: "Email" },
  { key: "edicion", label: "Edicion" },
  { key: "status", label: "Status" },
  { key: "metodo_pago", label: "Metodo de pago" },
  { key: "precio", label: "Precio", fmt: "eur" },
  { key: "cash_collected", label: "Cash collected", fmt: "eur" },
  { key: "en_reserva", label: "En reserva", fmt: "eur" },
  { key: "cuotas_restantes", label: "Cuotas restantes" },
  { key: "importe_cuotas_futuras", label: "Cuotas futuras", fmt: "eur" },
  { key: "fecha_compra", label: "Fecha compra", fmt: "date" },
  { key: "fecha_reembolso", label: "Fecha reembolso", fmt: "date" },
  { key: "nombre_comercial", label: "Comercial" },
  { key: "id_factura", label: "ID Factura" },
  { key: "id_hotmart", label: "ID Hotmart" },
  { key: "fuente", label: "Fuente" },
];

const OB_FIELDS = [
  { key: "nombre_completo", label: "Nombre" },
  { key: "email", label: "Email" },
  { key: "telefono", label: "Telefono" },
  { key: "edicion", label: "Edicion" },
  { key: "edad", label: "Edad" },
  { key: "tipo_avatar", label: "Avatar" },
  { key: "explicacion_avatar", label: "Explicacion avatar" },
  { key: "riesgo_reembolso", label: "Riesgo" },
  { key: "factores_riesgo", label: "Factores riesgo" },
  { key: "explicacion_riesgo", label: "Explicacion riesgo" },
  { key: "situacion_laboral", label: "Situacion laboral" },
  { key: "nivel_estudios", label: "Nivel estudios" },
  { key: "nivel_digital", label: "Nivel digital" },
  { key: "nivel_ia", label: "Nivel IA" },
  { key: "motivacion", label: "Motivacion" },
  { key: "expectativas", label: "Expectativas" },
  { key: "tiempo_semana", label: "Tiempo semanal" },
  { key: "estilo_aprendizaje", label: "Estilo aprendizaje" },
  { key: "frenos", label: "Frenos" },
  { key: "contrato_firmado", label: "Contrato firmado", fmt: "bool" },
  { key: "factura_enviada", label: "Factura enviada", fmt: "bool" },
  { key: "acceso_enviado", label: "Acceso enviado", fmt: "bool" },
  { key: "fecha_accesos", label: "Fecha accesos", fmt: "date" },
  { key: "fecha_fin_garantia", label: "Fin garantia", fmt: "date" },
  { key: "tipo_facturacion", label: "Tipo facturacion" },
  { key: "nif", label: "NIF" },
  { key: "pais", label: "Pais" },
  { key: "provincia", label: "Provincia" },
  { key: "municipio", label: "Municipio" },
];

type CustomFilter = { id: number; field: string; op: string; value: string };

const FILTER_OPS = [
  { v: "eq", l: "es igual a" },
  { v: "neq", l: "no es igual a" },
  { v: "contains", l: "contiene" },
  { v: "not_contains", l: "no contiene" },
  { v: "gt", l: "mayor que" },
  { v: "lt", l: "menor que" },
  { v: "empty", l: "esta vacio" },
  { v: "not_empty", l: "no esta vacio" },
  { v: "is_true", l: "es verdadero" },
  { v: "is_false", l: "es falso" },
];

function applyCustomFilters(rows: Record<string, unknown>[], filters: CustomFilter[]): Record<string, unknown>[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) => {
    return filters.every((f) => {
      const raw = row[f.field];
      const val = raw == null ? "" : String(raw).toLowerCase();
      const target = f.value.toLowerCase();
      switch (f.op) {
        case "eq": return val === target;
        case "neq": return val !== target;
        case "contains": return val.includes(target);
        case "not_contains": return !val.includes(target);
        case "gt": return Number(raw) > Number(f.value);
        case "lt": return Number(raw) < Number(f.value);
        case "empty": return !raw || val === "";
        case "not_empty": return !!raw && val !== "";
        case "is_true": return raw === true || val === "true";
        case "is_false": return raw === false || val === "false" || !raw;
        default: return true;
      }
    });
  });
}

function CustomFilterBar({ filters, setFilters, fieldOptions }: {
  filters: CustomFilter[];
  setFilters: (f: CustomFilter[]) => void;
  fieldOptions: { key: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  let nextId = filters.length > 0 ? Math.max(...filters.map(f => f.id)) + 1 : 1;

  function addFilter() {
    setFilters([...filters, { id: nextId, field: fieldOptions[0]?.key ?? "", op: "contains", value: "" }]);
    setOpen(true);
  }

  function removeFilter(id: number) {
    const next = filters.filter(f => f.id !== id);
    setFilters(next);
    if (next.length === 0) setOpen(false);
  }

  function updateFilter(id: number, patch: Partial<CustomFilter>) {
    setFilters(filters.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  const needsValue = (op: string) => !["empty", "not_empty", "is_true", "is_false"].includes(op);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button onClick={() => { if (filters.length === 0) addFilter(); else setOpen(!open); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filters.length > 0 ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
          <Filter className="h-3 w-3" />
          Filtros {filters.length > 0 && `(${filters.length})`}
        </button>
        {filters.length > 0 && (
          <button onClick={() => { setFilters([]); setOpen(false); }} className="text-[10px] text-gray-400 hover:text-red-500">Limpiar</button>
        )}
      </div>
      {open && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-2">
          {filters.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <select value={f.field} onChange={(e) => updateFilter(f.id, { field: e.target.value })}
                className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-indigo-300 bg-gray-50">
                {fieldOptions.map((fo) => <option key={fo.key} value={fo.key}>{fo.label}</option>)}
              </select>
              <select value={f.op} onChange={(e) => updateFilter(f.id, { op: e.target.value })}
                className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-indigo-300 bg-gray-50">
                {FILTER_OPS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              {needsValue(f.op) && (
                <input type="text" value={f.value} onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                  placeholder="valor..."
                  className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-indigo-300 bg-gray-50 w-32" />
              )}
              <button onClick={() => removeFilter(f.id)} className="p-1 text-gray-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button onClick={addFilter}
            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-semibold">
            <Plus className="h-3 w-3" /> Añadir filtro
          </button>
        </div>
      )}
    </div>
  );
}

function fmtValue(val: unknown, fmt?: string): string {
  if (val == null || val === "") return "—";
  if (fmt === "eur") return Number(val).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  if (fmt === "date") return new Date(String(val)).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  if (fmt === "bool") return val ? "Si" : "No";
  return String(val);
}

function DetailModal({ data, fields, title, onClose, onMatch, hasMatch, table, onSaved, onDeleted }: {
  data: Record<string, unknown>;
  fields: { key: string; label: string; fmt?: string }[];
  title: string;
  onClose: () => void;
  onMatch?: () => void;
  hasMatch?: boolean;
  table: "purchase_approved" | "onboarding";
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveField(key: string, value: unknown) {
    setSaving(key);
    await fetch(`/api/onboardings/update`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id: data.id, field: key, value }),
    });
    data[key] = value;
    setSaving(null);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="font-bold text-gray-900">{title}</p>
            <p className="text-xs text-gray-400">{String(data.correo_electronico ?? data.email ?? "")}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          <div className="space-y-3">
            {fields.map(({ key, label, fmt }) => {
              const val = data[key];
              const isBool = fmt === "bool";
              const isDate = fmt === "date";
              const isEur = fmt === "eur";
              const isSaving = saving === key;

              return (
                <div key={key} className="flex items-start gap-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-36 shrink-0 pt-2">{label}</p>
                  <div className="flex-1 min-w-0">
                    {isBool ? (
                      <button
                        onClick={() => saveField(key, !val)}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${val ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-500 hover:bg-red-100"}`}>
                        {val ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        {val ? "Si" : "No"}
                        {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                      </button>
                    ) : isDate ? (
                      <input type="date" defaultValue={val ? String(val).split("T")[0] : ""}
                        onBlur={(e) => { if (e.target.value !== (val ? String(val).split("T")[0] : "")) saveField(key, e.target.value || null); }}
                        className="w-full text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 text-gray-800" />
                    ) : isEur ? (
                      <input type="number" step="0.01" defaultValue={val != null ? Number(val) : ""}
                        onBlur={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n) && n !== Number(val)) saveField(key, n); }}
                        className="w-full text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 text-gray-800" />
                    ) : String(val ?? "").length > 60 ? (
                      <textarea defaultValue={val != null ? String(val) : ""} rows={3}
                        onBlur={(e) => { if (e.target.value !== (val != null ? String(val) : "")) saveField(key, e.target.value || null); }}
                        className="w-full text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 text-gray-800 placeholder:text-gray-300 resize-y"
                        placeholder="—" />
                    ) : (
                      <input type="text" defaultValue={val != null ? String(val) : ""}
                        onBlur={(e) => { if (e.target.value !== (val != null ? String(val) : "")) saveField(key, e.target.value || null); }}
                        className="w-full text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 text-gray-800 placeholder:text-gray-300"
                        placeholder="—" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center gap-3">
          {onMatch && !hasMatch && (
            <button onClick={() => { onClose(); onMatch(); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors">
              <Link2 className="h-4 w-4" /> Vincular manualmente
            </button>
          )}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={async () => {
                setDeleting(true);
                await fetch(`/api/onboardings/update?table=${table}&id=${data.id}`, { method: "DELETE" });
                setDeleting(false);
                onClose();
                onDeleted();
              }} disabled={deleting}
                className="flex items-center gap-1 px-4 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors">
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Confirmar
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-2.5 text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [riesgoMap, setRiesgoMap] = useState<Record<string, number>>({});
  const [avatarMap, setAvatarMap] = useState<Record<string, number>>({});
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [edicionFilter, setEdicionFilter] = useState("Global");
  const [loading, setLoading] = useState(true);
  const [searchVentas, setSearchVentas] = useState("");
  const [searchOb, setSearchOb] = useState("");
  const [filterVentas, setFilterVentas] = useState("");
  const [filterOb, setFilterOb] = useState("");
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [selectedOb, setSelectedOb] = useState<Onboarding | null>(null);
  const [matchVenta, setMatchVenta] = useState<Venta | null>(null);
  const [matchOb, setMatchOb] = useState<Onboarding | null>(null);
  const [matchSearch, setMatchSearch] = useState("");
  const [matching, setMatching] = useState(false);
  const [ventasCustomFilters, setVentasCustomFilters] = useState<CustomFilter[]>([]);
  const [obCustomFilters, setObCustomFilters] = useState<CustomFilter[]>([]);

  const cancelRef = useRef<(() => void) | null>(null);

  const fetchData = useCallback((silent = false) => {
    if (cancelRef.current) cancelRef.current();
    const params = new URLSearchParams();
    if (edicionFilter !== "Global") params.set("edicion", edicionFilter);
    const url = `/api/onboardings?${params}`;

    if (silent) {
      // Silent refresh — skip cache, just fetch
      fetch(url).then((r) => r.json()).then((d) => {
        setStats(d.stats ?? null);
        setRiesgoMap(d.riesgoMap ?? {});
        setAvatarMap(d.avatarMap ?? {});
        setVentas(d.ventas ?? []);
        setOnboardings(d.onboardings ?? []);
      });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cancelRef.current = swr<any>(url, (d, isStale) => {
      setStats(d.stats ?? null);
      setRiesgoMap(d.riesgoMap ?? {});
      setAvatarMap(d.avatarMap ?? {});
      setVentas(d.ventas ?? []);
      setOnboardings(d.onboardings ?? []);
      setLoading(false);
    });
  }, [edicionFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const VENTAS_FILTER_FIELDS = [
    { key: "nombre_completo", label: "Nombre" }, { key: "correo_electronico", label: "Email" },
    { key: "status", label: "Status" }, { key: "metodo_pago", label: "Metodo pago" },
    { key: "precio", label: "Precio" }, { key: "cash_collected", label: "Cash collected" },
    { key: "nombre_comercial", label: "Comercial" }, { key: "fecha_compra", label: "Fecha compra" },
    { key: "fecha_reembolso", label: "Fecha reembolso" }, { key: "fuente", label: "Fuente" },
    { key: "edicion", label: "Edicion" },
  ];

  const OB_FILTER_FIELDS = [
    { key: "nombre_completo", label: "Nombre" }, { key: "email", label: "Email" },
    { key: "telefono", label: "Telefono" }, { key: "tipo_avatar", label: "Avatar" },
    { key: "riesgo_reembolso", label: "Riesgo" }, { key: "edad", label: "Edad" },
    { key: "contrato_firmado", label: "Contrato firmado" }, { key: "factura_enviada", label: "Factura enviada" },
    { key: "acceso_enviado", label: "Acceso enviado" }, { key: "situacion_laboral", label: "Situacion laboral" },
    { key: "nivel_digital", label: "Nivel digital" }, { key: "nivel_ia", label: "Nivel IA" },
    { key: "motivacion", label: "Motivacion" }, { key: "estilo_aprendizaje", label: "Estilo aprendizaje" },
    { key: "tiempo_semana", label: "Tiempo semanal" }, { key: "fecha_accesos", label: "Fecha accesos" },
    { key: "edicion", label: "Edicion" }, { key: "pais", label: "Pais" },
  ];

  function downloadCsv(rows: Record<string, unknown>[], filename: string) {
    if (rows.length === 0) return;
    const keys = Object.keys(rows[0]).filter(k => k !== "id" && k !== "airtable_id" && k !== "created_at");
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => escape(r[k])).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Onboardings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Estado de onboarding por edicion · Ventas vs Onboardings</p>
      </div>

      {/* Selector de edición */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Selecciona la edicion</p>
        <div className="flex items-center gap-2 flex-wrap">
          {EDICIONES.map((ed) => (
            <button key={ed} onClick={() => setEdicionFilter(ed)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${edicionFilter === ed
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-[1.02]"
                : "bg-gray-50 border border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50"
              }`}>
              {ed}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        </div>
      ) : stats && (
        <>
          {/* 1. Resumen general */}
          <h2 className="text-lg font-bold text-gray-900">1. Resumen general</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ventas</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalVentas}</p>
                {stats.ventasDuplicados > 0 && (
                  <p className="text-[10px] text-gray-300 mt-0.5">{stats.ventasDuplicados} registros duplicados</p>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Onboardings</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.totalOnboardings}</p>
                {stats.onboardingsDuplicados > 0 && (
                  <p className="text-[10px] text-gray-300 mt-0.5">{stats.onboardingsDuplicados} registros duplicados</p>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Onboardings sin cruzar con la venta</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.ventasSinOnboarding}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Edad media</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.edadMedia} <span className="text-sm font-normal text-gray-400">años</span></p>
              </div>
            </div>
          </div>

          {/* Reembolsos */}
          <div className="grid grid-cols-4 gap-4">
            {(() => {
              const pctReembolso = stats.totalVentas > 0 ? ((stats.reembolsosSolicitados / stats.totalVentas) * 100) : 0;
              const color = pctReembolso < 8 ? { bg: "bg-emerald-500", border: "border-emerald-200", bgCard: "bg-emerald-50", text: "text-emerald-700" }
                : pctReembolso <= 10 ? { bg: "bg-amber-500", border: "border-amber-200", bgCard: "bg-amber-50", text: "text-amber-700" }
                : { bg: "bg-red-500", border: "border-red-200", bgCard: "bg-red-50", text: "text-red-700" };
              return (
                <div className={`rounded-2xl border ${color.border} shadow-sm px-4 py-3 flex items-center gap-3 ${color.bgCard}`}>
                  <div className={`h-9 w-9 rounded-xl ${color.bg} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-sm font-black">%</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tasa reembolso</p>
                    <p className={`text-2xl font-black leading-tight ${color.text}`}>{pctReembolso.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })()}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                <RefreshCw className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Reembolsos solicitados</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.reembolsosSolicitados}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                <RefreshCw className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Reembolsos ejecutados</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.reembolsosEjecutados}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gray-600 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Media dias hasta reembolso</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.mediaDiasReembolso != null ? stats.mediaDiasReembolso : "—"} <span className="text-sm font-normal text-gray-400">{stats.mediaDiasReembolso != null ? "dias" : ""}</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-700">Estado del proceso</h3>
            {[
              { label: "Onboardings realizados", val: stats.totalOnboardings, total: stats.totalVentas, icon: ClipboardList, color: "bg-emerald-500" },
              { label: "Contrato firmado", val: stats.contratoFirmado, total: stats.totalOnboardings, icon: FileCheck, color: "bg-indigo-500" },
              { label: "Factura enviada", val: stats.facturaEnviada, total: stats.totalOnboardings, icon: FileText, color: "bg-purple-500" },
            ].map(({ label, val, total, icon: Icon, color }) => {
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return (
                <div key={label} className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-gray-700">{label}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-black text-gray-900">{val} <span className="text-sm font-normal text-gray-400">/ {total}</span></p>
                        <span className="text-sm font-bold text-gray-500">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-2.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Avatar donut */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Tipo de avatar</h3>
              {(() => {
                const AVATAR_COLORS: Record<string, string> = { AV0: "#3b82f6", AV1: "#6366f1", AV2: "#a855f7", "NO AVATAR": "#9ca3af" };
                const ORDER = ["AV0", "AV1", "AV2", "NO AVATAR"];
                const totalAv = Object.values(avatarMap).reduce((s, n) => s + n, 0);
                const chartData = Object.entries(avatarMap)
                  .sort((a, b) => (ORDER.indexOf(a[0]) === -1 ? 99 : ORDER.indexOf(a[0])) - (ORDER.indexOf(b[0]) === -1 ? 99 : ORDER.indexOf(b[0])))
                  .map(([name, value]) => ({ name, value }));
                return (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={AVATAR_COLORS[entry.name] ?? "#d1d5db"} />
                          ))}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as { name: string; value: number };
                          const pct = totalAv > 0 ? ((d.value / totalAv) * 100).toFixed(1) : "0";
                          return (
                            <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                              <p className="font-bold" style={{ color: AVATAR_COLORS[d.name] }}>{d.name}</p>
                              <p className="text-gray-900 font-bold">{d.value} <span className="text-gray-400 font-normal">({pct}%)</span></p>
                            </div>
                          );
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 justify-center mt-1">
                      {chartData.map(({ name, value }) => {
                        const pct = totalAv > 0 ? ((value / totalAv) * 100).toFixed(1) : "0";
                        return (
                          <div key={name} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: AVATAR_COLORS[name] ?? "#d1d5db" }} />
                            <span className="text-xs text-gray-600 font-semibold">{name}</span>
                            <span className="text-xs text-gray-900 font-bold">{value}</span>
                            <span className="text-[10px] text-gray-400">({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Riesgo donut */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Riesgo de reembolso</h3>
              {(() => {
                const RISK_COLORS: Record<string, string> = { BAJO: "#10b981", MEDIO: "#f59e0b", ALTO: "#ef4444", "Sin evaluar": "#d1d5db" };
                const ORDER = ["BAJO", "MEDIO", "ALTO", "Sin evaluar"];
                const totalR = Object.values(riesgoMap).reduce((s, n) => s + n, 0);
                const chartData = Object.entries(riesgoMap)
                  .sort((a, b) => (ORDER.indexOf(a[0]) === -1 ? 99 : ORDER.indexOf(a[0])) - (ORDER.indexOf(b[0]) === -1 ? 99 : ORDER.indexOf(b[0])))
                  .map(([name, value]) => ({ name, value }));
                return (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={RISK_COLORS[entry.name] ?? "#d1d5db"} />
                          ))}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as { name: string; value: number };
                          const pct = totalR > 0 ? ((d.value / totalR) * 100).toFixed(1) : "0";
                          return (
                            <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                              <p className="font-bold" style={{ color: RISK_COLORS[d.name] }}>{d.name}</p>
                              <p className="text-gray-900 font-bold">{d.value} <span className="text-gray-400 font-normal">({pct}%)</span></p>
                            </div>
                          );
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 justify-center mt-1">
                      {chartData.map(({ name, value }) => {
                        const pct = totalR > 0 ? ((value / totalR) * 100).toFixed(1) : "0";
                        return (
                          <div key={name} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[name] ?? "#d1d5db" }} />
                            <span className="text-xs text-gray-600 font-semibold">{name}</span>
                            <span className="text-xs text-gray-900 font-bold">{value}</span>
                            <span className="text-[10px] text-gray-400">({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          {/* ── 2. Tabla de ventas ── */}
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-lg font-bold text-gray-900">2. Tabla de ventas</h2>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700">{new Set(ventas.map(v => (v.correo_electronico ?? "").toLowerCase()).filter(Boolean)).size} unicos</span>
              <span className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">{ventas.length} total</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" placeholder="Buscar venta..." value={searchVentas}
                onChange={(e) => setSearchVentas(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-amber-300" />
            </div>
            <div className="flex items-center gap-1.5">
              {[{ v: "", l: "Todos" }, { v: "En orden", l: "En orden" }, { v: "Rembolsado", l: "Reembolsado" }, { v: "sin_ob", l: "Sin onboarding" }, { v: "duplicados", l: "Duplicados" }].map(({ v, l }) => (
                <button key={v} onClick={() => setFilterVentas(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterVentas === v ? "bg-amber-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <CustomFilterBar filters={ventasCustomFilters} setFilters={setVentasCustomFilters} fieldOptions={VENTAS_FILTER_FIELDS} />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">Fecha</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase">OB</th>
                  <th className="px-2 py-3 text-right">
                    <button onClick={() => downloadCsv(ventas, `ventas_${edicionFilter.replace(/ /g, "_")}.csv`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-600 hover:bg-amber-100 transition-all">
                      <Download className="h-3 w-3" /> CSV
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(() => {
                  const obEmails = new Set(onboardings.map((o) => (o.email ?? "").toLowerCase()).filter(Boolean));
                  const ventaEmails = new Set(ventas.map((v) => (v.correo_electronico ?? "").toLowerCase()).filter(Boolean));
                  const obSinVenta = onboardings.filter((o) => !ventaEmails.has((o.email ?? "").toLowerCase()));
                  const ventaEmailCount: Record<string, number> = {};
                  ventas.forEach((v) => { const e = (v.correo_electronico ?? "").toLowerCase(); if (e) ventaEmailCount[e] = (ventaEmailCount[e] ?? 0) + 1; });
                  const dupVentaEmails = new Set(Object.entries(ventaEmailCount).filter(([, c]) => c > 1).map(([e]) => e));

                  return (applyCustomFilters(ventas, ventasCustomFilters) as Venta[])
                    .filter((v) => {
                      if (searchVentas && !(v.nombre_completo ?? "").toLowerCase().includes(searchVentas.toLowerCase()) && !(v.correo_electronico ?? "").toLowerCase().includes(searchVentas.toLowerCase())) return false;
                      if (filterVentas === "En orden" && v.status !== "En orden") return false;
                      if (filterVentas === "Rembolsado" && v.status !== "Rembolsado") return false;
                      if (filterVentas === "sin_ob" && obEmails.has((v.correo_electronico ?? "").toLowerCase())) return false;
                      if (filterVentas === "duplicados" && !dupVentaEmails.has((v.correo_electronico ?? "").toLowerCase())) return false;
                      return true;
                    })
                    .map((v, idx) => {
                      const hasOb = obEmails.has((v.correo_electronico ?? "").toLowerCase());
                      const nombre = (v.nombre_completo ?? "").toLowerCase();
                      const possibleMatch = !hasOb ? obSinVenta.find((o) => {
                        const obN = (o.nombre_completo ?? "").toLowerCase();
                        const first = nombre.split(" ")[0];
                        return first && first.length > 2 && obN.includes(first);
                      }) : null;
                      return (
                        <tr key={v.id} onClick={() => setSelectedVenta(v)} className={`hover:bg-gray-50/50 cursor-pointer ${!hasOb ? "bg-red-50/30" : ""}`}>
                          <td className="px-5 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{v.nombre_completo ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{v.correo_electronico}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${v.status === "Rembolsado" ? "bg-red-50 text-red-600" : v.status === "En orden" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600"}`}>{v.status ?? "—"}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{v.fecha_compra ? new Date(v.fecha_compra).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—"}</td>
                          <td className="px-4 py-2.5" onClick={(e) => { if (!hasOb) { e.stopPropagation(); setMatchVenta(v); } }}>
                            {hasOb ? (() => {
                              const matchedOb = onboardings.find((o) => (o.email ?? "").toLowerCase() === (v.correo_electronico ?? "").toLowerCase());
                              const isManual = matchedOb?.email_original;
                              return isManual ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  <button onClick={async (e) => {
                                    e.stopPropagation();
                                    await fetch("/api/onboardings", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ onboardingId: matchedOb.id, unlink: true }),
                                    });
                                    fetchData(true);
                                  }} className="text-[10px] text-red-400 hover:text-red-600 font-semibold hover:underline" title="Desvincular">
                                    desvincular
                                  </button>
                                </div>
                              ) : (
                                <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                              );
                            })() : possibleMatch ? (
                              <div className="flex items-center gap-1 justify-center cursor-pointer hover:bg-amber-100 rounded-lg px-1 py-0.5 transition-colors" title="Clic para vincular">
                                <Link2 className="h-3 w-3 text-amber-500" />
                                <span className="text-[10px] text-amber-600 font-semibold">{possibleMatch.nombre_completo}</span>
                              </div>
                            ) : (
                              <div className="flex justify-center cursor-pointer hover:bg-red-100 rounded-lg px-1 py-0.5 transition-colors" title="Clic para vincular">
                                <X className="h-4 w-4 text-red-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <button onClick={async () => {
                              if (!confirm("Eliminar esta venta?")) return;
                              await fetch(`/api/onboardings/update?table=purchase_approved&id=${v.id}`, { method: "DELETE" });
                              fetchData(true);
                            }} className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    });
                })()}
              </tbody>
            </table>
          </div>

          {/* ── 3. Tabla de onboardings ── */}
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-lg font-bold text-gray-900">3. Tabla de onboardings</h2>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700">{new Set(onboardings.map(o => (o.email ?? "").toLowerCase()).filter(Boolean)).size} unicos</span>
              <span className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">{onboardings.length} total</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" placeholder="Buscar onboarding..." value={searchOb}
                onChange={(e) => setSearchOb(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-amber-300" />
            </div>
            <div className="flex items-center gap-1.5">
              {[{ v: "", l: "Todos" }, { v: "sin_contrato", l: "Sin contrato" }, { v: "sin_factura", l: "Sin factura" }, { v: "sin_venta", l: "Sin venta" }, { v: "duplicados", l: "Duplicados" }].map(({ v, l }) => (
                <button key={v} onClick={() => setFilterOb(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterOb === v ? "bg-amber-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <CustomFilterBar filters={obCustomFilters} setFilters={setObCustomFilters} fieldOptions={OB_FILTER_FIELDS} />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">Avatar</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">Riesgo</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase">Contrato</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase">Factura</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase">Venta</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase">Edad</th>
                  <th className="px-2 py-3 text-right">
                    <button onClick={() => downloadCsv(onboardings, `onboardings_${edicionFilter.replace(/ /g, "_")}.csv`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-600 hover:bg-amber-100 transition-all">
                      <Download className="h-3 w-3" /> CSV
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(() => {
                  const ventaEmailSet = new Set(ventas.map((v) => (v.correo_electronico ?? "").toLowerCase()).filter(Boolean));
                  const ventasSinOb = ventas.filter((v) => {
                    const obEmailSet = new Set(onboardings.map((ob) => (ob.email ?? "").toLowerCase()).filter(Boolean));
                    return !obEmailSet.has((v.correo_electronico ?? "").toLowerCase());
                  });
                  const obEmailCount: Record<string, number> = {};
                  const obPhoneCount: Record<string, number> = {};
                  onboardings.forEach((o) => {
                    const e = (o.email ?? "").toLowerCase(); if (e) obEmailCount[e] = (obEmailCount[e] ?? 0) + 1;
                    const t = (o.telefono ?? "").replace(/\s/g, ""); if (t) obPhoneCount[t] = (obPhoneCount[t] ?? 0) + 1;
                  });
                  const dupObEmails = new Set(Object.entries(obEmailCount).filter(([, c]) => c > 1).map(([e]) => e));
                  const dupObPhones = new Set(Object.entries(obPhoneCount).filter(([, c]) => c > 1).map(([t]) => t));

                  return (applyCustomFilters(onboardings, obCustomFilters) as Onboarding[])
                    .filter((o) => {
                      if (searchOb && !(o.nombre_completo ?? "").toLowerCase().includes(searchOb.toLowerCase()) && !(o.email ?? "").toLowerCase().includes(searchOb.toLowerCase())) return false;
                      if (filterOb === "sin_contrato" && o.contrato_firmado) return false;
                      if (filterOb === "sin_factura" && o.factura_enviada) return false;
                      if (filterOb === "sin_venta" && ventaEmailSet.has((o.email ?? "").toLowerCase())) return false;
                      if (filterOb === "duplicados") {
                        const e = (o.email ?? "").toLowerCase();
                        const t = (o.telefono ?? "").replace(/\s/g, "");
                        if (!dupObEmails.has(e) && !dupObPhones.has(t)) return false;
                      }
                      return true;
                    })
                    .map((o, idx) => {
                      const AVATAR_COLORS: Record<string, string> = { AV0: "bg-blue-50 text-blue-600", AV1: "bg-indigo-50 text-indigo-600", AV2: "bg-purple-50 text-purple-600", "NO AVATAR": "bg-gray-100 text-gray-500" };
                      const RISK_COLORS: Record<string, string> = { BAJO: "bg-emerald-50 text-emerald-600", MEDIO: "bg-amber-50 text-amber-600", ALTO: "bg-red-50 text-red-600" };
                      const hasVenta = ventaEmailSet.has((o.email ?? "").toLowerCase());
                      const obNombre = (o.nombre_completo ?? "").toLowerCase();
                      const possibleMatch = !hasVenta ? ventasSinOb.find((v) => {
                        const first = obNombre.split(" ")[0];
                        return first && first.length > 2 && (v.nombre_completo ?? "").toLowerCase().includes(first);
                      }) : null;
                      return (
                        <tr key={o.id} onClick={() => setSelectedOb(o)} className={`hover:bg-gray-50/50 cursor-pointer ${!hasVenta ? "bg-amber-50/30" : ""}`}>
                          <td className="px-5 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{o.nombre_completo ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{o.email}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${AVATAR_COLORS[o.tipo_avatar ?? ""] ?? "bg-gray-100 text-gray-500"}`}>{o.tipo_avatar ?? "—"}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${RISK_COLORS[o.riesgo_reembolso ?? ""] ?? "bg-gray-100 text-gray-500"}`}>{o.riesgo_reembolso ?? "—"}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">{o.contrato_firmado ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-red-400 mx-auto" />}</td>
                          <td className="px-4 py-2.5 text-center">{o.factura_enviada ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-red-400 mx-auto" />}</td>
                          <td className="px-4 py-2.5" onClick={(e) => { if (!hasVenta) { e.stopPropagation(); setMatchOb(o); } }}>
                            {hasVenta ? (() => {
                              const isManual = o.email_original;
                              return isManual ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  <button onClick={async (e) => {
                                    e.stopPropagation();
                                    await fetch("/api/onboardings", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ onboardingId: o.id, unlink: true }),
                                    });
                                    fetchData(true);
                                  }} className="text-[10px] text-red-400 hover:text-red-600 font-semibold hover:underline" title="Desvincular">
                                    desvincular
                                  </button>
                                </div>
                              ) : (
                                <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                              );
                            })() : possibleMatch ? (
                              <div className="flex items-center gap-1 justify-center cursor-pointer hover:bg-amber-100 rounded-lg px-1 py-0.5 transition-colors" title="Clic para vincular">
                                <Link2 className="h-3 w-3 text-amber-500" />
                                <span className="text-[10px] text-amber-600 font-semibold">{possibleMatch.nombre_completo}</span>
                              </div>
                            ) : (
                              <div className="flex justify-center cursor-pointer hover:bg-amber-100 rounded-lg px-1 py-0.5 transition-colors" title="Clic para vincular">
                                <X className="h-4 w-4 text-red-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-gray-600">{o.edad ?? "—"}</td>
                          <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <button onClick={async () => {
                              if (!confirm("Eliminar este onboarding?")) return;
                              await fetch(`/api/onboardings/update?table=onboarding&id=${o.id}`, { method: "DELETE" });
                              fetchData(true);
                            }} className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    });
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedVenta && (() => {
        const obEmails = new Set(onboardings.map((o) => (o.email ?? "").toLowerCase()).filter(Boolean));
        const hasOb = obEmails.has((selectedVenta.correo_electronico ?? "").toLowerCase());
        return (
          <DetailModal data={selectedVenta} fields={VENTA_FIELDS} title={selectedVenta.nombre_completo ?? "Venta"}
            table="purchase_approved" onSaved={() => fetchData(true)} onDeleted={() => { setSelectedVenta(null); fetchData(true); }}
            onClose={() => setSelectedVenta(null)}
            hasMatch={hasOb}
            onMatch={() => setMatchVenta(selectedVenta)} />
        );
      })()}
      {selectedOb && (() => {
        const ventaEmails = new Set(ventas.map((v) => (v.correo_electronico ?? "").toLowerCase()).filter(Boolean));
        const hasVenta = ventaEmails.has((selectedOb.email ?? "").toLowerCase());
        return (
          <DetailModal data={selectedOb} fields={OB_FIELDS} title={selectedOb.nombre_completo ?? "Onboarding"}
            table="onboarding" onSaved={() => fetchData(true)} onDeleted={() => { setSelectedOb(null); fetchData(true); }}
            onClose={() => setSelectedOb(null)}
            hasMatch={hasVenta}
            onMatch={() => setMatchOb(selectedOb)} />
        );
      })()}

      {/* Modal match: elegir onboarding para vincular con venta */}
      {matchVenta && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setMatchVenta(null); setMatchSearch(""); }}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 shrink-0">
              <p className="font-bold text-gray-900">Vincular venta con onboarding</p>
              <p className="text-xs text-gray-400">Venta: {matchVenta.nombre_completo} ({matchVenta.correo_electronico})</p>
            </div>
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input type="text" value={matchSearch} onChange={(e) => setMatchSearch(e.target.value)} placeholder="Buscar onboarding por nombre o email..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-300" autoFocus />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {(() => {
                const ventaEmailSet = new Set(ventas.map((v) => (v.correo_electronico ?? "").toLowerCase()).filter(Boolean));
                const filtered = onboardings.filter((o) => {
                  const q = matchSearch.toLowerCase();
                  if (q && !(o.nombre_completo ?? "").toLowerCase().includes(q) && !(o.email ?? "").toLowerCase().includes(q)) return false;
                  return true;
                });
                return filtered.length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-400">No se encontraron resultados</p>
                ) : filtered.map((o) => {
                  const yaVinculado = ventaEmailSet.has((o.email ?? "").toLowerCase());
                  return (
                    <button key={o.id} onClick={async () => {
                      setMatching(true);
                      await fetch("/api/onboardings", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ onboardingId: o.id, newEmail: matchVenta!.correo_electronico }),
                      });
                      setMatching(false);
                      fetchData(true);
                    }} disabled={matching || yaVinculado}
                      className={`w-full flex items-center justify-between px-6 py-3 transition-colors text-left border-b border-gray-50 ${yaVinculado ? "opacity-40" : "hover:bg-amber-50"}`}>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{o.nombre_completo}</p>
                        <p className="text-xs text-gray-400">{o.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {o.tipo_avatar && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{o.tipo_avatar}</span>}
                        {yaVinculado ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4 text-amber-500" />}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal match: elegir venta para vincular con onboarding */}
      {matchOb && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setMatchOb(null); setMatchSearch(""); }}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 shrink-0">
              <p className="font-bold text-gray-900">Vincular onboarding con venta</p>
              <p className="text-xs text-gray-400">Onboarding: {matchOb.nombre_completo} ({matchOb.email})</p>
            </div>
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input type="text" value={matchSearch} onChange={(e) => setMatchSearch(e.target.value)} placeholder="Buscar venta por nombre o email..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-300" autoFocus />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {(() => {
                const obEmailSet = new Set(onboardings.map((o) => (o.email ?? "").toLowerCase()).filter(Boolean));
                const filtered = ventas.filter((v) => {
                  const q = matchSearch.toLowerCase();
                  if (q && !(v.nombre_completo ?? "").toLowerCase().includes(q) && !(v.correo_electronico ?? "").toLowerCase().includes(q)) return false;
                  return true;
                });
                return filtered.length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-400">No se encontraron resultados</p>
                ) : filtered.map((v) => {
                  const yaVinculado = obEmailSet.has((v.correo_electronico ?? "").toLowerCase());
                  return (
                    <button key={v.id} onClick={async () => {
                      setMatching(true);
                      await fetch("/api/onboardings", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ onboardingId: matchOb!.id, newEmail: v.correo_electronico }),
                      });
                      setMatching(false);
                      fetchData(true);
                    }} disabled={matching || yaVinculado}
                      className={`w-full flex items-center justify-between px-6 py-3 transition-colors text-left border-b border-gray-50 ${yaVinculado ? "opacity-40" : "hover:bg-amber-50"}`}>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{v.nombre_completo}</p>
                        <p className="text-xs text-gray-400">{v.correo_electronico}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.status === "Rembolsado" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>{v.status}</span>
                        {yaVinculado ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4 text-amber-500" />}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
