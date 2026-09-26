"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Reachable without a plan: pick one, connect channels, manage the team.
const OPEN_PREFIXES = ["/billing", "/channels", "/team", "/settings"];

/**
 * Shown in place of the page when the workspace has no active plan (billing
 * enforced + no trialing/active subscription + not comped). The server also
 * blocks scheduling, publishing and AI — this is just the friendly front door.
 */
export function PlanGate({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (!locked || OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <h2 className="font-display text-xl font-semibold">Start your 7-day free trial</h2>
        <p className="mt-2 text-sm text-muted">
          Pick a plan to schedule and publish posts. You won&apos;t be charged until the trial
          ends, and you can cancel any time.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/billing"
            className="rounded-full bg-blue px-5 py-2 font-display text-sm font-semibold text-on-blue shadow-sm"
          >
            Choose a plan
          </Link>
          <Link
            href="/channels"
            className="rounded-full border border-line px-5 py-2 font-display text-sm font-semibold"
          >
            Connect channels
          </Link>
        </div>
      </div>
    </div>
  );
}
