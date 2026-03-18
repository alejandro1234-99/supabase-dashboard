"use client";

import { useState, useEffect, Suspense } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2, Eye, EyeOff, Lock } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("error") === "no_admin") {
      setError("Tu cuenta no tiene permisos de administrador.");
    }
  }, [searchParams]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email o contrasena incorrectos.");
      setLoading(false);
      return;
    }

    const role =
      data.user?.app_metadata?.role ?? data.user?.user_metadata?.role;

    if (role === "admin") {
      window.location.href = "/dashboard";
      return;
    }

    if (role === "qa_admin") {
      window.location.href = "/dashboard/qa";
      return;
    }

    await supabase.auth.signOut();
    setError("Tu cuenta no tiene permisos de administrador.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[380px] px-5">
        {/* Logo + heading */}
        <div className="text-center mb-10">
          <Image
            src="/logo.png"
            alt="Revolutia"
            width={140}
            height={36}
            className="h-7 w-auto mx-auto object-contain mb-8 brightness-0 invert opacity-80"
            priority
          />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-5">
            <Lock className="h-3 w-3 text-emerald-400" />
            <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Panel de Administracion</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bienvenido</h1>
          <p className="text-sm text-white/30 mt-1.5">Inicia sesion para acceder al dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl shadow-2xl p-7">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@revolutia.ai"
                className="w-full h-11 text-sm bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 text-white placeholder:text-white/15 focus:outline-none focus:border-emerald-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2 block">
                Contrasena
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-11 text-sm bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 pr-11 text-white placeholder:text-white/15 focus:outline-none focus:border-emerald-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/15 rounded-xl px-4 py-3">
                <p className="text-xs text-red-400 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-400 active:bg-emerald-600 transition-all disabled:opacity-50 disabled:hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-white/15 mt-8">
          Acceso exclusivo para administradores
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
