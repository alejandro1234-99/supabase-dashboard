import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

type ExamResult = {
  full_name: string;
  email?: string;
  correct_count: number;
  wrong_count: number;
  score_percent: number;
  submitted_at: string;
  exam_session_id: string;
};

export async function POST(req: NextRequest) {
  // Protect with secret
  const secret = req.headers.get("x-sync-secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ExamResult | ExamResult[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const results = Array.isArray(body) ? body : [body];

  if (results.length === 0) {
    return NextResponse.json({ ok: true, upserted: 0 });
  }

  const records = results.map((r) => ({
    airtable_id: `exam-${r.exam_session_id}`,
    nombre: r.full_name,
    email: r.email ?? null,
    aciertos: r.correct_count,
    fallos: r.wrong_count,
    porcentaje: parseFloat((r.score_percent / 100).toFixed(6)),
    fecha: r.submitted_at ? r.submitted_at.slice(0, 10) : null,
  }));

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (supabase.from("arp_certificates" as any) as any)
    .upsert(records, { onConflict: "airtable_id", count: "exact" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, upserted: count ?? records.length });
}
