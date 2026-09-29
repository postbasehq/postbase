"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SignedIn = { name: string; avatarUrl?: string };

/**
 * The marketing nav's account buttons. Marketing pages are static, so the
 * signed-out buttons render first and swap to "Open app" once the browser
 * finds a session (read from the auth cookie, no network round-trip).
 */
export function NavAuthButtons() {
  const [user, setUser] = useState<SignedIn | null>(null);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return; // Supabase not configured (e.g. a bare self-host preview).
    }
    const apply = (u: { email?: string; user_metadata?: Record<string, unknown> } | null | undefined) => {
      if (!u) return setUser(null);
      const meta = u.user_metadata ?? {};
      setUser({
        name: (meta.full_name as string) || (meta.name as string) || u.email || "",
        avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || undefined,
      });
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => apply(session?.user));
    return () => data.subscription.unsubscribe();
  }, []);

  if (user) {
    return (
      <Link
        href="/calendar"
        className="flex items-center gap-2 whitespace-nowrap rounded-full bg-blue py-1.5 pl-1.5 pr-4 font-display text-[14px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-on-blue text-[12px] font-bold text-blue">
            {(user.name[0] ?? "?").toUpperCase()}
          </span>
        )}
        Open app
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="hidden whitespace-nowrap rounded-full border border-line px-4 py-2 font-display text-[14px] font-semibold text-ink transition-colors hover:border-ink sm:inline"
      >
        Log in
      </Link>
      <Link
        href="/login"
        className="whitespace-nowrap rounded-full bg-blue px-4 py-2 font-display text-[14px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
      >
        <span className="sm:hidden">Try free</span>
        <span className="hidden sm:inline">Start free trial</span>
      </Link>
    </>
  );
}
