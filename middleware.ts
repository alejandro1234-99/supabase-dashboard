import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isEmailAllowed, isTrustedDomain } from "./lib/access-config";

type PermEntry = { perm: { allowed_routes: string[] | null; is_super_admin: boolean } | null; ts: number };
const permCache = new Map<string, PermEntry>();
const PERM_TTL_MS = 30_000;

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();

  // Only protect /dashboard routes
  if (!request.nextUrl.pathname.startsWith("/dashboard")) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verificar que el email está en dominios/emails permitidos
  if (!user.email || !isEmailAllowed(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=email_no_autorizado", request.url));
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  // Los emails del grupo (revolutia / noctorial / hypeleadsad) entran sin necesidad de role.
  const trusted = isTrustedDomain(user.email);

  if (!trusted && role !== "admin" && role !== "qa_admin") {
    return NextResponse.redirect(new URL("/login?error=no_admin", request.url));
  }

  if (role === "qa_admin" && !request.nextUrl.pathname.startsWith("/dashboard/soporte")) {
    return NextResponse.redirect(new URL("/dashboard/soporte?tab=qa", request.url));
  }

  // Check granular permissions (skip for API routes and static assets)
  const path = request.nextUrl.pathname;
  if (path.startsWith("/dashboard/") && !path.startsWith("/dashboard/api")) {
    // Cache en memoria (TTL 30s) del lookup de dashboard_permissions
    // — los permisos no cambian entre clicks; sin esto cada navegación
    // a /dashboard/* paga 100-1500ms en una query trivial.
    let perm: PermEntry["perm"];
    const cached = permCache.get(user.id);
    if (cached && Date.now() - cached.ts < PERM_TTL_MS) {
      perm = cached.perm;
    } else {
      const permSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data } = await permSupabase
        .from("dashboard_permissions")
        .select("allowed_routes, is_super_admin")
        .eq("user_id", user.id)
        .single();
      perm = data ?? null;
      permCache.set(user.id, { perm, ts: Date.now() });
    }

    // /dashboard/permisos solo accesible a super_admin (no a trusted_default).
    if (path.startsWith("/dashboard/permisos") && !perm?.is_super_admin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (perm && !perm.is_super_admin) {
      const allowed: string[] = perm.allowed_routes ?? [];
      const dashboardRoute = "/" + path.split("/").slice(1, 3).join("/");
      if (!allowed.includes(dashboardRoute)) {
        const firstAllowed = allowed[0] ?? "/dashboard";
        return NextResponse.redirect(new URL(firstAllowed, request.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
