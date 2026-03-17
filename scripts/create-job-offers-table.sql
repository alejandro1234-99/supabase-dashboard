-- Ejecuta este SQL en Supabase → SQL Editor
-- Tabla para almacenar ofertas de trabajo encontradas por el agente diario

CREATE TABLE IF NOT EXISTS job_offers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  company      TEXT,
  platform     TEXT NOT NULL,
  url          TEXT,
  description  TEXT NOT NULL,
  budget_min   NUMERIC,
  budget_max   NUMERIC,
  currency     TEXT DEFAULT 'EUR',
  job_type     TEXT NOT NULL,   -- freelance | contract | full-time | part-time | project
  category     TEXT NOT NULL,   -- automation | no-code | ai-services | ai-agency-technical | ai-agency-commercial
  html_header  TEXT NOT NULL,   -- HTML del encabezado (listo para publicar)
  html_body    TEXT NOT NULL,   -- HTML del cuerpo con copy marketiniano
  raw_data     JSONB DEFAULT '{}',
  found_at     TIMESTAMPTZ DEFAULT NOW(),
  status       TEXT DEFAULT 'pending_review', -- pending_review | approved | published | rejected
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_job_offers_status   ON job_offers (status);
CREATE INDEX IF NOT EXISTS idx_job_offers_found_at ON job_offers (found_at DESC);

-- Evitar duplicados por URL
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_offers_url ON job_offers (url)
  WHERE url IS NOT NULL;

-- RLS: solo acceso via service_role (admin)
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo admins" ON job_offers FOR ALL USING (false);
