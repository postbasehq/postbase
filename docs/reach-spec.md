# Postbase Reach — product spec

**Status:** in build (foundation). Sibling product to Postbase Schedule, same brand + platform layer.

## One-liner
A conversational link-in-bio that guides every follower to the right content, product, or next step — and shows the creator what their audience actually wants before they buy.

## Why it's separate from Schedule
Different job-to-be-done: Schedule = distribute content *out*; Reach = *convert* an existing archive + audience. Different ICP, different pricing metric (traffic-based), different competitive set (Beacons/Stan/Linktree/Clonosapiens). Public unauthenticated follower surface vs the logged-in scheduler. Shares: OAuth/token vault, channel connections, R2, org/billing, `lib/agent/` runner, `lib/platforms/*`.

## ICP
Knowledge creators, **not** all creators:
- 50k–1M followers
- 100+ published posts/videos (a real archive to search)
- Already sell: courses, affiliates, newsletter, consulting
- Repetitive questions in comments/DMs

## The moat
Not the chatbot — the **intent data**: what followers ask, what we *couldn't* answer (new-product demand), what content/CTAs convert. Lives in `reach_messages` / `reach_leads`.

## MVP scope
1. **Data model** — `reach_pages`, `reach_content` (FTS corpus), `reach_ctas`, `reach_conversations`, `reach_messages`, `reach_leads`. (migration `0029_reach.sql`) ✅
2. **Ingestion** — YouTube titles+transcripts, TikTok captions (reuse `lib/platforms/*`), website scrape, manual entry. Dedupe on `(page_id, source, external_id)`.
3. **Public page** `/r/[handle]` — anonymous conversational surface, served via service role.
4. **Agent** — retrieve from corpus (Postgres FTS now; pgvector later), answer **with citations back to original content**, surface **one** relevant creator-approved CTA, **hard refusal when unsupported** (never invent). Reuses `lib/agent/run-shared.ts`.
5. **Creator dashboard** — top questions, unanswered questions, most-recommended content, CTA clicks/conversions, leads captured, new-product demand.

## Commercial CTAs (creator-approved only)
newsletter · product · course · affiliate · consult · sponsor · link. The agent may only route to these; `description` tells it when each applies.

## Pricing
£29–£99/mo by audience traffic. Free/beta tier for the first cohort of Postbase users.

## Retrieval decision
MVP = Postgres full-text search (`fts` generated tsvector, GIN index) — zero extra pipeline, works day one. Add pgvector embeddings when semantic recall is proven necessary (schema already leaves room).

## Guardrails
- Hard refusal when the corpus can't support an answer — log it as `answered=false` (this is the demand signal, not a failure to hide).
- Only route to creator-approved CTAs.
- Follower email capture is opt-in, stored in `reach_leads`.

## Naming
Master brand: **Postbase**. Products: **Postbase Schedule** (live pending review), **Postbase Reach** (this). Surface: `/r/[handle]` for MVP; `reach.postbase.so` later.

## Sequencing
Built while Schedule is in TikTok/Meta review. Schedule ships first; Reach beta goes to Schedule's own creator users as the cheap distribution + validation channel.
