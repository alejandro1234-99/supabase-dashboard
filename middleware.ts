import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (role !== "admin" && role !== "qa_admin") {
    return NextResponse.redirect(new URL("/login?error=no_admin", request.url));
  }

  if (role === "qa_admin" && !request.nextUrl.pathname.startsWith("/dashboard/qa")) {
    return NextResponse.redirect(new URL("/dashboard/qa", request.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
