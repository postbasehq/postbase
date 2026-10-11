import { createBrowserClient } from "@supabase/ssr";
import { cookieDomainFor, hostConfig } from "@/lib/hosts";

/** Supabase client for browser/client components. */
export function createClient() {
  // Shared across www, app and bots once the hosts split (lib/hosts.ts).
  const domain = typeof window === "undefined" ? null : cookieDomainFor(hostConfig(), window.location.host);
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain ? { cookieOptions: { domain } } : undefined,
  );
}
