"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Loader2, Search, Send, RefreshCw, MessageSquare, Inbox,
  CheckCircle, Timer, User,
} from "lucide-react";

// --- Types ---

type Ticket = {
  conversation_id: string;
  student_id: string;
  student_name: string;
  student_avatar: string | null;
  staff_user_id: string;
  staff_name: string;
  staff_short: string;
  status: "sin_responder" | "respondido";
  unread_count: number;
  last_message_at: string;
  last_message_preview: string;
  last_message_sender_id: string;
  response_hours: number | null;
  message_count: number;
};

type Stats = {
  total: number;
  sinResponder: number;
  respondido: number;
  avgResponseHours: number | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
};

type MessageGroup = {
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  messages: Message[];
  created_at: string;
};

const STAFF_IDS = [
  "96872496-d067-45cd-ba22-1c470a079b1e",
  "64daf2ce-b2ab-463c-9261-c410171036e1",
  "b3eb8fbc-6957-4187-b240-05fbd5469395",
];

const STAFF_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "96872496-d067-45cd-ba22-1c470a079b1e", label: "Soporte" },
  { id: "64daf2ce-b2ab-463c-9261-c410171036e1", label: "Erick" },
  { id: "b3eb8fbc-6957-4187-b240-05fbd5469395", label: "María" },
];

const STAFF_COLORS: Record<string, string> = {
  "96872496-d067-45cd-ba22-1c470a079b1e": "bg-indigo-100 text-indigo-700",
  "64daf2ce-b2ab-463c-9261-c410171036e1": "bg-amber-100 text-amber-700",
  "b3eb8fbc-6957-4187-b240-05fbd5469395": "bg-pink-100 text-pink-700",
};

// --- Helpers ---

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function fmtFullTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const lastGroup = groups[groups.length - 1];
    if (
      lastGroup &&
      lastGroup.sender_id === msg.sender_id &&
      new Date(msg.created_at).getTime() - new Date(lastGroup.messages[lastGroup.messages.length - 1].created_at).getTime() < 60000
    ) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        sender_avatar: msg.sender_avatar,
        messages: [msg],
        created_at: msg.created_at,
      });
    }
  }
  return groups;
}

function parseContent(content: string): { type: "text" | "audio" | "image" | "file"; text: string; url?: string } {
  if (content.startsWith("[audio]")) {
    return { type: "audio", text: "Mensaje de audio", url: content.replace("[audio]", "") };
  }
  const fileMatch = content.match(/^\[file:([^\]]+)\](.+)$/);
  if (fileMatch) {
    const filename = fileMatch[1];
    const url = fileMatch[2];
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);
    return { type: isImage ? "image" : "file", text: filename, url };
  }
  return { type: "text", text: content };
}

// --- Sub-components ---

