# Deployment (production)

Postbase runs on **Vercel** (app + crons) and **Supabase** (Postgres, Auth,
Storage), with **Cloudflare R2** for the media library. Production behaviour
is driven entirely by env vars.

## 1. Environment variables

Vercel → Project → Settings → Environment Variables. Every variable the code
reads is listed, with notes, in [`.env.example`](.env.example). The minimum to
run:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://www.postbase.so` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret**: the publisher, billing and channel writes |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32`; encrypts OAuth tokens at rest. Never rotate it without re-encrypting, or every channel needs reconnecting |
| `API_KEY_PEPPER` | long random string; hashing API keys |
| `CRON_SECRET` | protects the crons (§3) |

Then, per feature: each network's client id/secret/callback (X, LinkedIn,
Meta, TikTok, YouTube), Stripe (billing is off until it's configured), R2 (media
library), Resend (email), Anthropic/OpenAI (agent), Higgsfield (AI images and
video), Sentry and Healthchecks.io (monitoring).

## 2. Database

Apply every migration in `supabase/migrations/`, in order, to the production
project: `supabase db push`, or `psql "$DATABASE_URL" -f <file>` for each new
one. Several migrations note an order relative to a deploy (e.g. 0057 is applied
after the deploy that moves channel writes server-side): read a migration's
header before applying it.

## 3. Crons (`vercel.json`)

| Path | Schedule | What |
|---|---|---|
| `/api/cron/publish` | every minute | publishes due posts, retries, re-checks processing uploads |
| `/api/cron/cleanup-media` | daily 03:00 UTC | deletes uploads nothing uses (kept 48h first) |

Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; the endpoints reject
anything else. Minute-level crons need the Vercel Pro plan. Set
`HEALTHCHECK_PUBLISH_URL` so an alert fires if the publish cron stops.

Locally, run `npm run poll` in a second terminal to mimic the publish cron.

**Verify:** schedule a post a couple of minutes out on the live site: it
publishes, and Vercel's Cron logs show the runs.

## 4. Auth and network callbacks

- **Supabase → Authentication → URL Configuration:** Site URL, and Redirect
  URLs including `https://www.postbase.so/auth/callback`.
- **Each network's app:** the callback is
  `https://www.postbase.so/api/auth/<network>/callback` for `x`, `linkedin`,
  `instagram`, `facebook`, `tiktok` and `youtube` (the same values as the
  `*_CALLBACK_URL` vars). Mastodon registers its own app per instance.
- **Stripe:** webhook endpoint `https://www.postbase.so/api/stripe/webhook`
  with the events listed in `.env.example`. In Billing settings, make failed
  payments end in *canceled* or *unpaid* after the retries: a `past_due`
  workspace keeps publishing (with trial-level AI and X link allowances) until
  then.
- **R2:** the bucket's CORS rule (see `.env.example`) must expose `ETag`, or
  multipart uploads fail.

## 5. Custom domain

Vercel → Settings → Domains. The Privacy and Terms pages (`/privacy`,
`/terms`) the network app reviews ask for are served from it.
