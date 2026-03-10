-- Ejecuta esto en Supabase SQL Editor antes de importar

CREATE TABLE IF NOT EXISTS onboarding (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  airtable_id           text UNIQUE NOT NULL,
  nombre                text,
  apellidos             text,
  nombre_completo       text,
  email                 text,
  telefono              text,
  edicion               text,
  edad                  integer,

  -- Scoring IA
  tipo_avatar           text,
  explicacion_avatar    text,
  riesgo_reembolso      text,
  factores_riesgo       integer,
  explicacion_riesgo    text,

  -- Facturación
  fecha_registro        date,
  tipo_facturacion      text,
  email_facturacion     text,
  nif                   text,
  calle                 text,
  municipio             text,
  provincia             text,
  pais                  text,
  codigo_postal         text,
  fecha_nacimiento      date,

  -- Onboarding (respuestas del formulario)
  situacion_laboral     text,
  nivel_estudios        text,
  nivel_digital         text,
  nivel_ia              text,
  que_aprender          text,
  motivacion            text,
  expectativas          text,
  tiempo_semana         text,
  estilo_aprendizaje    text,
  frenos                text,
  merecido_la_pena      text,

  -- Operativo
  contrato_enviado      boolean DEFAULT false,
  contrato_firmado      boolean DEFAULT false,
  acceso_enviado        boolean DEFAULT false,
  factura_enviada       boolean DEFAULT false,
  fecha_accesos         date,
  fecha_fin_garantia    date,
  id_contrato           text,
  id_factura            text,

  created_at            timestamptz DEFAULT now()
);

ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON onboarding
  FOR ALL TO service_role USING (true) WITH CHECK (true);
