import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const BUCKET = "qa-attachments";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Archivo >20MB" }, { status: 400 });

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `scheduled-posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
