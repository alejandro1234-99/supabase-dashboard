/**
 * Importa feedback desde un archivo CSV exportado de Google Sheets
 * Uso: npm run import:feedback-csv -- --file="ruta/al/archivo.csv" --semana=0 --edicion=1
 *
 * Ejemplo:
 *   npm run import:feedback-csv -- --file="/Users/alejandro/Downloads/Semana 1 (respuestas) - Semana 0 .csv" --semana=0 --edicion=1
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v];
  })
);

const filePath = args.file;
const semana = parseInt(args.semana ?? "");
const edicion = parseInt(args.edicion ?? "1");

if (!filePath || isNaN(semana)) {
  console.error("❌ Uso: npm run import:feedback-csv -- --file=\"ruta.csv\" --semana=0 --edicion=1");
  process.exit(1);
}

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split("\n").filter((l) => l.trim());
  const headers: string[] = [];
  const rows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    if (i === 0) {
      headers.push(...cells);
    } else {
      if (cells.length > 0 && cells[0].trim()) rows.push(cells);
    }
  }
  return { headers, rows };
}

function splitCSVLine(line: string): string[] {
  const cells: string[] = [];
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
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseTimestamp(v: string): string | null {
  if (!v) return null;
  // "13/11/2025 17:23:44"
  if (v.includes("/")) {
    const [datePart, timePart] = v.trim().split(" ");
    const [day, month, year] = datePart.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart ?? "00:00:00"}Z`;
  }
  return null;
}

async function main() {
  console.log(`📂 Leyendo: ${filePath}`);
  console.log(`📋 Edición: ${edicion} | Semana: ${semana}\n`);

  const content = readFileSync(filePath, "utf-8");
  const { headers, rows } = parseCSV(content);
  const numCols = headers.length;

  console.log(`Columnas (${numCols}):`);
  headers.forEach((h, i) => console.log(`  [${i}] ${h.slice(0, 80)}`));
  console.log(`\nFilas encontradas: ${rows.length}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const records = [];
  let skipped = 0;

  for (const cells of rows) {
    const rawTs = cells[0];
    const submitted_at = parseTimestamp(rawTs);
    if (!submitted_at) { skipped++; continue; }

    const rating = parseInt(cells[1]);
    if (isNaN(rating) || rating < 1 || rating > 5) { skipped++; continue; }

    const respuesta_util = cells[2] || null;
    const mejora_sugerida = cells[numCols - 1] || null;

    // Middle columns → respuestas_extra
    const respuestas_extra: Record<string, string | null> = {};
    for (let i = 3; i < numCols - 1; i++) {
      const key = headers[i].slice(0, 80);
      respuestas_extra[key] = cells[i] || null;
    }

    const tsDigits = rawTs.replace(/\D/g, "");
    const form_response_id = `e${edicion}-s${semana}-${tsDigits}`;

    records.push({
      edicion,
      semana,
      submitted_at,
      rating,
      respuesta_util,
      mejora_sugerida,
      respuestas_extra: Object.keys(respuestas_extra).length > 0 ? respuestas_extra : null,
      form_response_id,
    });
  }

  console.log(`\n✅ Registros válidos: ${records.length}`);
  if (skipped > 0) console.log(`⚠️  Saltados: ${skipped}`);

  if (records.length === 0) {
    console.log("Nada que importar.");
    return;
  }

  // Upsert in batches of 200
  let total = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("course_feedback" as any) as any)
      .upsert(batch, { onConflict: "form_response_id" });
    if (error) { console.error(`❌ Error en batch ${i}: ${error.message}`); continue; }
    total += batch.length;
    console.log(`  Importados ${total}/${records.length}...`);
  }

  console.log(`\n🎉 Total importado: ${total} respuestas (Ed.${edicion} Semana ${semana})`);
}

main().catch((err) => { console.error("Error fatal:", err.message); process.exit(1); });
