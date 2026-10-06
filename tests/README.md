# Tests

```bash
npm test          # run once
npm run test:watch
```

Vitest, Node environment. No test touches a real service: `tests/setup.ts`
points Supabase at a fake host and clears every secret, and
`tests/helpers/fake-net.ts` replaces `fetch` with a scripted fake network
(Supabase, Resend and the social networks all go through `fetch`), which also
records every request so tests can assert on what was written.

What's covered, and why each matters:

| File | Guards against |
| --- | --- |
| `post-validation.test.ts` | posts a network would reject; wrong character counts; slow counting on hostile input |
| `repeat.test.ts` | repeating posts drifting an hour at DST; month-end overflow; unbounded catch-up |
| `security-inputs.test.ts` | XSS in agent chat markdown; unsafe OAuth redirect URIs |
| `stripe-sync.test.ts` | out-of-order Stripe events restoring or wiping subscriptions; swallowed DB errors |
| `publisher.test.ts` | a database blip failing paying customers' posts or sending without media |
| `adapters.test.ts` | duplicate posts on retry (Bluesky, Mastodon, YouTube); text truncation |
| `account-removal.test.ts` | account/workspace deletion order, blockers, exact email matching, usage hand-over |
| `emails.test.ts` | email spam/duplicates, retry after Resend outages, HTML/header injection |
| `allowances.test.ts` | trial-sized allowances; DB errors read as "no plan" |

The atomic reservation functions (migration 0055) are database-level and were
checked against the real database with 20 parallel requests; they aren't in
this suite because it never connects to a database.
