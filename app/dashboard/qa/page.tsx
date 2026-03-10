"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, HelpCircle, Clock, CheckCircle, XCircle, PlayCircle, ExternalLink, Video, Paperclip, Timer } from "lucide-react";

type QAConsulta = {
  id: string;
  nombre: string | null;
  email: string | null;
  consulta: string | null;
  loom_url: string | null;
  attachment_url: string | null;
  attachment_thumb: string | null;
  attachment_nombre: string | null;
  status: string;
  respuesta_preparada: string | null;
  creada: string | null;
  fecha_en_progreso: string | null;
  fecha_resuelta: string | null;
  tiempo_resolucion_min: number | null;
};

type Stats = {
  total: number;
  pendientes: number;
  enProgreso: number;
  resueltas: number;
  descartadas: number;
  avgResolucion: number | null;
};

const COLUMNS: { key: string; label: string; color: string; bg: string; icon: React.ElementType }[] = [
  { key: "Pendiente",   label: "Pendiente",   color: "text-amber-600",  bg: "bg-amber-50",  icon: Clock },
  { key: "En progreso", label: "En progreso", color: "text-blue-600",   bg: "bg-blue-50",   icon: PlayCircle },
  { key: "Resuelta",    label: "Resuelta",    color: "text-emerald-600",bg: "bg-emerald-50",icon: CheckCircle },
  { key: "Descartada",  label: "Descartada",  color: "text-gray-400",   bg: "bg-gray-50",   icon: XCircle },
];

