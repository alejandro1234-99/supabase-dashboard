import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

type FeedbackPayload = {
  edicion: number;
  semana: number;
  submitted_at: string;
  rating: number;
  respuesta_util?: string;
  mejora_sugerida?: string;
  respuestas_extra?: Record<string, string | null>;
  form_response_id: string;
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: FeedbackPayload | FeedbackPayload[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const records = Array.isArray(body) ? body : [body];
  if (records.length === 0) return NextResponse.json({ ok: true, upserted: 0 });

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (supabase.from("course_feedback" as any) as any)
    .upsert(records, { onConflict: "form_response_id", count: "exact" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, upserted: count ?? records.length });
}