function TicketItem({ ticket, isActive, onClick }: { ticket: Ticket; isActive: boolean; onClick: () => void }) {
  const isUnread = ticket.status === "sin_responder" && ticket.unread_count > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-all hover:bg-gray-50 ${
        isActive ? "bg-indigo-50/70 border-l-2 border-l-indigo-500" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {ticket.student_avatar ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={ticket.student_avatar} alt="" className="h-9 w-9 rounded-full shrink-0 object-cover" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-500">{ticket.student_name?.[0]?.toUpperCase() ?? "?"}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm truncate ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
              {ticket.student_name}
            </span>
            <span className="text-[10px] text-gray-400 shrink-0">{fmtTime(ticket.last_message_at)}</span>
          </div>
          <p className={`text-xs mt-0.5 truncate ${isUnread ? "text-gray-700" : "text-gray-400"}`}>
            {ticket.last_message_preview}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STAFF_COLORS[ticket.staff_user_id] ?? "bg-gray-100 text-gray-600"}`}>
              {ticket.staff_short}
            </span>
            {isUnread && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{ticket.unread_count}</span>
            )}
            {ticket.status === "respondido" && <CheckCircle className="h-3 w-3 text-emerald-500" />}
          </div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ group, isStaff }: { group: MessageGroup; isStaff: boolean }) {
  return (
    <div className={`flex gap-2.5 ${isStaff ? "flex-row-reverse" : ""}`}>
      {group.sender_avatar ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={group.sender_avatar} alt="" className="h-7 w-7 rounded-full shrink-0 object-cover mt-1" />
      ) : (
        <div className="h-7 w-7 rounded-full bg-gray-200 shrink-0 flex items-center justify-center mt-1">
          <span className="text-[9px] font-bold text-gray-500">{group.sender_name?.[0]?.toUpperCase() ?? "?"}</span>
        </div>
      )}
      <div className={`flex flex-col gap-0.5 max-w-[70%] ${isStaff ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-semibold text-gray-500">{group.sender_name}</span>
          <span className="text-[9px] text-gray-300">{fmtFullTime(group.created_at)}</span>
        </div>
        {group.messages.map((msg) => {
          const parsed = parseContent(msg.content);
          return (
            <div
              key={msg.id}
              className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                isStaff ? "bg-indigo-500 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"
              }`}
            >
              {parsed.type === "text" && <p className="whitespace-pre-wrap">{parsed.text}</p>}
              {parsed.type === "audio" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-70">🎤</span>
                  <audio controls src={parsed.url} className="h-8 max-w-[200px]" />
                </div>
              )}
              {parsed.type === "image" && parsed.url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={parsed.url} alt={parsed.text} className="max-w-[240px] rounded-lg" />
              )}
              {parsed.type === "file" && (
                <a href={parsed.url} target="_blank" rel="noopener noreferrer" className={`text-xs underline ${isStaff ? "text-white/80" : "text-indigo-600"}`}>
                  📎 {parsed.text}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Component ---

export default function MensajesSoportePanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStaff !== "all") params.set("staff", filterStaff);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (searchQuery) params.set("search", searchQuery);

    try {
      const res = await fetch(`/api/mensajes-soporte?${params}`);
      const d = await res.json();
      setTickets(d.data ?? []);
      setStats(d.stats ?? null);
    } finally {
      setLoading(false);
    }
  }, [filterStaff, filterStatus, searchQuery]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/mensajes-soporte/${convId}`);
      const d = await res.json();
      setMessages(d.data ?? []);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConvId) fetchMessages(activeConvId);
  }, [activeConvId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeConvId || sending) return;
    const activeTicket = tickets.find((t) => t.conversation_id === activeConvId);
    if (!activeTicket) return;

    setSending(true);
    const content = replyText.trim();
    setReplyText("");

    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConvId,
      sender_id: activeTicket.staff_user_id,
      content,
      created_at: new Date().toISOString(),
      sender_name: activeTicket.staff_name,
      sender_avatar: null,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    setTickets((prev) =>
      prev.map((t) =>
        t.conversation_id === activeConvId
          ? { ...t, status: "respondido" as const, unread_count: 0, last_message_preview: content.slice(0, 120), last_message_at: new Date().toISOString(), last_message_sender_id: activeTicket.staff_user_id }
          : t
      )
    );

    try {
      const res = await fetch("/api/mensajes-soporte/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvId, content, staffUserId: activeTicket.staff_user_id }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Error al enviar");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const activeTicket = tickets.find((t) => t.conversation_id === activeConvId);
  const messageGroups = groupMessages(messages);

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
              <Inbox className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sin responder</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{stats.sinResponder}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Respondido</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{stats.respondido}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-violet-500 flex items-center justify-center shrink-0">
              <Timer className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tiempo medio</p>
              <p className="text-xl font-black text-gray-900 leading-tight">
                {stats.avgResponseHours !== null
                  ? stats.avgResponseHours < 24 ? `${stats.avgResponseHours}h` : `${Math.round((stats.avgResponseHours / 24) * 10) / 10}d`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inbox layout */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 320px)" }}>
        <div className="flex h-full">
          {/* Left panel: ticket list */}
          <div className="w-[380px] border-r border-gray-100 flex flex-col h-full">
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar alumno..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 bg-gray-50 text-gray-700 placeholder-gray-300"
                />
              </div>
              <div className="flex gap-1.5">
                {[
                  { key: "all", label: "Todos" },
                  { key: "sin_responder", label: "Sin responder" },
                  { key: "respondido", label: "Respondido" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterStatus(f.key)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                      filterStatus === f.key ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {STAFF_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilterStaff(s.id)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                      filterStaff === s.id ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-16 text-sm text-gray-300">No hay conversaciones</div>
              ) : (
                tickets.map((ticket) => (
                  <TicketItem key={ticket.conversation_id} ticket={ticket} isActive={activeConvId === ticket.conversation_id} onClick={() => setActiveConvId(ticket.conversation_id)} />
                ))
              )}
            </div>
          </div>

          {/* Right panel: message thread */}
          <div className="flex-1 flex flex-col h-full">
            {!activeConvId ? (
              <div className="flex-1 flex items-center justify-center text-gray-300">
                <div className="text-center">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Selecciona una conversacion</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
                  {activeTicket?.student_avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={activeTicket.student_avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-900">{activeTicket?.student_name}</p>
                    <p className="text-[10px] text-gray-400">
                      Respondiendo como <span className="font-semibold text-indigo-500">{activeTicket?.staff_name}</span>
                    </p>
                  </div>
                  {activeTicket?.status === "sin_responder" && (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">Sin responder</span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {loadingMessages ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div>
                  ) : messageGroups.length === 0 ? (
                    <div className="text-center py-16 text-sm text-gray-300">Sin mensajes</div>
                  ) : (
                    messageGroups.map((group, i) => (
                      <MessageBubble key={`${group.sender_id}-${group.created_at}-${i}`} group={group} isStaff={STAFF_IDS.includes(group.sender_id)} />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex gap-2">
                    <textarea
                      ref={textareaRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Responder como ${activeTicket?.staff_name ?? "Soporte"}...`}
                      rows={2}
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:border-indigo-300 text-gray-700 placeholder-gray-300 bg-white"
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="self-end inline-flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-colors"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
