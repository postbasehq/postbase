import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, baseOptions } from "@/lib/monitoring/sentry-options";

Sentry.init({ ...baseOptions, dsn: SENTRY_DSN, enabled: Boolean(SENTRY_DSN) });
