-- Ejecuta esto en Supabase SQL Editor antes de importar

CREATE TABLE IF NOT EXISTS agendas (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  airtable_id   text UNIQUE NOT NULL,
  email         text,
  nombre        text,
  whatsapp      text,
  situacion_actual text,
  objetivo      text,
  inversion     text,
  comercial     text,
  edicion       text,
  fecha_llamada date,
  url_llamada   text,
  no_show       boolean DEFAULT false,
  creada        timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE agendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON agendas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
