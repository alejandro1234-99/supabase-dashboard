/**
 * Importa tabla Soporte de Airtable → Supabase (tabla: soporte)
 * Uso: npm run import:soporte
 *
 * ANTES: ejecuta scripts/create-soporte-table.sql en el Supabase SQL Editor
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblRjYs36s1od4Oyv"; // Soporte

type AirtableRecord = { id: string; fields: Record<string, unknown> };

function str(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}
function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function bool(v: unknown): boolean | null {
  if (v == null) return null;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return null;
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
  console.log("🎧 Importando Soporte → Supabase\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const airtableRecords = await fetchAll();
  console.log(`📋 ${airtableRecords.length} registros en Airtable`);

  const records = airtableRecords.map((r) => {
    const f = r.fields;
    return {
      airtable_id:        r.id,
      numero_ticket:      num(f["Número de ticket"]),
      fecha:              str(f["Fecha"]),
      alumno:             str(f["Alumno"]),
      consulta:           str(f["Consulta"]),
      tipo_consulta:      str(f["Tipo de consulta"]),
      medio_canal:        str(f["Medio / Canal"]),
      responsable:        str(f["Responsable"]),
      escalado_a:         str(f["Escalado a"]),
      pendiente_escalada: bool(f["Pendientes/ Escalada"]),
      cerrada:            bool(f["Cerradas"]),
      creada:             str(f["Creada"]) ?? new Date(r.createdTime).toISOString(),
    };
  });

  let total = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("soporte" as any) as any)
      .upsert(batch, { onConflict: "airtable_id" });
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error("  Hint: ¿Ejecutaste create-soporte-table.sql en Supabase?");
      process.exit(1);
    }
    total += batch.length;
    console.log(`  Importados ${total}/${records.length}...`);
  }

  const cerradas = records.filter((r) => r.cerrada === true).length;
  const pendientes = records.filter((r) => r.pendiente_escalada === true && r.cerrada !== true).length;
  const escaladas = records.filter((r) => r.escalado_a).length;

  const porTipo: Record<string, number> = {};
  for (const r of records) {
    const t = r.tipo_consulta ?? "Sin tipo";
    porTipo[t] = (porTipo[t] ?? 0) + 1;
  }

  console.log(`\n🎉 ${total} tickets importados`);
  console.log(`   ✅ ${cerradas} cerrados`);
  console.log(`   ⏳ ${pendientes} pendientes`);
  console.log(`   🔺 ${escaladas} escalados`);
  console.log(`   Por tipo:`, porTipo);
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
