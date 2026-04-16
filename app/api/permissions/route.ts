import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dashboard_permissions")
    .select("*")
    .order("is_super_admin", { ascending: false })
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ permissions: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { user_id, allowed_routes } = body;

  if (!user_id || !Array.isArray(allowed_routes)) {
    return NextResponse.json({ error: "user_id and allowed_routes required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dashboard_permissions")
    .update({ allowed_routes, updated_at: new Date().toISOString() })
    .eq("user_id", user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, email, name, is_super_admin, allowed_routes } = body;

  if (!user_id || !email) {
    return NextResponse.json({ error: "user_id and email required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dashboard_permissions")
    .upsert({
      user_id,
      email,
      name: name ?? "",
      is_super_admin: is_super_admin ?? false,
      allowed_routes: allowed_routes ?? [],
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
