-- Ejecuta esto en Supabase SQL Editor antes de importar

CREATE TABLE IF NOT EXISTS soporte (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  airtable_id         text UNIQUE NOT NULL,
  numero_ticket       integer,
  fecha               date,
  alumno              text,
  consulta            text,
  tipo_consulta       text,
  medio_canal         text,
  responsable         text,
  escalado_a          text,
  pendiente_escalada  boolean,
  cerrada             boolean,
  creada              timestamptz,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE soporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON soporte
  FOR ALL TO service_role USING (true) WITH CHECK (true);
