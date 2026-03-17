"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, Trophy, Search, ExternalLink, Activity, MessageSquare,
  Users, Plus, X, Check, Clock, ChevronDown,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

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
  avatar_url: string | null;
  edicion: string | null;
  fecha_entrada: string | null;
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
type PorEdicion = { edicion: string; count: number };

const STAGE_COLORS: Record<string, string> = {
  "Stage 0": "#818cf8",
  "Stage 1": "#34d399",
  "Stage 2": "#fbbf24",
  "Sin tipo": "#94a3b8",
};

const STAGE_DESC: Record<string, string> = {
  "Stage 0": "Primer logro / inicio",
  "Stage 1": "Resultado tangible",
  "Stage 2": "Transformación profunda",
};

const STAGES = ["Stage 0", "Stage 1", "Stage 2"];
const FUENTES = ["Testimonial", "Entrevista", "Post propio", "Referido", "Formulario", "Otro"];

function StageBadge({ tipo }: { tipo: string | null }) {
  if (!tipo) return null;
  const color = STAGE_COLORS[tipo] ?? "#94a3b8";
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: color + "20", color, border: `1px solid ${color}50` }}>
      {tipo}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string | null }) {
  if (estado === "Seguimiento") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200">
        <Clock className="h-3 w-3" /> Seguimiento
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
      <Check className="h-3 w-3" /> Confirmado
    </span>
  );
}

