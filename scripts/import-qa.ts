/**
 * Importa tabla Sesiones Q&A de Airtable → Supabase (tabla: qa_consultas)
 * Uso: npm run import:qa
 *
 * ANTES: ejecuta scripts/create-qa-table.sql en el Supabase SQL Editor
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblvFoR0mFSrhFcFe"; // Sesiones Q&A

type AirtableAttachment = { url: string; filename: string; type: string; thumbnails?: { large?: { url: string } } };
type AirtableRecord = { id: string; createdTime: string; fields: Record<string, unknown> };

function str(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
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
  } while (offset);
  return records;
}

async function main() {
  console.log("❓ Importando Q&A Consultas → Supabase\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const airtableRecords = await fetchAll();
  console.log(`📋 ${airtableRecords.length} registros en Airtable`);

  const records = airtableRecords.map((r) => {
    const f = r.fields;
    const attachments = (f["Attachments"] as AirtableAttachment[] | undefined) ?? [];
    const firstAtt = attachments[0];

    return {
      airtable_id:       r.id,
      nombre:            str(f["Name"]),
      email:             str(f["Correo electrónico"]),
      consulta:          str(f["Consulta"]),
      loom_url:          str(f["Loom"]),
      attachment_url:    firstAtt?.url ?? null,
      attachment_thumb:  firstAtt?.thumbnails?.large?.url ?? null,
      attachment_nombre: firstAtt?.filename ?? null,
      status:            str(f["Status"]) ?? "Pendiente",
      creada:            str(f["Creada"]) ?? new Date(r.createdTime).toISOString(),
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("qa_consultas" as any) as any)
    .upsert(records, { onConflict: "airtable_id" });

  if (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error("  Hint: ¿Ejecutaste create-qa-table.sql en Supabase?");
    process.exit(1);
  }

  const porStatus: Record<string, number> = {};
  for (const r of records) {
    porStatus[r.status] = (porStatus[r.status] ?? 0) + 1;
  }

  console.log(`\n🎉 ${records.length} consultas importadas`);
  for (const [s, n] of Object.entries(porStatus)) {
    console.log(`   · ${s}: ${n}`);
  }
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
