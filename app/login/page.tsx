"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Zap, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
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
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    const role =
      data.user?.app_metadata?.role ?? data.user?.user_metadata?.role;

    if (role !== "admin") {
      await supabase.auth.signOut();
      setError("Tu cuenta no tiene permisos de administrador.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Hero background */}
      <div className="absolute bottom-0 left-0 right-0 h-[320px] pointer-events-none">
        <Image
          src="/hero-background.png"
          alt=""
          fill
          className="object-cover opacity-30"
          priority
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[hsl(280_80%_60%_/_0.15)] mb-5 glow-primary">
            <Zap className="w-6 h-6 text-[hsl(280_80%_65%)]" />
          </div>
          <Image
            src="/logo.png"
            alt="Revolutia"
            width={160}
            height={40}
            className="h-8 w-auto mx-auto object-contain"
            priority
          />
          <h1 className="text-3xl font-bold text-white mt-4 tracking-tight">Panel de Administración</h1>
          <p className="text-white/40 text-sm mt-1.5">Acceso interno · Revolutia AI</p>
        </div>

        {/* Card */}
        <div className="bg-[hsl(240_6%_12%)] border border-white/[0.07] rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-7 pt-7 pb-2 text-center">
            <h1 className="text-base font-semibold text-white">Iniciar sesión</h1>
            <p className="text-[13px] text-white/40 mt-1">Acceso exclusivo para administradores</p>
          </div>

          <form onSubmit={handleLogin} className="p-7 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@revolutia.ai"
                className="w-full h-10 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[hsl(280_80%_60%_/_0.5)] focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1.5 block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-10 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 pr-10 text-white placeholder:text-white/20 focus:outline-none focus:border-[hsl(280_80%_60%_/_0.5)] focus:bg-white/[0.07] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-2 bg-[hsl(280_80%_60%)] text-white text-sm font-semibold rounded-xl hover:bg-[hsl(280_80%_55%)] transition-colors glow-primary disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] text-white/20 mt-6">
          Solo usuarios admin del proyecto Supabase pueden acceder
        </p>
      </div>
    </div>
  );
}
