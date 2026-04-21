"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Loader2, Clock, AlertTriangle, CheckCircle, MessageCircle,
  ExternalLink, RefreshCw, Search, Send, X, Play,
  Headphones, ThumbsUp, Inbox, StickyNote, Timer, MessageSquare, FileText, Pin,
} from "lucide-react";

// ============ Types ============

type PostTicket = {
  type: "post";
  id: string;
  post_id: string;
  student_name: string;
  student_avatar: string | null;
  title: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  is_pinned: boolean;
  support_status: string | null;
  has_soporte_reply: boolean;
  comment_count: number;
  like_count: number;
  created_at: string;
  resolved_at: string | null;
  resolution_hours: number | null;
};

type MessageTicket = {
  type: "message";
  id: string;
  first_message_id: string;
  conversation_id: string;
  student_id: string;
  student_name: string;
  student_avatar: string | null;
  staff_user_id: string;
  staff_name: string;
  staff_short: string;
  status: "sin_atender" | "resolved";
  title: string;
  excerpt: string;
  message_count: number;
  started_at: string;
  last_message_at: string;
  resolved_at: string | null;
  response_hours: number | null;
};

type Ticket = PostTicket | MessageTicket;

type ConversationMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
};

type Stats = {
  total: number;
  sinAtender: number;
  pendientes: number;
  escalados: number;
  resueltos: number;
  avgResolutionHours: number | null;
};

// ============ Constants ============

const STAFF_IDS = [
  "96872496-d067-45cd-ba22-1c470a079b1e",
  "64daf2ce-b2ab-463c-9261-c410171036e1",
  "b3eb8fbc-6957-4187-b240-05fbd5469395",
];

// Badges de fuente — colores distintos para cada canal
const SOURCE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  post: { bg: "bg-purple-100", text: "text-purple-700", label: "Post" },
  "msg:96872496-d067-45cd-ba22-1c470a079b1e": { bg: "bg-indigo-100", text: "text-indigo-700", label: "DM · Soporte" },
  "msg:64daf2ce-b2ab-463c-9261-c410171036e1": { bg: "bg-amber-100", text: "text-amber-700", label: "DM · Erick" },
  "msg:b3eb8fbc-6957-4187-b240-05fbd5469395": { bg: "bg-pink-100", text: "text-pink-700", label: "DM · María" },
};

function sourceBadge(ticket: Ticket) {
  if (ticket.type === "post") return SOURCE_BADGES.post;
  return SOURCE_BADGES[`msg:${ticket.staff_user_id}`] ?? { bg: "bg-gray-100", text: "text-gray-600", label: "DM" };
}

const COLUMNS: {
  key: string;
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
  postStatus: string | null;
  matchPost: (p: PostTicket) => boolean;
  matchMessage: (m: MessageTicket) => boolean;
}[] = [
  {
    key: "sin_atender", label: "Sin atender", color: "text-amber-600", bg: "bg-amber-50", icon: Inbox,
    postStatus: null,
    matchPost: (p) => !p.support_status && !p.has_soporte_reply,
    matchMessage: (m) => m.status === "sin_atender",
  },
  {
    key: "pending", label: "Pendiente", color: "text-blue-600", bg: "bg-blue-50", icon: Clock,
    postStatus: "pending",
    matchPost: (p) => p.support_status === "pending",
    matchMessage: () => false,
  },
  {
    key: "escalated", label: "Escalado", color: "text-rose-600", bg: "bg-rose-50", icon: AlertTriangle,
    postStatus: "escalated",
    matchPost: (p) => p.support_status === "escalated",
    matchMessage: () => false,
  },
  {
    key: "resolved", label: "Resuelto", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle,
    postStatus: "resolved",
    matchPost: (p) => p.support_status === "resolved" || (!p.support_status && p.has_soporte_reply),
    matchMessage: (m) => m.status === "resolved",
  },
];

// ============ Media Helpers ============

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi|mkv)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i;

