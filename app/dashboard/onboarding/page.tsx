"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Users, FileCheck, KeyRound, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Alumno = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  telefono: string | null;
  edicion: string | null;
  edad: number | null;
  tipo_avatar: string | null;
  riesgo_reembolso: string | null;
  factores_riesgo: number | null;
  situacion_laboral: string | null;
  nivel_ia: string | null;
  tiempo_semana: string | null;
  motivacion: string | null;
  expectativas: string | null;
  frenos: string | null;
  merecido_la_pena: string | null;
  contrato_firmado: boolean;
  acceso_enviado: boolean;
  fecha_registro: string | null;
  provincia: string | null;
};

type Stats = { total: number; conContrato: number; conAcceso: number };
type PorAvatar = { avatar: string; count: number };
type PorRiesgo = { riesgo: string; count: number };
type PorEdicion = { edicion: string; count: number };
type PorNivelIa = { nivel: string; count: number };
type PorLaboral = { laboral: string; count: number };

const AVATAR_COLORS: Record<string, string> = {
  AV0: "#f59e0b",
  AV1: "#6366f1",
  AV2: "#10b981",
  "NO AVATAR": "#9ca3af",
  "Sin clasificar": "#d1d5db",
};

const RIESGO_COLORS: Record<string, string> = {
  BAJO: "#10b981",
  MEDIO: "#f59e0b",
  ALTO: "#ef4444",
  "Sin evaluar": "#9ca3af",
};

function AvatarBadge({ avatar }: { avatar: string | null }) {
  if (!avatar) return null;
  const color = AVATAR_COLORS[avatar] ?? "#9ca3af";
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: color }}>
      {avatar}
    </span>
  );
}

function RiesgoBadge({ riesgo }: { riesgo: string | null }) {
  if (!riesgo) return null;
  const colors: Record<string, string> = {
    BAJO: "bg-emerald-50 text-emerald-700",
    MEDIO: "bg-amber-50 text-amber-700",
    ALTO: "bg-red-50 text-red-600",
  };
  const cls = colors[riesgo] ?? "bg-gray-100 text-gray-500";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{riesgo}</span>;
}

