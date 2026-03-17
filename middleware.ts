import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// El proyecto ref de Supabase (extraído de la URL)
const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?.replace("https://", "")
  .split(".")[0] ?? "";

function getSessionCookie(request: NextRequest): string | null {
  // Supabase guarda la sesión en sb-<project-ref>-auth-token o sb-<ref>-auth-token.0
  const cookieName = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
  return (
    request.cookies.get(cookieName)?.value ??
    request.cookies.get(`${cookieName}.0`)?.value ??
    null
  );
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getUserFromCookie(request: NextRequest): {
  email?: string;
  role?: string;
} | null {
  const raw = getSessionCookie(request);
  if (!raw) return null;

  try {
    // El valor puede ser JSON con access_token, o directamente el JWT
    const parsed = JSON.parse(decodeURIComponent(raw));
    const accessToken: string =
      typeof parsed === "string"
        ? parsed
        : parsed?.access_token ?? parsed?.[0]?.access_token ?? "";

    if (!accessToken) return null;

    const payload = decodeJwtPayload(accessToken);
    if (!payload) return null;

    // Comprobar expiración
    const exp = payload.exp as number;
    if (exp && Date.now() / 1000 > exp) return null;

    return {
      email: payload.email as string,
      role:
        (payload.app_metadata as Record<string, string>)?.role ??
        (payload.user_metadata as Record<string, string>)?.role,
    };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLogin = pathname === "/login";
  const isDashboard = pathname.startsWith("/dashboard");

  if (!isDashboard && !isLogin) return NextResponse.next();

  const user = getUserFromCookie(request);

  // Sin sesión → login
  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Con sesión pero sin rol admin → login con error
  if (user && isDashboard && user.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "no_admin");
    return NextResponse.redirect(url);
  }

  // Ya autenticado como admin → no mostrar login
  if (user && user.role === "admin" && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
