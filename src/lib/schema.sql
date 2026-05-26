-- ============================================================
-- BulkOS Database Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid        primary key references auth.users on delete cascade,
  full_name        text,
  height_cm        numeric,
  age              integer,
  gender           text        check (gender in ('male', 'female', 'other')),
  activity_level   text        check (activity_level in (
                                 'sedentary',
                                 'lightly_active',
                                 'moderately_active',
                                 'very_active',
                                 'extra_active'
                               )),
  target_weight_kg numeric,
  target_date      date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. DAILY_LOGS
-- ────────────────────────────────────────────────────────────
create table if not exists public.daily_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  log_date    date        not null,
  weight_kg   numeric,
  calories    integer,
  protein_g   numeric,
  carbs_g     numeric,
  fats_g      numeric,
  water_ml    integer,
  sleep_hours numeric,
  notes       text,
  created_at  timestamptz not null default now(),
  constraint daily_logs_user_date_unique unique (user_id, log_date)
);

create index if not exists daily_logs_user_date_idx on public.daily_logs (user_id, log_date desc);

-- ────────────────────────────────────────────────────────────
-- 3. MILESTONES
-- ────────────────────────────────────────────────────────────
create table if not exists public.milestones (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles (id) on delete cascade,
  title            text        not null,
  target_weight_kg numeric     not null,
  achieved         boolean     not null default false,
  achieved_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists milestones_user_idx on public.milestones (user_id);

-- ────────────────────────────────────────────────────────────
-- 4. AI_REPORTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.ai_reports (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  report_type   text        not null check (report_type in ('weekly', 'monthly', 'custom')),
  content       text        not null,
  data_snapshot jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists ai_reports_user_created_idx on public.ai_reports (user_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 5. BODY_MEASUREMENTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.body_measurements (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  measured_at  date        not null default current_date,
  neck_cm      numeric(5,1),
  chest_cm     numeric(5,1),
  waist_cm     numeric(5,1),
  hips_cm      numeric(5,1),
  left_arm_cm  numeric(5,1),
  right_arm_cm numeric(5,1),
  left_thigh_cm  numeric(5,1),
  right_thigh_cm numeric(5,1),
  notes        text,
  created_at   timestamptz not null default now(),
  constraint body_measurements_user_date_unique unique (user_id, measured_at)
);

create index if not exists body_measurements_user_date_idx
  on public.body_measurements (user_id, measured_at desc);

-- ────────────────────────────────────────────────────────────
-- 6. PROGRESS_PHOTOS
-- ────────────────────────────────────────────────────────────
-- Storage bucket: create manually in Supabase Dashboard →
--   Storage → New bucket → Name: "progress-photos" → Public: ON
-- Then add this storage policy (SQL Editor):
--   create policy "users manage own photos" on storage.objects
--     for all using (auth.uid()::text = (storage.foldername(name))[1])
--     with check (auth.uid()::text = (storage.foldername(name))[1]);

create table if not exists public.progress_photos (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  taken_at     date        not null default current_date,
  storage_path text        not null,
  public_url   text        not null,
  pose         text        check (pose in ('front','back','left','right','flexing','other')),
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists progress_photos_user_date_idx
  on public.progress_photos (user_id, taken_at desc);

-- ────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

-- profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "profiles: delete own" on public.profiles;
create policy "profiles: delete own"
  on public.profiles for delete
  using (auth.uid() = id);

-- daily_logs
alter table public.daily_logs enable row level security;

drop policy if exists "daily_logs: select own" on public.daily_logs;
create policy "daily_logs: select own"
  on public.daily_logs for select
  using (auth.uid() = user_id);

drop policy if exists "daily_logs: insert own" on public.daily_logs;
create policy "daily_logs: insert own"
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "daily_logs: update own" on public.daily_logs;
create policy "daily_logs: update own"
  on public.daily_logs for update
  using (auth.uid() = user_id);

drop policy if exists "daily_logs: delete own" on public.daily_logs;
create policy "daily_logs: delete own"
  on public.daily_logs for delete
  using (auth.uid() = user_id);

-- milestones
alter table public.milestones enable row level security;

drop policy if exists "milestones: select own" on public.milestones;
create policy "milestones: select own"
  on public.milestones for select
  using (auth.uid() = user_id);

drop policy if exists "milestones: insert own" on public.milestones;
create policy "milestones: insert own"
  on public.milestones for insert
  with check (auth.uid() = user_id);

drop policy if exists "milestones: update own" on public.milestones;
create policy "milestones: update own"
  on public.milestones for update
  using (auth.uid() = user_id);

drop policy if exists "milestones: delete own" on public.milestones;
create policy "milestones: delete own"
  on public.milestones for delete
  using (auth.uid() = user_id);

-- progress_photos
alter table public.progress_photos enable row level security;

drop policy if exists "progress_photos: select own" on public.progress_photos;
create policy "progress_photos: select own"
  on public.progress_photos for select using (auth.uid() = user_id);

drop policy if exists "progress_photos: insert own" on public.progress_photos;
create policy "progress_photos: insert own"
  on public.progress_photos for insert with check (auth.uid() = user_id);

drop policy if exists "progress_photos: delete own" on public.progress_photos;
create policy "progress_photos: delete own"
  on public.progress_photos for delete using (auth.uid() = user_id);

-- body_measurements
alter table public.body_measurements enable row level security;

drop policy if exists "body_measurements: select own" on public.body_measurements;
create policy "body_measurements: select own"
  on public.body_measurements for select
  using (auth.uid() = user_id);

drop policy if exists "body_measurements: insert own" on public.body_measurements;
create policy "body_measurements: insert own"
  on public.body_measurements for insert
  with check (auth.uid() = user_id);

drop policy if exists "body_measurements: update own" on public.body_measurements;
create policy "body_measurements: update own"
  on public.body_measurements for update
  using (auth.uid() = user_id);

drop policy if exists "body_measurements: delete own" on public.body_measurements;
create policy "body_measurements: delete own"
  on public.body_measurements for delete
  using (auth.uid() = user_id);

-- ai_reports
alter table public.ai_reports enable row level security;

drop policy if exists "ai_reports: select own" on public.ai_reports;
create policy "ai_reports: select own"
  on public.ai_reports for select
  using (auth.uid() = user_id);

drop policy if exists "ai_reports: insert own" on public.ai_reports;
create policy "ai_reports: insert own"
  on public.ai_reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "ai_reports: update own" on public.ai_reports;
create policy "ai_reports: update own"
  on public.ai_reports for update
  using (auth.uid() = user_id);

drop policy if exists "ai_reports: delete own" on public.ai_reports;
create policy "ai_reports: delete own"
  on public.ai_reports for delete
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 6. HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- get_weight_trend: daily weight + 7-day moving average
-- Usage: select * from get_weight_trend('<user_id>', 90);
create or replace function public.get_weight_trend(
  p_user_id uuid,
  p_days    integer default 90
)
returns table (
  log_date       date,
  weight_kg      numeric,
  moving_avg_7d  numeric
)
language sql
stable
security definer set search_path = public
as $$
  select
    log_date,
    weight_kg,
    round(
      avg(weight_kg) over (
        order by log_date
        rows between 6 preceding and current row
      ),
      2
    ) as moving_avg_7d
  from public.daily_logs
  where user_id = p_user_id
    and log_date >= current_date - (p_days || ' days')::interval
    and weight_kg is not null
  order by log_date;
$$;

-- get_daily_summary: aggregated nutrition/sleep/water over a date range
-- Usage: select * from get_daily_summary('<user_id>', '2025-01-01', '2025-01-31');
create or replace function public.get_daily_summary(
  p_user_id   uuid,
  p_start     date,
  p_end       date
)
returns table (
  total_days        bigint,
  avg_calories      numeric,
  avg_protein_g     numeric,
  avg_carbs_g       numeric,
  avg_fats_g        numeric,
  avg_water_ml      numeric,
  avg_sleep_hours   numeric,
  min_weight_kg     numeric,
  max_weight_kg     numeric,
  latest_weight_kg  numeric
)
language sql
stable
security definer set search_path = public
as $$
  select
    count(*)                              as total_days,
    round(avg(calories), 0)              as avg_calories,
    round(avg(protein_g), 1)             as avg_protein_g,
    round(avg(carbs_g), 1)               as avg_carbs_g,
    round(avg(fats_g), 1)                as avg_fats_g,
    round(avg(water_ml), 0)              as avg_water_ml,
    round(avg(sleep_hours), 1)           as avg_sleep_hours,
    min(weight_kg)                       as min_weight_kg,
    max(weight_kg)                       as max_weight_kg,
    (
      select weight_kg
      from public.daily_logs
      where user_id = p_user_id
        and log_date between p_start and p_end
        and weight_kg is not null
      order by log_date desc
      limit 1
    )                                    as latest_weight_kg
  from public.daily_logs
  where user_id = p_user_id
    and log_date between p_start and p_end;
$$;
