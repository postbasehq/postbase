import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomainFor, hostConfig } from "@/lib/hosts";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Supabase client for server components, route handlers, and server actions. */
export async function createClient() {
  const cookieStore = await cookies();
  // Shared across www, app and bots once the hosts split (lib/hosts.ts).
  const domain = cookieDomainFor(hostConfig(), (await headers()).get("host") ?? "");

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(domain ? { cookieOptions: { domain } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — safe to ignore; middleware refreshes the session
          }
        },
      },
    },
  );
}
