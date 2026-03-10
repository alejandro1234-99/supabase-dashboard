/**
 * Importa Agendas de Airtable → Supabase (tabla: agendas)
 * Uso: npm run import:agendas
 *
 * ANTES: ejecuta scripts/create-agendas-table.sql en el Supabase SQL Editor
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblKSJEolpnXbiA06"; // Agendas

type AirtableRecord = {
  id: string;
  fields: {
    "Name"?: string;
    "Nombre"?: string;
    "Número de WhatsApp"?: string;
    "Situación actual"?: string;
    "Objetivo"?: string;
    "Inversión"?: string;
    "Comercial"?: string;
    "Edición"?: string;
    "Fecha de la llamada"?: string;
    "URL Llamada"?: string;
    "No Show"?: boolean;
    "Creada"?: string;
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
    if (offset) process.stdout.write(`  Descargados ${records.length}...\r`);
  } while (offset);
  return records;
}

async function main() {
  console.log("📅 Importando Agendas → Supabase\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const airtableRecords = await fetchAll();
  console.log(`📋 ${airtableRecords.length} registros en Airtable`);

  const records = airtableRecords.map((r) => ({
    airtable_id:      r.id,
    email:            r.fields["Name"] ?? null,
    nombre:           r.fields["Nombre"] ?? null,
    whatsapp:         r.fields["Número de WhatsApp"] ?? null,
    situacion_actual: r.fields["Situación actual"] ?? null,
    objetivo:         r.fields["Objetivo"] ?? null,
    inversion:        r.fields["Inversión"] ?? null,
    comercial:        r.fields["Comercial"] ?? null,
    edicion:          r.fields["Edición"] ?? null,
    fecha_llamada:    r.fields["Fecha de la llamada"] ?? null,
    url_llamada:      r.fields["URL Llamada"] ?? null,
    no_show:          r.fields["No Show"] ?? false,
    creada:           r.fields["Creada"] ?? null,
  }));

  let total = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("agendas" as any) as any)
      .upsert(batch, { onConflict: "airtable_id" });
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error("  Hint: ¿Ejecutaste create-agendas-table.sql en Supabase?");
      process.exit(1);
    }
    total += batch.length;
    console.log(`  Importados ${total}/${records.length}...`);
  }

  const noShows = records.filter((r) => r.no_show).length;
  const conLlamada = records.filter((r) => r.fecha_llamada).length;

  console.log(`\n🎉 ${total} agendas en Supabase`);
  console.log(`   📞 ${conLlamada} con fecha de llamada`);
  console.log(`   ❌ ${noShows} no shows`);
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
