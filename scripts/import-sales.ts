/**
 * Importa Purchase_approved de Airtable → Supabase (tabla: purchase_approved)
 * Uso: npm run import:sales
 *
 * ANTES: ejecuta scripts/create-sales-table.sql en el Supabase SQL Editor
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblJSQubFBREzoeEe"; // Purchase_approved

type AirtableRecord = {
  id: string;
  fields: {
    "Nombre Completo"?: string;
    "Correo electrónico"?: string;
    "Edición"?: string;
    "Status"?: string;
    "Metodo de pago"?: string;
    "Moneda"?: string;
    "Precio"?: number;
    "Cash Collected"?: number;
    "En reserva"?: number;
    "Comisión Hotmart (incluye 1% seQura)"?: number;
    "Cuotas restantes"?: number;
    "Importe cuotas futuras"?: number;
    "Importe comisiones futuras"?: number;
    "Fecha de compra"?: string;
    "Fecha de solicitud de reembolso"?: string;
    "Date Added"?: string;
    "ID FACTURA"?: string;
    "ID Hotmart"?: string;
    "Nombre del comercial"?: string;
    "Fuente"?: string;
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
  console.log("💰 Importando Purchase_approved → Supabase\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const airtableRecords = await fetchAll();
  console.log(`📋 ${airtableRecords.length} registros en Airtable`);

  const records = airtableRecords.map((r) => ({
    airtable_id:                r.id,
    nombre_completo:            r.fields["Nombre Completo"] ?? null,
    correo_electronico:         r.fields["Correo electrónico"] ?? null,
    edicion:                    r.fields["Edición"] ?? null,
    status:                     r.fields["Status"] ?? null,
    metodo_pago:                r.fields["Metodo de pago"] ?? null,
    moneda:                     r.fields["Moneda"] ?? null,
    precio:                     r.fields["Precio"] ?? null,
    cash_collected:             r.fields["Cash Collected"] ?? null,
    en_reserva:                 r.fields["En reserva"] ?? null,
    comision:                   r.fields["Comisión Hotmart (incluye 1% seQura)"] ?? null,
    cuotas_restantes:           r.fields["Cuotas restantes"] ?? null,
    importe_cuotas_futuras:     r.fields["Importe cuotas futuras"] ?? null,
    importe_comisiones_futuras: r.fields["Importe comisiones futuras"] ?? null,
    fecha_compra:               r.fields["Fecha de compra"] ?? null,
    fecha_reembolso:            r.fields["Fecha de solicitud de reembolso"] ?? null,
    date_added:                 r.fields["Date Added"] ?? null,
    id_factura:                 r.fields["ID FACTURA"] ?? null,
    id_hotmart:                 r.fields["ID Hotmart"] ?? null,
    nombre_comercial:           r.fields["Nombre del comercial"] ?? null,
    fuente:                     r.fields["Fuente"] ?? null,
  }));

  // Upsert en batches de 200
  let total = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("purchase_approved" as any) as any)
      .upsert(batch, { onConflict: "airtable_id" });
    if (error) {
      console.error(`❌ Error en batch ${i}: ${error.message}`);
      console.error("  Hint: ¿Ejecutaste create-sales-table.sql en Supabase?");
      process.exit(1);
    }
    total += batch.length;
    console.log(`  Importados ${total}/${records.length}...`);
  }

  // Resumen
  const ventas = records.filter((r) => r.status !== "Rembolsado");
  const reembolsos = records.filter((r) => r.status === "Rembolsado");
  const ingresos = ventas.reduce((s, r) => s + (r.cash_collected ?? 0), 0);

  console.log(`\n🎉 ${total} registros en Supabase`);
  console.log(`   ✅ ${ventas.length} ventas activas`);
  console.log(`   ↩️  ${reembolsos.length} reembolsados`);
  console.log(`   💶 ${ingresos.toLocaleString("es-ES", { style: "currency", currency: "EUR" })} cobrados`);
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
