"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Trash2, Edit3, Save, X, FileText, Lightbulb, AlertTriangle } from "lucide-react";

type Nota = {
  id: string;
  edicion: string;
  titulo: string;
  contenido: string;
  tipo: string;
  created_at: string;
  updated_at: string;
};

const EDICIONES = ["Enero 2026", "Febrero 2026", "Marzo 2026", "Abril 2026"];

const TIPOS = [
  { value: "conclusion", label: "Conclusion", icon: FileText, color: "bg-emerald-500" },
  { value: "nota", label: "Nota", icon: Lightbulb, color: "bg-blue-500" },
  { value: "mejora", label: "Mejora", icon: AlertTriangle, color: "bg-amber-500" },
];

function TipoBadge({ tipo }: { tipo: string }) {
  const t = TIPOS.find((t) => t.value === tipo) ?? TIPOS[1];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white ${t.color}`}>
      <t.icon className="h-3 w-3" />
      {t.label}
    </span>
  );
}

export default function NotasPage() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [edicionFilter, setEdicionFilter] = useState<string>(EDICIONES[EDICIONES.length - 1]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editContenido, setEditContenido] = useState("");
  const [editTipo, setEditTipo] = useState("nota");
  const [showNew, setShowNew] = useState(false);
  const [newTitulo, setNewTitulo] = useState("");
  const [newContenido, setNewContenido] = useState("");
  const [newTipo, setNewTipo] = useState("nota");

  const fetchNotas = useCallback(() => {
    setLoading(true);
    fetch(`/api/notas?edicion=${encodeURIComponent(edicionFilter)}`)
      .then((r) => r.json())
      .then((d) => setNotas(d.data ?? []))
      .finally(() => setLoading(false));
  }, [edicionFilter]);

  useEffect(() => { fetchNotas(); }, [fetchNotas]);

  async function handleCreate() {
    if (!newTitulo.trim()) return;
    await fetch("/api/notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edicion: edicionFilter, titulo: newTitulo, contenido: newContenido, tipo: newTipo }),
    });
    setNewTitulo("");
    setNewContenido("");
    setNewTipo("nota");
    setShowNew(false);
    fetchNotas();
  }

  async function handleUpdate(id: string) {
    await fetch("/api/notas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, titulo: editTitulo, contenido: editContenido, tipo: editTipo }),
    });
    setEditingId(null);
    fetchNotas();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/notas?id=${id}`, { method: "DELETE" });
    fetchNotas();
  }

  function startEdit(nota: Nota) {
    setEditingId(nota.id);
    setEditTitulo(nota.titulo);
    setEditContenido(nota.contenido);
    setEditTipo(nota.tipo);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notas y conclusiones</h1>
          <p className="text-gray-400 text-sm mt-0.5">Registro de apuntes por lanzamiento</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva nota
        </button>
      </div>

      {/* Filtro edición */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium text-gray-400">Edicion:</span>
        {EDICIONES.map((ed) => (
          <button
            key={ed}
            onClick={() => setEdicionFilter(ed)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${edicionFilter === ed ? "bg-emerald-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300"}`}
          >
            {ed}
          </button>
        ))}
      </div>

      {/* Nueva nota */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-3">
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
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Contenido, conclusiones, apuntes..."
            value={newContenido}
            onChange={(e) => setNewContenido(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300 resize-none"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setShowNew(false)}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!newTitulo.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Lista de notas */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
        </div>
      ) : notas.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No hay notas para esta edicion</div>
      ) : (
        <div className="space-y-3">
          {notas.map((nota) => (
            <div key={nota.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {editingId === nota.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300"
                    />
                    <select
                      value={editTipo}
                      onChange={(e) => setEditTipo(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300"
                    >
                      {TIPOS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={editContenido}
                    onChange={(e) => setEditContenido(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-300 resize-none"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleUpdate(nota.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <TipoBadge tipo={nota.tipo} />
                        <span className="text-[11px] text-gray-400">
                          {new Date(nota.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">{nota.titulo}</h3>
                      {nota.contenido && (
                        <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap">{nota.contenido}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(nota)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(nota.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
