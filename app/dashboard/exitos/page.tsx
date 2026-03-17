"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, Trophy, Search, ExternalLink, Activity, MessageSquare,
  Users, Plus, X, Check, Clock, ChevronDown,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

type CasoExito = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  tags: string | null;
  localizacion: string | null;
  enlace_perfil: string | null;
  tipo_exito: string | null;
  fuente_caso_exito: string | null;
  fecha_caso_exito: string | null;
  descripcion_exito: string | null;
  conexiones_circle: number | null;
  posts_publicados: number | null;
  comentarios_totales: number | null;
  caso_exito: string | null;
};

type AlumnoResult = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  tags: string | null;
  caso_exito: string | null;
};

type Stats = { total: number; avgPosts: number; avgComentarios: number; avgConexiones: number };
type PorTipo = { tipo: string; count: number };
type PorFuente = { fuente: string; count: number };
type PorLanzamiento = { lanzamiento: string; count: number };

// ── Constants ────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  "Stage 0": "#6366f1",
  "Stage 1": "#10b981",
  "Stage 2": "#f59e0b",
  "Sin tipo": "#9ca3af",
};

const STAGE_DESC: Record<string, string> = {
  "Stage 0": "Primer logro / inicio",
  "Stage 1": "Resultado tangible",
  "Stage 2": "Transformación profunda",
};

const STAGES = ["Stage 0", "Stage 1", "Stage 2"];
const FUENTES = ["Testimonial", "Entrevista", "Post propio", "Referido", "Formulario", "Otro"];

// ── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ tipo }: { tipo: string | null }) {
  if (!tipo) return null;
  const color = STAGE_COLORS[tipo] ?? "#9ca3af";
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>
      {tipo}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string | null }) {
  if (estado === "Seguimiento") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-500">
        <Clock className="h-3 w-3" /> Seguimiento
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
      <Check className="h-3 w-3" /> Confirmado
    </span>
  );
}

