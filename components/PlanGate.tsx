"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/marketing/Decor";
import { PLAN_ORDER, PLANS } from "@/lib/plans";

// Reachable without a plan: pick one, connect channels, manage the team, and
// write drafts (the composer only blocks scheduling until a trial starts).
const OPEN_PREFIXES = ["/billing", "/channels", "/team", "/settings", "/composer", "/drafts"];

// A title that fits the page behind the card.
const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/calendar", title: "Your calendar is ready when you are" },
  { prefix: "/queue", title: "Your queue is ready when you are" },
  { prefix: "/analytics", title: "Your analytics start with your first post" },
  { prefix: "/agent", title: "Meet your posting agent" },
  { prefix: "/media", title: "Your media library is waiting" },
  { prefix: "/api-keys", title: "Connect your AI tools and apps" },
];

const RECOMMENDED = "team";

/**
 * Shown over the page when the workspace has no active plan (billing enforced +
 * no trialing/active subscription + not comped). The real page sits faded
 * behind it so people see what they're unlocking. The server also blocks
 * scheduling, publishing and AI; this is the friendly front door.
 */
export function PlanGate({
  locked,
  linkedTo = null,
  trial = true,
  children,
}: {
  locked: boolean;
  /** Checking out starts the free trial (lib/trial.ts); false once the workspace has had it. */
  trial?: boolean;
  /** This workspace's plan belongs to another workspace (whose plan has lapsed). */
  linkedTo?: { name: string; canManage: boolean } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  if (!locked || OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return <>{children}</>;
  }
  const title = TITLES.find((t) => pathname.startsWith(t.prefix))?.title ?? "Start posting with Postbase";

  return (
    <div className="relative h-full min-h-[560px]">
      {/* The real page, faded, so it's clear what the plan unlocks. */}
      <div className="pointer-events-none h-full select-none overflow-hidden opacity-30 blur-[2px]" aria-hidden inert>
        {children}
      </div>

      <div className="absolute inset-0 flex items-start justify-center overflow-y-auto px-4 py-10">
        <div className="w-full max-w-[460px] rounded-[22px] border border-line bg-surface p-2 shadow-2xl">
          {/* Zone 1: what this is and what it costs */}
          <div className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface-2 p-5">
            <LogoMark color="currentColor" className="pointer-events-none absolute -z-10 right-5 top-0 w-[120px] text-ink opacity-[0.06]" />
            {linkedTo ? (
              <>
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Plan paused</div>
                <h2 className="mt-1.5 font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                  {linkedTo.name}&apos;s plan has ended
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  This workspace is part of {linkedTo.name}&apos;s plan. Scheduling and publishing start again as soon as
                  it&apos;s renewed. Drafts and channels are all still here.
                </p>
              </>
            ) : (
              <>
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {trial ? "7 days free" : "Pick a plan"}
                </div>
                <h2 className="mt-1.5 font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  {trial
                    ? "Pick a plan to schedule and publish. $0 today, and nothing is charged if you cancel before the trial ends."
                    : "Pick a plan to schedule and publish again. This workspace has already had its free trial, so the plan starts and is charged today. Your drafts and channels are all still here."}
                </p>
              </>
            )}
          </div>

          {/* Zone 2: the plans, then the one action */}
          <div className="px-3 pb-3 pt-3">
            {linkedTo ? null : (
              <ul className="flex flex-col">
                {PLAN_ORDER.map((id) => {
                  const p = PLANS[id];
                  const rec = id === RECOMMENDED;
                  return (
                    <li key={id}>
                      <Link
                        href={`/billing?plan=${id}&interval=month`}
                        className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-display text-[15px] font-semibold text-ink">{p.name}</span>
                            {rec ? (
                              <span className="rounded-full bg-[#2b59d9] px-2 py-0.5 text-[10px] font-semibold text-white">Recommended</span>
                            ) : null}
                          </span>
                          <span className="block text-[12px] text-muted">
                            {p.channels} channels · {p.seats} {p.seats === 1 ? "person" : "people"}
                            {p.workspaces > 1 ? ` · ${p.workspaces} workspaces` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="font-display text-[16px] font-semibold tabular-nums text-ink">${p.monthly}</span>
                          <span className="text-[12px] text-muted">/mo</span>
                        </span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden>
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line px-2 pt-4">
              {linkedTo && !linkedTo.canManage ? (
                <p className="text-[13px] text-muted">Ask an owner of {linkedTo.name} to renew the plan.</p>
              ) : (
                <Link
                  href="/billing"
                  className="rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
                >
                  {linkedTo ? "Renew the plan" : "Choose a plan"}
                </Link>
              )}
              <Link href="/channels" className="text-[13px] font-semibold text-blue-ink hover:underline">
                Connect channels
              </Link>
            </div>
            {linkedTo ? null : (
              <p className="px-2 pt-3 text-[12px] leading-snug text-muted">
                While you decide, you can connect channels and write drafts.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
