# Deployment (production)

Postbase runs on **Vercel** (app) + **Supabase** (DB/auth/storage) + **Inngest Cloud**
(scheduled publishing). Nothing platform-specific in the code — production behaviour is
driven by env vars.

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — used by the Inngest publish job |
| `NEXT_PUBLIC_APP_URL` | `https://postbase.so` |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` — encrypts OAuth tokens at rest |
| `API_KEY_PEPPER` | long random string — hashing API keys |
| `CRON_SECRET` | protects the publish cron (see §3); Vercel Cron sends it as a bearer token |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X OAuth 2.0 app |
| `X_CALLBACK_URL` | `https://postbase.so/api/auth/x/callback` |

## 2. Database

Apply every migration in `supabase/migrations/` (0001–0005) to the production Supabase
project (SQL editor, or `supabase db push`).

## 3. Scheduled publishing (cron poller)

A **Vercel Cron** job calls `GET /api/cron/publish` every minute; the endpoint claims
any posts whose scheduled time has passed and publishes them. The schedule lives in
`vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/publish", "schedule": "* * * * *" }] }
```

Setup:
1. Set **`CRON_SECRET`** in Vercel env (`openssl rand -base64 32`). Vercel Cron sends it
   automatically as `Authorization: Bearer <CRON_SECRET>`; the endpoint rejects calls
   without it.
2. Deploy. Vercel registers the cron from `vercel.json`.

Notes:
- **Minute-level crons require the Vercel Pro plan** (Hobby crons run once/day).
- The claim is concurrency-safe (atomic `scheduled -> publishing`), so overlapping runs
  can't double-publish.
- **Local dev:** run `npm run poll` in a second terminal — it hits the endpoint on an
  interval, mimicking the cron.

**Verify:** schedule a post a couple of minutes out on the live site → it publishes; the
Vercel dashboard's Cron logs show the invocations.

## 4. Auth & platform callbacks

- **Supabase → Authentication → URL Configuration:** Site URL + Redirect URLs include
  `https://postbase.so/auth/callback` (magic-link sign-in).
- **X app → OAuth callback URLs:** include `https://postbase.so/api/auth/x/callback`.

## 5. Custom domain

Vercel → Settings → Domains → add `postbase.so`. This also makes the Privacy/Terms URLs
live (`/privacy`, `/terms`) that the platform API applications require.
