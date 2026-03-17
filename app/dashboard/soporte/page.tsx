"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw, CheckCircle, Clock, FileSpreadsheet } from "lucide-react";

export default function SoportePage() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; message?: string; rows?: number; error?: string } | null>(null);

  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SOPORTE_URL;

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/soporte-sheets", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}` },
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Error al conectar con el servidor" });
    } finally {
      setSyncing(false);
    }
  }

  // España (CET) = UTC+1, próxima ejecución
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setUTCHours(23, 0, 0, 0);
  if (now.getUTCHours() >= 23) nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  const nextRunSpain = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  }).format(nextRun);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Soporte</h1>
        <p className="text-white/45 text-sm mt-0.5">Volcado automático a Google Sheets · cada noche a las 00:00 España</p>
      </div>

      {/* Card principal */}
      <div className="bg-[hsl(240_5%_20%)] rounded-2xl border border-white/[0.07] p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Google Sheets · Soporte</p>
            <p className="text-xs text-white/45">Los datos se vuelcan automáticamente cada noche</p>
          </div>
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-2 rounded-full hover:bg-emerald-400/20 transition-colors shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir Sheet
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.06]">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-1">Frecuencia</p>
            <p className="text-sm font-bold text-white">Diaria · 00:00 España</p>
          </div>
          <div className="bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3 w-3 text-white/30" />
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Próxima ejecución</p>
            </div>
            <p className="text-sm font-bold text-white capitalize">{nextRunSpain}</p>
          </div>
        </div>

        <div className="bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.06]">
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-2">Columnas exportadas</p>
          <div className="flex flex-wrap gap-1.5">
            {["Nº Ticket", "Fecha", "Alumno", "Consulta", "Tipo", "Canal", "Responsable", "Escalado a", "Cerrada"].map((col) => (
              <span key={col} className="text-xs font-medium text-indigo-300 bg-indigo-400/10 border border-indigo-400/15 px-2 py-0.5 rounded-full">
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sync manual */}
      <div className="bg-[hsl(240_5%_20%)] rounded-2xl border border-white/[0.07] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-white text-sm">Volcado manual</p>
            <p className="text-xs text-white/40 mt-0.5">Exporta las filas de hoy ahora mismo</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-full disabled:opacity-50 transition-all shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Exportando..." : "Exportar hoy"}
          </button>
        </div>

        {result && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
            result.ok
              ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-300"
              : "bg-red-400/10 border border-red-400/20 text-red-300"
          }`}>
            {result.ok && <CheckCircle className="h-4 w-4 shrink-0" />}
            <p>{result.message ?? result.error}</p>
            {result.ok && result.rows !== undefined && (
              <span className="ml-auto font-bold">{result.rows} filas</span>
            )}
          </div>
        )}
      </div>

      {/* Setup instructions */}
      <div className="bg-amber-400/5 rounded-2xl border border-amber-400/15 p-5 space-y-3">
        <p className="text-sm font-bold text-amber-300">Variables de entorno requeridas en Vercel</p>
        <div className="space-y-1.5 font-mono text-xs">
          {[
            ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "email@proyecto.iam.gserviceaccount.com"],
            ["GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----\\n..."],
            ["GOOGLE_SHEETS_SOPORTE_ID", "ID del Google Sheet (de la URL)"],
            ["NEXT_PUBLIC_GOOGLE_SHEETS_SOPORTE_URL", "URL completa del Google Sheet"],
            ["CRON_SECRET", "Token secreto para proteger el endpoint"],
          ].map(([key, example]) => (
            <div key={key} className="flex items-start gap-3">
              <span className="text-amber-300 shrink-0">{key}</span>
              <span className="text-white/25"># {example}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-amber-300/60">
          El Service Account debe tener acceso de Editor al Google Sheet.
          Comparte el sheet con el email del service account.
        </p>
      </div>
    </div>
  );
}
