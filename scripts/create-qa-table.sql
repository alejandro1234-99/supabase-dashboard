-- Ejecuta esto en Supabase SQL Editor antes de importar

CREATE TABLE IF NOT EXISTS qa_consultas (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  airtable_id           text UNIQUE NOT NULL,
  nombre                text,
  email                 text,
  consulta              text,
  loom_url              text,
  attachment_url        text,
  attachment_thumb      text,
  attachment_nombre     text,
  status                text DEFAULT 'Pendiente',
  respuesta_preparada   text,
  creada                timestamptz,
  fecha_en_progreso     timestamptz,
  fecha_resuelta        timestamptz,
  tiempo_resolucion_min integer,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE qa_consultas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON qa_consultas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
