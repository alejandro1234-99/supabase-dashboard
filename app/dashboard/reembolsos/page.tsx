"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ShoppingCart, RefreshCw, Clock, Users, FileCheck } from "lucide-react";

type Stats = {
  totalVentas: number;
  totalOnboardings: number;
  ventasDuplicados: number;
  reembolsosSolicitados: number;
  reembolsosEjecutados: number;
  mediaDiasReembolso: number | null;
};

type EstudioReembolsos = {
  total: number; sinMatch: number; conContrato: number;
  edadMedia: number | null; diasMedia: number | null;
  avatarComparison: { avatar: string; reembolsos: number; reembolsosPct: string; totalVentas: number; totalPct: string; tasaReembolso: string }[];
  tasaReembolsoEdad: { range: string; total: number; reembolsos: number; tasa: string }[];
  tasaReembolsoRiesgo: { riesgo: string; total: number; reembolsos: number; tasa: string }[];
  perfilReembolso: { label: string; rows: { valor: string; total: number; reembolsos: number; tasa: string }[] }[];
};

type EstudioMkt = {
  mktFuente: { fuente: string; total: number; reembolsos: number; tasa: string }[];
  mktAvatar: { avatar: string; total: number; reembolsos: number; tasa: string }[];
  matchCount: number; noMatch: number;
};

const EDICIONES = ["Global", "Enero 2026", "Febrero 2026", "Marzo 2026"];

