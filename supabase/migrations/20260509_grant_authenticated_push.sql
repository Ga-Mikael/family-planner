-- The web client subscribes/unsubscribes using the `authenticated` role
-- (anon JWT upgraded after login), NOT service_role. RLS policies already
-- restrict rows to auth.uid() = user_id, but the role still needs table-level
-- GRANTs. Some Supabase projects strip default grants → add them explicitly.

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select                          on public.push_log           to authenticated;
