# Web Push Backend Setup

End-to-end setup for reliable push notifications (works when app is closed).

## VAPID Keys

**Generate fresh keys** (do NOT commit any of them):

```bash
npx web-push generate-vapid-keys --json
```

You get `{ publicKey, privateKey }`. Use them as below.

| Where                         | Which key      | Sensitivity                    |
|-------------------------------|----------------|---------------------------------|
| `.env.example` / hosting env  | publicKey only | Safe to expose                 |
| Password manager / 1Password  | privateKey     | **Secret** — never in git      |
| Supabase secret               | privateKey     | Backend only                    |
| Hosting env (Netlify/Vercel)  | publicKey      | Build-time inject              |

If a private key was ever pushed to a repo (even briefly), **rotate immediately**: generate new pair, update Supabase secret + hosting env + `.env.example`, re-deploy. All existing subscriptions become invalid — every device must re-subscribe.

## 1. Apply SQL migration

Supabase Dashboard → SQL Editor → paste content of
`supabase/migrations/20260508_push_subscriptions.sql` → Run.

Creates: `push_subscriptions`, `push_log` tables with RLS.

## 2. Frontend env

Add to your hosting env (Vercel/Netlify) and to `.env.local`:

```
VITE_VAPID_PUBLIC_KEY=<your publicKey>
```

The committed `.env.example` always reflects the current public key.

## 3. Deploy Edge Function

Install Supabase CLI if not done:

```bash
brew install supabase/tap/supabase
```

Link the project (one-time):

```bash
supabase link --project-ref jnpiblsxmqulrlqhdzji
```

Generate a CRON_SECRET (random, never committed):

```bash
openssl rand -hex 32
```

Set secrets — replace the placeholders with your actual keys (paste from password manager):

```bash
supabase secrets set \
  VAPID_PRIVATE_KEY="<your privateKey>" \
  VAPID_PUBLIC_KEY="<your publicKey>" \
  VAPID_SUBJECT="mailto:you@example.com" \
  CRON_SECRET="<your random hex secret>"
```

Store the CRON_SECRET in your password manager — you need it for the cron job below.

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` auto-injected.)

Deploy the function:

```bash
supabase functions deploy notify-cron
```

## 4. Schedule the cron

Supabase Dashboard → Database → Extensions → enable `pg_cron` and `pg_net` (usually pre-enabled).

Then SQL Editor — replace `YOUR_ANON_KEY_HERE` with the project's anon key, and `YOUR_CRON_SECRET_HERE` with the secret you generated above:

```sql
select cron.schedule(
  'notify-cron-every-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://jnpiblsxmqulrlqhdzji.supabase.co/functions/v1/notify-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY_HERE',
      'X-Cron-Secret', 'YOUR_CRON_SECRET_HERE'
    )
  ) as request_id;
  $$
);
```

The function rejects requests without `X-Cron-Secret`. Without this, anyone with the project anon key (it's in your frontend bundle) could spam the function.

To inspect / unschedule:
```sql
select * from cron.job;
select jobid, status, return_message, start_time
  from cron.job_run_details order by start_time desc limit 5;
select cron.unschedule('notify-cron-every-5min');
```

## 5. Per-device flow

1. Open app in Safari (iOS 16.4+)
2. Share → Sur l'écran d'accueil → install PWA
3. Open from Home Screen icon
4. Tâches → violet banner "Activer notifs persistantes" → Activer
5. Permission prompt → Allow
6. Banner becomes green "Push actif" → done

Server-side push now fires for tasks/reminders within ±5 min of dueTime even when the app is fully closed.

## Debugging

- **No notif arriving**: Edge Function logs in Supabase Dashboard → Edge Functions → notify-cron → Logs
- **`{ ok: true, sent: 0 }`**: no task/reminder matched the 5-minute window — set a task with dueTime in the next 5 min
- **404/410 in logs**: subscription expired, auto-cleaned by the function
- **VAPID `400 BadJwtToken`**: public key mismatch — frontend env public key ≠ Supabase secret public key. Regenerate both, redeploy, every device must re-subscribe.
