/**
 * Importa tabla Vimeo Stats de Airtable → Supabase (tabla: vimeo_stats)
 * Uso: npm run import:vimeo
 *
 * ANTES: ejecuta scripts/create-vimeo-table.sql en el Supabase SQL Editor
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblYMz4Ql4j6akQ7b"; // Vimeo Stats

type AirtableRecord = { id: string; fields: Record<string, unknown> };

function str(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}
function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function ts(v: unknown): string | null {
  if (!v || typeof v !== "string") return null;
  return v;
}

async function fetchAll(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE_ID}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
    });
    const data = await res.json() as { records: AirtableRecord[]; offset?: string };
    records.push(...data.records);
    offset = data.offset;
    if (offset) process.stdout.write(`  Descargados ${records.length}...\r`);
  } while (offset);
  return records;
}

async function main() {
  console.log("🎬 Importando Vimeo Stats → Supabase\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const airtableRecords = await fetchAll();
  console.log(`📋 ${airtableRecords.length} registros en Airtable`);

  const records = airtableRecords.map((r) => {
    const f = r.fields;
    return {
      airtable_id:                r.id,
      video_url:                  str(f["Video URL"]),
      video_title:                str(f["Video title"]),
      video_upload_date:          ts(str(f["Video upload date"])),
      views:                      num(f["Views"]),
      impressions:                num(f["Impressions"]),
      unique_impressions:         num(f["Unique Impressions"]),
      unique_viewers:             num(f["Unique Viewers"]),
      total_time_watched_seconds: num(f["Total time watched (seconds)"]),
      avg_time_watched_seconds:   num(f["Avg. time watched (seconds)"]),
      avg_pct_watched:            num(f["Avg. % watched"]),
      finishes:                   num(f["Finishes"]),
      downloads:                  num(f["Downloads"]),
      likes:                      num(f["Likes"]),
      comments:                   num(f["Comments"]),
      tiempo_reproduccion_min:    num(f["Tiempo de reproducción (Min)"]),
      categoria:                  str(f["Seleccionar"]),
      pct_reproduccion:           num(f["% Reproducción"]),
      modulo:                     str(f["Módulo/ Semana"]),
      creada:                     ts(str(f["Creada"])),
    };
  });

  let total = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("vimeo_stats" as any) as any)
      .upsert(batch, { onConflict: "airtable_id" });
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error("  Hint: ¿Ejecutaste create-vimeo-table.sql en Supabase?");
      process.exit(1);
    }
    total += batch.length;
    console.log(`  Importados ${total}/${records.length}...`);
  }

  const porCategoria: Record<string, number> = {};
  for (const r of records) {
    const c = r.categoria ?? "Sin categoría";
    porCategoria[c] = (porCategoria[c] ?? 0) + 1;
  }
  const totalViews = records.reduce((s, r) => s + (r.views ?? 0), 0);
  const totalMinutos = records.reduce((s, r) => s + (r.tiempo_reproduccion_min ?? 0), 0);

  console.log(`\n🎉 ${total} vídeos importados`);
  for (const [cat, cnt] of Object.entries(porCategoria)) {
    console.log(`   📹 ${cnt} en "${cat}"`);
  }
  console.log(`   👁  ${totalViews} vistas totales`);
  console.log(`   ⏱  ${Math.round(totalMinutos)} minutos totales reproducidos`);
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
