-- ============================================================
-- Mejoras de performance del dashboard
-- ============================================================
-- IMPORTANTE: la BD se comparte con la plataforma del curso
-- (lesson-vault-core-main). Estos cambios están diseñados para
-- ser NO INVASIVOS:
--
--   * Solo añadimos índices y funciones (no DROP, no ALTER).
--   * Todos los índices se crean CON `CREATE INDEX CONCURRENTLY`
--     para no bloquear escrituras de la plataforma mientras se
--     construyen.
--   * Las RPCs son SELECT-only sobre profiles/lesson_progress.
--
-- ⚠️ CÓMO APLICARLO EN SUPABASE:
--   `CREATE INDEX CONCURRENTLY` NO puede ejecutarse dentro de
--   una transacción. El SQL editor de Supabase envuelve cada
--   ejecución en una transacción, por lo que hay que pegar cada
--   sentencia POR SEPARADO (un statement, click "Run", siguiente).
--
--   Alternativa: ejecutar via psql directo:
--     psql $DATABASE_URL -f este_archivo.sql
-- ============================================================

-- ── Índices (CONCURRENTLY, ejecutar uno a uno en SQL editor) ──

-- profiles: filtros de actividad y cohort
create index concurrently if not exists profiles_is_test_active_idx
  on public.profiles (is_test_account, last_active_at desc nulls last);

create index concurrently if not exists profiles_is_test_created_idx
  on public.profiles (is_test_account, created_at desc);

create index concurrently if not exists profiles_cohort_idx
  on public.profiles (cohort)
  where cohort is not null;

-- purchase_approved (solo dashboard la usa)
create index concurrently if not exists purchase_approved_email_idx
  on public.purchase_approved (lower(correo_electronico));

create index concurrently if not exists purchase_approved_edicion_status_idx
  on public.purchase_approved (edicion, status);

-- onboarding (solo dashboard)
create index concurrently if not exists onboarding_email_idx
  on public.onboarding (lower(email));

create index concurrently if not exists onboarding_edicion_idx
  on public.onboarding (edicion);

-- lesson_progress (la plataforma escribe aquí muy seguido).
-- CONCURRENTLY garantiza no bloquear esas escrituras.
create index concurrently if not exists lesson_progress_completed_idx
  on public.lesson_progress (completed)
  where completed = true;

create index concurrently if not exists lesson_progress_lesson_user_idx
  on public.lesson_progress (lesson_id, user_id);

-- leads (solo dashboard)
create index concurrently if not exists leads_email_idx
  on public.leads (lower(email));

-- alumnos (solo dashboard, tabla Circle)
create index concurrently if not exists alumnos_email_idx
  on public.alumnos (lower(email))
  where email is not null;

create index concurrently if not exists alumnos_caso_exito_idx
  on public.alumnos (caso_exito)
  where caso_exito is not null;

-- course_feedback (solo dashboard)
create index concurrently if not exists course_feedback_submitted_idx
  on public.course_feedback (submitted_at desc);


-- ============================================================
-- RPCs server-side (no afectan a la plataforma; solo lecturas)
-- Estas SÍ se pueden ejecutar dentro de transacción → pegar
-- ambas a la vez es seguro.
-- ============================================================

-- DAU agregado por día (últimos 30 días)
create or replace function public.dashboard_dau_30d()
returns table(date date, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      (current_date - interval '29 days')::date,
      current_date,
      interval '1 day'
    )::date as date
  )
  select
    d.date,
    coalesce(count(p.user_id), 0) as count
  from days d
  left join public.profiles p
    on p.is_test_account = false
   and p.last_active_at::date = d.date
  group by d.date
  order by d.date asc;
$$;

grant execute on function public.dashboard_dau_30d() to service_role;


-- Distribución de alumnos por cohort
create or replace function public.dashboard_profiles_por_cohort()
returns table(cohort text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p.cohort, 'Sin cohort') as cohort,
    count(*) as count
  from public.profiles p
  where p.is_test_account = false
    and p.cohort is not null
  group by p.cohort
  order by p.cohort asc;
$$;

grant execute on function public.dashboard_profiles_por_cohort() to service_role;
