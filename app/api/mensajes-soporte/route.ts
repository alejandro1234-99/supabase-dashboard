import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// Usuarios monitorizados
const STAFF_USERS = [
  { id: "96872496-d067-45cd-ba22-1c470a079b1e", name: "Soporte Revolutia", short: "Soporte" },
  { id: "64daf2ce-b2ab-463c-9261-c410171036e1", name: "Erick Gutierrez", short: "Erick" },
  { id: "b3eb8fbc-6957-4187-b240-05fbd5469395", name: "María Perea", short: "María" },
] as const;

export { STAFF_USERS };

const STAFF_IDS: string[] = STAFF_USERS.map((s) => s.id);

// Ventana de tiempo para agrupar mensajes en un mismo ticket (10 min)
const BURST_WINDOW_MS = 10 * 60 * 1000;

type RawMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type TicketBurst = {
  first_message_id: string;
  conversation_id: string;
  staff_user_id: string;
  messages: RawMessage[];
  started_at: string;
  last_student_msg_at: string;
  status: "sin_atender" | "resolved";
  resolved_at: string | null;
  resolved_by: string | null;
  response_hours: number | null;
};

/**
 * Agrupa los mensajes de una conversacion en "tickets" (bloques).
 * Un ticket empieza cuando un alumno escribe despues de una pausa larga
 * o despues de que el staff ya haya respondido a la rafaga anterior.
 */
