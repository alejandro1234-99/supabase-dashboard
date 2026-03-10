-- Ejecuta esto en Supabase SQL Editor antes de sincronizar

-- Miembros de Circle
CREATE TABLE IF NOT EXISTS circle_members (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_member_id      bigint UNIQUE NOT NULL,
  user_id               bigint,
  name                  text,
  first_name            text,
  last_name             text,
  email                 text,
  headline              text,
  bio                   text,
  location              text,
  avatar_url            text,
  profile_url           text,
  public_uid            text,
  website_url           text,
  instagram_url         text,
  twitter_url           text,
  linkedin_url          text,
  posts_count           integer DEFAULT 0,
  comments_count        integer DEFAULT 0,
  topics_count          integer DEFAULT 0,
  member_tags           text[],
  active                boolean,
  accepted_invitation   boolean,
  last_seen_at          timestamptz,
  joined_at             timestamptz,
  updated_at            timestamptz,
  synced_at             timestamptz DEFAULT now()
);

-- Posts de Circle
CREATE TABLE IF NOT EXISTS circle_posts (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_post_id        bigint UNIQUE NOT NULL,
  title                 text,
  slug                  text,
  url                   text,
  space_id              bigint,
  space_name            text,
  space_slug            text,
  user_id               bigint,
  user_email            text,
  user_name             text,
  comments_count        integer DEFAULT 0,
  likes_count           integer DEFAULT 0,
  status                text,
  published_at          timestamptz,
  created_at            timestamptz,
  updated_at            timestamptz,
  synced_at             timestamptz DEFAULT now()
);

-- Feed de actividad en tiempo real (webhooks via Make.com)
CREATE TABLE IF NOT EXISTS circle_activity (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type            text NOT NULL,
  member_id             bigint,
  member_email          text,
  member_name           text,
  post_id               bigint,
  post_title            text,
  space_id              bigint,
  space_name            text,
  metadata              jsonb,
  happened_at           timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON circle_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE circle_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON circle_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE circle_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON circle_activity
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_circle_members_email ON circle_members(email);
CREATE INDEX IF NOT EXISTS idx_circle_members_last_seen ON circle_members(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_circle_posts_space ON circle_posts(space_id);
CREATE INDEX IF NOT EXISTS idx_circle_posts_created ON circle_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_circle_activity_type ON circle_activity(event_type);
CREATE INDEX IF NOT EXISTS idx_circle_activity_happened ON circle_activity(happened_at);
