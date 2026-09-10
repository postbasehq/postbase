import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    email = user.email ?? undefined;
  } catch {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh">
      {/* sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Logo />
        </div>
        <AppNav />
        <div className="border-t border-line p-3 text-xs text-muted">
          <div className="truncate px-3 py-1">{email}</div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-line px-6">
          <span className="font-display text-sm font-semibold text-muted md:hidden">
            Postbase
          </span>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/composer"
              className="rounded-full bg-blue px-4 py-2 font-display text-sm font-semibold text-on-blue shadow-sm"
            >
              New post
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