type ParsedContent =
  | { kind: "text"; text: string }
  | { kind: "audio"; url: string }
  | { kind: "image"; url: string; name: string }
  | { kind: "video"; url: string; name: string }
  | { kind: "file"; url: string; name: string };

function parseMessageContent(content: string): ParsedContent {
  if (content.startsWith("[audio]")) {
    return { kind: "audio", url: content.replace("[audio]", "") };
  }
  const fileMatch = content.match(/^\[file:([^\]]+)\](.+)$/);
  if (fileMatch) {
    const name = fileMatch[1];
    const url = fileMatch[2];
    if (IMAGE_EXT.test(name)) return { kind: "image", url, name };
    if (VIDEO_EXT.test(name)) return { kind: "video", url, name };
    if (AUDIO_EXT.test(name)) return { kind: "audio", url };
    return { kind: "file", url, name };
  }
  return { kind: "text", text: content };
}

function MediaPreview({ parsed, dark = false }: { parsed: ParsedContent; dark?: boolean }) {
  if (parsed.kind === "text") {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{parsed.text}</p>;
  }
  if (parsed.kind === "audio") {
    return <audio controls src={parsed.url} className="h-9 w-full max-w-[320px]" />;
  }
  if (parsed.kind === "image") {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={parsed.url} alt={parsed.name} className="max-w-full max-h-[320px] rounded-lg object-contain" />
    );
  }
  if (parsed.kind === "video") {
    return <video controls src={parsed.url} className="max-w-full max-h-[320px] rounded-lg" />;
  }
  return (
    <a
      href={parsed.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold underline ${
        dark ? "text-white/90 hover:text-white" : "text-indigo-600 hover:text-indigo-800"
      }`}
    >
      📎 {parsed.name}
    </a>
  );
}

// ============ Helpers ============

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function ticketInColumn(ticket: Ticket, col: typeof COLUMNS[number]) {
  return ticket.type === "post" ? col.matchPost(ticket) : col.matchMessage(ticket);
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

// ============ Card ============

function TicketCard({
  ticket,
  onOpen,
  onDragStart,
}: {
  ticket: Ticket;
  onOpen: () => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
}) {
  const badge = sourceBadge(ticket);
  const isDraggable = ticket.type === "post";

  const studentName = ticket.student_name;
  const studentAvatar = ticket.student_avatar;
  const title = ticket.title;
  const excerpt = ticket.excerpt;

  // Metadata
  const countIcon = ticket.type === "post" ? MessageCircle : MessageSquare;
  const count = ticket.type === "post" ? ticket.comment_count : ticket.message_count;
  const timeHours = ticket.type === "post" ? ticket.resolution_hours : ticket.response_hours;
  const date = ticket.type === "post" ? ticket.created_at : ticket.started_at;

  return (
    <div
      draggable={isDraggable}
      onDragStart={isDraggable && onDragStart ? (e) => onDragStart(e, ticket.id) : undefined}
      onClick={onOpen}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow select-none ${
        isDraggable ? "active:cursor-grabbing" : ""
      }`}
    >
      <div className="p-3.5">
        {/* Source badge at top */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          {ticket.type === "post" && ticket.is_pinned && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 flex items-center gap-0.5">
              <Pin className="h-2.5 w-2.5" /> Fijado
            </span>
          )}
          <span className="text-[9px] text-gray-300 ml-auto">{fmtDate(date)}</span>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 mb-1.5">
          {studentAvatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={studentAvatar} alt="" className="h-5 w-5 rounded-full shrink-0 object-cover" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
              <span className="text-[8px] font-bold text-gray-500">{studentName?.[0] ?? "?"}</span>
            </div>
          )}
          <p className="font-semibold text-gray-900 text-xs truncate">{studentName}</p>
        </div>

        {/* Title */}
        <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-relaxed">{title}</p>

        {/* Excerpt */}
        {excerpt && <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mt-1">{excerpt}</p>}

        {/* Bottom metadata */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-gray-400">
            {(() => { const Icon = countIcon; return <Icon className="h-2.5 w-2.5" />; })()} {count}
          </span>
          {ticket.type === "post" && ticket.like_count > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-400">
              <ThumbsUp className="h-2.5 w-2.5" /> {ticket.like_count}
            </span>
          )}
          {timeHours !== null && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full">
              <Timer className="h-2.5 w-2.5" />
              {timeHours < 24 ? `${timeHours}h` : `${Math.round((timeHours / 24) * 10) / 10}d`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Detail Modal ============

function TicketDetailModal({
  ticket,
  onClose,
  onPostStatusChange,
  onPostReply,
  onMessageReply,
}: {
  ticket: Ticket;
  onClose: () => void;
  onPostStatusChange: (postId: string, status: string | null) => void;
  onPostReply: (card: PostTicket, message: string) => Promise<boolean>;
  onMessageReply: (card: MessageTicket, message: string) => Promise<boolean>;
}) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Cargar mensajes si es un DM
  useEffect(() => {
    if (ticket.type === "message") {
      setLoadingMsgs(true);
      fetch(`/api/mensajes-soporte/${ticket.conversation_id}`)
        .then((r) => r.json())
        .then((d) => setMessages(d.data ?? []))
        .finally(() => setLoadingMsgs(false));
    }
  }, [ticket]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const badge = sourceBadge(ticket);

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    let ok = false;
    if (ticket.type === "post") {
      ok = await onPostReply(ticket, replyText);
    } else {
      ok = await onMessageReply(ticket, replyText);
    }
    setSending(false);
    if (ok) {
      setSent(true);
      setReplyText("");
      setTimeout(() => setSent(false), 3000);
      // Recargar mensajes si es DM
      if (ticket.type === "message") {
        const d = await fetch(`/api/mensajes-soporte/${ticket.conversation_id}`).then((r) => r.json());
        setMessages(d.data ?? []);
      }
    }
  };

  const currentCol = ticket.type === "post" ? COLUMNS.find((c) => c.matchPost(ticket)) : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {ticket.student_avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={ticket.student_avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-500">{ticket.student_name?.[0] ?? "?"}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-sm truncate">{ticket.student_name}</p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {fmtDate(ticket.type === "post" ? ticket.created_at : ticket.started_at)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {ticket.type === "post" ? (
            <>
              {/* Post content */}
              <h2 className="text-lg font-bold text-gray-900 mb-3">{ticket.title}</h2>
              <div
                className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: ticket.content }}
              />
              {ticket.image_url && (
                <div className="mt-4">
                  {VIDEO_EXT.test(ticket.image_url) ? (
                    <video controls src={ticket.image_url} className="max-w-full max-h-[420px] rounded-lg" />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={ticket.image_url} alt="" className="max-w-full max-h-[420px] rounded-lg object-contain" />
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> {ticket.comment_count} comentarios
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" /> {ticket.like_count} likes
                </span>
              </div>

              <a
                href={`https://hub.revolutia.ai/spaces/soporte-tecnico/${ticket.post_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <ExternalLink className="h-3 w-3" /> Ver en el Hub
              </a>
            </>
          ) : (
            <>
              {/* Conversation thread */}
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => {
                    const parsed = parseMessageContent(m.content);
                    const isStaff = STAFF_IDS.includes(m.sender_id);
                    return (
                      <div key={m.id} className={`flex gap-2.5 ${isStaff ? "flex-row-reverse" : ""}`}>
                        {m.sender_avatar ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={m.sender_avatar} alt="" className="h-7 w-7 rounded-full shrink-0 object-cover mt-1" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-gray-200 shrink-0 flex items-center justify-center mt-1">
                            <span className="text-[9px] font-bold text-gray-500">{m.sender_name?.[0] ?? "?"}</span>
                          </div>
                        )}
                        <div className={`flex flex-col gap-0.5 max-w-[75%] ${isStaff ? "items-end" : "items-start"}`}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-semibold text-gray-500">{m.sender_name}</span>
                            <span className="text-[9px] text-gray-300">{fmtDate(m.created_at)}</span>
                          </div>
                          <div
                            className={`px-3 py-2 rounded-xl ${
                              isStaff ? "bg-indigo-500 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"
                            }`}
                          >
                            <MediaPreview parsed={parsed} dark={isStaff} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 bg-gray-50/50 shrink-0">
          {ticket.type === "post" && currentCol && (
            <div className="px-6 pt-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Estado</p>
              <div className="flex flex-wrap gap-1.5">
                {COLUMNS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => onPostStatusChange(ticket.post_id, c.postStatus)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                      c.key === currentCol.key
                        ? `${c.bg} ${c.color} ring-2 ring-offset-1 ring-current/30`
                        : `${c.bg} ${c.color} opacity-60 hover:opacity-100`
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-6 py-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
              Responder como{" "}
              <span className="text-indigo-500">
                {ticket.type === "post" ? "Soporte Revolutia" : ticket.staff_name}
              </span>
            </p>
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escribe tu respuesta..."
                rows={3}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:border-indigo-300 text-gray-700 placeholder-gray-300 bg-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !replyText.trim()}
                className="self-end inline-flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-colors"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            {sent && <p className="text-[10px] text-emerald-500 font-medium mt-1.5">Enviado ✓</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Main Page ============

export default function SoporteHubPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const draggingId = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);

    try {
      const [postsRes, msgsRes] = await Promise.all([
        fetch(`/api/soporte-hub?${params}`),
        fetch(`/api/mensajes-soporte?${params}`),
      ]);
      const postsData = await postsRes.json();
      const msgsData = await msgsRes.json();

      const postTickets: PostTicket[] = (postsData.data ?? []).map((p: any) => ({
        type: "post" as const,
        id: `post:${p.id}`,
        post_id: p.id,
        student_name: p.author_name,
        student_avatar: p.author_avatar,
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        image_url: p.image_url,
        is_pinned: p.is_pinned,
        support_status: p.support_status,
        has_soporte_reply: p.has_soporte_reply,
        comment_count: p.comment_count,
        like_count: p.like_count,
        created_at: p.created_at,
        resolved_at: p.resolved_at,
        resolution_hours: p.resolution_hours,
      }));

      const msgTickets: MessageTicket[] = (msgsData.data ?? []).map((m: any) => ({
        type: "message" as const,
        ...m,
      }));

      setTickets([...postTickets, ...msgTickets]);

      setStats({
        total: (postsData.stats?.total ?? 0) + (msgsData.stats?.total ?? 0),
        sinAtender: (postsData.stats?.sinAtender ?? 0) + (msgsData.stats?.sinResponder ?? 0),
        pendientes: postsData.stats?.pendientes ?? 0,
        escalados: postsData.stats?.escalados ?? 0,
        resueltos: (postsData.stats?.resueltos ?? 0) + (msgsData.stats?.respondido ?? 0),
        avgResolutionHours: averageHours(postsData.stats?.avgResolutionHours, msgsData.stats?.avgResponseHours),
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { if (!loading) fetchData(); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePostStatusChange = async (postId: string, statusValue: string | null) => {
    setTickets((prev) =>
      prev.map((t) => (t.type === "post" && t.post_id === postId ? { ...t, support_status: statusValue } : t))
    );
    if (selectedTicket?.type === "post" && selectedTicket.post_id === postId) {
      setSelectedTicket({ ...selectedTicket, support_status: statusValue });
    }
    await fetch(`/api/soporte-hub/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ support_status: statusValue }),
    });
  };

  const handlePostReply = async (card: PostTicket, message: string): Promise<boolean> => {
    const res = await fetch("/api/soporte-hub/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: card.post_id, content: message }),
    });
    if (res.ok) {
      const updater = (t: PostTicket): PostTicket => ({
        ...t,
        has_soporte_reply: true,
        support_status: "resolved",
        comment_count: t.comment_count + 1,
        resolution_hours: Math.round((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60) * 10) / 10,
      });
      setTickets((prev) =>
        prev.map((t) => (t.type === "post" && t.post_id === card.post_id ? updater(t) : t))
      );
      return true;
    }
    const err = await res.json();
    alert(err.error ?? "Error al publicar respuesta");
    return false;
  };

  const handleMessageReply = async (card: MessageTicket, message: string): Promise<boolean> => {
    const res = await fetch("/api/mensajes-soporte/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: card.conversation_id, content: message, staffUserId: card.staff_user_id }),
    });
    if (res.ok) {
      setTickets((prev) =>
        prev.map((t) =>
          t.type === "message" && t.id === card.id
            ? {
                ...t,
                status: "resolved" as const,
                resolved_at: new Date().toISOString(),
                response_hours: Math.round((Date.now() - new Date(t.started_at).getTime()) / (1000 * 60 * 60) * 10) / 10,
              }
            : t
        )
      );
      return true;
    }
    const err = await res.json();
    alert(err.error ?? "Error al enviar mensaje");
    return false;
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

  const handleDrop = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggingId.current) return;
    const id = draggingId.current;
    draggingId.current = null;

    if (!id.startsWith("post:")) return;
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || ticket.type !== "post") return;

    const col = COLUMNS.find((c) => c.key === colKey);
    if (!col) return;

    const currentCol = COLUMNS.find((c) => c.matchPost(ticket));
    if (currentCol?.key !== colKey) {
      handlePostStatusChange(ticket.post_id, col.postStatus);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline de Soporte</h1>
          <p className="text-gray-400 text-sm mt-0.5">Publicaciones del Hub y mensajes privados en un único pipeline</p>
        </div>
        <button
          onClick={() => fetchData()}
          disabled={loading}
          className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 px-4 py-2 rounded-xl transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-6 gap-3">
          <StatCard icon={Headphones} bg="bg-indigo-500" label="Total" value={stats.total} />
          <StatCard icon={Inbox} bg="bg-amber-400" label="Sin atender" value={stats.sinAtender} />
          <StatCard icon={Clock} bg="bg-blue-500" label="Pendientes" value={stats.pendientes} />
          <StatCard icon={AlertTriangle} bg="bg-rose-500" label="Escalados" value={stats.escalados} />
          <StatCard icon={CheckCircle} bg="bg-emerald-500" label="Resueltos" value={stats.resueltos} />
          <StatCard
            icon={Timer}
            bg="bg-violet-500"
            label="Tiempo medio"
            value={
              stats.avgResolutionHours !== null
                ? stats.avgResolutionHours < 24
                  ? `${stats.avgResolutionHours}h`
                  : `${Math.round((stats.avgResolutionHours / 24) * 10) / 10}d`
                : "—"
            }
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por contenido o alumno..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 bg-gray-50 text-gray-700 placeholder-gray-300"
          />
        </div>
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors">
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-indigo-400" /></div>
      ) : (
        <div className="grid grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const cards = tickets.filter((t) => ticketInColumn(t, col));
            const isOver = dragOverCol === col.key;
            const Icon = col.icon;
            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`rounded-2xl p-3 min-h-40 transition-all ${isOver ? "ring-2 ring-indigo-300 ring-offset-1" : ""} ${col.bg}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${col.color}`} />
                    <span className={`text-xs font-bold ${col.color}`}>{col.label}</span>
                  </div>
                  <span className={`text-xs font-black ${col.color} opacity-60`}>{cards.length}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onOpen={() => setSelectedTicket(ticket)}
                      onDragStart={handleDragStart}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-300">Vacío</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onPostStatusChange={handlePostStatusChange}
          onPostReply={handlePostReply}
          onMessageReply={handleMessageReply}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, bg, label, value }: { icon: React.ElementType; bg: string; label: string; value: number | string }) {
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

function averageHours(a: number | null | undefined, b: number | null | undefined): number | null {
  const values = [a, b].filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}
