/**
 * Importa Alumnos_ventas (onboarding) de Airtable → Supabase (tabla: onboarding)
 * Uso: npm run import:onboarding
 *
 * ANTES: ejecuta scripts/create-onboarding-table.sql en el Supabase SQL Editor
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblOt77xRItYrjk8c"; // Alumnos_ventas

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

function str(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v[0] != null ? String(v[0]) : null;
  return String(v);
}
function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function bool(v: unknown): boolean {
  return v === true;
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
  console.log("🎓 Importando Alumnos_ventas (onboarding) → Supabase\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const airtableRecords = await fetchAll();
  console.log(`📋 ${airtableRecords.length} registros en Airtable`);

  const records = airtableRecords.map((r) => {
    const f = r.fields;
    return {
      airtable_id:         r.id,
      nombre:              str(f["Nombre"]),
      apellidos:           str(f["Apellidos"]),
      nombre_completo:     str(f["Nombre Completo"]),
      email:               str(f["Email"]),
      telefono:            str(f["Teléfono"]),
      edicion:             str(f["Edición"]),
      edad:                num(f["Edad actual"]),

      tipo_avatar:         str(f["Tipo de avatar"]),
      explicacion_avatar:  str(f["Explicación - Tipo de Avatar"]),
      riesgo_reembolso:    str(f["Riesgo de reembolso"]),
      factores_riesgo:     num(f["Nº de factores de riesgo detectados"]),
      explicacion_riesgo:  str(f["Explicación - Factores de Riesgo"]),

      fecha_registro:      date(str(f["Fecha del Registro"])),
      tipo_facturacion:    str(f["Tipo de facturación"]),
      email_facturacion:   str(f["Email de facturación"]),
      nif:                 str(f["CIF / NIF"]),
      calle:               str(f["Calle"]),
      municipio:           str(f["Municipio"]),
      provincia:           str(f["Provincia"]),
      pais:                str(f["País"]),
      codigo_postal:       str(f["Código postal"]),
      fecha_nacimiento:    date(str(f["Fecha de Nacimiento"])),

      situacion_laboral:   str(f["¿Cuál es tu situación laboral actual?"]),
      nivel_estudios:      str(f["¿Qué nivel de estudios tienes?"]),
      nivel_digital:       str(f["¿Cómo te manejas con herramientas digitales en general?"]),
      nivel_ia:            str(f["¿Cuál dirías que es tu nivel actual en Inteligencia Artificial?"]),
      que_aprender:        str(f["¿Qué crees que vas a aprender principalmente en Revolutia IA Pro?"]),
      motivacion:          str(f["¿Cuál es tu principal motivación para entrar ahora?"]),
      expectativas:        str(f["¿Qué esperas obtener de esta formación?"]),
      tiempo_semana:       str(f["¿Cuánto tiempo real puedes dedicarle a la semana?"]),
      estilo_aprendizaje:  str(f["Cuando aprendes algo nuevo ¿con qué frase te identificas más?"]),
      frenos:              str(f["¿Hay algo que ahora mismo te preocupe o te frene respecto a este proceso?"]),
      merecido_la_pena:    str(f["¿Qué te haría sentir que esta decisión ha merecido la pena dentro de unos meses?"]),

      contrato_enviado:    bool(f["Contrato enviado"]),
      contrato_firmado:    bool(f["Contrato Firmado"]),
      acceso_enviado:      bool(f["Acceso enviado"]),
      factura_enviada:     bool(f["Factura enviada"]),
      fecha_accesos:       date(str(f["Fecha de envío de accesos"])),
      fecha_fin_garantia:  date(str(f["Fecha fin de garantía"])),
      id_contrato:         str(f["ID Contrato"]),
      id_factura:          str(f["ID Factura"]),
    };
  });

  let total = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("onboarding" as any) as any)
      .upsert(batch, { onConflict: "airtable_id" });
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error("  Hint: ¿Ejecutaste create-onboarding-table.sql en Supabase?");
      process.exit(1);
    }
    total += batch.length;
    console.log(`  Importados ${total}/${records.length}...`);
  }

  const conContrato = records.filter((r) => r.contrato_firmado).length;
  const conAcceso = records.filter((r) => r.acceso_enviado).length;
  const avatares: Record<string, number> = {};
  records.forEach((r) => { if (r.tipo_avatar) avatares[r.tipo_avatar] = (avatares[r.tipo_avatar] ?? 0) + 1; });

  console.log(`\n🎉 ${total} alumnos importados`);
  console.log(`   📝 ${conContrato} con contrato firmado`);
  console.log(`   🔑 ${conAcceso} con acceso enviado`);
  console.log(`   👤 Avatares: ${Object.entries(avatares).map(([k, v]) => `${k}(${v})`).join(", ")}`);
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
