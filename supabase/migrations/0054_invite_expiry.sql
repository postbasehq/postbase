-- ── Team invites expire ────────────────────────────────────────────────
-- Invite links never expired, so an old link (forwarded, or sitting in an
-- inbox) worked forever, and an unanswered invite held a seat forever.
-- Invites now last 7 days; expired ones can't be accepted, don't count as a
-- seat, and can be re-sent (new link, new expiry) from the Team page.

alter table org_invites
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days');
