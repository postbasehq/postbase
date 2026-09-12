// Local dev poller — mimics the production cron by hitting /api/cron/publish
// on an interval. Run: `npm run poll` (loads .env.local for CRON_SECRET).
const url = process.env.POLL_URL ?? "http://localhost:3000/api/cron/publish";
const secret = process.env.CRON_SECRET ?? "";
const interval = Number(process.env.POLL_INTERVAL_MS ?? 20000);

async function tick() {
  try {
    const res = await fetch(url, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    });
    const text = await res.text();
    console.log(new Date().toISOString(), res.status, text.slice(0, 200));
  } catch (e) {
    console.log(new Date().toISOString(), "poll error:", e instanceof Error ? e.message : e);
  }
}

console.log(`Polling ${url} every ${interval / 1000}s`);
tick();
setInterval(tick, interval);
