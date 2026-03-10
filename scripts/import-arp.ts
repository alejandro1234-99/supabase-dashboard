/**
 * Importa los certificados ARP desde Airtable → Supabase
 * Uso: npm run import:arp
 *
 * ANTES de ejecutar, crea la tabla en Supabase SQL Editor:
 *
 * CREATE TABLE IF NOT EXISTS arp_certificates (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   nombre text NOT NULL,
 *   email text,
 *   aciertos integer NOT NULL,
 *   fallos integer NOT NULL,
 *   porcentaje float NOT NULL,
 *   aprobado boolean GENERATED ALWAYS AS (porcentaje >= 0.7) STORED,
 *   fecha date,
 *   airtable_id text UNIQUE,
 *   created_at timestamptz DEFAULT now()
 * );
 * ALTER TABLE arp_certificates ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "service_role_all" ON arp_certificates
 *   FOR ALL TO service_role USING (true) WITH CHECK (true);
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblPtKlG8vjCqpWiJ";

type AirtableRecord = {
  id: string;
  fields: {
    Nombre?: string;
    "Correo electrónico"?: string;
    Aciertos?: number;
    Fallos?: number;
    "% Aciertos"?: number;
    Fecha?: string;
  };
};

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
  } while (offset);
  return records;
}

async function main() {
  console.log("🎓 Importando Certificados ARP → Supabase\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const airtableRecords = await fetchAll();
  console.log(`📋 ${airtableRecords.length} registros en Airtable`);

  const records = airtableRecords
    .filter((r) => r.fields.Nombre && r.fields.Aciertos !== undefined)
    .map((r) => {
      const aciertos = r.fields.Aciertos ?? 0;
      const fallos = r.fields.Fallos ?? 0;
      const total = aciertos + fallos;
      const porcentaje = total > 0 ? aciertos / total : (r.fields["% Aciertos"] ?? 0);
      return {
        airtable_id: r.id,
        nombre: r.fields.Nombre!,
        email: r.fields["Correo electrónico"] ?? null,
        aciertos,
        fallos,
        porcentaje: parseFloat(porcentaje.toFixed(6)),
        fecha: r.fields.Fecha ?? null,
      };
    });

  console.log(`📤 Insertando ${records.length} certificados...`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (supabase.from("arp_certificates" as any) as any)
    .upsert(records, { onConflict: "airtable_id", count: "exact" });

  if (error) {
    console.error("❌ Error:", error.message);
    console.error("  Hint: ¿Creaste la tabla en Supabase SQL Editor?");
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: total } = await (supabase.from("arp_certificates" as any) as any)
    .select("*", { count: "exact", head: true });

  const passed = records.filter((r) => r.porcentaje >= 0.7).length;
  const avg = records.reduce((s, r) => s + r.porcentaje, 0) / records.length;

  console.log(`\n🎉 Hecho:`);
  console.log(`   ${total} certificados en Supabase`);
  console.log(`   ✅ ${passed} aprobados / ❌ ${records.length - passed} suspensos`);
  console.log(`   📊 Media: ${(avg * 100).toFixed(1)}%`);
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
