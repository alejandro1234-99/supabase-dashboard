import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { isEmailAllowed, isTrustedDomain } from "@/lib/access-config";

type PermRow = {
  user_id: string;
  email: string;
  name: string;
  allowed_routes: string[];
  is_super_admin: boolean;
  is_trusted_default?: boolean;
};

export async function GET() {
  const supabase = createAdminClient();

  // Fila explicita en dashboard_permissions.
  const { data: rows, error } = await supabase
    .from("dashboard_permissions")
    .select("user_id, email, name, allowed_routes, is_super_admin")
    .returns<Omit<PermRow, "is_trusted_default">[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Iterar TODAS las paginas de auth.users via REST directa (el cliente JS
  // de supabase ignora perPage en algunas versiones y solo devuelve 50).
  type AuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };
  const allAuthUsers: { id: string; email: string | undefined; user_metadata: Record<string, unknown> }[] = [];
  const restHeaders = {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
  };
  for (let page = 1; page <= 100; page++) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`,
      { headers: restHeaders, cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Auth admin: ${res.status} ${await res.text()}` }, { status: 500 });
    }
    const d = (await res.json()) as { users?: AuthUser[] };
    const users = d.users ?? [];
    if (!users.length) break;
    for (const u of users) {
      allAuthUsers.push({ id: u.id, email: u.email, user_metadata: u.user_metadata ?? {} });
    }
  }

  const explicitByUserId = new Map<string, PermRow>();
  for (const r of rows ?? []) explicitByUserId.set(r.user_id, r as PermRow);

  const merged: PermRow[] = [];
  for (const u of allAuthUsers) {
    if (!u.email || !isEmailAllowed(u.email)) continue;
    const explicit = explicitByUserId.get(u.id);
    if (explicit) {
      merged.push({ ...explicit, is_trusted_default: false });
    } else if (isTrustedDomain(u.email)) {
      // Acceso por defecto via dominio trusted, sin fila en dashboard_permissions.
      merged.push({
        user_id: u.id,
        email: u.email,
        name: (u.user_metadata?.full_name as string) || u.email.split("@")[0],
        allowed_routes: [],
        is_super_admin: true, // acceso completo por defecto
        is_trusted_default: true,
      });
    }
  }

  // Tambien incluir filas explicitas cuyo user_id no aparece en auth (caso raro).
  for (const r of rows ?? []) {
    if (!allAuthUsers.some((u) => u.id === r.user_id)) {
      merged.push({ ...r, is_trusted_default: false });
    }
  }

  // Orden: super_admin primero, luego trusted_default, luego resto, alfabetico por name.
  merged.sort((a, b) => {
    if (a.is_super_admin !== b.is_super_admin) return a.is_super_admin ? -1 : 1;
    if (!!a.is_trusted_default !== !!b.is_trusted_default) return a.is_trusted_default ? -1 : 1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  return NextResponse.json({ permissions: merged });
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
