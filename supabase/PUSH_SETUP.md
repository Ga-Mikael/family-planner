# Web Push Backend Setup

End-to-end setup for reliable push notifications (works when app is closed).

## VAPID Keys (already generated)

- **Public** (already in `.env.example`):
  ```
  BBpUbWSGGKyeyqXar3hd2EDEHSMN037pdVWr_lPlBQFWDslPzk5v_4gMLPHqjeEV37AUtGG3KnStcOLn13aa_7s
  ```

- **Private** (paste into Supabase secret — see below):
  ```
  ToGs6PMFJBsY4LMTHdXSXutcogBdKX5VArKCVtXdfXQ
  ```

⚠️ Don't commit the private key. Don't share publicly. If leaked, regenerate
both via `npx web-push generate-vapid-keys --json` and re-deploy.

## 1. Apply SQL migration

In Supabase Dashboard → SQL Editor → paste content of
`supabase/migrations/20260508_push_subscriptions.sql` → Run.

Creates: `push_subscriptions`, `push_log` tables with RLS.

## 2. Frontend env

Add to your hosting env (Vercel/Netlify) and to `.env.local`:

```
VITE_VAPID_PUBLIC_KEY=BBpUbWSGGKyeyqXar3hd2EDEHSMN037pdVWr_lPlBQFWDslPzk5v_4gMLPHqjeEV37AUtGG3KnStcOLn13aa_7s
```

## 3. Deploy Edge Function

Install Supabase CLI if not done:

```bash
brew install supabase/tap/supabase
```

Link the project (one-time):

```bash
supabase link --project-ref jnpiblsxmqulrlqhdzji
```

Set secrets (private key + service role):

```bash
supabase secrets set \
  VAPID_PRIVATE_KEY="ToGs6PMFJBsY4LMTHdXSXutcogBdKX5VArKCVtXdfXQ" \
  VAPID_PUBLIC_KEY="BBpUbWSGGKyeyqXar3hd2EDEHSMN037pdVWr_lPlBQFWDslPzk5v_4gMLPHqjeEV37AUtGG3KnStcOLn13aa_7s" \
  VAPID_SUBJECT="mailto:mikael.galle.pro@gmail.com"
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.)

Deploy the function:

```bash
supabase functions deploy notify-cron
```

## 4. Schedule the cron

In Supabase Dashboard → Database → Extensions → enable `pg_cron` if not already.

Then SQL Editor:

```sql
-- Run notify-cron every 5 minutes
select cron.schedule(
  'notify-cron-every-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url:='https://jnpiblsxmqulrlqhdzji.supabase.co/functions/v1/notify-cron',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer YOUR_ANON_KEY_HERE'
    )
  ) as request_id;
  $$
);
```

(`pg_net` extension required — usually pre-enabled on Supabase.)

To inspect / unschedule:
```sql
select * from cron.job;
select cron.unschedule('notify-cron-every-5min');
```

## 5. User flow per device

1. Open app in Safari (iOS 16.4+)
2. Share → Sur l'écran d'accueil → install PWA
3. Open from Home Screen icon
4. Tâches → "Activer notifs persistantes" violet banner → Activer
5. Permission prompt → Allow
6. Banner becomes green "Push actif" → done

Now scheduled tasks/reminders fire from the server, even when the app is fully
closed (within ±5 min of dueTime).

## Debugging

- **No notif arriving**: check Edge Function logs in Supabase Dashboard →
  Edge Functions → notify-cron → Logs.
- **`{ ok: true, sent: 0 }`**: means no tasks/reminders matched the 5-minute
  window. Try setting a task with dueTime within next 5 minutes.
- **404/410 errors in logs**: subscription expired — auto-cleaned by the function.
- **VAPID `400 BadJwtToken`**: VAPID public key in env doesn't match what's
  registered in PushManager. Regenerate both, redeploy, re-subscribe each device.
