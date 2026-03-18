import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // In Server Components, cookies can only be read, not set.
            // setAll is handled by the middleware instead.
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (role !== "admin" && role !== "qa_admin") redirect("/login?error=no_admin");

  // qa_admin solo puede acceder a /dashboard/qa
  if (role === "qa_admin") {
    const headersList = await headers();
    const pathname = headersList.get("x-invoke-path") ?? headersList.get("x-pathname") ?? "";
    if (pathname && !pathname.startsWith("/dashboard/qa")) {
      redirect("/dashboard/qa");
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <main className="flex-1 p-8 overflow-auto scrollbar-thin">{children}</main>
    </div>
  );
}
