import * as Sentry from "@sentry/nextjs";
import { baseOptions } from "@/lib/monitoring/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  ...baseOptions,
  dsn,
  enabled: Boolean(dsn),
  // Browser noise that isn't ours to fix.
  ignoreErrors: ["ResizeObserver loop limit exceeded", "ResizeObserver loop completed with undelivered notifications", "Non-Error promise rejection captured"],
});
