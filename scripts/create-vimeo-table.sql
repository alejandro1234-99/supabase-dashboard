-- Ejecuta esto en Supabase SQL Editor antes de importar

CREATE TABLE IF NOT EXISTS vimeo_stats (
  id                          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  airtable_id                 text UNIQUE NOT NULL,
  video_url                   text,
  video_title                 text,
  video_upload_date           timestamptz,
  views                       integer,
  impressions                 integer,
  unique_impressions          integer,
  unique_viewers              integer,
  total_time_watched_seconds  integer,
  avg_time_watched_seconds    integer,
  avg_pct_watched             numeric(5,2),
  finishes                    integer,
  downloads                   integer,
  likes                       integer,
  comments                    integer,
  tiempo_reproduccion_min     numeric(10,4),
  categoria                   text,
  pct_reproduccion            numeric(5,2),
  modulo                      text,
  creada                      timestamptz,
  created_at                  timestamptz DEFAULT now()
);

ALTER TABLE vimeo_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON vimeo_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);
