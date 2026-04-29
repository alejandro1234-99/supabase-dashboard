/**
 * Importa leads desde CSVs locales → Supabase (tabla: leads)
 * Uso: npx tsx scripts/import-leads.ts
 *
 * ANTES: crea la tabla leads usando el SQL en setup-leads-db.ts
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Mini cliente REST (evita @supabase/supabase-js — node_modules a veces tiene realtime-js roto)
const restHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

async function restInsert(table: string, rows: object[]): Promise<{ error?: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...restHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) return { error: `${res.status} ${await res.text()}` };
  return {};
}

async function restDeleteEq(table: string, column: string, value: string): Promise<{ count: number; error?: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: "DELETE",
    headers: { ...restHeaders, Prefer: "return=representation,count=exact" },
  });
  if (!res.ok) return { count: 0, error: `${res.status} ${await res.text()}` };
  const data = await res.json();
  return { count: Array.isArray(data) ? data.length : 0 };
}

// CSV files to import
const CSV_FILES = [
  resolve(process.env.HOME!, "Downloads/Leads Registro Marzo 2025 Revolutia - ABR26.csv"),
];

// Edición destino y fecha de corte (excluir hoy: solo hasta ayer inclusive)
const TARGET_EDICION = "Abril 2026";
const CUTOFF_DATE = "2026-04-28"; // máxima fecha aceptada (inclusive)

/**
 * Parse a CSV line handling quoted fields with commas inside
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse various date formats found in the CSVs
 */
function parseDate(raw: string): string | null {
  if (!raw) return null;

  // "January 20, 2026" format
  const longMatch = raw.match(/^(\w+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (longMatch) {
    const months: Record<string, string> = {
      January: "01", February: "02", March: "03", April: "04",
      May: "05", June: "06", July: "07", August: "08",
      September: "09", October: "10", November: "11", December: "12",
    };
    const m = months[longMatch[1]];
    if (m) return `${longMatch[3]}-${m}-${longMatch[2].padStart(2, "0")}`;
  }

  // "28/01/2026" format (DD/MM/YYYY)
  const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`;
  }

  return null;
}

type LeadRow = {
  fecha_registro: string | null;
  nombre: string | null;
  email: string | null;
  avatar: string | null;
  funnel: string | null;
  test: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  external_id: string | null;
  fuente_medio: string | null;
  edicion: string;
};

/**
 * Capitalize first letter: "enero 2026" → "Enero 2026"
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Header name → DB column mapping
 */
const HEADER_MAP: Record<string, keyof LeadRow> = {
  "fecha registrofirst": "fecha_registro",
  "nombre": "nombre",
  "email": "email",
  "avatar": "avatar",
  "medium": "medium",
  "campaing": "campaign",
  "content": "content",
  "term": "term",
  "id": "external_id",
  "fuente_medio": "fuente_medio",
  "edicion": "edicion",
};

function parseFile(filePath: string): LeadRow[] {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());

  // Parse header to build column index map
  const headerCols = parseCsvLine(lines[0]);
  const colMap: Record<string, number> = {};
  let funnelCount = 0;

  headerCols.forEach((h, idx) => {
    const key = h.toLowerCase().trim();
    if (key === "funnel / test") {
      // First occurrence = funnel, second = test
      colMap[funnelCount === 0 ? "funnel" : "test"] = idx;
      funnelCount++;
    } else if (HEADER_MAP[key] && !(key in colMap)) {
      // Only use first occurrence (skip duplicates like Avatar, Fecha)
      colMap[key] = idx;
    }
  });

  console.log("   Columnas detectadas:", Object.keys(colMap).join(", "));

  const get = (cols: string[], key: string): string | null => {
    const idx = colMap[key];
    if (idx === undefined) return null;
    return cols[idx]?.trim() || null;
  };

  const rows: LeadRow[] = [];
  let fixedEmails = 0;
  let skipped = 0;
  let skippedFuture = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);

    let email = get(cols, "email");
    let nombre = get(cols, "nombre");

    // If email is empty but nombre contains an @, it's an email in the wrong column
    if (!email && nombre && nombre.includes("@")) {
      email = nombre;
      nombre = null;
      fixedEmails++;
    }

    if (!email) { skipped++; continue; }

    const fechaRegistro = parseDate(get(cols, "fecha registrofirst") ?? "");

    // Excluir registros del día de hoy (los del lanzamiento aún no cuentan)
    if (fechaRegistro && fechaRegistro > CUTOFF_DATE) { skippedFuture++; continue; }

    const edicionRaw = get(cols, "edicion") ?? TARGET_EDICION;

    rows.push({
      fecha_registro: fechaRegistro,
      nombre,
      email,
      avatar: get(cols, "avatar"),
      funnel: get(cols, "funnel") ?? null,
      test: get(cols, "test") ?? null,
      medium: get(cols, "medium"),
      campaign: get(cols, "campaing"),
      content: get(cols, "content"),
      term: get(cols, "term"),
      external_id: get(cols, "id"),
      fuente_medio: get(cols, "fuente_medio"),
      edicion: capitalize(edicionRaw),
    });
  }

  console.log(`   📧 ${fixedEmails} emails corregidos (estaban en campo nombre)`);
  console.log(`   ⏭️  ${skipped} filas sin email descartadas`);
  console.log(`   📅 ${skippedFuture} filas posteriores a ${CUTOFF_DATE} descartadas (lanzamiento en curso)`);

  return rows;
}

async function deleteEdicion(edicion: string) {
  console.log(`\n🗑️  Borrando leads de "${edicion}"...`);
  const { count, error } = await restDeleteEq("leads", "edicion", edicion);
  if (error) {
    console.error("   ❌ Error borrando:", error);
    return;
  }
  console.log(`   🗑️  ${count} leads de "${edicion}" borrados`);
}

async function main() {
  if (!SUPABASE_KEY) {
    console.error("❌ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  // Delete existing leads of target edition before importing (idempotente)
  await deleteEdicion(TARGET_EDICION);

  let totalInserted = 0;

  for (const filePath of CSV_FILES) {
    console.log(`\n📄 Procesando: ${filePath}`);

    const rows = parseFile(filePath);
    console.log(`   ${rows.length} leads con email encontrados`);

    // Insert in batches of 200
    const BATCH = 200;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await restInsert("leads", batch);

      if (error) {
        console.error(`   ❌ Error en batch ${Math.floor(i / BATCH) + 1}:`, error);
      } else {
        inserted += batch.length;
        process.stdout.write(`   ✅ ${inserted}/${rows.length} insertados\r`);
      }
    }

    console.log(`   ✅ ${inserted} leads insertados`);
    totalInserted += inserted;
  }

  console.log(`\n🎉 Importación completa: ${totalInserted} leads totales`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
