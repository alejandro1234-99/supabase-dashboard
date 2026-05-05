import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const now = new Date();
  const last7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const last30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const last24h = new Date(now.getTime() - 86400000).toISOString();

  // Métricas básicas en paralelo (excluyendo cuentas de test).
  // DAU y cohort se calculan via RPC server-side cuando está disponible
  // (ver migración dashboard_perf_indexes_and_rpcs.sql); si la función
  // todavía no existe, falla suave y caemos al cálculo en JS.
  const [
    { count: totalAlumnos },
    { count: newUsers7d },
    { count: newUsers30d },
    { count: activos24h },
    { count: activos7d },
    { count: activos30d },
    { count: leccionesCompletadas },
    dauRpc,
    cohortRpc,
  ] = await Promise.all([
    sb.from("profiles").select("user_id", { count: "exact", head: true }).eq("is_test_account", false),
    sb.from("profiles").select("user_id", { count: "exact", head: true }).eq("is_test_account", false).gte("created_at", last7),
    sb.from("profiles").select("user_id", { count: "exact", head: true }).eq("is_test_account", false).gte("created_at", last30),
    sb.from("profiles").select("user_id", { count: "exact", head: true }).eq("is_test_account", false).gte("last_active_at", last24h),
    sb.from("profiles").select("user_id", { count: "exact", head: true }).eq("is_test_account", false).gte("last_active_at", last7),
    sb.from("profiles").select("user_id", { count: "exact", head: true }).eq("is_test_account", false).gte("last_active_at", last30),
    sb.from("lesson_progress").select("user_id", { count: "exact", head: true }).eq("completed", true),
    sb.rpc("dashboard_dau_30d"),
    sb.rpc("dashboard_profiles_por_cohort"),
  ]);

  // Conexiones por día (últimos 30 días)
  let dauChart: { date: string; count: number }[] = [];
  if (dauRpc?.data && !dauRpc.error) {
    dauChart = (dauRpc.data as { date: string; count: number | string }[])
      .map((r) => ({ date: r.date, count: typeof r.count === "string" ? parseInt(r.count) : r.count }));
  } else {
    // Fallback (RPC no existe aún): traer todo y bucketear en JS
    const { data: dailyActives } = await sb
      .from("profiles")
      .select("last_active_at")
      .eq("is_test_account", false)
      .gte("last_active_at", last30);
    const dauMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      dauMap[d] = 0;
    }
    for (const r of (dailyActives ?? []) as { last_active_at: string | null }[]) {
      if (!r.last_active_at) continue;
      const d = r.last_active_at.slice(0, 10);
      if (d in dauMap) dauMap[d] = (dauMap[d] ?? 0) + 1;
    }
    dauChart = Object.entries(dauMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  // Por cohort
  let porCohort: { cohort: string; count: number }[] = [];
  if (cohortRpc?.data && !cohortRpc.error) {
    porCohort = (cohortRpc.data as { cohort: string; count: number | string }[])
      .map((r) => ({ cohort: r.cohort, count: typeof r.count === "string" ? parseInt(r.count) : r.count }));
  } else {
    const { data: cohortRows } = await sb
      .from("profiles")
      .select("cohort")
      .eq("is_test_account", false)
      .not("cohort", "is", null);
    const cohortMap: Record<string, number> = {};
    for (const r of (cohortRows ?? []) as { cohort: string | null }[]) {
      const c = r.cohort ?? "Sin cohort";
      cohortMap[c] = (cohortMap[c] ?? 0) + 1;
    }
    porCohort = Object.entries(cohortMap)
      .map(([cohort, count]) => ({ cohort, count }))
      .sort((a, b) => a.cohort.localeCompare(b.cohort));
  }

  // Completion por curso — opcional, falla suave si la tabla/columnas
  // no coinciden con lo esperado.
  let porCurso: { course: string; completion: number; usuarios: number; lecciones: number }[] = [];
  try {
    const { data: lessons } = await sb
      .from("lessons")
      .select("id, course_id, courses(name, is_published)");
    const lessonsByCourse: Record<string, { name: string; ids: Set<string> }> = {};
    for (const l of (lessons ?? []) as { id: string; course_id: string | null; courses: { name?: string; is_published?: boolean } | { name?: string; is_published?: boolean }[] | null }[]) {
      if (!l.course_id) continue;
      const courseInfo = Array.isArray(l.courses) ? l.courses[0] : l.courses;
      if (!courseInfo?.is_published) continue;
      const name = courseInfo.name ?? l.course_id;
      if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = { name, ids: new Set() };
      lessonsByCourse[l.course_id].ids.add(l.id);
    }

    const allLessonIds = Object.values(lessonsByCourse).flatMap((c) => Array.from(c.ids));
    if (allLessonIds.length > 0) {
      const { data: progress } = await sb
        .from("lesson_progress")
        .select("user_id, lesson_id, completed")
        .eq("completed", true)
        .in("lesson_id", allLessonIds);

      const lessonToCourse: Record<string, string> = {};
      for (const [courseId, c] of Object.entries(lessonsByCourse)) {
        for (const lid of c.ids) lessonToCourse[lid] = courseId;
      }

      // Para cada curso, contar lecciones completadas por usuario
      const completionByCourse: Record<string, Record<string, number>> = {};
      for (const p of (progress ?? []) as { user_id: string; lesson_id: string }[]) {
        const courseId = lessonToCourse[p.lesson_id];
        if (!courseId) continue;
        if (!completionByCourse[courseId]) completionByCourse[courseId] = {};
        completionByCourse[courseId][p.user_id] = (completionByCourse[courseId][p.user_id] ?? 0) + 1;
      }

      porCurso = Object.entries(lessonsByCourse).map(([courseId, c]) => {
        const totalLessons = c.ids.size;
        const userCounts = completionByCourse[courseId] ?? {};
        const usuarios = Object.keys(userCounts).length;
        const avgPct = usuarios > 0
          ? Object.values(userCounts).reduce((s, v) => s + (v / totalLessons), 0) / usuarios * 100
          : 0;
        return { course: c.name, completion: parseFloat(avgPct.toFixed(1)), usuarios, lecciones: totalLessons };
      }).sort((a, b) => b.usuarios - a.usuarios);
    }
  } catch {
    // dejar porCurso vacío si la consulta falla — schema desconocido
  }

  return NextResponse.json({
    stats: {
      totalAlumnos: totalAlumnos ?? 0,
      newUsers7d: newUsers7d ?? 0,
      newUsers30d: newUsers30d ?? 0,
      activos24h: activos24h ?? 0,
      activos7d: activos7d ?? 0,
      activos30d: activos30d ?? 0,
      leccionesCompletadas: leccionesCompletadas ?? 0,
    },
    dauChart,
    porCohort,
    porCurso,
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
}
