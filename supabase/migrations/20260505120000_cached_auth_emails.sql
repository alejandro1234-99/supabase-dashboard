-- Cache server-side del mapeo email <-> user_id de auth.users.
-- El dashboard cruza muchas tablas (alumnos, profiles, exitos-pro) con
-- auth.users por email. La pagination de la admin API tarda ~3s; con esta
-- tabla, una sola query SELECT lo resuelve en <100ms.
--
-- Se rellena automáticamente la primera vez que un endpoint pide
-- getEmailToUserIdMap() y no encuentra filas. Se refresca con el endpoint
-- /api/cron/refresh-auth-emails (idealmente cron diario en vercel.json).

create table if not exists public.cached_auth_emails (
  user_id uuid primary key,
  email text not null,
  refreshed_at timestamptz not null default now()
);

create index if not exists cached_auth_emails_email_idx
  on public.cached_auth_emails (lower(email));

-- RLS: nadie excepto service role debería leer/escribir.
alter table public.cached_auth_emails enable row level security;
