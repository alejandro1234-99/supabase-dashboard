/**
 * Importa respuestas de Google Forms (Google Sheets) → Supabase
 * Uso: npm run import:feedback
 *
 * ANTES de ejecutar, crea la tabla en Supabase SQL Editor:
 *
 * CREATE TABLE IF NOT EXISTS course_feedback (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   edicion integer NOT NULL DEFAULT 1,
 *   semana integer NOT NULL,
 *   submitted_at timestamptz NOT NULL,
 *   rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
 *   respuesta_util text,
 *   mejora_sugerida text,
 *   respuestas_extra jsonb,
 *   form_response_id text UNIQUE,
 *   created_at timestamptz DEFAULT now()
 * );
 * ALTER TABLE course_feedback ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "service_role_all" ON course_feedback
 *   FOR ALL TO service_role USING (true) WITH CHECK (true);
 * CREATE INDEX ON course_feedback (semana);
 * CREATE INDEX ON course_feedback (edicion);
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ID del Google Spreadsheet que contiene todos los formularios
const SHEET_ID = "1XBDBPdqNNhiRrgyOaOMuIwoZEZXtjXhQSD9XEE8P38Y";

// Mapeo de cada tab (gid) a su edición y semana.
// Los gids se obtienen de la URL: ...spreadsheets/d/{ID}/edit?gid={GID}
// Ajusta edicion y semana si el orden no es el correcto.
const SHEET_TABS: { gid: number; edicion: number; semana: number }[] = [
  { gid: 286557846,  edicion: 1, semana: 1  },
  { gid: 834535045,  edicion: 1, semana: 2  },
  { gid: 1220284608, edicion: 1, semana: 3  },
  { gid: 1913987428, edicion: 1, semana: 4  },
  { gid: 2007633598, edicion: 1, semana: 5  },
  { gid: 1407273804, edicion: 1, semana: 6  },
  { gid: 1086330540, edicion: 1, semana: 7  },
  { gid: 816507433,  edicion: 1, semana: 8  },
  { gid: 2029657523, edicion: 1, semana: 9  },
  { gid: 1754328212, edicion: 1, semana: 10 },
  { gid: 583215239,  edicion: 2, semana: 1  },
  { gid: 568732783,  edicion: 2, semana: 2  },
  { gid: 895327756,  edicion: 2, semana: 3  },
];

type GVizRow = { c: ({ v: unknown; f?: string } | null)[] };
type GVizCol = { label: string; type: string };

function parseTimestamp(v: unknown): string | null {
  if (!v || typeof v !== "string") return null;
  // Google Forms: "13/11/2025 17:38:40"
  if (v.includes("/")) {
    const [datePart, timePart] = v.trim().split(" ");
    const [day, month, year] = datePart.split("/");
    return `${year}-${month}-${day}T${timePart ?? "00:00:00"}Z`;
  }
  // GViz Date() format: "Date(2025,10,13,17,38,40)"
  const m = v.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
  if (m) {
    const [, yr, mo, dy, hh = "0", mm = "0", ss = "0"] = m;
    const month = String(parseInt(mo) + 1).padStart(2, "0");
    return `${yr}-${month}-${dy.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}Z`;
  }
  return null;
}

async function fetchTabData(sheetId: string, gid: number): Promise<{ cols: GVizCol[]; rows: GVizRow[] } | null> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  // GViz wraps in callback: google.visualization.Query.setResponse({...})
  const jsonStr = text.replace(/^[^{]*/, "").replace(/\s*\);\s*$/, "");
  try {
    const data = JSON.parse(jsonStr);
    if (data.status !== "ok") return null;
    if (!data.table?.rows?.length) return null;
    return { cols: data.table.cols, rows: data.table.rows };
  } catch {
    return null;
  }
}

function getCellValue(cell: { v: unknown; f?: string } | null): string | null {
  if (!cell || cell.v === null || cell.v === undefined) return null;
  // For datetime, prefer formatted value
  if (cell.f) return cell.f;
  return String(cell.v);
}

async function importTab(
  { gid, edicion, semana }: { gid: number; edicion: number; semana: number },
  supabase: ReturnType<typeof createClient>
) {
  const data = await fetchTabData(SHEET_ID, gid);
  if (!data) {
    console.log(`  gid=${gid} (Ed.${edicion} S${semana}): sin datos, saltando`);
    return 0;
  }

  const { cols, rows } = data;
  const numCols = cols.length;
  console.log(`\n📋 Ed.${edicion} Semana ${semana} (gid=${gid}): ${rows.length} respuestas, ${numCols} columnas`);

  // Sanity check: col[1] should be the rating (number 1-5)
  // If col[1] is not numeric, the tab structure might be unexpected
  const firstValidRow = rows.find((r) => r.c?.[1]);
  if (firstValidRow) {
    const sampleRating = parseInt(String(getCellValue(firstValidRow.c[1]) ?? ""));
    if (isNaN(sampleRating) || sampleRating < 1 || sampleRating > 5) {
      console.log(`  ⚠️  Columna de rating inesperada (valor: "${getCellValue(firstValidRow.c[1])}"). Saltando tab.`);
      return 0;
    }
  }

  const records = [];
  for (const row of rows) {
    const cells = row.c;
    if (!cells || !cells[0]) continue;

    const rawTs = getCellValue(cells[0]);
    const submitted_at = parseTimestamp(rawTs);
    if (!submitted_at) continue;

    const rating = parseInt(String(getCellValue(cells[1]) ?? "")) || 0;
    if (rating < 1 || rating > 5) continue;

    const respuesta_util = getCellValue(cells[2]) || null;
    const mejora_sugerida = getCellValue(cells[numCols - 1]) || null;

    // Middle columns (index 3 to numCols-2) → respuestas_extra
    const respuestas_extra: Record<string, string | null> = {};
    for (let i = 3; i < numCols - 1; i++) {
      const key = cols[i].label.slice(0, 80);
      respuestas_extra[key] = getCellValue(cells[i]) || null;
    }

    const tsDigits = (rawTs ?? "").replace(/\D/g, "");
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

  if (records.length === 0) { console.log(`  ⚠️  Sin registros válidos`); return 0; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("course_feedback" as any) as any)
    .upsert(records, { onConflict: "form_response_id" });

  if (error) { console.error(`  ❌ Error: ${error.message}`); return 0; }
  console.log(`  ✅ ${records.length} respuestas importadas`);
  return records.length;
}

async function main() {
  console.log("📚 Importando feedback de alumnos → Supabase\n");
  console.log(`Sheet ID: ${SHEET_ID}`);
  console.log(`Tabs a importar: ${SHEET_TABS.length}\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let total = 0;
  for (const tab of SHEET_TABS) {
    total += await importTab(tab, supabase);
  }

  console.log(`\n🎉 Total importado: ${total} respuestas`);
}

main().catch((err) => { console.error("Error fatal:", err.message); process.exit(1); });
