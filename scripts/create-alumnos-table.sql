-- Ejecuta esto en Supabase SQL Editor antes de importar

CREATE TABLE IF NOT EXISTS alumnos (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  airtable_id           text UNIQUE NOT NULL,
  nombre_completo       text,
  email                 text,
  id_circle             text,
  fecha_union           date,
  tags                  text,
  localizacion          text,
  enlace_perfil         text,
  pagina_web            text,
  instagram             text,
  linkedin              text,

  -- Actividad en Circle
  conexiones_circle     integer,
  posts_publicados      integer,
  comentarios_totales   integer,

  -- Caso de éxito
  caso_exito            text,
  tipo_exito            text,
  fecha_caso_exito      date,
  descripcion_exito     text,
  fuente_caso_exito     text,

  created_at            timestamptz DEFAULT now()
);

ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON alumnos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
