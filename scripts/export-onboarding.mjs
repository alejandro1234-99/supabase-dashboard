// Export onboarding table a CSV con solo las columnas útiles.
// Run: node scripts/export-onboarding.mjs [edicion] > /tmp/onboarding.csv
//
// Sin edición → exporta todo. Con edición → filtra.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const COLUMNS = [
  "nombre", "apellidos", "nombre_completo", "email", "telefono", "edicion", "edad", "fecha_nacimiento",
  "tipo_avatar", "explicacion_avatar",
  "riesgo_reembolso", "factores_riesgo", "explicacion_riesgo",
  "fecha_registro", "tipo_facturacion", "email_facturacion", "nif",
  "calle", "municipio", "provincia", "pais", "codigo_postal",
  "situacion_laboral", "nivel_estudios", "nivel_digital", "nivel_ia",
  "que_aprender", "motivacion", "expectativas",
  "tiempo_semana", "estilo_aprendizaje", "frenos", "merecido_la_pena",
  "contrato_enviado", "contrato_firmado", "acceso_enviado", "factura_enviada",
  "fecha_accesos", "fecha_fin_garantia", "id_contrato", "id_factura",
  "airtable_id", "created_at",
];

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/\r\n|\r|\n/g, " ").trim();
  if (s.includes(",") || s.includes("\"") || s.includes(";")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const edicion = process.argv[2];
const params = new URLSearchParams({ select: COLUMNS.join(","), order: "edicion.desc,nombre_completo.asc" });
if (edicion) params.set("edicion", `eq.${edicion}`);

const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/onboarding?${params.toString()}`, {
  headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
});

if (!res.ok) {
  console.error(`Error: ${res.status}`, await res.text());
  process.exit(1);
}
const rows = await res.json();

process.stderr.write(`Exportando ${rows.length} registros${edicion ? ` de ${edicion}` : ""}\n`);

console.log(COLUMNS.join(","));
for (const r of rows) console.log(COLUMNS.map((c) => csvEscape(r[c])).join(","));
