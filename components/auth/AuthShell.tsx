import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthScene } from "@/components/auth/AuthScene";

type Tone = "blue" | "amber" | "red";

const PANEL: Record<Tone, { bg: string; shapes: [string, string]; fg: string; sub: string }> = {
  blue: { bg: "#2b59d9", shapes: ["#e3a72c", "#d14a3e"], fg: "text-white", sub: "text-white/80" },
  amber: { bg: "#e3a72c", shapes: ["#2b59d9", "#d14a3e"], fg: "text-[#202124]", sub: "text-[#202124]/75" },
  red: { bg: "#d14a3e", shapes: ["#e3a72c", "#2b59d9"], fg: "text-white", sub: "text-white/80" },
};

/**
 * Split-screen frame for sign-in, invites and the MCP consent page: the form
 * on the left, and on wide screens a brand-colour panel with a live scene of
 * the real app on the right.
 */
export function AuthShell({
  tone,
  scene,
  title,
  sub,
  children,
}: {
  tone: Tone;
  scene: "creators" | "teams" | "developers";
  title: React.ReactNode;
  sub: string;
  children: React.ReactNode;
}) {
  const p = PANEL[tone];
  return (
    <div className="grid min-h-dvh bg-ground lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex min-h-dvh flex-col px-6 py-6 md:px-12">
        <header className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-muted">
          <span>© {new Date().getFullYear()} Postbase</span>
          <a href="/terms" className="hover:text-ink">Terms</a>
          <a href="/privacy" className="hover:text-ink">Privacy</a>
          <a href="mailto:team@postbase.so" className="hover:text-ink">Help</a>
        </footer>
      </div>

      <aside
        className="relative isolate m-3 hidden flex-col overflow-hidden rounded-[32px] lg:flex"
        style={{ backgroundColor: p.bg }}
      >
        <span aria-hidden className="absolute -right-20 -top-24 -z-10 size-72 rounded-full" style={{ backgroundColor: p.shapes[0] }} />
        <span
          aria-hidden
          className="absolute -bottom-24 -left-16 -z-10 h-56 w-80 rotate-[-14deg] rounded-[56px]"
          style={{ backgroundColor: p.shapes[1] }}
        />
        <div className="px-12 pt-14">
          <h2 className={`max-w-[16ch] font-display text-[clamp(32px,3.4vw,48px)] font-semibold leading-[1.02] tracking-[-0.035em] ${p.fg}`}>
            {title}
          </h2>
          <p className={`mt-4 max-w-[42ch] text-[16px] leading-relaxed ${p.sub}`}>{sub}</p>
        </div>
        <div className="mx-auto my-auto w-full max-w-[600px] px-8 py-8">
          <AuthScene scene={scene} />
        </div>
      </aside>
    </div>
  );
}
