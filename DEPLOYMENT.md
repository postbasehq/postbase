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
| `INNGEST_EVENT_KEY` | from Inngest Cloud (see §3) |
| `INNGEST_SIGNING_KEY` | from Inngest Cloud (see §3) |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X OAuth 2.0 app |
| `X_CALLBACK_URL` | `https://postbase.so/api/auth/x/callback` |

Do **not** set `INNGEST_DEV` in production (it's for local dev only).

## 2. Database

Apply every migration in `supabase/migrations/` (0001–0005) to the production Supabase
project (SQL editor, or `supabase db push`).

## 3. Inngest Cloud (this is what makes scheduled publishing fire)

Locally, `npm run dev` sets `INNGEST_DEV=1` and `npm run inngest` runs the executor.
**In production, Inngest Cloud is the executor** and calls back to
`https://postbase.so/api/inngest` at each post's scheduled time.

**Recommended — the Vercel integration (auto):**
1. Create an account at inngest.com.
2. Install the **Inngest ↔ Vercel integration** and connect this project. It sets
   `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` and **auto-syncs** your functions on every
   deploy (it hits `/api/inngest`).
3. Redeploy.

**Manual alternative:**
1. In Inngest, create an app; copy the **Event Key** and **Signing Key**.
2. Add both to Vercel env (above); redeploy.
3. In Inngest → **Sync app** → URL `https://postbase.so/api/inngest`.

**Verify:** the Inngest dashboard lists the `postbase` app with the `publish-post`
function, and `GET https://postbase.so/api/inngest` returns `200` (not the 500 it returns
without a signing key in cloud mode).

## 4. Auth & platform callbacks

- **Supabase → Authentication → URL Configuration:** Site URL + Redirect URLs include
  `https://postbase.so/auth/callback` (magic-link sign-in).
- **X app → OAuth callback URLs:** include `https://postbase.so/api/auth/x/callback`.

## 5. Custom domain

Vercel → Settings → Domains → add `postbase.so`. This also makes the Privacy/Terms URLs
live (`/privacy`, `/terms`) that the platform API applications require.
