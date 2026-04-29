"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Loader2, Trophy, Search, ExternalLink, Activity, Plus, X, Save, Check, Clock,
  Video, VideoOff, Edit3, MapPin, Briefcase,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { cachedFetch, invalidateCache } from "@/lib/cached-fetch";

type Caso = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  tags: string | null;
  localizacion: string | null;
  enlace_perfil: string | null;
  pagina_web: string | null;
  instagram: string | null;
  linkedin: string | null;
  tipo_exito: string | null;
  fuente_caso_exito: string | null;
  fecha_caso_exito: string | null;
  descripcion_exito: string | null;
  conexiones_circle: number | null;
  posts_publicados: number | null;
  comentarios_totales: number | null;
  caso_exito: string | null;
  grabado: boolean;
  enlace_drive: string | null;
  avatar_url: string | null;
  platform_avatar_url: string | null;
  edicion: string | null;
  fecha_entrada: string | null;
  // Platform data
  platform_user_id: string | null;
  platform_cohort: string | null;
  platform_professional_background: string | null;
  platform_desired_role: string | null;
  platform_onboarding_completed: boolean;
  platform_onboarding_completed_at: string | null;
  platform_last_active_at: string | null;
  platform_city: string | null;
  platform_region: string | null;
  platform_country: string | null;
};

type AlumnoSearchResult = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  tags: string | null;
  caso_exito: string | null;
};

type Stats = {
  total: number;
  confirmados: number;
  seguimiento: number;
  grabados: number;
  sinGrabar: number;
  tasaCaptura: string;
  tasaCierre: string;
  totalAlumnosCurso: number;
};

const STAGES = ["Stage 0", "Stage 1", "Stage 2"];
const FUENTES = ["Testimonial", "Entrevista", "Post propio", "Referido", "Formulario", "Otro"];
const STAGE_COLORS: Record<string, string> = {
  "Stage 0": "#818cf8",
  "Stage 1": "#34d399",
  "Stage 2": "#fbbf24",
  "Sin stage": "#94a3b8",
};
const STAGE_DESC: Record<string, string> = {
  "Stage 0": "Primer logro / inicio",
  "Stage 1": "Resultado tangible",
  "Stage 2": "Transformación profunda",
};

function StageBadge({ tipo }: { tipo: string | null }) {
  if (!tipo) return null;
  const color = STAGE_COLORS[tipo] ?? "#94a3b8";
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ backgroundColor: color + "20", color, border: `1px solid ${color}50` }}>
      {tipo}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string | null }) {
  if (estado === "Seguimiento") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
        <Clock className="h-3 w-3" /> Seguimiento
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
      <Check className="h-3 w-3" /> Confirmado
    </span>
  );
}