function fmtDuration(min: number | null) {
  if (min == null) return null;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function KanbanCard({
  card,
  onStatusChange,
  onRespuestaChange,
  onDragStart,
}: {
  card: QAConsulta;
  onStatusChange: (id: string, status: string) => void;
  onRespuestaChange: (id: string, respuesta: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [respuesta, setRespuesta] = useState(card.respuesta_preparada ?? "");
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRespuestaChange = (val: string) => {
    setRespuesta(val);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      setSaving(true);
      onRespuestaChange(card.id, val);
      setTimeout(() => setSaving(false), 800);
    }, 800);
  };

  const col = COLUMNS.find((c) => c.key === card.status);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm cursor-grab active:cursor-grabbing select-none"
    >
      {/* Header */}
      <div className="p-3.5" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-xs">{card.nombre ?? "—"}</p>
            <p className="text-[10px] text-gray-400 truncate">{card.email ?? ""}</p>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${col?.bg} ${col?.color}`}>
            {card.status}
          </span>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{card.consulta ?? "—"}</p>

        {/* Badges */}
        <div className="flex items-center gap-1.5 mt-2">
          {card.loom_url && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
              <Video className="h-2.5 w-2.5" /> Loom
            </span>
          )}
          {card.attachment_url && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
              <Paperclip className="h-2.5 w-2.5" /> Adjunto
            </span>
          )}
          {card.tiempo_resolucion_min != null && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full ml-auto">
              <Timer className="h-2.5 w-2.5" /> {fmtDuration(card.tiempo_resolucion_min)}
            </span>
          )}
          <span className="text-[9px] text-gray-300 ml-auto">{fmtDate(card.creada)}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-50 p-3.5 space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Consulta completa */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Consulta</p>
            <p className="text-xs text-gray-700 leading-relaxed">{card.consulta}</p>
          </div>

          {/* Loom */}
          {card.loom_url && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Vídeo Loom</p>
              <a href={card.loom_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                <Video className="h-3 w-3" /> Ver vídeo
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          )}

          {/* Adjunto */}
          {card.attachment_url && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Adjunto</p>
              {card.attachment_thumb ? (
                <a href={card.attachment_url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.attachment_thumb} alt={card.attachment_nombre ?? "adjunto"}
                    className="rounded-lg max-h-40 object-contain border border-gray-100 hover:opacity-90 transition-opacity" />
                </a>
              ) : (
                <a href={card.attachment_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                  <Paperclip className="h-3 w-3" /> {card.attachment_nombre ?? "Ver adjunto"}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )}

          {/* Respuesta preparada */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Respuesta preparada</p>
              {saving && <span className="text-[9px] text-emerald-500 font-medium">Guardando...</span>}
            </div>
            <textarea
              value={respuesta}
              onChange={(e) => handleRespuestaChange(e.target.value)}
              placeholder="Escribe la respuesta para la clase..."
              rows={4}
              className="w-full text-xs border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-indigo-300 text-gray-700 placeholder-gray-300"
            />
          </div>

          {/* Mover a columna */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Mover a</p>
            <div className="flex flex-wrap gap-1.5">
              {COLUMNS.filter((c) => c.key !== card.status).map((c) => (
                <button key={c.key} onClick={() => onStatusChange(card.id, c.key)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${c.bg} ${c.color} hover:opacity-80`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          {(card.fecha_en_progreso || card.fecha_resuelta) && (
            <div className="text-[10px] text-gray-400 space-y-0.5 pt-1 border-t border-gray-50">
              {card.fecha_en_progreso && <p>En progreso: {fmtDate(card.fecha_en_progreso)}</p>}
              {card.fecha_resuelta && <p>Resuelta: {fmtDate(card.fecha_resuelta)}</p>}
              {card.tiempo_resolucion_min != null && (
                <p className="font-semibold text-emerald-600">Tiempo de resolución: {fmtDuration(card.tiempo_resolucion_min)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QAPage() {
  const [consultas, setConsultas] = useState<QAConsulta[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const draggingId = useRef<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/qa")
      .then((r) => r.json())
      .then((d) => {
        setConsultas(d.data ?? []);
        setStats(d.stats);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (id: string, status: string) => {
    // Optimistic update
    setConsultas((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
    const res = await fetch(`/api/qa/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setConsultas((prev) => prev.map((c) => c.id === id ? data : c));
      // Update stats
      setStats((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        const old = consultas.find((c) => c.id === id);
        if (old) {
          const decKey = old.status === "Pendiente" ? "pendientes" : old.status === "En progreso" ? "enProgreso" : old.status === "Resuelta" ? "resueltas" : "descartadas";
          const incKey = status === "Pendiente" ? "pendientes" : status === "En progreso" ? "enProgreso" : status === "Resuelta" ? "resueltas" : "descartadas";
          (updated as Record<string, number>)[decKey] -= 1;
          (updated as Record<string, number>)[incKey] += 1;
        }
        return updated;
      });
    }
  };

  const handleRespuestaChange = async (id: string, respuesta_preparada: string) => {
    await fetch(`/api/qa/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respuesta_preparada }),
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(col);
  };

  const handleDrop = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (draggingId.current) {
      const card = consultas.find((c) => c.id === draggingId.current);
      if (card && card.status !== col) {
        handleStatusChange(draggingId.current, col);
      }
      draggingId.current = null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Q&A — Pipeline de consultas</h1>
        <p className="text-gray-400 text-sm mt-0.5">Gestión y seguimiento de consultas de alumnos</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-6 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <HelpCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Pendientes</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{stats.pendientes}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <PlayCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">En progreso</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{stats.enProgreso}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Resueltas</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{stats.resueltas}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gray-300 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Descartadas</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{stats.descartadas}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
              <Timer className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Avg resolución</p>
              <p className="text-xl font-black text-gray-900 leading-tight">
                {stats.avgResolucion != null ? fmtDuration(stats.avgResolucion) : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Kanban */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 items-start">
          {COLUMNS.map(({ key, label, color, bg, icon: Icon }) => {
            const cards = consultas.filter((c) => c.status === key);
            const isOver = dragOverCol === key;
            return (
              <div
                key={key}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, key)}
                className={`rounded-2xl p-3 min-h-40 transition-all ${isOver ? "ring-2 ring-indigo-300 ring-offset-1" : ""} ${bg}`}
              >
                {/* Column header */}
                <div className={`flex items-center justify-between mb-3`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    <span className={`text-xs font-bold ${color}`}>{label}</span>
                  </div>
                  <span className={`text-xs font-black ${color} opacity-60`}>{cards.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {cards.map((card) => (
                    <KanbanCard
                      key={card.id}
                      card={card}
                      onStatusChange={handleStatusChange}
                      onRespuestaChange={handleRespuestaChange}
                      onDragStart={handleDragStart}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-300">
                      Arrastra aquí
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
