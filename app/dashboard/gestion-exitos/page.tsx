"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, Search, Trophy, Plus, X, Save, Check, Clock,
  Video, VideoOff, ExternalLink, Edit3, ChevronDown,
} from "lucide-react";

type Caso = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  caso_exito: string | null;
  tipo_exito: string | null;
  descripcion_exito: string | null;
  fuente_caso_exito: string | null;
  fecha_caso_exito: string | null;
  grabado: boolean;
  enlace_drive: string | null;
  tags: string | null;
};

type AlumnoResult = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  tags: string | null;
  caso_exito: string | null;
};

type Stats = { total: number; confirmados: number; seguimiento: number; grabados: number; sinGrabar: number; porStage: Record<string, number> };

const STAGES = ["Stage 0", "Stage 1", "Stage 2"];
const FUENTES = ["Testimonial", "Entrevista", "Post propio", "Referido", "Formulario", "Otro"];
const STAGE_COLORS: Record<string, string> = {
  "Stage 0": "#818cf8", "Stage 1": "#34d399", "Stage 2": "#fbbf24",
};

export default function GestionExitosPage() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterGrabado, setFilterGrabado] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Caso>>({});
  const [saving, setSaving] = useState(false);

  // Buscador de alumnos
  const [alumnoQuery, setAlumnoQuery] = useState("");
  const [alumnoResults, setAlumnoResults] = useState<AlumnoResult[]>([]);
  const [alumnoLoading, setAlumnoLoading] = useState(false);
  const [alumnoOpen, setAlumnoOpen] = useState(false);
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ caso_exito: "Sí", tipo_exito: "", descripcion_exito: "", fuente_caso_exito: "", fecha_caso_exito: new Date().toISOString().split("T")[0], grabado: false, enlace_drive: "" });
  const [nuevoAlumno, setNuevoAlumno] = useState<AlumnoResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterGrabado) params.set("grabado", filterGrabado);
    if (filterEstado) params.set("estado", filterEstado);
    fetch(`/api/gestion-exitos?${params}`)
      .then((r) => r.json())
      .then((d) => { setCasos(d.data ?? []); setStats(d.stats ?? null); })
      .finally(() => setLoading(false));
  }, [search, filterGrabado, filterEstado]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function searchAlumnos(q: string) {
    setAlumnoQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setAlumnoResults([]); setAlumnoOpen(false); return; }
    setAlumnoLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/alumnos?search=${encodeURIComponent(q)}&limit=8&page=1`)
        .then((r) => r.json())
        .then((d) => { setAlumnoResults(d.data ?? []); setAlumnoOpen(true); })
        .finally(() => setAlumnoLoading(false));
    }, 300);
  }

  async function handleNuevoSave() {
    if (!nuevoAlumno) return;
    setSaving(true);
    await fetch("/api/gestion-exitos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: nuevoAlumno.id, ...nuevoForm }),
    });
    setSaving(false);
    setShowNuevo(false);
    setNuevoAlumno(null);
    setNuevoForm({ caso_exito: "Sí", tipo_exito: "", descripcion_exito: "", fuente_caso_exito: "", fecha_caso_exito: new Date().toISOString().split("T")[0], grabado: false, enlace_drive: "" });
    fetchData();
  }

  async function handleEditSave(id: string) {
    setSaving(true);
    await fetch("/api/gestion-exitos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editForm }),
    });
    setSaving(false);
    setEditingId(null);
    fetchData();
  }

  async function toggleGrabado(caso: Caso) {
    await fetch("/api/gestion-exitos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: caso.id, grabado: !caso.grabado }),
    });
    fetchData();
  }

  function startEdit(caso: Caso) {
    setEditingId(caso.id);
    setEditForm({
      caso_exito: caso.caso_exito,
      tipo_exito: caso.tipo_exito,
      descripcion_exito: caso.descripcion_exito,
      fuente_caso_exito: caso.fuente_caso_exito,
      fecha_caso_exito: caso.fecha_caso_exito?.split("T")[0] ?? "",
      grabado: caso.grabado,
      enlace_drive: caso.enlace_drive,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion Casos de Exito</h1>
          <p className="text-gray-400 text-sm mt-0.5">Registra, edita y marca grabaciones</p>
        </div>
        <button onClick={() => setShowNuevo(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors">
          <Plus className="h-4 w-4" /> Registrar caso
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Confirmados", val: stats.confirmados, color: "bg-emerald-500" },
            { label: "Seguimiento", val: stats.seguimiento, color: "bg-orange-500" },
            { label: "Grabados", val: stats.grabados, color: "bg-indigo-500" },
            { label: "Sin grabar", val: stats.sinGrabar, color: "bg-red-400" },
            { label: "Total", val: stats.total, color: "bg-gray-800" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{val}</p>
              </div>
            </div>
          ))}
        </div>

      )}

      {/* Desglose por stage */}
      {stats && stats.porStage && Object.keys(stats.porStage).length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Stages (confirmados):</span>
          {Object.entries(stats.porStage).map(([stage, count]) => (
            <span key={stage} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border-2"
              style={{ backgroundColor: (STAGE_COLORS[stage] ?? "#94a3b8") + "15", borderColor: STAGE_COLORS[stage] ?? "#94a3b8", color: STAGE_COLORS[stage] ?? "#94a3b8" }}>
              {stage} <span className="text-xs font-black">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Nuevo caso */}
      {showNuevo && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Registrar nuevo caso de exito</h2>
            <button onClick={() => { setShowNuevo(false); setNuevoAlumno(null); }} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>

          {!nuevoAlumno ? (
            <div className="relative">
              <div className="relative">
                {alumnoLoading
                  ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 animate-spin" />
                  : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                }
                <input type="text" value={alumnoQuery} onChange={(e) => searchAlumnos(e.target.value)}
                  onFocus={() => alumnoResults.length > 0 && setAlumnoOpen(true)}
                  placeholder="Buscar alumno por nombre o email..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:border-amber-300 bg-gray-50 border border-gray-200 text-gray-700 placeholder:text-gray-300" />
              </div>
              {alumnoOpen && alumnoResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                  {alumnoResults.map((a) => (
                    <button key={a.id} onClick={() => { setNuevoAlumno(a); setAlumnoQuery(""); setAlumnoResults([]); setAlumnoOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.nombre_completo ?? "—"}</p>
                        <p className="text-xs text-gray-400">{a.email}</p>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-amber-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
                <Trophy className="h-4 w-4 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{nuevoAlumno.nombre_completo}</p>
                  <p className="text-xs text-gray-400">{nuevoAlumno.email}</p>
                </div>
                <button onClick={() => setNuevoAlumno(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Estado</label>
                  <div className="flex gap-2">
                    {["Sí", "Seguimiento"].map((v) => (
                      <button key={v} onClick={() => setNuevoForm((f) => ({ ...f, caso_exito: v }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border ${nuevoForm.caso_exito === v
                          ? v === "Sí" ? "bg-emerald-500 text-white border-emerald-500" : "bg-orange-500 text-white border-orange-500"
                          : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {v === "Sí" ? "Confirmado" : "Seguimiento"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Stage</label>
                  <div className="flex gap-1.5">
                    {STAGES.map((s) => (
                      <button key={s} onClick={() => setNuevoForm((f) => ({ ...f, tipo_exito: f.tipo_exito === s ? "" : s }))}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border-2"
                        style={{ backgroundColor: nuevoForm.tipo_exito === s ? STAGE_COLORS[s] : "transparent", borderColor: STAGE_COLORS[s], color: nuevoForm.tipo_exito === s ? "white" : STAGE_COLORS[s] }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <textarea rows={2} value={nuevoForm.descripcion_exito} onChange={(e) => setNuevoForm((f) => ({ ...f, descripcion_exito: e.target.value }))}
                placeholder="Descripcion del caso de exito..."
                className="w-full text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-amber-300 bg-gray-50 border border-gray-200 text-gray-700 placeholder:text-gray-300" />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Fuente</label>
                  <div className="relative">
                    <select value={nuevoForm.fuente_caso_exito} onChange={(e) => setNuevoForm((f) => ({ ...f, fuente_caso_exito: e.target.value }))}
                      className="w-full text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none appearance-none bg-gray-50 border border-gray-200 text-gray-700 focus:border-amber-300">
                      <option value="">Sin fuente</option>
                      {FUENTES.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Fecha</label>
                  <input type="date" value={nuevoForm.fecha_caso_exito} onChange={(e) => setNuevoForm((f) => ({ ...f, fecha_caso_exito: e.target.value }))}
                    className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none bg-gray-50 border border-gray-200 text-gray-700 focus:border-amber-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Enlace Drive</label>
                  <input type="url" value={nuevoForm.enlace_drive} onChange={(e) => setNuevoForm((f) => ({ ...f, enlace_drive: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none bg-gray-50 border border-gray-200 text-gray-700 placeholder:text-gray-300 focus:border-amber-300" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={nuevoForm.grabado} onChange={(e) => setNuevoForm((f) => ({ ...f, grabado: e.target.checked }))}
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                  <span className="text-sm text-gray-600 font-medium">Grabado</span>
                </label>
                <button onClick={handleNuevoSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <Save className="h-3.5 w-3.5" /> Guardar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input type="text" placeholder="Buscar..." value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); } }}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-amber-300 w-48" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Estado:</span>
          {[{ v: "", l: "Todos" }, { v: "Sí", l: "Confirmados" }, { v: "Seguimiento", l: "Seguimiento" }].map(({ v, l }) => (
            <button key={v} onClick={() => setFilterEstado(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterEstado === v ? "bg-amber-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-amber-300"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Grabacion:</span>
          {[{ v: "", l: "Todos" }, { v: "true", l: "Grabados" }, { v: "false", l: "Sin grabar" }].map(({ v, l }) => (
            <button key={v} onClick={() => setFilterGrabado(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterGrabado === v ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
              {l}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">{casos.length} casos</span>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-amber-400" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Alumno</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Fuente</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Grabado</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Drive</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {casos.map((caso) => (
                editingId === caso.id ? (
                  <tr key={caso.id} className="bg-amber-50/30">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-gray-900">{caso.nombre_completo}</p>
                      <p className="text-xs text-gray-400">{caso.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select value={editForm.caso_exito ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, caso_exito: e.target.value }))}
                        className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-amber-300">
                        <option value="Sí">Confirmado</option>
                        <option value="Seguimiento">Seguimiento</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {STAGES.map((s) => (
                          <button key={s} onClick={() => setEditForm((f) => ({ ...f, tipo_exito: f.tipo_exito === s ? "" : s }))}
                            className="px-2 py-1 rounded-md text-[10px] font-bold border"
                            style={{ backgroundColor: editForm.tipo_exito === s ? STAGE_COLORS[s] : "transparent", borderColor: STAGE_COLORS[s], color: editForm.tipo_exito === s ? "white" : STAGE_COLORS[s] }}>
                            {s.replace("Stage ", "S")}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select value={editForm.fuente_caso_exito ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, fuente_caso_exito: e.target.value }))}
                        className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-amber-300">
                        <option value="">—</option>
                        {FUENTES.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={editForm.grabado ?? false} onChange={(e) => setEditForm((f) => ({ ...f, grabado: e.target.checked }))}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="url" value={editForm.enlace_drive ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, enlace_drive: e.target.value }))}
                        placeholder="https://drive..."
                        className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-amber-300 w-full" />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleEditSave(caso.id)} disabled={saving}
                          className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50">
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={caso.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-gray-800">{caso.nombre_completo ?? "—"}</p>
                      <p className="text-[11px] text-gray-400">{caso.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {caso.caso_exito === "Sí"
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600"><Check className="h-3 w-3" />Confirmado</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-500"><Clock className="h-3 w-3" />Seguimiento</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {caso.tipo_exito ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{ backgroundColor: (STAGE_COLORS[caso.tipo_exito] ?? "#818cf8") + "20", color: STAGE_COLORS[caso.tipo_exito] ?? "#818cf8" }}>
                          {caso.tipo_exito}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{caso.fuente_caso_exito ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleGrabado(caso)}
                        className={`p-1.5 rounded-lg transition-all ${caso.grabado ? "text-indigo-500 bg-indigo-50 hover:bg-indigo-100" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"}`}>
                        {caso.grabado ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {caso.enlace_drive ? (
                        <a href={caso.enlace_drive} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                          <ExternalLink className="h-3 w-3" /> Ver
                        </a>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => startEdit(caso)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-all">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
          {casos.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">No hay casos de exito con estos filtros</div>
          )}
        </div>
      )}
    </div>
  );
}
