/**
 * Script para crear tablas directamente en Supabase via PostgreSQL
 * Uso: npm run setup:db
 */
import { Client } from "pg";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const password = process.env.SUPABASE_DB_PASSWORD!;

// Extrae el project ref de la URL (ej: cgbezrwywsgkidssptfm)
const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");

const SQL = `
CREATE TABLE IF NOT EXISTS trustpilot_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name TEXT NOT NULL,
  stars         INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review_date   TIMESTAMPTZ NOT NULL,
  headline      TEXT,
  review_body   TEXT,
  trustpilot_id TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trustpilot_date  ON trustpilot_reviews (review_date DESC);
CREATE INDEX IF NOT EXISTS idx_trustpilot_stars ON trustpilot_reviews (stars);

ALTER TABLE trustpilot_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trustpilot_reviews' AND policyname = 'Solo admins'
  ) THEN
    CREATE POLICY "Solo admins" ON trustpilot_reviews FOR ALL USING (false);
  END IF;
END $$;
`;

async function main() {
  if (!password) {
    console.error("❌ Falta SUPABASE_DB_PASSWORD en .env.local");
    console.error("   Ve a Supabase → Settings → Database → Database password");
    process.exit(1);
  }

  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password,
    ssl: { rejectUnauthorized: false },
  });

  console.log("🔌 Conectando a Supabase PostgreSQL...");
  await client.connect();
  console.log("✅ Conectado\n");

  console.log("📋 Creando tabla trustpilot_reviews...");
  await client.query(SQL);
  console.log("✅ Tabla creada correctamente\n");

  await client.end();
  console.log("🎉 Base de datos lista. Ahora ejecuta: npm run import:trustpilot");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
