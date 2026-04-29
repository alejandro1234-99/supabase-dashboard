import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase";
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
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role ?? "admin";

  let allowedRoutes: string[] | null = null;
  let isSuperAdmin = false;
  if (user) {
    const admin = createAdminClient();
    const { data: perm } = await admin
      .from("dashboard_permissions")
      .select("allowed_routes, is_super_admin")
      .eq("user_id", user.id)
      .single();
    if (perm) {
      isSuperAdmin = !!perm.is_super_admin;
      if (!perm.is_super_admin) {
        allowedRoutes = perm.allowed_routes ?? [];
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} allowedRoutes={allowedRoutes} isSuperAdmin={isSuperAdmin} />
      <main className="flex-1 p-8 overflow-auto scrollbar-thin">{children}</main>
    </div>
  );
}
