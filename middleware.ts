import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Dominios del grupo empresarial: cualquier email de estos dominios tiene acceso
// completo al dashboard sin necesidad de role manual ni fila en dashboard_permissions.
const ALLOWED_DOMAINS = ["@revolutia.ai", "@noctorial.com", "@hypeleadsad.com"];

// Excepciones individuales (emails fuera de los dominios del grupo).
const ALLOWED_EMAILS: string[] = [];

function isEmailAllowed(email: string): boolean {
  const lower = email.toLowerCase();
  if (ALLOWED_EMAILS.includes(lower)) return true;
  return ALLOWED_DOMAINS.some((domain) => lower.endsWith(domain));
}

function isTrustedDomain(email: string): boolean {
  const lower = email.toLowerCase();
  return ALLOWED_DOMAINS.some((domain) => lower.endsWith(domain));
}

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

  if (role === "qa_admin" && !request.nextUrl.pathname.startsWith("/dashboard/qa")) {
    return NextResponse.redirect(new URL("/dashboard/qa", request.url));
  }

  // Check granular permissions (skip for API routes and static assets)
  const path = request.nextUrl.pathname;
  if (path.startsWith("/dashboard/") && !path.startsWith("/dashboard/api")) {
    const permSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    const { data: perm } = await permSupabase
      .from("dashboard_permissions")
      .select("allowed_routes, is_super_admin")
      .eq("user_id", user.id)
      .single();

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