function ReembolsoTable({ title, subtitle, rows, labelKey }: {
  title: string; subtitle?: string;
  rows: { label: string; total: number; reembolsos: number; tasa: string }[];
  labelKey: string;
}) {
  const totalV = rows.reduce((s, r) => s + r.total, 0);
  const totalR = rows.reduce((s, r) => s + r.reembolsos, 0);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{labelKey}</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">% del total</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Reembolsos</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Tasa reembolso</th>
            <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Peso en reembolsos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => {
            const tasa = parseFloat(row.tasa);
            const tasaColor = tasa === 0 ? "text-emerald-500" : tasa < 10 ? "text-amber-500" : "text-red-500";
            const pctV = totalV > 0 ? ((row.total / totalV) * 100).toFixed(1) : "0";
            const pctR = totalR > 0 ? ((row.reembolsos / totalR) * 100).toFixed(1) : "0";
            return (
              <tr key={row.label} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-3.5 text-xs font-semibold text-gray-700 max-w-[300px]">{row.label}</td>
                <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">{row.total}</td>
                <td className="text-right px-4 py-3.5 text-sm font-semibold text-gray-500">{pctV}%</td>
                <td className="text-right px-4 py-3.5 text-sm font-bold text-gray-900">{row.reembolsos}</td>
                <td className="text-right px-4 py-3.5"><span className={`text-sm font-black ${tasaColor}`}>{row.tasa}%</span></td>
                <td className="text-right px-6 py-3.5 text-sm font-semibold text-red-500">{pctR}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ReembolsosPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [estudioReembolsos, setEstudioReembolsos] = useState<EstudioReembolsos | null>(null);
  const [estudioMkt, setEstudioMkt] = useState<EstudioMkt | null>(null);
  const [edicionFilter, setEdicionFilter] = useState("Global");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (edicionFilter !== "Global") params.set("edicion", edicionFilter);
    fetch(`/api/onboardings?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? null);
        setEstudioReembolsos(d.estudioReembolsos ?? null);
        setEstudioMkt(d.estudioMkt ?? null);
      })
      .finally(() => setLoading(false));
  }, [edicionFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reembolsos</h1>
        <p className="text-gray-400 text-sm mt-0.5">Estudio de reembolsos cruzado con onboarding y marketing</p>
      </div>

      {/* Selector de edición */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Selecciona la edicion</p>
        <div className="flex items-center gap-2 flex-wrap">
          {EDICIONES.map((ed) => (
            <button key={ed} onClick={() => setEdicionFilter(ed)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${edicionFilter === ed
                ? "bg-red-500 text-white shadow-md shadow-red-500/25 scale-[1.02]"
                : "bg-gray-50 border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50"
              }`}>
              {ed}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-red-500" /></div>
      ) : stats && (
        <>
          {/* 1. Resumen */}
          <h2 className="text-lg font-bold text-gray-900">1. Resumen de reembolsos</h2>
          <div className="grid grid-cols-4 gap-4">
            {(() => {
              const pctReembolso = stats.totalVentas > 0 ? ((stats.reembolsosSolicitados / stats.totalVentas) * 100) : 0;
              const color = pctReembolso < 8 ? { bg: "bg-emerald-500", border: "border-emerald-200", bgCard: "bg-emerald-50", text: "text-emerald-700" }
                : pctReembolso <= 10 ? { bg: "bg-amber-500", border: "border-amber-200", bgCard: "bg-amber-50", text: "text-amber-700" }
                : { bg: "bg-red-500", border: "border-red-200", bgCard: "bg-red-50", text: "text-red-700" };
              return (
                <div className={`rounded-2xl border ${color.border} shadow-sm px-4 py-3 flex items-center gap-3 ${color.bgCard}`}>
                  <div className={`h-9 w-9 rounded-xl ${color.bg} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-sm font-black">%</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tasa reembolso</p>
                    <p className={`text-2xl font-black leading-tight ${color.text}`}>{pctReembolso.toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-400">{stats.totalVentas} ventas</p>
                  </div>
                </div>
              );
            })()}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                <RefreshCw className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Solicitados</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.reembolsosSolicitados}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                <RefreshCw className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ejecutados</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.reembolsosEjecutados}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gray-600 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Media dias</p>
                <p className="text-2xl font-black text-gray-900 leading-tight">{stats.mediaDiasReembolso ?? "—"} <span className="text-sm font-normal text-gray-400">{stats.mediaDiasReembolso != null ? "dias" : ""}</span></p>
              </div>
            </div>
          </div>

          {estudioReembolsos && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Edad media reembolsados</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{estudioReembolsos.edadMedia ?? "—"} <span className="text-sm font-normal text-gray-400">{estudioReembolsos.edadMedia ? "años" : ""}</span></p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                  <FileCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Con contrato firmado</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{estudioReembolsos.conContrato} <span className="text-sm font-normal text-gray-400">/ {estudioReembolsos.total - estudioReembolsos.sinMatch}</span></p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gray-400 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sin cruzar con onboarding</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{estudioReembolsos.sinMatch}</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Estudio onboarding */}
          {estudioReembolsos && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mt-2">2. Estudio de reembolsos en base a los datos de onboarding</h2>

              <ReembolsoTable title="Tasa de reembolso por avatar" subtitle="avatar identificado en producto" labelKey="Avatar"
                rows={estudioReembolsos.avatarComparison.map((r) => ({ label: r.avatar, total: r.totalVentas, reembolsos: r.reembolsos, tasa: r.tasaReembolso }))} />

              <ReembolsoTable title="Tasa de reembolso por nivel de riesgo" labelKey="Riesgo"
                rows={(estudioReembolsos.tasaReembolsoRiesgo ?? []).map((r) => ({ label: r.riesgo, total: r.total, reembolsos: r.reembolsos, tasa: r.tasa }))} />

              <ReembolsoTable title="Tasa de reembolso por rango de edad" labelKey="Rango"
                rows={(estudioReembolsos.tasaReembolsoEdad ?? []).map((r) => ({ label: `${r.range} años`, total: r.total, reembolsos: r.reembolsos, tasa: r.tasa }))} />

              {estudioReembolsos.perfilReembolso?.map((pf) => (
                <ReembolsoTable key={pf.label} title={`Tasa de reembolso por ${pf.label.toLowerCase()}`} labelKey={pf.label}
                  rows={pf.rows.map((r) => ({ label: r.valor, total: r.total, reembolsos: r.reembolsos, tasa: r.tasa }))} />
              ))}
            </>
          )}

          {/* 3. Estudio Mkt */}
          {estudioMkt && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mt-2">3. Estudio de reembolsos cruzado con Marketing</h2>
              <p className="text-xs text-gray-400 -mt-4">Cruce de ventas/reembolsos con la tabla de leads por email</p>

              <ReembolsoTable title="Tasa de reembolso por fuente de captacion" labelKey="Fuente"
                rows={estudioMkt.mktFuente.map((r) => ({ label: r.fuente, total: r.total, reembolsos: r.reembolsos, tasa: r.tasa }))} />

              {estudioMkt.mktAvatar.length > 0 && (
                <ReembolsoTable title="Tasa de reembolso por avatar de Mkt" subtitle="solo ventas Paid" labelKey="Avatar Mkt"
                  rows={estudioMkt.mktAvatar.map((r) => ({ label: r.avatar, total: r.total, reembolsos: r.reembolsos, tasa: r.tasa }))} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
