import type { ErrorEvent } from "@sentry/nextjs";

/*
 * Shared Sentry settings for server, edge and browser. Errors only: no
 * tracing, no session replay, no personal data — so it stays in the free
 * tier and needs no cookie consent. Off unless a DSN is set.
 *
 * Env: NEXT_PUBLIC_SENTRY_DSN (browser + server), optional SENTRY_DSN to
 * override on the server; SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT only for
 * source-map upload at build time (next.config.ts).
 */

export const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Strip what could carry secrets or personal data before an event leaves:
 * request bodies (post text, form data), headers (bearer tokens, API keys),
 * cookies, and query strings (OAuth codes/state, invite tokens).
 */
export function scrub(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split("?")[0];
  }
  delete event.user;
  return event;
}

export const baseOptions = {
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: scrub,
};