function GrabadoBadge({ grabado, enlace }: { grabado: boolean; enlace: string | null }) {
  if (grabado) {
    return (
      <a
        href={enlace ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
        onClick={(e) => { if (!enlace) e.preventDefault(); }}
      >
        <Video className="h-3 w-3" /> Grabado
        {enlace && <ExternalLink className="h-2.5 w-2.5" />}
      </a>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-500 border border-gray-200">
      <VideoOff className="h-3 w-3" /> Sin grabar
    </span>
  );
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function CasoCard({ caso, onEdit }: { caso: Caso; onEdit: (c: Caso) => void }) {
  const initials = (caso.nombre_completo ?? "?")
    .split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
  const color = STAGE_COLORS[caso.tipo_exito ?? ""] ?? "#94a3b8";
  const avatar = caso.platform_avatar_url ?? caso.avatar_url;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all relative group"
    >
      {/* Edit button */}
      <button
        onClick={() => onEdit(caso)}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-50 hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
        title="Editar"
      >
        <Edit3 className="h-3.5 w-3.5" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={caso.nombre_completo ?? ""} className="w-12 h-12 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: color }}>
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0 pr-6">
          <p className="font-bold text-gray-900 text-sm truncate">{caso.nombre_completo ?? "—"}</p>
          <p className="text-[11px] text-gray-400 truncate">{caso.email ?? ""}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <StageBadge tipo={caso.tipo_exito} />
            <EstadoBadge estado={caso.caso_exito} />
            <GrabadoBadge grabado={caso.grabado} enlace={caso.enlace_drive} />
          </div>
        </div>
      </div>

      {/* Description */}
      {caso.descripcion_exito && (
        <p className="text-[12px] text-gray-600 line-clamp-3 mb-3">{caso.descripcion_exito}</p>
      )}

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {caso.edicion && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">{caso.edicion}</span>}
        {caso.platform_cohort && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">cohort {caso.platform_cohort}</span>}
        {caso.fuente_caso_exito && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">{caso.fuente_caso_exito}</span>}
        {caso.tags && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">{caso.tags}</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 pt-3 border-t border-gray-100 text-[11px]">
        <div className="text-center">
          <p className="font-bold text-gray-900">{caso.posts_publicados ?? 0}</p>
          <p className="text-gray-400">posts</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-900">{caso.comentarios_totales ?? 0}</p>
          <p className="text-gray-400">comentarios</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-900">{caso.conexiones_circle ?? 0}</p>
          <p className="text-gray-400">conexiones</p>
        </div>
      </div>

      {/* Platform details */}
      {(caso.platform_user_id || caso.platform_city) && (
        <div className="space-y-1 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
          {caso.platform_city && (
            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{caso.platform_city}</span></div>
          )}
          {caso.platform_professional_background && (
            <div className="flex items-center gap-1.5"><Briefcase className="h-3 w-3 shrink-0" /><span className="truncate">{caso.platform_professional_background}</span></div>
          )}
          {caso.platform_last_active_at && (
            <div className="flex items-center gap-1.5"><Activity className="h-3 w-3 shrink-0" /><span>Activo {fmtDate(caso.platform_last_active_at)}</span></div>
          )}
        </div>
      )}

      {/* Footer links */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
        {caso.enlace_perfil && <a href={caso.enlace_perfil} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-500 hover:underline">Circle</a>}
        {caso.linkedin && <a href={caso.linkedin} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-500 hover:underline">LinkedIn</a>}
        {caso.instagram && <a href={caso.instagram} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-500 hover:underline">Instagram</a>}
        {caso.pagina_web && <a href={caso.pagina_web} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-500 hover:underline">Web</a>}
      </div>
    </div>
  );
}

export default function ExitosProPage() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [porStage, setPorStage] = useState<{ stage: string; count: number }[]>([]);
  const [porFuente, setPorFuente] = useState<{ fuente: string; count: number }[]>([]);
  const [porEdicion, setPorEdicion] = useState<{ edicion: string; count: number }[]>([]);
  const [porCohort, setPorCohort] = useState<{ cohort: string; count: number }[]>([]);
  const [ediciones, setEdiciones] = useState<string[]>([]);
  const [cohorts, setCohorts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterGrabado, setFilterGrabado] = useState("");
  const [filterEdicion, setFilterEdicion] = useState("");
  const [filterCohort, setFilterCohort] = useState("");

  const [editing, setEditing] = useState<Caso | null>(null);
  const [editForm, setEditForm] = useState<Partial<Caso>>({});
  const [saving, setSaving] = useState(false);

  // Buscador para añadir
  const [showAdd, setShowAdd] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<AlumnoSearchResult[]>([]);
  const [addAlumno, setAddAlumno] = useState<AlumnoSearchResult | null>(null);
  const [addForm, setAddForm] = useState({
    caso_exito: "Sí",
    tipo_exito: "",
    descripcion_exito: "",
    fuente_caso_exito: "",
    fecha_caso_exito: new Date().toISOString().split("T")[0],
    grabado: false,
    enlace_drive: "",
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterStage) params.set("tipo", filterStage);
    if (filterEstado && filterEstado !== "todos") params.set("estado", filterEstado);
    if (filterGrabado) params.set("grabado", filterGrabado);
    if (filterEdicion) params.set("edicion", filterEdicion);
    if (filterCohort) params.set("cohort", filterCohort);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cachedFetch<any>(`/api/exitos-pro?${params}`)
      .then((d) => {
        setCasos(d.data ?? []);
        setStats(d.stats);
        setPorStage(d.porStage ?? []);
        setPorFuente(d.porFuente ?? []);
        setPorEdicion(d.porEdicion ?? []);
        setPorCohort(d.porCohort ?? []);
        setEdiciones(d.ediciones ?? []);
        setCohorts(d.cohorts ?? []);
      })
      .finally(() => setLoading(false));
  }, [search, filterStage, filterEstado, filterGrabado, filterEdicion, filterCohort]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function searchAlumnos(q: string) {
    setAddQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setAddResults([]); return; }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/alumnos?search=${encodeURIComponent(q)}&limit=8&page=1`)
        .then((r) => r.json())
        .then((d) => setAddResults(d.data ?? []));
    }, 300);
  }

  function startEdit(c: Caso) {
    setEditing(c);
    setEditForm({
      tipo_exito: c.tipo_exito,
      descripcion_exito: c.descripcion_exito,
      fuente_caso_exito: c.fuente_caso_exito,
      fecha_caso_exito: c.fecha_caso_exito,
      caso_exito: c.caso_exito,
      grabado: c.grabado,
      enlace_drive: c.enlace_drive,
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    await fetch("/api/exitos-pro", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, ...editForm }),
    });
    invalidateCache("/api/exitos-pro");
    setEditing(null);
    setEditForm({});
    setSaving(false);
    fetchData();
  }

  async function saveAdd() {
    if (!addAlumno) return;
    setSaving(true);
    await fetch("/api/exitos-pro", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: addAlumno.id, ...addForm }),
    });
    invalidateCache("/api/exitos-pro");
    setShowAdd(false);
    setAddAlumno(null);
    setAddQuery("");
    setAddResults([]);
    setAddForm({ caso_exito: "Sí", tipo_exito: "", descripcion_exito: "", fuente_caso_exito: "", fecha_caso_exito: new Date().toISOString().split("T")[0], grabado: false, enlace_drive: "" });
    setSaving(false);
    fetchData();
  }

  const stageChartData = useMemo(() => porStage.map((s) => ({ name: s.stage, value: s.count })), [porStage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" /> Casos de Éxito
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Captura, gestión y análisis · Datos cruzados Circle + Platform</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold shadow-md hover:bg-amber-600 transition-all"
        >
          <Plus className="h-4 w-4" /> Añadir caso
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Total casos" value={stats.total} color="bg-gray-700" />
          <StatCard label="Confirmados" value={stats.confirmados} color="bg-emerald-500" />
          <StatCard label="Seguimiento" value={stats.seguimiento} color="bg-orange-500" />
          <StatCard label="Grabados" value={stats.grabados} color="bg-blue-500" />
          <StatCard label="Sin grabar" value={stats.sinGrabar} color="bg-gray-400" />
          <StatCard label="% Captura" value={`${stats.tasaCaptura}%`} subtitle={`/ ${stats.totalAlumnosCurso} alumnos`} color="bg-indigo-500" />
          <StatCard label="% Cierre" value={`${stats.tasaCierre}%`} subtitle="grabación" color="bg-amber-500" />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stages */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-700 mb-2">Por Stage</h3>
          {stageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={stageChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} stroke="none">
                  {stageChartData.map((s, i) => <Cell key={i} fill={STAGE_COLORS[s.name] ?? "#94a3b8"} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
          <div className="space-y-0.5 mt-2">
            {porStage.map((s) => (
              <div key={s.stage} className="flex items-center justify-between text-[11px]">
                <span className="text-gray-600">{s.stage}</span>
                <span className="font-bold text-gray-800">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fuente */}
        <ChartBlock title="Por Fuente" data={porFuente} dataKey="fuente" color="#6366f1" />
        {/* Edición */}
        <ChartBlock title="Por Edición" data={porEdicion} dataKey="edicion" color="#8b5cf6" />
        {/* Cohort */}
        <ChartBlock title="Por Cohort (Platform)" data={porCohort} dataKey="cohort" color="#ec4899" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text" placeholder="Nombre, email, descripción..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-amber-300 w-56"
          />
        </div>
        <Select label="Stage" value={filterStage} onChange={setFilterStage} options={["", ...STAGES]} />
        <Select label="Estado" value={filterEstado} onChange={setFilterEstado} options={["todos", "Sí", "Seguimiento"]} renderOption={(o) => o === "Sí" ? "Confirmado" : o === "todos" ? "Todos" : "Seguimiento"} />
        <Select label="Grabado" value={filterGrabado} onChange={setFilterGrabado} options={["", "true", "false"]} renderOption={(o) => o === "" ? "Todos" : o === "true" ? "Grabados" : "Sin grabar"} />
        <Select label="Edición" value={filterEdicion} onChange={setFilterEdicion} options={["", ...ediciones]} />
        <Select label="Cohort" value={filterCohort} onChange={setFilterCohort} options={["", ...cohorts]} />
        <span className="text-xs text-gray-400 ml-auto">{stats?.total ?? 0} resultados</span>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-amber-500" /></div>
      ) : casos.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No hay casos para los filtros aplicados.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {casos.map((c) => <CasoCard key={c.id} caso={c} onEdit={startEdit} />)}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title={`Editar caso · ${editing.nombre_completo ?? "—"}`} onClose={() => setEditing(null)}>
          <EditForm form={editForm} onChange={setEditForm} />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
            </button>
          </div>
        </Modal>
      )}

      {/* Add modal */}
      {showAdd && (
        <Modal title="Añadir nuevo caso" onClose={() => setShowAdd(false)}>
          {!addAlumno ? (
            <div>
              <p className="text-xs text-gray-500 mb-2">Buscar alumno (al menos 2 caracteres)</p>
              <input
                type="text"
                value={addQuery}
                onChange={(e) => searchAlumnos(e.target.value)}
                placeholder="Nombre o email..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300"
              />
              {addResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                  {addResults.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAddAlumno(a)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{a.nombre_completo}</p>
                        <p className="text-[11px] text-gray-400">{a.email}</p>
                      </div>
                      {a.caso_exito && <span className="text-[10px] text-amber-600">ya tiene caso</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{addAlumno.nombre_completo}</p>
                  <p className="text-[11px] text-gray-400">{addAlumno.email}</p>
                </div>
                <button onClick={() => setAddAlumno(null)} className="text-xs text-gray-400 hover:text-red-500">Cambiar</button>
              </div>
              <EditForm form={addForm} onChange={(f) => setAddForm({ ...addForm, ...f })} />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button onClick={saveAdd} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Añadir
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, subtitle, color }: { label: string; value: number | string; subtitle?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
      <div className={`h-1 w-8 rounded-full mb-2 ${color}`} />
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
      {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function ChartBlock({ title, data, dataKey, color }: { title: string; data: { count: number }[]; dataKey: string; color: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartData = data.map((d: any) => ({ name: d[dataKey], count: d.count }));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-xs font-bold text-gray-700 mb-2">{title}</h3>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyChart />}
    </div>
  );
}

function EmptyChart() {
  return <div className="h-[160px] flex items-center justify-center text-[11px] text-gray-300">Sin datos</div>;
}

function Select({ label, value, onChange, options, renderOption }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; renderOption?: (o: string) => string;
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-[11px] text-gray-500">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-xs border border-gray-200 rounded-full bg-white focus:outline-none focus:border-amber-300"
      >
        {options.map((o) => (
          <option key={o} value={o}>{renderOption ? renderOption(o) : (o === "" ? "Todos" : o)}</option>
        ))}
      </select>
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EditForm({ form, onChange }: { form: any; onChange: (f: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado">
          <select value={form.caso_exito ?? ""} onChange={(e) => onChange({ ...form, caso_exito: e.target.value })} className="input">
            <option value="">—</option>
            <option value="Sí">Confirmado</option>
            <option value="Seguimiento">Seguimiento</option>
          </select>
        </Field>
        <Field label="Stage">
          <select value={form.tipo_exito ?? ""} onChange={(e) => onChange({ ...form, tipo_exito: e.target.value })} className="input">
            <option value="">—</option>
            {STAGES.map((s) => <option key={s} value={s}>{s} — {STAGE_DESC[s]}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fuente">
          <select value={form.fuente_caso_exito ?? ""} onChange={(e) => onChange({ ...form, fuente_caso_exito: e.target.value })} className="input">
            <option value="">—</option>
            {FUENTES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Fecha del caso">
          <input type="date" value={form.fecha_caso_exito?.slice(0, 10) ?? ""} onChange={(e) => onChange({ ...form, fecha_caso_exito: e.target.value })} className="input" />
        </Field>
      </div>
      <Field label="Descripción">
        <textarea value={form.descripcion_exito ?? ""} onChange={(e) => onChange({ ...form, descripcion_exito: e.target.value })} rows={4} className="input resize-none" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Grabado">
          <label className="inline-flex items-center gap-2 mt-2">
            <input type="checkbox" checked={!!form.grabado} onChange={(e) => onChange({ ...form, grabado: e.target.checked })} />
            <span className="text-xs">Sí, grabado</span>
          </label>
        </Field>
        <Field label="Enlace de la grabación" className="col-span-2">
          <input type="url" placeholder="https://drive.google.com/..." value={form.enlace_drive ?? ""} onChange={(e) => onChange({ ...form, enlace_drive: e.target.value })} className="input" />
        </Field>
      </div>
      <style jsx>{`
        .input {
          width: 100%;
          padding: 6px 10px;
          font-size: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          outline: none;
        }
        .input:focus { border-color: #fcd34d; }
      `}</style>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