function groupIntoBursts(messages: RawMessage[], staffUserId: string): TicketBurst[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const bursts: TicketBurst[] = [];
  let current: TicketBurst | null = null;

  for (const msg of sorted) {
    const isStaff = STAFF_IDS.includes(msg.sender_id);

    if (!isStaff) {
      // Mensaje de alumno
      const msgTime = new Date(msg.created_at).getTime();

      if (!current) {
        // No hay ticket activo → crear uno nuevo
        current = {
          first_message_id: msg.id,
          conversation_id: msg.conversation_id,
          staff_user_id: staffUserId,
          messages: [msg],
          started_at: msg.created_at,
          last_student_msg_at: msg.created_at,
          status: "sin_atender",
          resolved_at: null,
          resolved_by: null,
          response_hours: null,
        };
      } else {
        const gap = msgTime - new Date(current.last_student_msg_at).getTime();
        if (current.status === "resolved" || gap > BURST_WINDOW_MS) {
          // Cerrar el ticket anterior y empezar uno nuevo
          bursts.push(current);
          current = {
            first_message_id: msg.id,
            conversation_id: msg.conversation_id,
            staff_user_id: staffUserId,
            messages: [msg],
            started_at: msg.created_at,
            last_student_msg_at: msg.created_at,
            status: "sin_atender",
            resolved_at: null,
            resolved_by: null,
            response_hours: null,
          };
        } else {
          // Añadir al ticket actual
          current.messages.push(msg);
          current.last_student_msg_at = msg.created_at;
        }
      }
    } else {
      // Mensaje de staff
      if (current && current.status === "sin_atender") {
        current.status = "resolved";
        current.resolved_at = msg.created_at;
        current.resolved_by = msg.sender_id;
        current.messages.push(msg);
        current.response_hours = Math.round(
          ((new Date(msg.created_at).getTime() - new Date(current.started_at).getTime()) /
            (1000 * 60 * 60)) *
            10
        ) / 10;
      } else if (current) {
        // Mensaje de seguimiento del staff dentro del mismo ticket
        current.messages.push(msg);
      }
      // else: mensaje de staff sin contexto de ticket → ignorar
    }
  }

  if (current) bursts.push(current);

  return bursts;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filterStaff = searchParams.get("staff");
  const search = searchParams.get("search")?.trim() ?? "";

  const supabase = createAdminClient();

  const staffIds = filterStaff && filterStaff !== "all" ? [filterStaff] : STAFF_IDS;

  // 1. Participaciones del staff en conversaciones
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: participations, error: partErr } = await (supabase.from("conversation_participants" as any) as any)
    .select("conversation_id, user_id, last_read_at")
    .in("user_id", staffIds);

  if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 });
  if (!participations || participations.length === 0) {
    return NextResponse.json({ data: [], stats: emptyStats() });
  }

  // Conv -> staff (preferir Soporte si hay varios)
  const convStaffMap: Record<string, string> = {};
  for (const p of participations) {
    if (!convStaffMap[p.conversation_id] || p.user_id === STAFF_IDS[0]) {
      convStaffMap[p.conversation_id] = p.user_id;
    }
  }

  const convIds = Object.keys(convStaffMap);

  // 2. Otros participantes (alumnos)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allParticipants } = await (supabase.from("conversation_participants" as any) as any)
    .select("conversation_id, user_id")
    .in("conversation_id", convIds)
    .not("user_id", "in", `(${STAFF_IDS.join(",")})`);

  const convStudentMap: Record<string, string> = {};
  for (const p of (allParticipants ?? [])) {
    if (!convStudentMap[p.conversation_id]) convStudentMap[p.conversation_id] = p.user_id;
  }

  const validConvIds = convIds.filter((cid) => convStudentMap[cid]);
  if (validConvIds.length === 0) {
    return NextResponse.json({ data: [], stats: emptyStats() });
  }

  // 3. Traer todos los mensajes de la semana actual en estas conversaciones
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentMessages } = await (supabase.from("messages" as any) as any)
    .select("id, conversation_id, sender_id, content, created_at")
    .in("conversation_id", validConvIds)
    .gte("created_at", weekStart)
    .order("created_at", { ascending: true })
    .limit(10000);

  // Agrupar por conversacion
  const convMessages: Record<string, RawMessage[]> = {};
  for (const msg of (recentMessages ?? []) as RawMessage[]) {
    if (!convMessages[msg.conversation_id]) convMessages[msg.conversation_id] = [];
    convMessages[msg.conversation_id].push(msg);
  }

  // 4. Perfiles de alumnos
  const studentIds = [...new Set(Object.values(convStudentMap))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from("profiles" as any) as any)
    .select("user_id, name, avatar_url")
    .in("user_id", studentIds);

  const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
  for (const p of (profiles ?? [])) {
    profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
  }

  // 5. Generar tickets (bloques) por conversacion
  const tickets: any[] = [];
  for (const convId of validConvIds) {
    const msgs = convMessages[convId] ?? [];
    if (msgs.length === 0) continue;

    const staffUserId = convStaffMap[convId];
    const bursts = groupIntoBursts(msgs, staffUserId);

    for (const burst of bursts) {
      const studentId = convStudentMap[convId];
      const student = profileMap[studentId];
      const staff = STAFF_USERS.find((s) => s.id === burst.staff_user_id);

      // Texto del ticket: concatenar contenido de los msgs del alumno
      const studentMsgs = burst.messages.filter((m) => !STAFF_IDS.includes(m.sender_id));
      const firstMsg = studentMsgs[0];

      let preview = firstMsg?.content || "";
      preview = preview.replace(/\[audio\].*/, "🎤 Audio");
      preview = preview.replace(/\[file:([^\]]+)\].*/, "📎 $1");

      const title = preview.split("\n")[0].slice(0, 100);
      const excerpt = studentMsgs.slice(1).map((m) => m.content).join(" · ").slice(0, 150);

      tickets.push({
        id: `msg:${burst.first_message_id}`,
        type: "message" as const,
        first_message_id: burst.first_message_id,
        conversation_id: convId,
        student_id: studentId,
        student_name: student?.name ?? "Usuario",
        student_avatar: student?.avatar_url ?? null,
        staff_user_id: burst.staff_user_id,
        staff_name: staff?.name ?? "Soporte",
        staff_short: staff?.short ?? "Soporte",
        status: burst.status,
        title,
        excerpt,
        message_count: studentMsgs.length,
        started_at: burst.started_at,
        last_message_at: burst.last_student_msg_at,
        resolved_at: burst.resolved_at,
        response_hours: burst.response_hours,
      });
    }
  }

  // Filtrar por busqueda
  const filtered = tickets.filter((t) => !search || t.student_name.toLowerCase().includes(search.toLowerCase()));

  // Stats
  const respondidos = tickets.filter((t) => t.response_hours !== null);
  const avgResponseHours =
    respondidos.length > 0
      ? Math.round((respondidos.reduce((sum, t) => sum + (t.response_hours ?? 0), 0) / respondidos.length) * 10) / 10
      : null;

  const stats = {
    total: tickets.length,
    sinResponder: tickets.filter((t) => t.status === "sin_atender").length,
    respondido: tickets.filter((t) => t.status === "resolved").length,
    avgResponseHours,
  };

  return NextResponse.json({ data: filtered, stats });
}

function emptyStats() {
  return { total: 0, sinResponder: 0, respondido: 0, avgResponseHours: null };
}
