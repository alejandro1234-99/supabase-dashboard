import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getEmailToUserIdMap } from "@/lib/auth-users-cache";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tags = searchParams.get("tags");
  const caso_exito = searchParams.get("caso_exito");
  const search = searchParams.get("search")?.trim() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 30;
  const from = (page - 1) * pageSize;

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from("alumnos") as any)
    .select("*", { count: "exact" })
    .order("fecha_union", { ascending: false })
    .range(from, from + pageSize - 1);

  if (tags) query = query.ilike("tags", `%${tags}%`);
  if (caso_exito) query = query.eq("caso_exito", caso_exito);
  if (search) query = query.or(`nombre_completo.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Incluir compradores de purchase_approved que no estén en alumnos
  if (search) {
    const alumnoEmails = new Set(
      ((data ?? []) as { email: string | null }[]).map((r) => r.email?.toLowerCase()).filter(Boolean)
    );

    const { data: allAlumnoEmails } = await sb
      .from("alumnos")
      .select("email");
    const allAlumnoEmailSet = new Set(
      ((allAlumnoEmails ?? []) as { email: string | null }[]).map((r) => r.email?.toLowerCase()).filter(Boolean)
    );

    const { data: purchases } = await sb
      .from("purchase_approved")
      .select("id, nombre_completo, correo_electronico, edicion")
      .neq("status", "Rembolsado")
      .or(`nombre_completo.ilike.%${search}%,correo_electronico.ilike.%${search}%`)
      .limit(10);

    const newFromPurchases = ((purchases ?? []) as {
      id: string;
      nombre_completo: string | null;
      correo_electronico: string | null;
      edicion: string | null;
    }[])
      .filter((p) => p.correo_electronico && !allAlumnoEmailSet.has(p.correo_electronico.toLowerCase()))
      .filter((p) => !alumnoEmails.has(p.correo_electronico?.toLowerCase() ?? ""))
      .map((p) => ({
        id: p.id,
        nombre_completo: p.nombre_completo,
        email: p.correo_electronico,
        tags: p.edicion ?? null,
        caso_exito: null,
        _from_purchases: true,
      }));

    if (newFromPurchases.length > 0) {
      (data as unknown[]).push(...newFromPurchases);
    }

    // También buscar en `profiles` (plataforma Revolutia). Devuelve usuarios
    // que entraron por la plataforma nueva y todavía no están en `alumnos`.
    const emailToUserId = await getEmailToUserIdMap();
    const userIdToEmail: Record<string, string> = {};
    for (const [email, uid] of Object.entries(emailToUserId)) userIdToEmail[uid] = email;

    const matchingUserIdsByEmail = Object.entries(emailToUserId)
      .filter(([email]) => email.includes(search.toLowerCase()))
      .map(([, uid]) => uid);

    const { data: profilesByName } = await sb
      .from("profiles")
      .select("user_id, name, avatar_url, cohort, is_test_account")
      .ilike("name", `%${search}%`)
      .limit(20);

    const profileUserIds = new Set<string>([
      ...matchingUserIdsByEmail,
      ...(((profilesByName ?? []) as { user_id: string }[]).map((p) => p.user_id)),
    ]);

    let profilesData: { user_id: string; name: string | null; avatar_url: string | null; cohort: string | null; is_test_account: boolean }[] = [];
    if (profileUserIds.size > 0) {
      const { data: profilesFull } = await sb
        .from("profiles")
        .select("user_id, name, avatar_url, cohort, is_test_account")
        .in("user_id", Array.from(profileUserIds));
      profilesData = (profilesFull ?? []) as typeof profilesData;
    }

    const newFromPlatform = profilesData
      .filter((p) => !p.is_test_account)
      .map((p) => ({
        user_id: p.user_id,
        email: userIdToEmail[p.user_id] ?? null,
        name: p.name,
        avatar_url: p.avatar_url,
        cohort: p.cohort,
      }))
      .filter((p) => p.email && !allAlumnoEmailSet.has(p.email.toLowerCase()))
      .filter((p) => !alumnoEmails.has(p.email!.toLowerCase()))
      .filter((p, i, arr) => arr.findIndex((x) => x.email === p.email) === i)
      .map((p) => ({
        id: p.user_id,
        nombre_completo: p.name,
        email: p.email,
        tags: p.cohort,
        caso_exito: null,
        avatar_url: p.avatar_url,
        _from_platform: true,
      }));

    if (newFromPlatform.length > 0) {
      (data as unknown[]).push(...newFromPlatform);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allData } = await (supabase.from("alumnos" as any) as any)
    .select("tags, caso_exito, tipo_exito, conexiones_circle, posts_publicados, comentarios_totales, localizacion");

  const all = (allData ?? []) as {
    tags: string | null;
    caso_exito: string | null;
    tipo_exito: string | null;
    conexiones_circle: number | null;
    posts_publicados: number | null;
    comentarios_totales: number | null;
    localizacion: string | null;
  }[];

  const total = all.length;
  const casosExito = all.filter((r) => r.caso_exito === "Sí").length;
  const conActividad = all.filter((r) => (r.posts_publicados ?? 0) > 0 || (r.comentarios_totales ?? 0) > 0).length;
  const totalPosts = all.reduce((s, r) => s + (r.posts_publicados ?? 0), 0);
  const totalComentarios = all.reduce((s, r) => s + (r.comentarios_totales ?? 0), 0);
  const avgConexiones = total > 0
    ? parseFloat((all.reduce((s, r) => s + (r.conexiones_circle ?? 0), 0) / total).toFixed(1))
    : 0;

  // Por tags
  const tagsMap: Record<string, number> = {};
  for (const r of all) {
    if (r.tags) {
      r.tags.split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => {
        tagsMap[t] = (tagsMap[t] ?? 0) + 1;
      });
    }
  }
  const porTags = Object.entries(tagsMap).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);

  // Por tipo de éxito
  const exitoMap: Record<string, number> = {};
  for (const r of all.filter((r) => r.caso_exito === "Sí")) {
    const t = r.tipo_exito ?? "Sin tipo";
    exitoMap[t] = (exitoMap[t] ?? 0) + 1;
  }
  const porTipoExito = Object.entries(exitoMap).map(([tipo, count]) => ({ tipo, count })).sort((a, b) => b.count - a.count);

  // Top localización (país/ciudad)
  const locMap: Record<string, number> = {};
  for (const r of all) {
    if (r.localizacion) {
      const parts = r.localizacion.split(",");
      const country = parts[parts.length - 1]?.trim();
      if (country) locMap[country] = (locMap[country] ?? 0) + 1;
    }
  }
  const porPais = Object.entries(locMap).map(([pais, count]) => ({ pais, count })).sort((a, b) => b.count - a.count).slice(0, 8);

  const allTags = [...new Set(
    all.flatMap((r) => (r.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean))
  )].sort();

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    stats: { total, casosExito, conActividad, totalPosts, totalComentarios, avgConexiones },
    porTags,
    porTipoExito,
    porPais,
    allTags,
  });
}
