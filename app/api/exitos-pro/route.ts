/**
 * API unificada de Casos de Éxito (sustituye a /api/exitos + /api/gestion-exitos).
 *
 * Cruza:
 *   - alumnos               (datos del caso de éxito, fuente principal)
 *   - circle_members        (avatar, datos Circle)
 *   - purchase_approved     (edición, fecha de compra)
 *   - profiles (Platform)   (cohort, onboarding, last_active_at, ubicación)
 *   - auth.users            (puente email ↔ user_id de profiles)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getEmailToUserIdMap } from "@/lib/auth-users-cache";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const tipo = searchParams.get("tipo");
  const estado = searchParams.get("estado") ?? "todos"; // "Sí" | "Seguimiento" | "todos"
  const edicion = searchParams.get("edicion");
  const cohort = searchParams.get("cohort");
  const grabado = searchParams.get("grabado"); // "true" | "false" | null

  const supabase = createAdminClient();
  const sb = supabase as Any;

  // 1. Alumnos con caso de éxito
  let q = sb
    .from("alumnos")
    .select("*")
    .order("fecha_caso_exito", { ascending: false, nullsFirst: false });

  if (estado === "todos") q = q.in("caso_exito", ["Sí", "Seguimiento"]);
  else q = q.eq("caso_exito", estado);

  if (tipo) q = q.eq("tipo_exito", tipo);
  if (search) q = q.or(`nombre_completo.ilike.%${search}%,email.ilike.%${search}%,descripcion_exito.ilike.%${search}%`);
  if (grabado === "true") q = q.eq("grabado", true);
  if (grabado === "false") q = q.eq("grabado", false);

  const { data: alumnosRaw, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const alumnos = (alumnosRaw ?? []) as Any[];

  const emails = alumnos.map((a) => (a.email ?? "").toLowerCase()).filter(Boolean);
  const circleIds = alumnos.map((a) => a.id_circle).filter(Boolean).map(Number);

  // 2. Circle members (avatar)
  const { data: circleMembersRaw } = circleIds.length > 0
    ? await sb.from("circle_members").select("circle_member_id, avatar_url").in("circle_member_id", circleIds)
    : { data: [] };
  const avatarMap: Record<number, string> = {};
  for (const m of (circleMembersRaw ?? []) as Any[]) {
    if (m.avatar_url) avatarMap[m.circle_member_id] = m.avatar_url;
  }

  // 3. Purchase approved (edición + fecha compra)
  const { data: purchasesRaw } = emails.length > 0
    ? await sb
        .from("purchase_approved")
        .select("correo_electronico, edicion, fecha_compra")
        .in("correo_electronico", emails)
        .neq("status", "Rembolsado")
        .order("fecha_compra", { ascending: false })
    : { data: [] };
  const purchaseMap: Record<string, { edicion: string | null; fecha_compra: string | null }> = {};
  for (const p of (purchasesRaw ?? []) as Any[]) {
    const e = (p.correo_electronico ?? "").toLowerCase();
    if (!purchaseMap[e]) purchaseMap[e] = { edicion: p.edicion, fecha_compra: p.fecha_compra };
  }

  // 4. Profiles de la Platform — via auth.users (email → user_id → profile)
  // Mapeo cacheado a nivel modulo (TTL 2 min) para evitar paginar auth.users
  // en cada request.
  const emailToUserId = await getEmailToUserIdMap();

  const userIds = emails.map((e) => emailToUserId[e]).filter(Boolean);
  const { data: profilesRaw } = userIds.length > 0
    ? await sb
        .from("profiles")
        .select("user_id, name, avatar_url, cohort, professional_background, desired_role, onboarding_completed, onboarding_completed_at, last_active_at, city, region, country, is_test_account")
        .in("user_id", userIds)
    : { data: [] };
  const profileByUserId: Record<string, Any> = {};
  for (const p of (profilesRaw ?? []) as Any[]) profileByUserId[p.user_id] = p;

  // 5. Total alumnos del curso (denominador para % captura)
  const { count: totalAlumnosCurso } = await sb
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("is_test_account", false);

  // Combinar todo
  const data = alumnos.map((a) => {
    const e = (a.email ?? "").toLowerCase();
    const userId = emailToUserId[e];
    const profile = userId ? profileByUserId[userId] : null;
    const purchase = purchaseMap[e];
    return {
      ...a,
      avatar_url: a.id_circle ? (avatarMap[Number(a.id_circle)] ?? null) : null,
      platform_avatar_url: profile?.avatar_url ?? null,
      edicion: purchase?.edicion ?? null,
      fecha_entrada: purchase?.fecha_compra ?? null,
      // Datos de la Platform
      platform_user_id: userId ?? null,
      platform_cohort: profile?.cohort ?? null,
      platform_professional_background: profile?.professional_background ?? null,
      platform_desired_role: profile?.desired_role ?? null,
      platform_onboarding_completed: profile?.onboarding_completed ?? false,
      platform_onboarding_completed_at: profile?.onboarding_completed_at ?? null,
      platform_last_active_at: profile?.last_active_at ?? null,
      platform_city: profile?.city ?? null,
      platform_region: profile?.region ?? null,
      platform_country: profile?.country ?? null,
    };
  });

  // Filtros adicionales en memoria (tras cruces)
  const filtered = data.filter((c) => {
    if (edicion && c.edicion !== edicion) return false;
    if (cohort && c.platform_cohort !== cohort) return false;
    return true;
  });

  // Métricas
  const total = filtered.length;
  const confirmados = filtered.filter((c) => c.caso_exito === "Sí").length;
  const seguimiento = filtered.filter((c) => c.caso_exito === "Seguimiento").length;
  const grabados = filtered.filter((c) => c.grabado && c.caso_exito === "Sí").length;
  const sinGrabar = confirmados - grabados;

  const tasaCaptura = totalAlumnosCurso && totalAlumnosCurso > 0
    ? ((confirmados / totalAlumnosCurso) * 100).toFixed(1)
    : "0";
  const tasaCierre = confirmados > 0
    ? ((grabados / confirmados) * 100).toFixed(1)
    : "0";

  // Por Stage (solo confirmados)
  const stageMap: Record<string, number> = {};
  for (const c of filtered) {
    if (c.caso_exito !== "Sí") continue;
    const s = c.tipo_exito ?? "Sin stage";
    stageMap[s] = (stageMap[s] ?? 0) + 1;
  }
  const porStage = Object.entries(stageMap)
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => a.stage.localeCompare(b.stage));

  // Por Fuente
  const fuenteMap: Record<string, number> = {};
  for (const c of filtered) {
    const f = c.fuente_caso_exito ?? "Sin fuente";
    fuenteMap[f] = (fuenteMap[f] ?? 0) + 1;
  }
  const porFuente = Object.entries(fuenteMap)
    .map(([fuente, count]) => ({ fuente, count }))
    .sort((a, b) => b.count - a.count);

  // Por Edición
  const edicionMap: Record<string, number> = {};
  for (const c of filtered) {
    const ed = c.edicion ?? "Sin edición";
    edicionMap[ed] = (edicionMap[ed] ?? 0) + 1;
  }
  const porEdicion = Object.entries(edicionMap)
    .map(([edicion, count]) => ({ edicion, count }))
    .sort((a, b) => a.edicion.localeCompare(b.edicion));

  // Por Cohort (Platform)
  const cohortMap: Record<string, number> = {};
  for (const c of filtered) {
    if (!c.platform_cohort) continue;
    cohortMap[c.platform_cohort] = (cohortMap[c.platform_cohort] ?? 0) + 1;
  }
  const porCohort = Object.entries(cohortMap)
    .map(([cohort, count]) => ({ cohort, count }))
    .sort((a, b) => a.cohort.localeCompare(b.cohort));

  // Listas para selectores
  const { data: edicionesList } = await sb
    .from("purchase_approved")
    .select("edicion")
    .neq("status", "Rembolsado")
    .not("edicion", "is", null);
  const ediciones = [...new Set(((edicionesList ?? []) as Any[]).map((r) => r.edicion).filter(Boolean))].sort();

  // Cohorts del set sin filtrar (para que el dropdown no se reduzca al filtrar).
  const cohorts = [...new Set(data.map((c) => c.platform_cohort).filter(Boolean))].sort() as string[];

  return NextResponse.json({
    data: filtered,
    stats: {
      total,
      confirmados,
      seguimiento,
      grabados,
      sinGrabar,
      tasaCaptura,
      tasaCierre,
      totalAlumnosCurso: totalAlumnosCurso ?? 0,
    },
    porStage,
    porFuente,
    porEdicion,
    porCohort,
    ediciones,
    cohorts,
  }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
  });
}

// Editar campos del caso (incluye crear el caso si el alumno no existía)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const supabase = createAdminClient();
  const sb = supabase as Any;

  const { data, error } = await sb
    .from("alumnos")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si no existe en alumnos, intentar crear desde purchase_approved
  if (!data) {
    const { data: purchase } = await sb
      .from("purchase_approved")
      .select("id, nombre_completo, correo_electronico, edicion, fecha_compra")
      .eq("id", id)
      .maybeSingle();

    if (!purchase) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });

    const newAlumno = {
      airtable_id: `purchase_${purchase.id}`,
      nombre_completo: purchase.nombre_completo,
      email: purchase.correo_electronico,
      fecha_union: purchase.fecha_compra,
      tags: purchase.edicion,
      ...updates,
    };
    const { data: inserted, error: insertErr } = await sb
      .from("alumnos")
      .insert(newAlumno)
      .select()
      .single();
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    return NextResponse.json({ data: inserted });
  }

  return NextResponse.json({ data });
}
