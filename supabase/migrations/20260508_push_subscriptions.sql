-- Push subscriptions for Web Push notifications
-- One row per device. Shared family account → all devices share the same user_id.

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  device_label  text,
  user_agent    text,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- Tracks which task occurrences / reminder occurrences have already been
-- pushed, so the cron doesn't send duplicates if it runs multiple times
-- inside the same notification window.
create table if not exists public.push_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  source        text not null check (source in ('task', 'reminder')),
  source_id     text not null,
  fire_at       timestamptz not null,
  variant       text not null default 'exact', -- 'exact' | 'pre5'
  created_at    timestamptz not null default now(),
  unique (user_id, source, source_id, fire_at, variant)
);

create index if not exists push_log_fire_idx
  on public.push_log (fire_at);

-- RLS: each authenticated user reads/writes only their own subscriptions.
alter table public.push_subscriptions enable row level security;
alter table public.push_log enable row level security;

drop policy if exists "subs_owner_all" on public.push_subscriptions;
create policy "subs_owner_all"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "log_owner_read" on public.push_log;
create policy "log_owner_read"
  on public.push_log
  for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS, so the Edge Function can read/write all rows.
