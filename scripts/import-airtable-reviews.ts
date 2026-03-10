/**
 * Importa las reviews de la tabla "Truspilot" de Airtable a Supabase
 * Solo inserta las que no existen ya (compara por reviewer_name + review_date)
 * Uso: npm run import:airtable-reviews
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblgSEINce6gfkD9y"; // "Truspilot" table

type AirtableRecord = {
  id: string;
  fields: {
    Nombre?: string;
    "Número de reseña"?: number;
    Puntuación?: number;
    Fecha?: string;
    "Comentario en la reseña"?: string;
    Seleccionar?: string;
  };
};

async function fetchAllAirtable(): Promise<AirtableRecord[]> {
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
  console.log("📥 Sincronizando reviews de Airtable → Supabase\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Delete all at- records (previous bad import)
  console.log("🧹 Eliminando importación previa de Airtable...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delError } = await (supabase.from("trustpilot_reviews" as any) as any)
    .delete()
    .like("trustpilot_id", "at-%");
  if (delError) { console.error("❌ Error borrando:", delError.message); process.exit(1); }

  // Step 2: Fetch existing Trustpilot scraped reviews (key: name + date)
  console.log("📊 Cargando reviews existentes de Trustpilot...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from("trustpilot_reviews" as any) as any)
    .select("reviewer_name, review_date");
  const existingKeys = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (existing ?? []).map((r: any) => `${r.reviewer_name}|${r.review_date?.slice(0, 10)}`)
  );
  console.log(`  ${existingKeys.size} reviews existentes\n`);

  // Step 3: Fetch all Airtable records
  const airtableRecords = await fetchAllAirtable();
  console.log(`📋 ${airtableRecords.length} registros en Airtable`);

  // Step 4: Find new ones (not in Supabase already)
  const newReviews = airtableRecords
    .filter((r) => r.fields.Puntuación && r.fields.Nombre)
    .map((r) => {
      const dateStr = r.fields.Fecha
        ? new Date(r.fields.Fecha).toISOString()
        : new Date().toISOString();
      return {
        trustpilot_id: `at-${r.id}`,
        reviewer_name: r.fields.Nombre ?? "Anónimo",
        stars: r.fields.Puntuación!,
        review_date: dateStr,
        headline: "",
        review_body: r.fields["Comentario en la reseña"] ?? "",
        _key: `${r.fields.Nombre}|${r.fields.Fecha}`,
      };
    })
    .filter((r) => r.stars >= 1 && r.stars <= 5 && !existingKeys.has(r._key))
    .map(({ _key: _, ...rest }) => rest);

  console.log(`✨ ${newReviews.length} reviews nuevas (no estaban en Trustpilot)\n`);

  if (newReviews.length === 0) {
    console.log("ℹ️  No hay reviews nuevas para añadir.");
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("trustpilot_reviews" as any) as any)
      .insert(newReviews);
    if (error) { console.error("❌ Error insertando:", error.message); process.exit(1); }
    console.log(`✅ ${newReviews.length} reviews añadidas`);
    newReviews.forEach((r) => console.log(`   · ${r.reviewer_name} (${r.stars}★) — ${r.review_date.slice(0, 10)}`));
  }

  // Final count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: total } = await (supabase.from("trustpilot_reviews" as any) as any)
    .select("*", { count: "exact", head: true });
  console.log(`\n🎉 Total en Supabase: ${total} reviews`);
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
