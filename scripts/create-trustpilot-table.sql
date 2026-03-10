-- Ejecuta este SQL en Supabase → SQL Editor
-- Crea la tabla de reviews de Trustpilot (no visible en la plataforma)

CREATE TABLE IF NOT EXISTS trustpilot_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name TEXT NOT NULL,
  stars         INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review_date   TIMESTAMPTZ NOT NULL,
  headline      TEXT,
  review_body   TEXT,
  trustpilot_id TEXT UNIQUE, -- para evitar duplicados al actualizar
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_trustpilot_date  ON trustpilot_reviews (review_date DESC);
CREATE INDEX IF NOT EXISTS idx_trustpilot_stars ON trustpilot_reviews (stars);

-- NO exponer esta tabla via RLS pública (es solo para admin)
ALTER TABLE trustpilot_reviews ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden leer (service_role key tiene acceso total siempre)
CREATE POLICY "Solo admins" ON trustpilot_reviews
  FOR ALL USING (false);
