"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, Plus, Calendar, Clock, CheckCircle, AlertTriangle, X,
  Trash2, Pencil, RefreshCw, Image as ImageIcon, Upload, ExternalLink,
  Send, User, Hash, FileText, MessageSquare, Users, Mail,
} from "lucide-react";

// ============ Types ============

type ScheduledPost = {
  kind: "post";
  id: string;
  title: string;
  body: string;
  space_id: string;
  space_name: string;
  space_slug: string;
  image_url: string | null;
  author_user_id: string;
  author_name: string;
  author_avatar: string | null;
  scheduled_for: string;
  status: "pending" | "published" | "failed" | "cancelled";
  published_at: string | null;
  published_post_id: string | null;
  error_message: string | null;
  created_at: string;
};

type ScheduledMessage = {
  kind: "message";
  id: string;
  content: string;
  sender_user_id: string;
  sender_name: string;
  sender_avatar: string | null;
  target_edition_ids: string[];
  edition_names: string[];
  scheduled_for: string;
  status: "pending" | "published" | "failed" | "cancelled";
  published_at: string | null;
  delivered_count: number;
  total_recipients: number;
  error_message: string | null;
  created_at: string;
};

type Ticket = ScheduledPost | ScheduledMessage;

type Stats = {
  total: number;
  pending: number;
  overdue: number;
  published: number;
  failed: number;
};

type Space = { id: string; name: string; slug: string; icon: string | null };
type Edition = { id: string; name: string; group_chat_conversation_id: string; student_count: number };

const AUTHORS = [
  { id: "96872496-d067-45cd-ba22-1c470a079b1e", name: "Soporte Revolutia" },
  { id: "64daf2ce-b2ab-463c-9261-c410171036e1", name: "Erick Gutierrez" },
  { id: "b3eb8fbc-6957-4187-b240-05fbd5469395", name: "María Perea" },
];

