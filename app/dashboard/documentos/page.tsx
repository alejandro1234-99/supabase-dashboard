"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Search, Plus, Save, Edit3, Trash2, X, ExternalLink, FileText,
} from "lucide-react";

type Documento = {
  id: string;
  nombre: string;
  archivo: string | null;
  categoria: string | null;
  usuario: string | null;
  password: string | null;
  safe_code: string | null;
  created_at: string;
};

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [filterCategoria, setFilterCategoria] = useState("");

  // Modal credentials
  const [credModal, setCredModal] = useState<Documento | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // New
  const [showNew, setShowNew] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newArchivo, setNewArchivo] = useState("");
  const [newCategoria, setNewCategoria] = useState("Recurso");
  const [newUsuario, setNewUsuario] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newSafeCode, setNewSafeCode] = useState("");

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editArchivo, setEditArchivo] = useState("");
  const [editCategoria, setEditCategoria] = useState("Recurso");
  const [editUsuario, setEditUsuario] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editSafeCode, setEditSafeCode] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterCategoria) params.set("categoria", filterCategoria);
    fetch(`/api/documentos?${params}`)
      .then((r) => r.json())
      .then((d) => setDocs(d.data ?? []))
      .finally(() => setLoading(false));
  }, [search, filterCategoria]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate() {
    if (!newNombre.trim()) return;
    await fetch("/api/documentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: newNombre, archivo: newArchivo, categoria: newCategoria, usuario: newUsuario || null, password: newPassword || null, safe_code: newSafeCode || null }),
    });
    setNewNombre(""); setNewArchivo(""); setNewCategoria("Recurso"); setNewUsuario(""); setNewPassword(""); setNewSafeCode(""); setShowNew(false);
    fetchData();
  }

  async function handleUpdate(id: string) {
    await fetch("/api/documentos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nombre: editNombre, archivo: editArchivo, categoria: editCategoria, usuario: editUsuario || null, password: editPassword || null, safe_code: editSafeCode || null }),
    });
    setEditingId(null);
    fetchData();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/documentos?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  function startEdit(doc: Documento) {
    setEditingId(doc.id);
    setEditNombre(doc.nombre);
    setEditArchivo(doc.archivo ?? "");
    setEditCategoria(doc.categoria ?? "Recurso");
    setEditUsuario(doc.usuario ?? "");
    setEditPassword(doc.password ?? "");
    setEditSafeCode(doc.safe_code ?? "");
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos y accesos</h1>
          <p className="text-gray-400 text-sm mt-0.5">Documentos de utilidad, enlaces y recursos del equipo</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors">
          <Plus className="h-4 w-4" /> Añadir documento
        </button>
      </div>

      {/* Busqueda + filtro */}
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input type="text" placeholder="Buscar documento..." value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-amber-300" />
        </div>
        <div className="flex items-center gap-1.5">
          {[{ v: "", l: "Todos" }, { v: "Recurso", l: "Recursos" }, { v: "Acceso", l: "Accesos" }].map(({ v, l }) => (
            <button key={v} onClick={() => setFilterCategoria(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCategoria === v ? "bg-amber-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-amber-300"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Nuevo */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Nuevo documento</h2>
            <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex gap-3">
            <input type="text" placeholder="Nombre del documento..." value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-300" />
            <select value={newCategoria} onChange={(e) => setNewCategoria(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-300">
              <option value="Recurso">Recurso</option>
              <option value="Acceso">Acceso</option>
            </select>
          </div>
          <input type="url" placeholder="Enlace al archivo (Drive, Notion, etc)..." value={newArchivo}
            onChange={(e) => setNewArchivo(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-300" />
          {newCategoria === "Acceso" && (
            <div className="grid grid-cols-3 gap-3">
              <input type="text" placeholder="Usuario / email" value={newUsuario}
                onChange={(e) => setNewUsuario(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-300" />
              <input type="text" placeholder="Contraseña" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-300" />
              <input type="text" placeholder="Safe code (opcional)" value={newSafeCode}
                onChange={(e) => setNewSafeCode(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-300" />
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={handleCreate} disabled={!newNombre.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-40">
              <Save className="h-3.5 w-3.5" /> Guardar
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-amber-400" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Documento</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Enlace</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Credenciales</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {docs.map((doc, idx) => (
                editingId === doc.id ? (
                  <tr key={doc.id} className="bg-amber-50/30">
                    <td className="px-5 py-3">
                      <input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                        className="w-full text-sm rounded-lg px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-amber-300" />
                    </td>
                    <td className="px-4 py-3">
                      <select value={editCategoria} onChange={(e) => setEditCategoria(e.target.value)}
                        className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-amber-300">
                        <option value="Recurso">Recurso</option>
                        <option value="Acceso">Acceso</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input type="url" value={editArchivo} onChange={(e) => setEditArchivo(e.target.value)}
                        className="w-full text-sm rounded-lg px-2 py-1.5 border border-gray-200 focus:outline-none focus:border-amber-300" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">—</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleUpdate(doc.id)} className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50"><Save className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{idx + 1}.</span>
                        <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                        <span className="text-sm font-semibold text-gray-800">{doc.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {doc.categoria === "Acceso"
                        ? <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600">Acceso</span>
                        : <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600">Recurso</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {doc.archivo ? (
                        <a href={doc.archivo} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-700 font-medium">
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir
                        </a>
                      ) : <span className="text-sm text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {doc.categoria === "Acceso" && (doc.usuario || doc.password) ? (
                        <button onClick={() => setCredModal(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                          🔑 Ver
                        </button>
                      ) : <span className="text-sm text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => startEdit(doc)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-all">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(doc.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
          {docs.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">No hay documentos registrados</div>
          )}
        </div>
      )}
      {/* Modal credenciales */}
      {credModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setCredModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                <h2 className="font-bold text-gray-900">{credModal.nombre}</h2>
              </div>
              <button onClick={() => setCredModal(null)} className="text-gray-300 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {credModal.usuario && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Usuario / Email</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-mono">{credModal.usuario}</code>
                    <button onClick={() => copyToClipboard(credModal.usuario!, "usuario")}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${copied === "usuario" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {copied === "usuario" ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
              {credModal.password && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Contraseña</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-mono">{credModal.password}</code>
                    <button onClick={() => copyToClipboard(credModal.password!, "password")}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${copied === "password" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {copied === "password" ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
              {credModal.safe_code && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Safe Code</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-mono">{credModal.safe_code}</code>
                    <button onClick={() => copyToClipboard(credModal.safe_code!, "safe_code")}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${copied === "safe_code" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {copied === "safe_code" ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
              {credModal.archivo && (
                <a href={credModal.archivo} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 transition-colors">
                  <ExternalLink className="h-4 w-4" /> Ir al sitio
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
