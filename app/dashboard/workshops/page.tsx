"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Search, Calendar, Plus, Copy, Trash2, ArrowUp, ArrowDown, ArrowRight,
} from "lucide-react";

type Workshop = {
  id: string;
  nombre: string;
  fecha: string | null;
  persona: string | null;
  tipo: string | null;
  cuenta_zoom: string | null;
  descripcion: string | null;
  acciones_previas: string | null;
  nps: string | null;
  estado: string | null;
  notion: string | null;
  asistentes: string | null;
  video_explicativo: string | null;
  enlace_portada: string | null;
};

const TIPO_COLORS: Record<string, string> = {
  "Q&A": "bg-purple-50 text-purple-600",
  "Técnico": "bg-blue-50 text-blue-600",
  "Técnico Nuevos alumnos": "bg-cyan-50 text-cyan-600",
  "Negocio": "bg-amber-50 text-amber-600",
  "Negocio Nuevos alumnos": "bg-orange-50 text-orange-600",
  "Jornada Bienvenida": "bg-emerald-50 text-emerald-600",
};

const MONTH_NAMES: Record<string, string> = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril", "05": "Mayo", "06": "Junio",
  "07": "Julio", "08": "Agosto", "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
};

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[month] ?? month} ${year}`;
}

function nextMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showNewTablero, setShowNewTablero] = useState(false);
  const [newTableroMes, setNewTableroMes] = useState("");
  const [moveTarget, setMoveTarget] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/workshops?${params}`)
      .then((r) => r.json())
      .then((d) => setWorkshops(d.data ?? []))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date().toISOString().split("T")[0];

  // Group by month
  const grouped: Record<string, Workshop[]> = {};
  workshops.forEach((w) => {
    const key = w.fecha ? w.fecha.substring(0, 7) : "sin-fecha";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  });
  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Sort items within each month by date ascending
  for (const key of sortedMonths) {
    grouped[key].sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
  }

  async function updateField(id: string, field: string, value: string) {
    await fetch("/api/workshops", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value || null }),
    });
    fetchData();
  }

  async function addRow(monthKey: string) {
    const [y, m] = monthKey.split("-");
    const fecha = `${y}-${m}-01`;
    await fetch("/api/workshops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Nuevo workshop", fecha }),
    });
    fetchData();
  }

  async function cloneRow(w: Workshop) {
    const { id, ...rest } = w;
    await fetch("/api/workshops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rest, nombre: `${rest.nombre} (copia)` }),
    });
    fetchData();
  }

  async function deleteRow(id: string) {
    await fetch(`/api/workshops?id=${id}`, { method: "DELETE" });
    setSelected((s) => { const ns = new Set(s); ns.delete(id); return ns; });
    fetchData();
  }

  async function moveRows(targetMonth: string) {
    const [y, m] = targetMonth.split("-");
    const promises = [...selected].map((id) => {
      const w = workshops.find((w) => w.id === id);
      const day = w?.fecha ? w.fecha.substring(8, 10) : "01";
      return fetch("/api/workshops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, fecha: `${y}-${m}-${day}` }),
      });
    });
    await Promise.all(promises);
    setSelected(new Set());
    setMoveTarget(null);
    fetchData();
  }

  async function addTablero() {
    if (!newTableroMes) return;
    await fetch("/api/workshops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Nuevo workshop", fecha: `${newTableroMes}-01` }),
    });
    setShowNewTablero(false);
    setNewTableroMes("");
    fetchData();
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      return ns;
    });
  }

  function toggleSelectAll(monthKey: string) {
    const items = grouped[monthKey] ?? [];
    const allSelected = items.every((w) => selected.has(w.id));
    setSelected((s) => {
      const ns = new Set(s);
      items.forEach((w) => { if (allSelected) ns.delete(w.id); else ns.add(w.id); });
      return ns;
    });
  }

  async function moveRow(id: string, direction: "up" | "down", monthItems: Workshop[]) {
    const idx = monthItems.findIndex((w) => w.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= monthItems.length) return;
    // Swap dates to swap order
    const dateA = monthItems[idx].fecha;
    const dateB = monthItems[swapIdx].fecha;
    await Promise.all([
      fetch("/api/workshops", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: monthItems[idx].id, fecha: dateB }) }),
      fetch("/api/workshops", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: monthItems[swapIdx].id, fecha: dateA }) }),
    ]);
    fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workshops</h1>
          <p className="text-gray-400 text-sm mt-0.5">Planificacion y seguimiento de clases</p>
        </div>
        <button onClick={() => setShowNewTablero(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors">
          <Plus className="h-4 w-4" /> Nuevo tablero
        </button>
      </div>

      {/* Nuevo tablero */}
      {showNewTablero && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 flex items-center gap-3">
          <input type="month" value={newTableroMes} onChange={(e) => setNewTableroMes(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-300" />
          <button onClick={addTablero} disabled={!newTableroMes}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-40">
            Crear
          </button>
          <button onClick={() => setShowNewTablero(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
        </div>
      )}

      {/* Stats + buscador */}
      <div className="flex items-center gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">{workshops.length}</p>
          </div>
        </div>
        <a href="https://docs.google.com/document/d/19aT-Gz44uxAWYfawH1jT3U1wUkuWlSZrm6IMoCI2AMU/edit?usp=sharing"
          target="_blank" rel="noopener noreferrer"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 hover:border-indigo-200 hover:shadow-md transition-all">
          <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
            <span className="text-base">📋</span>
          </div>
          <p className="text-sm font-bold text-gray-900">Protocolo Workshops</p>
        </a>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
        <p className="text-xs text-amber-700 font-medium">Recuerda revisar el protocolo antes de cada clase para garantizar la calidad de los workshops.</p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input type="text" placeholder="Buscar workshop..." value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-amber-300" />
      </div>

      {/* Barra acciones seleccion */}
      {selected.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm font-semibold text-amber-700">{selected.size} seleccionados</span>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-amber-600" />
              <select value={moveTarget ?? ""} onChange={(e) => setMoveTarget(e.target.value || null)}
                className="text-xs rounded-lg px-2 py-1.5 border border-amber-300 focus:outline-none bg-white">
                <option value="">Mover a...</option>
                {sortedMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                <option value={nextMonth(sortedMonths[0] ?? "2026-04")}>{monthLabel(nextMonth(sortedMonths[0] ?? "2026-04"))} (nuevo)</option>
              </select>
              {moveTarget && (
                <button onClick={() => moveRows(moveTarget)}
                  className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600">
                  Mover
                </button>
              )}
            </div>
            <button onClick={() => setSelected(new Set())}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium">
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Tablas por mes */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-amber-400" /></div>
      ) : sortedMonths.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No hay workshops</div>
      ) : (
        <div className="space-y-8">
          {sortedMonths.map((monthKey) => {
            const items = grouped[monthKey];
            const label = monthKey === "sin-fecha" ? "Sin fecha" : monthLabel(monthKey);
            const allSelected = items.every((w) => selected.has(w.id));

            return (
              <div key={monthKey}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">{label} <span className="text-sm font-normal text-gray-400">({items.length})</span></h2>
                  <button onClick={() => addRow(monthKey)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <Plus className="h-3 w-3" /> Añadir fila
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-3 py-3 w-8">
                          <input type="checkbox" checked={allSelected && items.length > 0} onChange={() => toggleSelectAll(monthKey)}
                            className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                        </th>
                        <th className="text-left px-2 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-8">#</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Workshop</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Fecha</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Persona</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Tipo</th>
                        <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Asist.</th>
                        <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">NPS</th>
                        <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Acc.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((w, idx) => {
                        const isPast = w.fecha && w.fecha < today;
                        const isSelected = selected.has(w.id);
                        return (
                          <tr key={w.id} className={`transition-colors ${isPast ? "opacity-40" : "hover:bg-gray-50/50"} ${isSelected ? "bg-amber-50/40" : ""}`}>
                            <td className="px-3 py-2">
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(w.id)}
                                className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-gray-400">{idx + 1}</td>
                            <td className="px-4 py-2">
                              <input type="text" defaultValue={w.nombre}
                                onBlur={(e) => { if (e.target.value !== w.nombre) updateField(w.id, "nombre", e.target.value); }}
                                className="text-sm font-semibold text-gray-800 bg-transparent border-0 focus:outline-none focus:bg-gray-50 rounded px-1 -mx-1 w-full" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="date" defaultValue={w.fecha ?? ""}
                                onBlur={(e) => { if (e.target.value !== (w.fecha ?? "")) updateField(w.id, "fecha", e.target.value); }}
                                className="text-xs text-gray-600 bg-transparent border-0 focus:outline-none focus:bg-gray-50 rounded px-1 -mx-1" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" defaultValue={w.persona ?? ""}
                                onBlur={(e) => { if (e.target.value !== (w.persona ?? "")) updateField(w.id, "persona", e.target.value); }}
                                className="text-xs text-gray-600 bg-transparent border-0 focus:outline-none focus:bg-gray-50 rounded px-1 -mx-1 w-full" />
                            </td>
                            <td className="px-4 py-2">
                              <select defaultValue={w.tipo ?? ""}
                                onChange={(e) => updateField(w.id, "tipo", e.target.value)}
                                className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border-0 focus:outline-none cursor-pointer ${TIPO_COLORS[w.tipo ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                                <option value="">—</option>
                                <option value="Q&A">Q&A</option>
                                <option value="Técnico">Tecnico</option>
                                <option value="Técnico Nuevos alumnos">Tecnico Nuevos</option>
                                <option value="Negocio">Negocio</option>
                                <option value="Negocio Nuevos alumnos">Negocio Nuevos</option>
                                <option value="Jornada Bienvenida">Bienvenida</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input type="text" defaultValue={w.asistentes ?? ""}
                                onBlur={(e) => { if (e.target.value !== (w.asistentes ?? "")) updateField(w.id, "asistentes", e.target.value); }}
                                className="w-12 text-xs font-bold text-gray-900 bg-transparent border-0 focus:outline-none focus:bg-gray-50 rounded px-1 text-right" />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input type="text" defaultValue={w.nps ?? ""}
                                onBlur={(e) => { if (e.target.value !== (w.nps ?? "")) updateField(w.id, "nps", e.target.value); }}
                                className="w-12 text-xs font-bold text-gray-900 bg-transparent border-0 focus:outline-none focus:bg-gray-50 rounded px-1 text-right" />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-0.5 justify-end">
                                <button onClick={() => moveRow(w.id, "up", items)} title="Subir"
                                  className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100"><ArrowUp className="h-3 w-3" /></button>
                                <button onClick={() => moveRow(w.id, "down", items)} title="Bajar"
                                  className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100"><ArrowDown className="h-3 w-3" /></button>
                                <button onClick={() => cloneRow(w)} title="Clonar"
                                  className="p-1 rounded text-gray-300 hover:text-amber-500 hover:bg-amber-50"><Copy className="h-3 w-3" /></button>
                                <button onClick={() => deleteRow(w.id)} title="Eliminar"
                                  className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