const STATUS_BADGES: Record<Ticket["status"], { bg: string; text: string; label: string; icon: React.ElementType }> = {
  pending: { bg: "bg-blue-100", text: "text-blue-700", label: "Programado", icon: Clock },
  published: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Enviado", icon: CheckCircle },
  failed: { bg: "bg-rose-100", text: "text-rose-700", label: "Fallido", icon: AlertTriangle },
  cancelled: { bg: "bg-gray-100", text: "text-gray-500", label: "Cancelado", icon: X },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function toDatetimeLocal(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============ Editor de Posts ============

function PostEditorModal({
  open, onClose, onSaved, initial, spaces,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial: ScheduledPost | null;
  spaces: Space[];
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [authorId, setAuthorId] = useState(AUTHORS[0].id);
  const [scheduledFor, setScheduledFor] = useState(toDatetimeLocal(new Date(Date.now() + 10 * 60 * 1000)));
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title); setBody(initial.body); setSpaceId(initial.space_id);
      setAuthorId(initial.author_user_id); setScheduledFor(toDatetimeLocal(initial.scheduled_for));
      setImageUrl(initial.image_url);
    } else {
      setTitle(""); setBody(""); setSpaceId(spaces[0]?.id ?? "");
      setAuthorId(AUTHORS[0].id);
      setScheduledFor(toDatetimeLocal(new Date(Date.now() + 10 * 60 * 1000)));
      setImageUrl(null);
    }
    setError(null);
  }, [open, initial, spaces]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/scheduled-posts/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error al subir");
      setImageUrl(d.url);
    } catch (err: any) { setError(err.message ?? "Error"); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) return setError("Título obligatorio");
    if (!spaceId) return setError("Elige un canal");
    if (!scheduledFor) return setError("Elige una fecha");
    setSaving(true);
    try {
      const payload = {
        title: title.trim(), body: body.trim(), space_id: spaceId,
        author_user_id: authorId, scheduled_for: new Date(scheduledFor).toISOString(),
        image_url: imageUrl,
      };
      const url = initial ? `/api/scheduled-posts/${initial.id}` : "/api/scheduled-posts";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      onSaved(); onClose();
    } catch (err: any) { setError(err.message ?? "Error"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-500" />
            <h2 className="text-lg font-bold text-gray-900">{initial ? "Editar post" : "Programar nuevo post"}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Título</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del post"
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-300 text-gray-700" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Contenido</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6}
              placeholder="Cuerpo del post (opcional)..."
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:border-indigo-300 text-gray-700" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Canal</label>
              <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-300 text-gray-700 bg-white">
                {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Publicar como</label>
              <select value={authorId} onChange={(e) => setAuthorId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-300 text-gray-700 bg-white">
                {AUTHORS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Fecha y hora</label>
            <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-300 text-gray-700" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Imagen / vídeo (opcional)</label>
            {imageUrl ? (
              <div className="relative inline-block">
                {/\.(mp4|webm|mov)$/i.test(imageUrl) ? (
                  <video src={imageUrl} className="max-h-40 rounded-lg" controls />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={imageUrl} alt="" className="max-h-40 rounded-lg object-cover" />
                )}
                <button onClick={() => setImageUrl(null)} className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center justify-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/30 text-gray-400 text-xs">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                {uploading ? "Subiendo..." : "Click para subir"}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          </div>
          {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-700">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-600 rounded-xl hover:bg-gray-100">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 rounded-xl">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {initial ? "Guardar" : "Programar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Editor de Mensajes ============

function MessageEditorModal({
  open, onClose, onSaved, initial, editions,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial: ScheduledMessage | null;
  editions: Edition[];
}) {
  const [content, setContent] = useState("");
  const [senderId, setSenderId] = useState(AUTHORS[0].id);
  const [targetEditions, setTargetEditions] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState(toDatetimeLocal(new Date(Date.now() + 10 * 60 * 1000)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setContent(initial.content); setSenderId(initial.sender_user_id);
      setTargetEditions(initial.target_edition_ids);
      setScheduledFor(toDatetimeLocal(initial.scheduled_for));
    } else {
      setContent(""); setSenderId(AUTHORS[0].id); setTargetEditions([]);
      setScheduledFor(toDatetimeLocal(new Date(Date.now() + 10 * 60 * 1000)));
    }
    setError(null);
  }, [open, initial]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const totalRecipients = editions
    .filter((e) => targetEditions.includes(e.id))
    .reduce((sum, e) => sum + e.student_count, 0);

  const toggleEdition = (id: string) => {
    setTargetEditions((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setError(null);
    if (!content.trim()) return setError("El mensaje es obligatorio");
    if (targetEditions.length === 0) return setError("Selecciona al menos una edición");
    if (!scheduledFor) return setError("Elige una fecha");
    setSaving(true);
    try {
      const payload = {
        content: content.trim(), sender_user_id: senderId,
        target_edition_ids: targetEditions,
        scheduled_for: new Date(scheduledFor).toISOString(),
      };
      const url = initial ? `/api/scheduled-messages/${initial.id}` : "/api/scheduled-messages";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      onSaved(); onClose();
    } catch (err: any) { setError(err.message ?? "Error"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-teal-500" />
            <h2 className="text-lg font-bold text-gray-900">{initial ? "Editar mensaje" : "Programar mensaje privado"}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Mensaje</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6}
              placeholder="Escribe el mensaje que recibirán los alumnos..."
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:border-indigo-300 text-gray-700" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Enviar como</label>
            <select value={senderId} onChange={(e) => setSenderId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-300 text-gray-700 bg-white">
              {AUTHORS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">
              Destinatarios — ediciones
            </label>
            <div className="space-y-2">
              {editions.map((ed) => (
                <label key={ed.id} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  targetEditions.includes(ed.id) ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200 hover:border-gray-300"
                }`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={targetEditions.includes(ed.id)} onChange={() => toggleEdition(ed.id)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800">{ed.name}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-500">{ed.student_count} alumnos</span>
                </label>
              ))}
            </div>
            {targetEditions.length > 0 && (
              <p className="mt-2 text-[11px] font-bold text-indigo-500">
                → El mensaje llegará a <span className="text-indigo-700">{totalRecipients}</span> alumnos
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Fecha y hora</label>
            <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-300 text-gray-700" />
          </div>

          {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-700">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-600 rounded-xl hover:bg-gray-100">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 rounded-xl">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {initial ? "Guardar" : `Programar para ${totalRecipients} alumnos`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Fila ============

function TicketRow({ ticket, onEdit, onDelete, onRetry }: {
  ticket: Ticket;
  onEdit: () => void;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const badge = STATUS_BADGES[ticket.status];
  const BadgeIcon = badge.icon;
  const isOverdue = ticket.status === "pending" && new Date(ticket.scheduled_for) <= new Date();
  const isPost = ticket.kind === "post";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4 flex items-start gap-4">
        {isPost && ticket.image_url && (
          <div className="shrink-0 h-16 w-16 rounded-lg overflow-hidden bg-gray-100">
            {/\.(mp4|webm|mov)$/i.test(ticket.image_url) ? (
              <video src={ticket.image_url} className="h-full w-full object-cover" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={ticket.image_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isPost ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"} flex items-center gap-1`}>
              {isPost ? <FileText className="h-2.5 w-2.5" /> : <MessageSquare className="h-2.5 w-2.5" />}
              {isPost ? "Post" : "Mensaje privado"}
            </span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.bg} ${badge.text}`}>
              <BadgeIcon className="h-2.5 w-2.5" />
              {badge.label}
            </span>
            {isOverdue && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Pendiente
              </span>
            )}
            {isPost ? (
              <>
                <span className="text-[10px] text-gray-400 flex items-center gap-1"><Hash className="h-2.5 w-2.5" /> {ticket.space_name}</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1"><User className="h-2.5 w-2.5" /> {ticket.author_name}</span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" /> {ticket.edition_names.join(", ") || "—"}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1"><User className="h-2.5 w-2.5" /> {ticket.sender_name}</span>
              </>
            )}
          </div>

          <h3 className="text-sm font-bold text-gray-900 truncate">
            {isPost ? ticket.title : ticket.content.split("\n")[0].slice(0, 100)}
          </h3>
          {isPost && ticket.body && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{ticket.body}</p>}
          {!isPost && ticket.content.length > 100 && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{ticket.content.slice(100, 180)}...</p>
          )}

          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {fmtDate(ticket.scheduled_for)}
              </span>
              {ticket.published_at && (
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle className="h-3 w-3" />
                  {isPost ? "Publicado" : `Enviado a ${ticket.delivered_count}/${ticket.total_recipients}`} · {fmtDate(ticket.published_at)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {isPost && ticket.status === "published" && ticket.published_post_id && (
                <a href={`https://hub.revolutia.ai/spaces/${ticket.space_slug}/${ticket.published_post_id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-500" title="Ver en el Hub">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {ticket.status === "failed" && (
                <button onClick={onRetry} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-500" title="Reintentar">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
              {ticket.status === "pending" && (
                <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-500" title="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-500" title="Eliminar">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {ticket.status === "failed" && ticket.error_message && (
            <div className="mt-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5 text-[11px] text-rose-700">
              Error: {ticket.error_message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Página ============

export default function ProgramadorPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [postModal, setPostModal] = useState(false);
  const [msgModal, setMsgModal] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [editingMsg, setEditingMsg] = useState<ScheduledMessage | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "published" | "failed">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "message">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, msgsRes, spacesRes, edRes] = await Promise.all([
        fetch("/api/scheduled-posts"),
        fetch("/api/scheduled-messages"),
        fetch("/api/scheduled-posts/spaces"),
        fetch("/api/scheduled-messages/editions"),
      ]);
      const p = await postsRes.json();
      const m = await msgsRes.json();
      const s = await spacesRes.json();
      const e = await edRes.json();

      setPosts((p.data ?? []).map((x: any) => ({ ...x, kind: "post" })));
      setMessages((m.data ?? []).map((x: any) => ({ ...x, kind: "message" })));
      setSpaces(s.data ?? []);
      setEditions(e.data ?? []);

      const ps = p.stats ?? { total: 0, pending: 0, overdue: 0, published: 0, failed: 0 };
      const ms = m.stats ?? { total: 0, pending: 0, overdue: 0, published: 0, failed: 0 };
      setStats({
        total: ps.total + ms.total,
        pending: ps.pending + ms.pending,
        overdue: ps.overdue + ms.overdue,
        published: ps.published + ms.published,
        failed: ps.failed + ms.failed,
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (ticket: Ticket) => {
    if (!confirm(ticket.kind === "post" ? "¿Eliminar este post programado?" : "¿Eliminar este mensaje programado?")) return;
    const url = ticket.kind === "post" ? `/api/scheduled-posts/${ticket.id}` : `/api/scheduled-messages/${ticket.id}`;
    await fetch(url, { method: "DELETE" });
    fetchData();
  };

  const handleRetry = async (ticket: Ticket) => {
    const url = ticket.kind === "post" ? `/api/scheduled-posts/${ticket.id}` : `/api/scheduled-messages/${ticket.id}`;
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });
    fetchData();
  };

  const allTickets: Ticket[] = [...posts, ...messages].sort(
    (a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime()
  );

  const filtered = allTickets.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (typeFilter !== "all" && t.kind !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programador de Contenido</h1>
          <p className="text-gray-400 text-sm mt-0.5">Planifica posts y mensajes privados para que se envíen solos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-4 py-2 rounded-xl">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button onClick={() => { setEditingPost(null); setPostModal(true); }}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl">
            <FileText className="h-3.5 w-3.5" />
            Post
          </button>
          <button onClick={() => { setEditingMsg(null); setMsgModal(true); }}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 px-4 py-2 rounded-xl">
            <Mail className="h-3.5 w-3.5" />
            Mensaje
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-3">
          <StatCard icon={Calendar} bg="bg-indigo-500" label="Total" value={stats.total} />
          <StatCard icon={Clock} bg="bg-blue-500" label="Programados" value={stats.pending} />
          <StatCard icon={AlertTriangle} bg="bg-amber-500" label="Pendientes" value={stats.overdue} />
          <StatCard icon={CheckCircle} bg="bg-emerald-500" label="Enviados" value={stats.published} />
          <StatCard icon={AlertTriangle} bg="bg-rose-500" label="Fallidos" value={stats.failed} />
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {[
            { key: "all", label: "Todos" },
            { key: "post", label: "Posts" },
            { key: "message", label: "Mensajes" },
          ].map((f) => (
            <button key={f.key} onClick={() => setTypeFilter(f.key as any)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all ${
                typeFilter === f.key ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[
            { key: "all", label: "Cualquier estado" },
            { key: "pending", label: "Programados" },
            { key: "published", label: "Enviados" },
            { key: "failed", label: "Fallidos" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all ${
                filter === f.key ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Calendar className="h-10 w-10 mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400 font-medium">No hay nada programado</p>
          <p className="text-xs text-gray-300 mt-1">Crea un Post o Mensaje con los botones de arriba</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <TicketRow key={`${t.kind}-${t.id}`} ticket={t}
              onEdit={() => {
                if (t.kind === "post") { setEditingPost(t); setPostModal(true); }
                else { setEditingMsg(t); setMsgModal(true); }
              }}
              onDelete={() => handleDelete(t)}
              onRetry={() => handleRetry(t)}
            />
          ))}
        </div>
      )}

      <PostEditorModal open={postModal} onClose={() => setPostModal(false)}
        onSaved={fetchData} initial={editingPost} spaces={spaces} />
      <MessageEditorModal open={msgModal} onClose={() => setMsgModal(false)}
        onSaved={fetchData} initial={editingMsg} editions={editions} />
    </div>
  );
}

function StatCard({ icon: Icon, bg, label, value }: { icon: React.ElementType; bg: string; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className={`h-8 w-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-black text-gray-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}
