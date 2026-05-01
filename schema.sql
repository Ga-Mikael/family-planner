-- ═══════════════════════════════════════════════════════════════
--  Family Planner — Schéma Supabase
--  Copiez-collez ce SQL dans : Supabase > SQL Editor > New query
-- ═══════════════════════════════════════════════════════════════

-- TÂCHES
create table if not exists public.tasks (
  id          text        primary key,
  name        text        not null,
  member_id   text        not null default '',
  room_id     text        not null default 'r-general',
  day         smallint    not null check (day between 0 and 6),
  priority    text        not null default 'med' check (priority in ('low','med','high')),
  recurrence  text        not null default 'once' check (recurrence in ('once','daily','weekly','monthly')),
  done        boolean     not null default false,
  note        text,
  due_time    text,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy "tasks_own" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- MEMBRES
create table if not exists public.members (
  id          text      primary key,
  name        text      not null,
  emoji       text      not null default '😊',
  color       text      not null default '#6B7280',
  avatar_bg   text      not null default '#F3F4F6',
  is_child    boolean   not null default false,
  work_days   integer[] not null default '{}',
  work_hours  jsonb     not null default '{}',
  sort_order  integer   not null default 0,
  user_id     uuid      not null references auth.users(id) on delete cascade
);
alter table public.members enable row level security;
create policy "members_own" on public.members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- REPAS
create table if not exists public.meals (
  day       smallint not null check (day between 0 and 6),
  meal      text     not null default '',
  user_id   uuid     not null references auth.users(id) on delete cascade,
  primary key (day, user_id)
);
alter table public.meals enable row level security;
create policy "meals_own" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- COURSES
create table if not exists public.groceries (
  id          text        primary key,
  name        text        not null,
  qty         text        not null default '',
  done        boolean     not null default false,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.groceries enable row level security;
create policy "groceries_own" on public.groceries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RAPPELS
create table if not exists public.reminders (
  id      text     primary key,
  title   text     not null,
  time    text     not null default '',
  day     smallint not null check (day between 0 and 6),
  emoji   text     not null default '🔔',
  user_id uuid     not null references auth.users(id) on delete cascade
);
alter table public.reminders enable row level security;
create policy "reminders_own" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Permissions pour les utilisateurs authentifiés (indispensable avec RLS)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.tasks      to authenticated;
grant select, insert, update, delete on public.members    to authenticated;
grant select, insert, update, delete on public.meals      to authenticated;
grant select, insert, update, delete on public.groceries  to authenticated;
grant select, insert, update, delete on public.reminders  to authenticated;

-- Activer le temps réel
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.meals;
alter publication supabase_realtime add table public.groceries;
alter publication supabase_realtime add table public.reminders;
