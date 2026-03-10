/**
 * Script de migración Airtable → Supabase
 *
 * Uso:
 *   npx tsx scripts/migrate-airtable.ts
 *
 * Configura las tablas a migrar en el array TABLES_TO_MIGRATE.
 * Cada tabla de Airtable debe tener su tabla equivalente en Supabase
 * con una columna "airtable_id TEXT UNIQUE".
 */

import Airtable from "airtable";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Define aquí el mapeo de tablas Airtable → Supabase
 * airtableTable: nombre exacto de la tabla en Airtable
 * supabaseTable: nombre de la tabla en Supabase (debe existir previamente)
 */
const TABLES_TO_MIGRATE = [
  { airtableTable: "Tabla1", supabaseTable: "tabla1" },
  { airtableTable: "Tabla2", supabaseTable: "tabla2" },
  // Añade más tablas aquí...
];
// ─────────────────────────────────────────────────────────────────────────────

async function migrateTable(
  base: Airtable.Base,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  airtableTable: string,
  supabaseTable: string
) {
  console.log(`\n📋 Migrando: ${airtableTable} → ${supabaseTable}`);

  const records: Record<string, unknown>[] = [];

  try {
    await base(airtableTable)
      .select({ pageSize: 100 })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          // Normaliza los nombres de campo a snake_case
          const fields: Record<string, unknown> = { airtable_id: record.id };
          for (const [key, value] of Object.entries(record.fields)) {
            const normalizedKey = key.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
            fields[normalizedKey] = value;
          }
          records.push(fields);
        });
        fetchNextPage();
      });
  } catch (err) {
    console.error(`  ❌ Error leyendo Airtable: ${(err as Error).message}`);
    return;
  }

  if (records.length === 0) {
    console.log("  ⚠️  Sin registros, saltando...");
    return;
  }

  console.log(`  ✅ ${records.length} registros obtenidos de Airtable`);

  // Insertar en lotes de 100
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error, count } = await supabase
      .from(supabaseTable)
      .upsert(batch, { onConflict: "airtable_id", count: "exact" });

    if (error) {
      console.error(`  ❌ Error en Supabase (lote ${i / BATCH_SIZE + 1}): ${error.message}`);
      break;
    }
    inserted += count ?? batch.length;
  }

  console.log(`  ✅ ${inserted} registros insertados/actualizados en Supabase`);
}

async function main() {
  console.log("🚀 Iniciando migración Airtable → Supabase\n");

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error("❌ Falta AIRTABLE_API_KEY o AIRTABLE_BASE_ID en .env.local");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const { airtableTable, supabaseTable } of TABLES_TO_MIGRATE) {
    await migrateTable(base, supabase, airtableTable, supabaseTable);
  }

  console.log("\n🎉 Migración completada.");
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
