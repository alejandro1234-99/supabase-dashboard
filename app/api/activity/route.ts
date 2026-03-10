import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const category = searchParams.get("category") ?? "";

  const supabase = createAdminClient();

  let query = supabase
    .from("activity_logs")
    .select("id, event_type, category, user_id, target_type, description, metadata, created_at, profiles(name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
