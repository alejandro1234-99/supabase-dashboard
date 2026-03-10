-- Snapshots diarios de métricas por miembro de Circle

CREATE TABLE IF NOT EXISTS circle_member_snapshots (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_member_id  bigint NOT NULL,
  snapshot_date     date NOT NULL,
  posts_count       integer DEFAULT 0,
  comments_count    integer DEFAULT 0,
  topics_count      integer DEFAULT 0,
  connections_count integer DEFAULT 0,  -- se actualiza vía webhook Make.com
  last_seen_at      timestamptz,
  created_at        timestamptz DEFAULT now(),

  UNIQUE (circle_member_id, snapshot_date)
);

-- Añadir connections_count a circle_members si no existe
ALTER TABLE circle_members ADD COLUMN IF NOT EXISTS connections_count integer DEFAULT 0;

ALTER TABLE circle_member_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON circle_member_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_snapshots_member ON circle_member_snapshots(circle_member_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON circle_member_snapshots(snapshot_date);
