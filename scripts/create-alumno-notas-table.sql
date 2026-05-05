-- Notas internas por alumno (Onboarding / OB)
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS alumno_notas (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id   uuid NOT NULL REFERENCES onboarding(id) ON DELETE CASCADE,
  contenido   text NOT NULL,
  autor       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alumno_notas_alumno_id_idx ON alumno_notas (alumno_id);
CREATE INDEX IF NOT EXISTS alumno_notas_created_at_idx ON alumno_notas (created_at DESC);
