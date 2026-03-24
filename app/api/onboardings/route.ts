import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const edicion = searchParams.get("edicion") || "";

  const supabase = createAdminClient();

  const VALID_EDICIONES = ["Enero 2026", "Febrero 2026", "Marzo 2026"];

  // Onboarding data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let obQuery = (supabase.from("onboarding" as any) as any)
    .select("*");
  if (edicion) obQuery = obQuery.eq("edicion", edicion);
  else obQuery = obQuery.in("edicion", VALID_EDICIONES);
  const { data: obData, error: obError } = await obQuery;
  if (obError) return NextResponse.json({ error: obError.message }, { status: 500 });

  // Purchase approved data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let paQuery = (supabase.from("purchase_approved" as any) as any)
    .select("*");
  if (edicion) paQuery = paQuery.eq("edicion", edicion);
  else paQuery = paQuery.in("edicion", VALID_EDICIONES);
  const { data: paData, error: paError } = await paQuery;
  if (paError) return NextResponse.json({ error: paError.message }, { status: 500 });

  const onboardings = obData ?? [];
  const ventas = paData ?? [];

  // Stats — unique by email
  const ventasEmails = ventas.map((r: { correo_electronico: string }) => (r.correo_electronico ?? "").toLowerCase()).filter(Boolean);
  const ventasUnicas = new Set(ventasEmails).size;
  const ventasDuplicados = ventas.length - ventasUnicas;

  const obEmails = onboardings.map((r: { email: string }) => (r.email ?? "").toLowerCase()).filter(Boolean);
  const onboardingsUnicos = new Set(obEmails).size;
  const onboardingsDuplicados = onboardings.length - onboardingsUnicos;

  const totalVentas = ventasUnicas;
  const totalOnboardings = onboardingsUnicos;
  const contratoEnviado = onboardings.filter((r: { contrato_enviado: boolean }) => r.contrato_enviado).length;
  const contratoFirmado = onboardings.filter((r: { contrato_firmado: boolean }) => r.contrato_firmado).length;
  const accesoEnviado = onboardings.filter((r: { acceso_enviado: boolean }) => r.acceso_enviado).length;
  const facturaEnviada = onboardings.filter((r: { factura_enviada: boolean }) => r.factura_enviada).length;

  // Riesgo reembolso
  const riesgoMap: Record<string, number> = {};
  onboardings.forEach((r: { riesgo_reembolso: string | null }) => {
    const risk = r.riesgo_reembolso || "Sin evaluar";
    riesgoMap[risk] = (riesgoMap[risk] ?? 0) + 1;
  });

  // Avatar types
  const avatarMap: Record<string, number> = {};
  onboardings.forEach((r: { tipo_avatar: string | null }) => {
    const av = r.tipo_avatar || "Sin asignar";
    avatarMap[av] = (avatarMap[av] ?? 0) + 1;
  });

  // Ventas sin onboarding (by email)
  const obEmailSet = new Set(onboardings.map((r: { email: string }) => (r.email ?? "").toLowerCase()).filter(Boolean));
  const ventasSinOnboarding = [...new Set(ventasEmails)].filter((e) => !obEmailSet.has(e)).length;

  // Edad media
  const edades = onboardings.map((r: { edad: number | null }) => r.edad).filter((e: number | null): e is number => e != null && e > 0);
  const edadMedia = edades.length > 0 ? parseFloat((edades.reduce((s: number, e: number) => s + e, 0) / edades.length).toFixed(1)) : 0;

  // Reembolsos
  const reembolsosSolicitados = ventas.filter((r: { status: string }) =>
    r.status?.toLowerCase().includes("solicita") || r.status === "Rembolsado"
  ).length;
  const reembolsosEjecutados = ventas.filter((r: { status: string }) => r.status === "Rembolsado").length;

  // Dias entre acceso y solicitud de reembolso
  const diasReembolso: number[] = [];
  const obByEmail: Record<string, string> = {};
  onboardings.forEach((r: { email: string; fecha_accesos: string | null }) => {
    if (r.email && r.fecha_accesos) obByEmail[r.email.toLowerCase()] = r.fecha_accesos;
  });
  ventas.forEach((r: { correo_electronico: string; fecha_reembolso: string | null; status: string }) => {
    if (!r.fecha_reembolso) return;
    if (!r.status?.toLowerCase().includes("solicita") && r.status !== "Rembolsado") return;
    const email = (r.correo_electronico ?? "").toLowerCase();
    const fechaAcceso = obByEmail[email];
    if (fechaAcceso) {
      const dias = Math.round((new Date(r.fecha_reembolso).getTime() - new Date(fechaAcceso).getTime()) / 86400000);
      if (dias >= 0) diasReembolso.push(dias);
    }
  });
  const mediaDiasReembolso = diasReembolso.length > 0
    ? parseFloat((diasReembolso.reduce((s, d) => s + d, 0) / diasReembolso.length).toFixed(1))
    : null;

  // ── Inferir sexo por nombre ──
  const FEMALE_NAMES = new Set(["maria","ana","laura","carmen","isabel","marta","lucia","elena","rosa","paula","sara","cristina","andrea","sofia","patricia","natalia","raquel","pilar","lorena","silvia","monica","beatriz","irene","alicia","susana","rocio","nuria","carolina","claudia","diana","alba","eva","olga","ines","julia","nerea","lidia","esther","angeles","margarita","consuelo","jessica","gabriela","alejandra","erika","nathalie","victoria","sandra","valeria","daniela","veronica","adriana","guadalupe","teresa","yolanda","lourdes","amparo","gloria","mercedes","inmaculada","manuela","josefa","dolores","luisa","angela","antonia","zulma","aleida","soledad","luz","estela","catalina","fernanda","cecilia","araceli","miriam","celia","aurora","laia","aitana","jimena","noa","alma","gala","martina","abril","blanca","carlota","elisa","emma","lola","nora","vera","carla","violeta","judith","ariadna","noelia","rebeca","tamara","vanessa","marina","maribel","ruth","sonia","marian","conchi","chelo","montse","estefania","mariana","fatima","maite","leticia","flor","elsa","paloma","covadonga","begoña","macarena","edith"]);
  const MALE_NAMES = new Set(["jose","antonio","manuel","francisco","david","juan","carlos","jesus","javier","miguel","angel","pedro","rafael","fernando","luis","pablo","sergio","ramon","jorge","daniel","alejandro","alberto","alvaro","andres","diego","enrique","mario","victor","marcos","ivan","raul","oscar","roberto","jaime","eduardo","adrian","hugo","ruben","gabriel","gonzalo","nicolas","martin","tomas","joaquin","felix","emilio","ignacio","agustin","hector","arturo","lucas","guillermo","pascual","alfonso","xavier","samuel","ricardo","cesar","santiago","rodrigo","bernardo","cristian","lautaro","gregorio","dario","matias","felipe","leonardo","julian","gustavo","german","armando","ernesto","greyson","nacho","cristobal","fermin","pau","arnau","alex","marc","pol","joel","iker","aitor","unai","mikel","jon","gorka","asier","borja","omar","salvador","valentin","maximiliano","ismael","fabian","sebastian","lorenzo","esteban","eugenio","blas","patricio","damian","orlando","umberto"]);

  function inferSexo(nombre: string | null): string {
    if (!nombre) return "Desconocido";
    const first = nombre.trim().split(/\s+/)[0].toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (FEMALE_NAMES.has(first)) return "Mujer";
    if (MALE_NAMES.has(first)) return "Hombre";
    // Heuristic: names ending in 'a' are often female in Spanish
    if (first.endsWith("a") && !first.endsWith("ia") && first.length > 2) return "Mujer";
    return "Desconocido";
  }

  // ── Estudio de reembolsos ──
  const reembolsosList = ventas.filter((r: { status: string }) =>
    r.status === "Rembolsado" || r.status?.toLowerCase().includes("solicita")
  ) as { correo_electronico: string; status: string; fecha_compra: string | null; fecha_reembolso: string | null }[];

  const reembolsoEmails = reembolsosList.map((r) => (r.correo_electronico ?? "").toLowerCase()).filter(Boolean);
  const obByEmailMap: Record<string, { tipo_avatar: string | null; riesgo_reembolso: string | null; edad: number | null; contrato_firmado: boolean; fecha_accesos: string | null }> = {};
  onboardings.forEach((r: { email: string; tipo_avatar: string | null; riesgo_reembolso: string | null; edad: number | null; contrato_firmado: boolean; fecha_accesos: string | null }) => {
    if (r.email) obByEmailMap[r.email.toLowerCase()] = r;
  });

  // Avatar breakdown: reembolsos vs total ventas
  const reembolsoAvatarMap: Record<string, number> = {};
  const reembolsoRiesgoMap: Record<string, number> = {};
  const reembolsoEdades: number[] = [];
  const reembolsoDias: number[] = [];
  let reembolsoConContrato = 0;
  let reembolsoSinMatch = 0;

  for (const r of reembolsosList) {
    const email = (r.correo_electronico ?? "").toLowerCase();
    const ob = obByEmailMap[email];
    if (!ob) { reembolsoSinMatch++; continue; }

    const avatar = ob.tipo_avatar || "Sin avatar";
    reembolsoAvatarMap[avatar] = (reembolsoAvatarMap[avatar] ?? 0) + 1;

    const riesgo = ob.riesgo_reembolso || "Sin evaluar";
    reembolsoRiesgoMap[riesgo] = (reembolsoRiesgoMap[riesgo] ?? 0) + 1;

    if (ob.edad && ob.edad > 0) reembolsoEdades.push(ob.edad);
    if (ob.contrato_firmado) reembolsoConContrato++;

    if (ob.fecha_accesos && r.fecha_reembolso) {
      const dias = Math.round((new Date(r.fecha_reembolso).getTime() - new Date(ob.fecha_accesos).getTime()) / 86400000);
      if (dias >= 0) reembolsoDias.push(dias);
    }
  }

  const reembolsoEdadMedia = reembolsoEdades.length > 0
    ? parseFloat((reembolsoEdades.reduce((s, e) => s + e, 0) / reembolsoEdades.length).toFixed(1))
    : null;
  const reembolsoDiasMedia = reembolsoDias.length > 0
    ? parseFloat((reembolsoDias.reduce((s, d) => s + d, 0) / reembolsoDias.length).toFixed(1))
    : null;

  // Compare avatar % in reembolsos vs total
  const totalAvatarMap: Record<string, number> = {};
  onboardings.forEach((r: { tipo_avatar: string | null }) => {
    const av = r.tipo_avatar || "Sin avatar";
    totalAvatarMap[av] = (totalAvatarMap[av] ?? 0) + 1;
  });
  const totalObCount = onboardings.length;

  const reembolsoMatchCount = reembolsosList.length - reembolsoSinMatch;
  const reembolsoAvatarComparison = Object.keys({ ...reembolsoAvatarMap, ...totalAvatarMap }).map((avatar) => {
    const reemb = reembolsoAvatarMap[avatar] ?? 0;
    const total = totalAvatarMap[avatar] ?? 0;
    const tasaReembolso = total > 0 ? ((reemb / total) * 100).toFixed(1) : "0";
    return {
      avatar,
      reembolsos: reemb,
      reembolsosPct: reembolsoMatchCount > 0 ? ((reemb / reembolsoMatchCount) * 100).toFixed(1) : "0",
      totalVentas: total,
      totalPct: totalObCount > 0 ? ((total / totalObCount) * 100).toFixed(1) : "0",
      tasaReembolso,
    };
  });

  // Tasa reembolso por rango de edad
  const AGE_RANGES = ["18-25", "26-35", "36-45", "46-55", "56+", "Sin edad"] as const;
  function getAgeRange(edad: number | null): string {
    if (!edad) return "Sin edad";
    if (edad <= 25) return "18-25";
    if (edad <= 35) return "26-35";
    if (edad <= 45) return "36-45";
    if (edad <= 55) return "46-55";
    return "56+";
  }

  const ageRangeData: Record<string, { total: number; reembolsos: number }> = {};
  for (const r of AGE_RANGES) ageRangeData[r] = { total: 0, reembolsos: 0 };

  // Map all ventas to age ranges via onboarding email
  for (const v of ventas as { correo_electronico: string; status: string }[]) {
    const email = (v.correo_electronico ?? "").toLowerCase();
    const ob = obByEmailMap[email];
    const range = getAgeRange(ob?.edad ?? null);
    ageRangeData[range].total++;
    if (v.status === "Rembolsado" || v.status?.toLowerCase().includes("solicita")) {
      ageRangeData[range].reembolsos++;
    }
  }

  const tasaReembolsoEdad = AGE_RANGES.map((range) => ({
    range,
    total: ageRangeData[range].total,
    reembolsos: ageRangeData[range].reembolsos,
    tasa: ageRangeData[range].total > 0
      ? ((ageRangeData[range].reembolsos / ageRangeData[range].total) * 100).toFixed(1)
      : "0",
  }));

  // Tasa reembolso por campos de perfil
  type ProfileField = { field: string; label: string };
  const PROFILE_FIELDS: ProfileField[] = [
    { field: "nivel_digital", label: "Nivel digital" },
    { field: "nivel_ia", label: "Nivel de IA" },
    { field: "tiempo_semana", label: "Tiempo semanal" },
    { field: "estilo_aprendizaje", label: "Estilo de aprendizaje" },
    { field: "situacion_laboral", label: "Situacion laboral" },
    { field: "motivacion", label: "Motivacion" },
  ];

  const perfilReembolso = PROFILE_FIELDS.map(({ field, label }) => {
    const valueTotal: Record<string, number> = {};
    const valueReemb: Record<string, number> = {};

    for (const v of ventas as { correo_electronico: string; status: string }[]) {
      const email = (v.correo_electronico ?? "").toLowerCase();
      const obFull = onboardings.find((o: { email: string }) => (o.email ?? "").toLowerCase() === email) as Record<string, string | null> | undefined;
      const val = obFull?.[field] || "Sin respuesta";
      // Truncate long values
      const shortVal = val.length > 60 ? val.substring(0, 57) + "..." : val;
      valueTotal[shortVal] = (valueTotal[shortVal] ?? 0) + 1;
      if (v.status === "Rembolsado" || v.status?.toLowerCase().includes("solicita")) {
        valueReemb[shortVal] = (valueReemb[shortVal] ?? 0) + 1;
      }
    }

    const rows = Object.keys(valueTotal)
      .map((val) => {
        const total = valueTotal[val];
        const reemb = valueReemb[val] ?? 0;
        return {
          valor: val,
          total,
          reembolsos: reemb,
          tasa: total > 0 ? ((reemb / total) * 100).toFixed(1) : "0",
        };
      })
      .sort((a, b) => b.total - a.total);

    return { label, rows };
  });

  const estudioReembolsos = {
    total: reembolsosList.length,
    sinMatch: reembolsoSinMatch,
    conContrato: reembolsoConContrato,
    edadMedia: reembolsoEdadMedia,
    diasMedia: reembolsoDiasMedia,
    avatarComparison: reembolsoAvatarComparison,
    tasaReembolsoEdad,
    perfilReembolso,
    tasaReembolsoSexo: (() => {
      const sexoTotal: Record<string, number> = { Hombre: 0, Mujer: 0, Desconocido: 0 };
      const sexoReemb: Record<string, number> = { Hombre: 0, Mujer: 0, Desconocido: 0 };
      for (const v of ventas as { correo_electronico: string; status: string }[]) {
        const email = (v.correo_electronico ?? "").toLowerCase();
        const ob = obByEmailMap[email] as { tipo_avatar: string | null; riesgo_reembolso: string | null; edad: number | null; contrato_firmado: boolean; fecha_accesos: string | null } & { nombre?: string } | undefined;
        // Need nombre - fetch from onboardings
        const obFull = onboardings.find((o: { email: string }) => (o.email ?? "").toLowerCase() === email) as { nombre: string | null } | undefined;
        const sexo = inferSexo(obFull?.nombre ?? null);
        sexoTotal[sexo] = (sexoTotal[sexo] ?? 0) + 1;
        if (v.status === "Rembolsado" || v.status?.toLowerCase().includes("solicita")) {
          sexoReemb[sexo] = (sexoReemb[sexo] ?? 0) + 1;
        }
      }
      return ["Hombre", "Mujer", "Desconocido"]
        .filter((s) => (sexoTotal[s] ?? 0) > 0)
        .map((sexo) => ({
          sexo,
          total: sexoTotal[sexo] ?? 0,
          reembolsos: sexoReemb[sexo] ?? 0,
          tasa: (sexoTotal[sexo] ?? 0) > 0 ? (((sexoReemb[sexo] ?? 0) / sexoTotal[sexo]) * 100).toFixed(1) : "0",
        }));
    })(),
    tasaReembolsoRiesgo: (() => {
      const RISK_ORDER = ["BAJO", "MEDIO", "ALTO", "Sin evaluar"];
      const totalRiesgoMap: Record<string, number> = {};
      onboardings.forEach((r: { riesgo_reembolso: string | null }) => {
        const risk = r.riesgo_reembolso || "Sin evaluar";
        totalRiesgoMap[risk] = (totalRiesgoMap[risk] ?? 0) + 1;
      });
      return RISK_ORDER
        .filter((r) => (totalRiesgoMap[r] ?? 0) > 0 || (reembolsoRiesgoMap[r] ?? 0) > 0)
        .map((risk) => {
          const total = totalRiesgoMap[risk] ?? 0;
          const reemb = reembolsoRiesgoMap[risk] ?? 0;
          return {
            riesgo: risk,
            total,
            reembolsos: reemb,
            tasa: total > 0 ? ((reemb / total) * 100).toFixed(1) : "0",
          };
        });
    })(),
  };

  // ── 3. Estudio reembolsos vs Mkt (leads) ──
  // Fetch ALL leads to match by email across editions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allLeads = await (async () => {
    const PAGE = 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all: any[] = [];
    let from = 0;
    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("leads" as any) as any)
        .select("email, funnel, test, medium, campaign, edicion")
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all as { email: string | null; funnel: string | null; test: string | null; medium: string | null; campaign: string | null; edicion: string | null }[];
  })();

  const leadByEmail: Record<string, { funnel: string | null; medium: string | null; campaign: string | null; test: string | null }> = {};
  for (const l of allLeads) {
    if (l.email) leadByEmail[l.email.toLowerCase()] = l;
  }

  // Classify lead source
  function classifyLeadSource(lead: { funnel: string | null; medium: string | null; test: string | null }): string {
    const funnel = (lead.funnel ?? "").toLowerCase();
    const medium = (lead.medium ?? "").toLowerCase();
    const test = (lead.test ?? "").toLowerCase();
    if (funnel === "ca") return "Paid";
    if (medium.includes("worldcast") || medium.includes("vidascontadas")) return "Afiliados";
    const om = ["winstagram", "wtiktok", "wyoutube", "bio", "leadmagnetx", "home", "winstagramrevolutia"];
    const ot = ["tiktok", "youtube", "instagram", "ig", "home", "fb", "fb_ad", "worldcast"];
    if (om.includes(medium) || medium.startsWith("reelp") || ot.includes(test)) return "Organico";
    if (medium) return "Organico";
    if (test === "bbdd" || test === "waitlist" || test === "com_anteriores" || test.startsWith("email")) return "Organico";
    return "Untracked";
  }

  function classifyMktAvatar(lead: { campaign: string | null }): string {
    const campaign = (lead.campaign ?? "").toUpperCase();
    if (campaign.includes("AV2")) return "AV2";
    if (campaign.includes("AV1")) return "AV1";
    if (campaign.includes("AV0") || campaign.includes("AVO")) return "AV0";
    return "Sin avatar MKT";
  }

  // Build mkt reembolso analysis
  const mktFuenteTotal: Record<string, number> = {};
  const mktFuenteReemb: Record<string, number> = {};
  const mktAvatarTotal: Record<string, number> = {};
  const mktAvatarReemb: Record<string, number> = {};
  let mktMatchCount = 0;
  let mktNoMatch = 0;

  for (const v of ventas as { correo_electronico: string; status: string }[]) {
    const email = (v.correo_electronico ?? "").toLowerCase();
    const lead = leadByEmail[email];
    const isReemb = v.status === "Rembolsado" || v.status?.toLowerCase().includes("solicita");

    if (!lead) {
      mktNoMatch++;
      const src = "Sin lead";
      mktFuenteTotal[src] = (mktFuenteTotal[src] ?? 0) + 1;
      if (isReemb) mktFuenteReemb[src] = (mktFuenteReemb[src] ?? 0) + 1;
      continue;
    }

    mktMatchCount++;
    const src = classifyLeadSource(lead);
    mktFuenteTotal[src] = (mktFuenteTotal[src] ?? 0) + 1;
    if (isReemb) mktFuenteReemb[src] = (mktFuenteReemb[src] ?? 0) + 1;

    if (src === "Paid") {
      const av = classifyMktAvatar(lead);
      mktAvatarTotal[av] = (mktAvatarTotal[av] ?? 0) + 1;
      if (isReemb) mktAvatarReemb[av] = (mktAvatarReemb[av] ?? 0) + 1;
    }
  }

  const mktFuente = Object.keys(mktFuenteTotal).map((src) => ({
    fuente: src,
    total: mktFuenteTotal[src],
    reembolsos: mktFuenteReemb[src] ?? 0,
    tasa: mktFuenteTotal[src] > 0 ? (((mktFuenteReemb[src] ?? 0) / mktFuenteTotal[src]) * 100).toFixed(1) : "0",
  })).sort((a, b) => b.total - a.total);

  const ORDER_AV = ["AV0", "AV1", "AV2", "Sin avatar MKT"];
  const mktAvatar = Object.keys({ ...mktAvatarTotal })
    .sort((a, b) => (ORDER_AV.indexOf(a) === -1 ? 99 : ORDER_AV.indexOf(a)) - (ORDER_AV.indexOf(b) === -1 ? 99 : ORDER_AV.indexOf(b)))
    .map((av) => ({
      avatar: av,
      total: mktAvatarTotal[av] ?? 0,
      reembolsos: mktAvatarReemb[av] ?? 0,
      tasa: (mktAvatarTotal[av] ?? 0) > 0 ? (((mktAvatarReemb[av] ?? 0) / mktAvatarTotal[av]) * 100).toFixed(1) : "0",
    }));

  const estudioMkt = { mktFuente, mktAvatar, matchCount: mktMatchCount, noMatch: mktNoMatch };

  return NextResponse.json({
    onboardings,
    ventas,
    stats: {
      totalVentas,
      totalOnboardings,
      ventasDuplicados,
      onboardingsDuplicados,
      ventasSinOnboarding,
      contratoEnviado,
      contratoFirmado,
      accesoEnviado,
      facturaEnviada,
      edadMedia,
      reembolsosSolicitados,
      reembolsosEjecutados,
      mediaDiasReembolso,
    },
    riesgoMap,
    avatarMap,
    estudioReembolsos,
    estudioMkt,
  });
}

// PATCH: vincular/desvincular onboarding con venta
export async function PATCH(req: NextRequest) {
  const { onboardingId, newEmail, unlink } = await req.json();
  if (!onboardingId) return NextResponse.json({ error: "onboardingId requerido" }, { status: 400 });

  const supabase = createAdminClient();

  if (unlink) {
    // Restore original email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ob } = await (supabase.from("onboarding" as any) as any)
      .select("email_original")
      .eq("id", onboardingId)
      .single();

    if (!ob?.email_original) return NextResponse.json({ error: "No hay email original para restaurar" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("onboarding" as any) as any)
      .update({ email: ob.email_original, email_original: null })
      .eq("id", onboardingId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!newEmail) return NextResponse.json({ error: "newEmail requerido" }, { status: 400 });

  // Save original email before overwriting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ob } = await (supabase.from("onboarding" as any) as any)
    .select("email, email_original")
    .eq("id", onboardingId)
    .single();

  const updates: Record<string, string | null> = { email: newEmail };
  // Only save original if not already saved (don't overwrite a previous original)
  if (!ob?.email_original) {
    updates.email_original = ob?.email ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("onboarding" as any) as any)
    .update(updates)
    .eq("id", onboardingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
