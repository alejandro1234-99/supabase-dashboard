/**
 * Script para crear la tabla `leads` en Supabase via PostgreSQL
 * Uso: npx tsx scripts/setup-leads-db.ts
 */
import { Client } from "pg";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const password = process.env.SUPABASE_DB_PASSWORD!;

const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");

const SQL = `
CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_registro  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nombre          TEXT,
  email           TEXT,
  avatar          TEXT,
  funnel          TEXT,
  "test"          TEXT,
  medium          TEXT,
  campaign        TEXT,
  "content"       TEXT,
  term            TEXT,
  external_id     TEXT,
  fuente_medio    TEXT,
  edicion         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_fecha     ON leads (fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_leads_edicion   ON leads (edicion);
CREATE INDEX IF NOT EXISTS idx_leads_email     ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_funnel    ON leads (funnel);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Solo admins'
  ) THEN
    CREATE POLICY "Solo admins" ON leads FOR ALL USING (false);
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

  console.log("📋 Creando tabla leads...");
  await client.query(SQL);
  console.log("✅ Tabla leads creada correctamente\n");

  await client.end();
  console.log("🎉 Tabla lista. Ahora puedes importar el CSV desde Supabase Dashboard.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