function AlumnoRow({ a }: { a: Alumno }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <td className="px-4 py-3">
          <p className="font-semibold text-gray-800 text-xs">{a.nombre_completo ?? "—"}</p>
          <p className="text-[11px] text-gray-400">{a.email ?? ""}</p>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600">{a.edicion ?? "—"}</td>
        <td className="px-4 py-3"><AvatarBadge avatar={a.tipo_avatar} /></td>
        <td className="px-4 py-3"><RiesgoBadge riesgo={a.riesgo_reembolso} /></td>
        <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate">{a.situacion_laboral ?? "—"}</td>
        <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate">{a.nivel_ia ?? "—"}</td>
        <td className="px-4 py-3 text-xs text-gray-600">{a.tiempo_semana ?? "—"}</td>
        <td className="px-4 py-3">
          <div className="flex gap-1.5">
            {a.contrato_firmado && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">Contrato</span>}
            {a.acceso_enviado && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600">Acceso</span>}
          </div>
        </td>
        <td className="px-4 py-2 text-gray-400">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50/60">
          <td colSpan={9} className="px-4 pb-4 pt-2">
            <div className="grid grid-cols-2 gap-4 text-xs">
              {a.motivacion && (
                <div>
                  <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Motivación</p>
                  <p className="text-gray-700">{a.motivacion}</p>
                </div>
              )}
              {a.expectativas && (
                <div>
                  <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Expectativas</p>
                  <p className="text-gray-700">{a.expectativas}</p>
                </div>
              )}
              {a.frenos && (
                <div>
                  <p className="font-semibold text-amber-500 uppercase tracking-wide text-[10px] mb-0.5">Frenos / Preocupaciones</p>
                  <p className="text-gray-700">{a.frenos}</p>
                </div>
              )}
              {a.merecido_la_pena && (
                <div>
                  <p className="font-semibold text-emerald-500 uppercase tracking-wide text-[10px] mb-0.5">¿Qué haría que merezca la pena?</p>
                  <p className="text-gray-700">{a.merecido_la_pena}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function OnboardingPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [porAvatar, setPorAvatar] = useState<PorAvatar[]>([]);
  const [porRiesgo, setPorRiesgo] = useState<PorRiesgo[]>([]);
  const [porEdicion, setPorEdicion] = useState<PorEdicion[]>([]);
  const [porNivelIa, setPorNivelIa] = useState<PorNivelIa[]>([]);
  const [porLaboral, setPorLaboral] = useState<PorLaboral[]>([]);
  const [ediciones, setEdiciones] = useState<string[]>([]);
  const [avatares, setAvatares] = useState<string[]>([]);
  const [riesgos, setRiesgos] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [edicionFilter, setEdicionFilter] = useState<string | null>(null);
  const [avatarFilter, setAvatarFilter] = useState<string | null>(null);
  const [riesgoFilter, setRiesgoFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (edicionFilter) params.set("edicion", edicionFilter);
    if (avatarFilter) params.set("avatar", avatarFilter);
    if (riesgoFilter) params.set("riesgo", riesgoFilter);
    if (search) params.set("search", search);
    fetch(`/api/onboarding?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setAlumnos(d.data ?? []);
        setCount(d.count ?? 0);
        setStats(d.stats);
        setPorAvatar(d.porAvatar ?? []);
        setPorRiesgo(d.porRiesgo ?? []);
        setPorEdicion(d.porEdicion ?? []);
        setPorNivelIa(d.porNivelIa ?? []);
        setPorLaboral(d.porLaboral ?? []);
        setEdiciones(d.ediciones ?? []);
        setAvatares(d.avatares ?? []);
        setRiesgos(d.riesgos ?? []);
      })
      .finally(() => setLoading(false));
  }, [page, edicionFilter, avatarFilter, riesgoFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(count / 30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Onboarding Alumnos</h1>
        <p className="text-gray-400 text-sm mt-0.5">Datos de registro y perfilado · Alumnos_ventas</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total alumnos</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <FileCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Contrato firmado</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">
                {stats.conContrato}
                <span className="text-sm font-medium text-gray-400 ml-1">{Math.round((stats.conContrato / stats.total) * 100)}%</span>
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <KeyRound className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Acceso enviado</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">
                {stats.conAcceso}
                <span className="text-sm font-medium text-gray-400 ml-1">{Math.round((stats.conAcceso / stats.total) * 100)}%</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-4 gap-4">
        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Tipo de avatar</h2>
          <div className="space-y-2">
            {porAvatar.map((a) => (
              <div key={a.avatar}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs font-semibold" style={{ color: AVATAR_COLORS[a.avatar] ?? "#9ca3af" }}>{a.avatar}</span>
                  <span className="text-xs font-bold text-gray-800">{a.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-2 rounded-full" style={{ width: `${Math.round((a.count / (porAvatar[0]?.count ?? 1)) * 100)}%`, backgroundColor: AVATAR_COLORS[a.avatar] ?? "#9ca3af" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Riesgo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Riesgo de reembolso</h2>
          <div className="space-y-2">
            {porRiesgo.map((r) => (
              <div key={r.riesgo}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs font-semibold" style={{ color: RIESGO_COLORS[r.riesgo] ?? "#9ca3af" }}>{r.riesgo}</span>
                  <span className="text-xs font-bold text-gray-800">{r.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-2 rounded-full" style={{ width: `${Math.round((r.count / (porRiesgo[0]?.count ?? 1)) * 100)}%`, backgroundColor: RIESGO_COLORS[r.riesgo] ?? "#9ca3af" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nivel IA */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Nivel IA</h2>
          <div className="space-y-2">
            {porNivelIa.map((n) => {
              const label = n.nivel.length > 30 ? n.nivel.slice(0, 30) + "…" : n.nivel;
              return (
                <div key={n.nivel}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[11px] text-gray-600 truncate max-w-[140px]" title={n.nivel}>{label}</span>
                    <span className="text-xs font-bold text-gray-800 ml-1 shrink-0">{n.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-indigo-400 rounded-full" style={{ width: `${Math.round((n.count / (porNivelIa[0]?.count ?? 1)) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Situación laboral */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Situación laboral</h2>
          <div className="space-y-2">
            {porLaboral.map((l) => {
              const label = l.laboral.length > 28 ? l.laboral.slice(0, 28) + "…" : l.laboral;
              return (
                <div key={l.laboral}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[11px] text-gray-600 truncate max-w-[140px]" title={l.laboral}>{label}</span>
                    <span className="text-xs font-bold text-gray-800 ml-1 shrink-0">{l.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-emerald-400 rounded-full" style={{ width: `${Math.round((l.count / (porLaboral[0]?.count ?? 1)) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gráfica por edición */}
      {porEdicion.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-1">Alumnos por edición</h2>
          <p className="text-xs text-gray-400 mb-4">Total registros de onboarding</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={porEdicion} barCategoryGap="35%">
              <XAxis dataKey="edicion" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "#f3f4f6" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-700">{label}</p>
                      <p className="font-bold text-indigo-600">{(payload[0].payload as PorEdicion).count} alumnos</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                {porEdicion.map((_, i) => <Cell key={i} fill="#6366f1" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Nombre o email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-indigo-300 w-48"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-gray-400">Edición:</span>
          <button onClick={() => { setEdicionFilter(null); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!edicionFilter ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
            Todas
          </button>
          {ediciones.map((ed) => (
            <button key={ed} onClick={() => { setEdicionFilter(ed); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${edicionFilter === ed ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
              {ed}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-medium text-gray-400">Avatar:</span>
          {avatares.map((av) => (
            <button key={av} onClick={() => { setAvatarFilter(avatarFilter === av ? null : av); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all text-white`}
              style={{ backgroundColor: avatarFilter === av ? AVATAR_COLORS[av] : "#e5e7eb", color: avatarFilter === av ? "white" : "#6b7280" }}>
              {av}
            </button>
          ))}
          <span className="text-xs font-medium text-gray-400 ml-2">Riesgo:</span>
          {riesgos.map((r) => (
            <button key={r} onClick={() => { setRiesgoFilter(riesgoFilter === r ? null : r); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${riesgoFilter === r ? "text-white" : "bg-white border border-gray-200 text-gray-600"}`}
              style={riesgoFilter === r ? { backgroundColor: RIESGO_COLORS[r] ?? "#6b7280" } : {}}>
              {r}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">{count} alumnos</span>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Alumno</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Edición</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Avatar</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Riesgo</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Situación</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Nivel IA</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Tiempo/sem</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {alumnos.map((a) => <AlumnoRow key={a.id} a={a} />)}
            </tbody>
          </table>
          {alumnos.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">No hay resultados</div>
          )}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-400">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full" disabled={page === 1}
              onClick={() => { setPage((p) => p - 1); window.scrollTo(0, 0); }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={page === p ? "default" : "outline"} size="sm"
                className={`rounded-full w-9 ${page === p ? "bg-indigo-500 hover:bg-indigo-600 border-indigo-500" : ""}`}
                onClick={() => { setPage(p); window.scrollTo(0, 0); }}>
                {p}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="rounded-full" disabled={page === totalPages}
              onClick={() => { setPage((p) => p + 1); window.scrollTo(0, 0); }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