function ExitoCard({ caso, onEdit }: { caso: CasoExito; onEdit: (c: CasoExito) => void }) {
  const color = STAGE_COLORS[caso.tipo_exito ?? ""] ?? "#818cf8";
  const initials = caso.nombre_completo
    ?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() ?? "?";

  return (
    <div
      className="relative rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all min-w-0 overflow-hidden bg-white"
      style={{
        border: `1px solid ${color}28`,
        boxShadow: `0 1px 3px rgba(0,0,0,0.06)`,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px -4px ${color}30`; (e.currentTarget as HTMLDivElement).style.borderColor = `${color}55`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 1px 3px rgba(0,0,0,0.06)`; (e.currentTarget as HTMLDivElement).style.borderColor = `${color}28`; }}
      onClick={() => onEdit(caso)}
    >
      {/* Barra de color superior */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />

      {/* Fila 1: foto + nombre | badges */}
      <div className="flex items-start gap-3 min-w-0">
        <div className="shrink-0 h-12 w-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-black"
          style={{ outline: `2.5px solid ${color}`, outlineOffset: "2px", backgroundColor: color + "15", color }}>
          {caso.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={caso.avatar_url} alt={caso.nombre_completo ?? ""} className="h-full w-full object-cover" />
            : initials
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-gray-900 text-[14px] leading-snug">{caso.nombre_completo ?? "—"}</p>
            {caso.enlace_perfil && (
              <a href={caso.enlace_perfil} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gray-300 hover:text-indigo-500 transition-colors shrink-0">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{caso.localizacion ?? caso.email ?? ""}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <EstadoBadge estado={caso.caso_exito} />
          <StageBadge tipo={caso.tipo_exito} />
        </div>
      </div>

      {/* Descripción */}
      {caso.descripcion_exito && (
        <p className="text-[13px] text-gray-500 leading-relaxed border-l-2 pl-3 line-clamp-3" style={{ borderColor: color + "80" }}>
          {caso.descripcion_exito}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 gap-2 min-w-0" style={{ borderTop: `1px solid ${color}15` }}>
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {caso.edicion && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {caso.edicion}
            </span>
          )}
          {caso.fuente_caso_exito && (
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">{caso.fuente_caso_exito}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
          {caso.fecha_entrada && (
            <span className="font-medium" title="Fecha de compra">
              {new Date(caso.fecha_entrada).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" })}
            </span>
          )}
          <span className="text-gray-300">{caso.posts_publicados ?? 0}p · {caso.comentarios_totales ?? 0}c</span>
        </div>
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

type FormData = {
  caso_exito: "Sí" | "Seguimiento";
  tipo_exito: string;
  descripcion_exito: string;
  fuente_caso_exito: string;
  fecha_caso_exito: string;
};

function GestionModal({ alumno, onClose, onSaved }: { alumno: CasoExito | AlumnoResult; onClose: () => void; onSaved: () => void }) {
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
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900">{alumno.nombre_completo ?? alumno.email}</p>
            <p className="text-xs text-gray-400">{alumno.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Estado</label>
            <div className="flex gap-2">
              {(["Sí", "Seguimiento"] as const).map((v) => (
                <button key={v} onClick={() => setForm((f) => ({ ...f, caso_exito: v }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    form.caso_exito === v
                      ? v === "Sí" ? "bg-emerald-500 text-white border-emerald-500" : "bg-orange-500 text-white border-orange-500"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}>
                  {v === "Sí" ? "✓ Caso confirmado" : "⏳ En seguimiento"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Stage</label>
            <div className="flex gap-2">
              <button onClick={() => setForm((f) => ({ ...f, tipo_exito: "" }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  !form.tipo_exito ? "bg-gray-100 text-gray-700 border-gray-300" : "bg-transparent text-gray-400 border-gray-200"
                }`}>
                Sin stage
              </button>
              {STAGES.map((s) => (
                <button key={s} onClick={() => setForm((f) => ({ ...f, tipo_exito: s }))}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2"
                  style={{
                    backgroundColor: form.tipo_exito === s ? STAGE_COLORS[s] : "transparent",
                    borderColor: STAGE_COLORS[s],
                    color: form.tipo_exito === s ? "white" : STAGE_COLORS[s],
                  }}>
                  {s}
                </button>
              ))}
            </div>
            {form.tipo_exito && <p className="text-xs text-gray-400 mt-1">{STAGE_DESC[form.tipo_exito]}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Descripción / Comentarios</label>
            <textarea rows={3} value={form.descripcion_exito}
              onChange={(e) => setForm((f) => ({ ...f, descripcion_exito: e.target.value }))}
              placeholder="Describe el resultado, logro o situación del alumno..."
              className="w-full text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-indigo-300 bg-gray-50 border border-gray-200 text-gray-700 placeholder:text-gray-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Fuente</label>
              <div className="relative">
                <select value={form.fuente_caso_exito}
                  onChange={(e) => setForm((f) => ({ ...f, fuente_caso_exito: e.target.value }))}
                  className="w-full text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none appearance-none bg-gray-50 border border-gray-200 text-gray-700 focus:border-indigo-300">
                  <option value="">Sin fuente</option>
                  {FUENTES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Fecha</label>
              <input type="date" value={form.fecha_caso_exito}
                onChange={(e) => setForm((f) => ({ ...f, fecha_caso_exito: e.target.value }))}
                className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none bg-gray-50 border border-gray-200 text-gray-700 focus:border-indigo-300"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar caso
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Buscador ──────────────────────────────────────────────────────────────────

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
          ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 animate-spin" />
          : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
        }
        <input type="text" value={query} onChange={(e) => search(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar alumno por nombre o email..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:border-emerald-300 bg-gray-50 border border-gray-200 text-gray-700 placeholder:text-gray-300"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
          {results.map((a) => (
            <button key={a.id}
              onClick={() => { onSelect(a); setQuery(""); setResults([]); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
              <div>
                <p className="text-sm font-medium text-gray-900">{a.nombre_completo ?? "—"}</p>
                <p className="text-xs text-gray-400">{a.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.tags && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{a.tags.split(",")[0].trim()}</span>}
                {a.caso_exito === "Sí" && <span className="text-xs text-emerald-600 font-semibold">Confirmado</span>}
                {a.caso_exito === "Seguimiento" && <span className="text-xs text-orange-500 font-semibold">Seguimiento</span>}
                <Plus className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "Sí" | "Seguimiento";

export default function ExitosPage() {
  const [casos, setCasos] = useState<CasoExito[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [porTipo, setPorTipo] = useState<PorTipo[]>([]);
  const [porFuente, setPorFuente] = useState<PorFuente[]>([]);
  const [porEdicion, setPorEdicion] = useState<PorEdicion[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [ediciones, setEdiciones] = useState<string[]>([]);
  const [tipoFilter, setTipoFilter] = useState<string | null>(null);
  const [edicionFilter, setEdicionFilter] = useState<string | null>(null);
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
    if (edicionFilter) params.set("edicion", edicionFilter);
    if (search) params.set("search", search);
    Promise.all([
      fetch(`/api/exitos?${params}`).then((r) => r.json()),
      fetch(`/api/exitos?estado=Sí`).then((r) => r.json()),
      fetch(`/api/exitos?estado=Seguimiento`).then((r) => r.json()),
    ]).then(([tabData, siData, segData]) => {
      setCasos(tabData.data ?? []);
      setStats(tabData.stats);
      setPorTipo(tabData.porTipo ?? []);
      setPorFuente(tabData.porFuente ?? []);
      setPorEdicion(tabData.porEdicion ?? []);
      setTipos(tabData.tipos ?? []);
      setEdiciones(tabData.ediciones ?? []);
      setCounts({ confirmados: siData.total ?? 0, seguimiento: segData.total ?? 0 });
    }).finally(() => setLoading(false));
  }, [tab, tipoFilter, edicionFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Casos de Éxito</h1>
          <p className="text-gray-400 text-sm mt-0.5">Alumnos con resultado documentado · Circle</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4 text-emerald-500" />
          <p className="text-sm font-semibold text-gray-900">Agregar alumno a caso de éxito</p>
        </div>
        <BuscadorAlumnos onSelect={(a) => setModal(a)} />
        <p className="text-xs text-gray-300 mt-2">Busca por nombre o email · Haz clic en un alumno para asignarle un caso o actualizar su estado</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Trophy,        label: "Casos de éxito",     val: stats.total,         color: "bg-amber-500" },
            { icon: Users,         label: "Conexiones medias",  val: stats.avgConexiones,  color: "bg-indigo-500" },
            { icon: Activity,      label: "Posts medios",       val: stats.avgPosts,       color: "bg-blue-500" },
            { icon: MessageSquare, label: "Comentarios medios", val: stats.avgComentarios, color: "bg-purple-500" },
          ].map(({ icon: Icon, label, val, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{val}</p>
              </div>
            </div>
          ))}
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
                  <Cell key={entry.tipo} fill={STAGE_COLORS[entry.tipo] ?? "#818cf8"} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as PorTipo;
                return (
                  <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                    <p className="font-bold" style={{ color: STAGE_COLORS[d.tipo] }}>{d.tipo}</p>
                    <p className="text-gray-400">{STAGE_DESC[d.tipo] ?? ""}</p>
                    <p className="font-bold text-gray-900">{d.count} casos</p>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-1">
            {porTipo.map((t) => (
              <div key={t.tipo} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STAGE_COLORS[t.tipo] ?? "#818cf8" }} />
                <span className="text-xs text-gray-500 flex-1">{t.tipo}</span>
                <span className="text-xs font-bold text-gray-900">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-1">Por edición</h2>
          <p className="text-xs text-gray-400 mb-4">Casos de éxito por lanzamiento</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={porEdicion} barCategoryGap="35%">
              <XAxis dataKey="edicion" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                    <p className="font-semibold text-gray-500">{label}</p>
                    <p className="font-bold text-amber-500">{(payload[0].payload as PorEdicion).count} casos</p>
                  </div>
                );
              }} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} fill="#fbbf24" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Por fuente</h2>
          <div className="space-y-2.5">
            {porFuente.map((f) => (
              <div key={f.fuente}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">{f.fuente}</span>
                  <span className="text-xs font-bold text-gray-900">{f.count}</span>
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
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button onClick={() => { setTab("Sí"); setTipoFilter(null); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "Sí" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}>
            <Check className="h-3.5 w-3.5" />
            Confirmados
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === "Sí" ? "bg-emerald-50 text-emerald-600" : "bg-gray-200 text-gray-400"}`}>
              {counts.confirmados}
            </span>
          </button>
          <button onClick={() => { setTab("Seguimiento"); setTipoFilter(null); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "Seguimiento" ? "bg-white text-orange-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}>
            <Clock className="h-3.5 w-3.5" />
            En seguimiento
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === "Seguimiento" ? "bg-orange-50 text-orange-500" : "bg-gray-200 text-gray-400"}`}>
              {counts.seguimiento}
            </span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
          <input type="text" placeholder="Nombre o descripción..." value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
            className="pl-8 pr-3 py-1.5 text-xs rounded-full focus:outline-none w-52 bg-gray-50 border border-gray-200 text-gray-700 placeholder:text-gray-300 focus:border-indigo-300"
          />
        </div>

        {tab === "Sí" && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-400">Stage:</span>
            <button onClick={() => setTipoFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!tipoFilter ? "bg-gray-200 text-gray-700 border border-gray-300" : "text-gray-400 border border-gray-200"}`}>
              Todos
            </button>
            {tipos.map((t) => (
              <button key={t} onClick={() => setTipoFilter(tipoFilter === t ? null : t)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2"
                style={{
                  backgroundColor: tipoFilter === t ? STAGE_COLORS[t] : "transparent",
                  borderColor: STAGE_COLORS[t],
                  color: tipoFilter === t ? "white" : STAGE_COLORS[t],
                }}>
                {t}
              </button>
            ))}
          </div>
        )}

        {ediciones.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-400">Edición:</span>
            <button onClick={() => setEdicionFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!edicionFilter ? "bg-amber-50 text-amber-600 border border-amber-200" : "text-gray-400 border border-gray-200"}`}>
              Todas
            </button>
            {ediciones.map((ed) => (
              <button key={ed} onClick={() => setEdicionFilter(edicionFilter === ed ? null : ed)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  edicionFilter === ed
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "text-gray-400 border-gray-200 hover:text-gray-600"
                }`}>
                {ed}
              </button>
            ))}
          </div>
        )}

        <span className="ml-auto text-xs text-gray-300">{casos.length} casos</span>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
        </div>
      ) : casos.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{tab === "Seguimiento" ? "No hay alumnos en seguimiento" : "No hay casos de éxito con estos filtros"}</p>
          <p className="text-xs mt-1 text-gray-200">Usa el buscador de arriba para agregar alumnos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {casos.map((caso) => (
            <ExitoCard key={caso.id} caso={caso} onEdit={(c) => setModal(c)} />
          ))}
        </div>
      )}

      {modal && (
        <GestionModal alumno={modal} onClose={() => setModal(null)} onSaved={() => fetchData()} />
      )}
    </div>
  );
}
