/**
 * Limpieza retroactiva de leads en BD para ediciones historicas.
 *
 * Aplica la misma logica que import-leads.ts pero sobre datos ya en Supabase:
 *   1. Excluir emails del equipo/test interno (+revolutia, prueba@, test@, @whyadsmedia.com, ...).
 *   2. Dedup por (edicion, email) con first-touch-with-fallback:
 *      - Ordenar todas las filas del email por fecha_registro ASC.
 *      - Quedarse con la PRIMERA fila que tenga al menos un campo de tracking poblado.
 *      - Si todas las filas estan vacias, usar la primera.
 *
 * Uso: npx tsx scripts/dedup-leads-historic.ts [--apply]
 *   - Sin --apply: dry-run (solo muestra que pasaria).
 *   - Con --apply: ejecuta los DELETE en Supabase.
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APPLY = process.argv.includes("--apply");

const restHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

const TARGET_EDICIONES = ["Enero 2026", "Febrero 2026", "Marzo 2026"];

type Lead = {
  id: string;
  email: string | null;
  edicion: string | null;
  fecha_registro: string | null;
  funnel: string | null;
  medium: string | null;
  test: string | null;
};

function isTeamOrTestEmail(email: string): boolean {
  const e = email.toLowerCase().trim();
  if (e.includes("+revolutia")) return true;
  if (/^(test|prueba|testing|dev|cretest)\d*@/.test(e)) return true;
  if (/^(intentodetest|thisisatest|revotest|aztest|detest|ivantest)\d*@/.test(e)) return true;
  if (e.endsWith("@whyadsmedia.com")) return true;
  return false;
}

async function fetchAllLeads(edicion: string): Promise<Lead[]> {
  const all: Lead[] = [];
  const PAGE = 5000;
  let from = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/leads?edicion=eq.${encodeURIComponent(edicion)}&select=id,email,edicion,fecha_registro,funnel,medium,test&order=fecha_registro.asc&limit=${PAGE}&offset=${from}`;
    const res = await fetch(url, { headers: restHeaders });
    if (!res.ok) throw new Error(`Fetch ${edicion}: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as Lead[];
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function deleteIds(ids: string[]): Promise<number> {
  // Borrar por chunks (Supabase limita ?in=... por longitud de URL)
  const CHUNK = 200;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const list = chunk.map((id) => `"${id}"`).join(",");
    const url = `${SUPABASE_URL}/rest/v1/leads?id=in.(${list})`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { ...restHeaders, Prefer: "return=representation" },
    });
    if (!res.ok) throw new Error(`Delete chunk: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as Lead[];
    deleted += data.length;
    process.stdout.write(`     borrados ${deleted}/${ids.length}\r`);
  }
  return deleted;
}

async function main() {
  console.log(`Modo: ${APPLY ? "🔥 APPLY (borra en BD)" : "🧪 DRY-RUN (solo muestra)"}\n`);

  let totalToDelete = 0;
  const allIdsToDelete: string[] = [];

  for (const ed of TARGET_EDICIONES) {
    console.log(`\n📋 Edición: ${ed}`);
    const leads = await fetchAllLeads(ed);
    console.log(`   Filas en BD: ${leads.length}`);

    // 1. Marcar para borrar emails de equipo/test
    const teamIds: string[] = [];
    const surviving: Lead[] = [];
    for (const l of leads) {
      const e = (l.email ?? "").toLowerCase().trim();
      if (e && isTeamOrTestEmail(e)) teamIds.push(l.id);
      else surviving.push(l);
    }
    console.log(`   🧪 Emails equipo/test: ${teamIds.length} filas`);

    // 2. Dedup por email (first-touch-with-fallback)
    const byEmail: Record<string, Lead[]> = {};
    for (const l of surviving) {
      const key = (l.email ?? "").toLowerCase().trim();
      if (!key) continue;
      if (!byEmail[key]) byEmail[key] = [];
      byEmail[key].push(l);
    }
    const dupIds: string[] = [];
    for (const list of Object.values(byEmail)) {
      if (list.length <= 1) continue;
      // Ya viene ordenado por fecha_registro ASC desde la query
      const keep = list.find((l) => l.funnel || l.medium || l.test) ?? list[0];
      for (const l of list) {
        if (l.id !== keep.id) dupIds.push(l.id);
      }
    }
    console.log(`   🔁 Duplicados (mismo email): ${dupIds.length} filas`);

    const idsToDelete = [...teamIds, ...dupIds];
    const remainingCount = leads.length - idsToDelete.length;
    console.log(`   ✅ Tras limpieza: ${remainingCount} filas (-${idsToDelete.length})`);
    totalToDelete += idsToDelete.length;
    allIdsToDelete.push(...idsToDelete);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`TOTAL a borrar: ${totalToDelete} filas`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (!APPLY) {
    console.log(`\n💡 Para ejecutar de verdad: npx tsx scripts/dedup-leads-historic.ts --apply`);
    return;
  }

  console.log(`\n🔥 Aplicando DELETE en BD...`);
  const deleted = await deleteIds(allIdsToDelete);
  console.log(`\n   ✅ ${deleted} filas borradas`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
