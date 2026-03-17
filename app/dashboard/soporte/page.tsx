"use client";

import { ExternalLink, FileSpreadsheet, Zap } from "lucide-react";

export default function SoportePage() {
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SOPORTE_URL;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Soporte</h1>
        <p className="text-white/45 text-sm mt-0.5">Volcado automático a Google Sheets · automatizado con n8n</p>
      </div>

      {/* Card Google Sheets */}
      <div className="bg-[hsl(240_5%_20%)] rounded-2xl border border-white/[0.07] p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Google Sheets · Soporte</p>
            <p className="text-xs text-white/45">Los datos se vuelcan automáticamente cada noche a las 00:00 España</p>
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

      {/* n8n info */}
      <div className="bg-[hsl(240_5%_20%)] rounded-2xl border border-white/[0.07] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-400" />
          <p className="font-bold text-white text-sm">Automatización con n8n</p>
        </div>
        <p className="text-sm text-white/55 leading-relaxed">
          El flujo de n8n conecta directamente con Supabase, obtiene las filas del día y las vuelca en Google Sheets cada noche a las 00:00 (hora España).
        </p>
        <div className="space-y-2 text-xs text-white/45">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-orange-400/15 text-orange-300 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
            <span>Schedule Trigger · Cron <code className="bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">0 23 * * *</code> (00:00 España CET)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-orange-400/15 text-orange-300 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
            <span>Supabase node · tabla <code className="bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">soporte</code> · filtro <code className="bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">fecha = hoy</code></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-orange-400/15 text-orange-300 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
            <span>Google Sheets node · Append rows al sheet de soporte</span>
          </div>
        </div>
      </div>
    </div>
  );
}
