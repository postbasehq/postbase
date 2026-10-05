import * as Sentry from "@sentry/nextjs";

// Next calls this once per server runtime; loads the matching Sentry setup.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

// Uncaught errors in server components, route handlers and server actions.
export const onRequestError = Sentry.captureRequestError;
