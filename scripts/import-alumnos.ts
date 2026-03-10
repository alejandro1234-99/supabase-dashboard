/**
 * Importa tabla Alumnos de Airtable → Supabase (tabla: alumnos)
 * Uso: npm run import:alumnos
 *
 * ANTES: ejecuta scripts/create-alumnos-table.sql en el Supabase SQL Editor
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblXmqUhOpssQOpek"; // Alumnos

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
function date(v: unknown): string | null {
  if (!v || typeof v !== "string") return null;
  return v.split("T")[0];
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
  console.log("👥 Importando Alumnos → Supabase\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const airtableRecords = await fetchAll();
  console.log(`📋 ${airtableRecords.length} registros en Airtable`);

  const records = airtableRecords.map((r) => {
    const f = r.fields;
    return {
      airtable_id:          r.id,
      nombre_completo:      str(f["Nombre completo"]),
      email:                str(f["Email"]),
      id_circle:            str(f["ID Circle"]),
      fecha_union:          date(str(f["Fecha de unión"])),
      tags:                 str(f["Tags"]),
      localizacion:         str(f["Localización"]),
      enlace_perfil:        str(f["Enlace al perfil"]),
      pagina_web:           str(f["Página Web"]),
      instagram:            str(f["Instagram"]),
      linkedin:             str(f["LinkedIn"]),
      conexiones_circle:    num(f["Conexiones a Circle"]),
      posts_publicados:     num(f["Post Publicados"]),
      comentarios_totales:  num(f["Comentarios totales"]),
      caso_exito:           str(f["Caso de éxito"]),
      tipo_exito:           str(f["Tipo de éxito"]),
      fecha_caso_exito:     date(str(f["Fecha caso de éxito"])),
      descripcion_exito:    str(f["Descripción caso de éxito"]),
      fuente_caso_exito:    str(f["Fuente caso de éxito"]),
    };
  });

  let total = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("alumnos" as any) as any)
      .upsert(batch, { onConflict: "airtable_id" });
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error("  Hint: ¿Ejecutaste create-alumnos-table.sql en Supabase?");
      process.exit(1);
    }
    total += batch.length;
    console.log(`  Importados ${total}/${records.length}...`);
  }

  const conCircle = records.filter((r) => r.id_circle).length;
  const casosExito = records.filter((r) => r.caso_exito === "Sí").length;
  const conActividad = records.filter((r) => (r.posts_publicados ?? 0) > 0 || (r.comentarios_totales ?? 0) > 0).length;

  console.log(`\n🎉 ${total} alumnos importados`);
  console.log(`   🔵 ${conCircle} con perfil en Circle`);
  console.log(`   ✨ ${casosExito} casos de éxito`);
  console.log(`   📝 ${conActividad} con actividad en Circle`);
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
