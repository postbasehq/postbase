import { randomBytes } from "node:crypto";

// Tests never touch real services: point everything at fakes before any
// module reads its environment. The .env.local file is never loaded.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.NEXT_PUBLIC_APP_URL = "https://www.postbase.so";
// Fake Stripe price ids (lib/plans reads these when it loads).
process.env.STRIPE_PRICE_CREATOR_MONTH = "price_creator";
process.env.STRIPE_PRICE_TEAM_MONTH = "price_team";
for (const k of [
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "R2_ACCOUNT_ID",
  "R2_BUCKET",
  "HIGGSFIELD_API_KEY",
  "FORCE_BILLING",
]) {
  delete process.env[k];
}

// Supabase's client checks for a WebSocket implementation when it's created
// (for realtime, which no test uses). Node 20 has none built in.
if (!("WebSocket" in globalThis)) {
  (globalThis as Record<string, unknown>).WebSocket = class FakeWebSocket {};
}