function ExitoCard({ caso, onEdit }: { caso: CasoExito; onEdit: (c: CasoExito) => void }) {
  const color = STAGE_COLORS[caso.tipo_exito ?? ""] ?? "#9ca3af";
  const tag = caso.tags?.split(",")[0].trim();

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onEdit(caso)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
            style={{ backgroundColor: color }}>
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{caso.nombre_completo ?? "—"}</p>
            <p className="text-[11px] text-gray-400">{caso.localizacion ?? caso.email ?? ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EstadoBadge estado={caso.caso_exito} />
          <StageBadge tipo={caso.tipo_exito} />
          {caso.enlace_perfil && (
            <a href={caso.enlace_perfil} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-300 hover:text-indigo-500 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {caso.descripcion_exito && (
        <p className="text-sm text-gray-700 leading-relaxed border-l-2 pl-3" style={{ borderColor: color }}>
          "{caso.descripcion_exito}"
        </p>
      )}

      <div className="flex items-center gap-3 pt-1 border-t border-gray-50 flex-wrap">
        {tag && <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{tag}</span>}
        {caso.fuente_caso_exito && (
          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">{caso.fuente_caso_exito}</span>
        )}
        {caso.fecha_caso_exito && (
          <span className="text-[10px] text-gray-400 ml-auto">
            {new Date(caso.fecha_caso_exito).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
        <div className="flex items-center gap-2 text-[10px] text-gray-400 ml-auto">
          <span>{caso.posts_publicados ?? 0} posts</span>
          <span>{caso.comentarios_totales ?? 0} cmts</span>
        </div>
      </div>
    </div>
  );
}

// ── Modal de gestión ─────────────────────────────────────────────────────────

type FormData = {
  caso_exito: "Sí" | "Seguimiento";
  tipo_exito: string;
  descripcion_exito: string;
  fuente_caso_exito: string;
  fecha_caso_exito: string;
};

function GestionModal({
  alumno,
  onClose,
  onSaved,
}: {
  alumno: CasoExito | AlumnoResult;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>({
    caso_exito: (alumno as CasoExito).caso_exito === "Seguimiento" ? "Seguimiento" : "Sí",
    tipo_exito: (alumno as CasoExito).tipo_exito ?? "",
    descripcion_exito: (alumno as CasoExito).descripcion_exito ?? "",
    fuente_caso_exito: (alumno as CasoExito).fuente_caso_exito ?? "",
    fecha_caso_exito: (alumno as CasoExito).fecha_caso_exito?.split("T")[0] ?? new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/exitos/${alumno.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caso_exito: form.caso_exito,
          tipo_exito: form.tipo_exito || null,
          descripcion_exito: form.descripcion_exito || null,
          fuente_caso_exito: form.fuente_caso_exito || null,
          fecha_caso_exito: form.fecha_caso_exito || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      onSaved();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900">{alumno.nombre_completo ?? alumno.email}</p>
            <p className="text-xs text-gray-400">{alumno.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Estado */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Estado</label>
            <div className="flex gap-2">
              {(["Sí", "Seguimiento"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setForm((f) => ({ ...f, caso_exito: v }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    form.caso_exito === v
                      ? v === "Sí"
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-orange-400 text-white border-orange-400"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {v === "Sí" ? "✓ Caso confirmado" : "⏳ En seguimiento"}
                </button>
              ))}
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Stage</label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm((f) => ({ ...f, tipo_exito: "" }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  !form.tipo_exito ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200"
                }`}
              >
                Sin stage
              </button>
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, tipo_exito: s }))}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all border-2"
                  style={{
                    backgroundColor: form.tipo_exito === s ? STAGE_COLORS[s] : "transparent",
                    borderColor: STAGE_COLORS[s],
                    color: form.tipo_exito === s ? "white" : STAGE_COLORS[s],
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {form.tipo_exito && (
              <p className="text-xs text-gray-400 mt-1">{STAGE_DESC[form.tipo_exito]}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Descripción / Comentarios</label>
            <textarea
              rows={3}
              value={form.descripcion_exito}
              onChange={(e) => setForm((f) => ({ ...f, descripcion_exito: e.target.value }))}
              placeholder="Describe el resultado, logro o situación del alumno..."
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-300 resize-none"
            />
          </div>

          {/* Fuente y Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Fuente</label>
              <div className="relative">
                <select
                  value={form.fuente_caso_exito}
                  onChange={(e) => setForm((f) => ({ ...f, fuente_caso_exito: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-300 appearance-none bg-white"
                >
                  <option value="">Sin fuente</option>
                  {FUENTES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Fecha</label>
              <input
                type="date"
                value={form.fecha_caso_exito}
                onChange={(e) => setForm((f) => ({ ...f, fecha_caso_exito: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-300"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar caso
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel buscador de alumnos ─────────────────────────────────────────────────

function BuscadorAlumnos({ onSelect }: { onSelect: (a: AlumnoResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlumnoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/alumnos?search=${encodeURIComponent(q)}&limit=8&page=1`)
        .then((r) => r.json())
        .then((d) => { setResults(d.data ?? []); setOpen(true); })
        .finally(() => setLoading(false));
    }, 300);
  };

  return (
    <div className="relative">
      <div className="relative">
        {loading
          ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
          : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        }
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar alumno por nombre o email..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300 bg-white"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
          {results.map((a) => (
            <button
              key={a.id}
              onClick={() => { onSelect(a); setQuery(""); setResults([]); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{a.nombre_completo ?? "—"}</p>
                <p className="text-xs text-gray-400">{a.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.tags && <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{a.tags.split(",")[0].trim()}</span>}
                {a.caso_exito === "Sí" && <span className="text-[10px] text-emerald-500 font-semibold">Confirmado</span>}
                {a.caso_exito === "Seguimiento" && <span className="text-[10px] text-orange-400 font-semibold">Seguimiento</span>}
                <Plus className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

type Tab = "Sí" | "Seguimiento";

export default function ExitosPage() {
  const [casos, setCasos] = useState<CasoExito[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [porTipo, setPorTipo] = useState<PorTipo[]>([]);
  const [porFuente, setPorFuente] = useState<PorFuente[]>([]);
  const [porLanzamiento, setPorLanzamiento] = useState<PorLanzamiento[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [tipoFilter, setTipoFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Sí");
  const [modal, setModal] = useState<CasoExito | AlumnoResult | null>(null);
  const [counts, setCounts] = useState<{ confirmados: number; seguimiento: number }>({ confirmados: 0, seguimiento: 0 });

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ estado: tab });
    if (tipoFilter) params.set("tipo", tipoFilter);
    if (search) params.set("search", search);

    // Fetch current tab data + counts for both tabs
    Promise.all([
      fetch(`/api/exitos?${params}`).then((r) => r.json()),
      fetch(`/api/exitos?estado=Sí`).then((r) => r.json()),
      fetch(`/api/exitos?estado=Seguimiento`).then((r) => r.json()),
    ]).then(([tabData, siData, segData]) => {
      setCasos(tabData.data ?? []);
      setStats(tabData.stats);
      setPorTipo(tabData.porTipo ?? []);
      setPorFuente(tabData.porFuente ?? []);
      setPorLanzamiento(tabData.porLanzamiento ?? []);
      setTipos(tabData.tipos ?? []);
      setCounts({ confirmados: siData.total ?? 0, seguimiento: segData.total ?? 0 });
    }).finally(() => setLoading(false));
  }, [tab, tipoFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaved = () => fetchData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Casos de Éxito</h1>
          <p className="text-gray-400 text-sm mt-0.5">Alumnos con resultado documentado · Circle</p>
        </div>
      </div>

      {/* Buscador + Agregar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4 text-emerald-500" />
          <p className="text-sm font-semibold text-gray-700">Agregar alumno a caso de éxito</p>
        </div>
        <BuscadorAlumnos onSelect={(a) => setModal(a)} />
        <p className="text-xs text-gray-400 mt-2">Busca por nombre o email · Haz clic en un alumno para asignarle un caso o actualizar su estado</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Casos de éxito</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Conexiones medias</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.avgConexiones}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Posts medios</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.avgPosts}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Comentarios medios</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.avgComentarios}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-1">Por stage</h2>
          <p className="text-xs text-gray-400 mb-2">Nivel del caso de éxito</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={porTipo} dataKey="count" nameKey="tipo" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                {porTipo.map((entry) => (
                  <Cell key={entry.tipo} fill={STAGE_COLORS[entry.tipo] ?? "#9ca3af"} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as PorTipo;
                return (
                  <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                    <p className="font-bold" style={{ color: STAGE_COLORS[d.tipo] ?? "#9ca3af" }}>{d.tipo}</p>
                    <p className="text-gray-500">{STAGE_DESC[d.tipo] ?? ""}</p>
                    <p className="font-bold text-gray-800">{d.count} casos</p>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-1">
            {porTipo.map((t) => (
              <div key={t.tipo} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STAGE_COLORS[t.tipo] ?? "#9ca3af" }} />
                <span className="text-xs text-gray-600 flex-1">{t.tipo}</span>
                <span className="text-xs font-bold text-gray-800">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-1">Por lanzamiento</h2>
          <p className="text-xs text-gray-400 mb-4">Distribución por edición</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={porLanzamiento} barCategoryGap="35%">
              <XAxis dataKey="lanzamiento" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: "#f3f4f6" }} content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                    <p className="font-semibold text-gray-700">{label}</p>
                    <p className="font-bold text-amber-600">{(payload[0].payload as PorLanzamiento).count} casos</p>
                  </div>
                );
              }} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Por fuente</h2>
          <div className="space-y-2.5">
            {porFuente.map((f) => (
              <div key={f.fuente}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs text-gray-600">{f.fuente}</span>
                  <span className="text-xs font-bold text-gray-800">{f.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-1.5 bg-indigo-400 rounded-full" style={{ width: `${Math.round((f.count / (porFuente[0]?.count ?? 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs + Filtros */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => { setTab("Sí"); setTipoFilter(null); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "Sí" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            Confirmados
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === "Sí" ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-500"}`}>
              {counts.confirmados}
            </span>
          </button>
          <button
            onClick={() => { setTab("Seguimiento"); setTipoFilter(null); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "Seguimiento" ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            En seguimiento
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === "Seguimiento" ? "bg-orange-100 text-orange-500" : "bg-gray-200 text-gray-500"}`}>
              {counts.seguimiento}
            </span>
          </button>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Nombre o descripción..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 w-52"
          />
        </div>

        {/* Stage filter */}
        {tab === "Sí" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-400">Stage:</span>
            <button onClick={() => setTipoFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!tipoFilter ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
              Todos
            </button>
            {tipos.map((t) => (
              <button key={t} onClick={() => setTipoFilter(tipoFilter === t ? null : t)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  backgroundColor: tipoFilter === t ? STAGE_COLORS[t] : "transparent",
                  border: `1.5px solid ${STAGE_COLORS[t]}`,
                  color: tipoFilter === t ? "white" : STAGE_COLORS[t],
                }}>
                {t}
              </button>
            ))}
          </div>
        )}

        <span className="ml-auto text-xs text-gray-400">{casos.length} casos</span>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
        </div>
      ) : casos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            {tab === "Seguimiento" ? "No hay alumnos en seguimiento" : "No hay casos de éxito con estos filtros"}
          </p>
          <p className="text-xs mt-1 text-gray-300">Usa el buscador de arriba para agregar alumnos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {casos.map((caso) => (
            <ExitoCard key={caso.id} caso={caso} onEdit={(c) => setModal(c)} />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <GestionModal
          alumno={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
