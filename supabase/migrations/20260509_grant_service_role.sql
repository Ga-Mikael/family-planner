-- Grant service_role explicit access to tables read/written by the
-- notify-cron Edge Function. Some Supabase projects strip default grants —
-- this restores them so the function can bypass RLS via service_role.

grant select on public.tasks     to service_role;
grant select on public.reminders to service_role;

grant select, insert, update, delete on public.push_subscriptions to service_role;
grant select, insert, delete         on public.push_log           to service_role;

-- Also ensure RLS bypass: service_role does it by default when using the
-- service_role JWT, but only if grants exist. Confirmed above.
