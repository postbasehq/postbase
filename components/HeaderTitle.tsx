"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { RangeTabs } from "@/components/analytics/RangeTabs";

// Map the current route to its page title, shown in the app header.
const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/agent", title: "Agent" },
  { prefix: "/calendar", title: "Calendar" },
  { prefix: "/queue", title: "Queue" },
  { prefix: "/composer/", title: "Edit post" },
  { prefix: "/composer", title: "New post" },
  { prefix: "/drafts", title: "Drafts" },
  { prefix: "/channels", title: "Channels" },
  { prefix: "/media", title: "Media" },
  { prefix: "/analytics", title: "Analytics" },
  { prefix: "/api-keys", title: "AI & API" },
  { prefix: "/team", title: "Team" },
  { prefix: "/billing", title: "Billing" },
  { prefix: "/settings", title: "Settings" },
];

export function HeaderTitle() {
  const pathname = usePathname() ?? "";
  const match = TITLES.find((t) => pathname === t.prefix || pathname.startsWith(t.prefix));
  return (
    <div className="flex min-w-0 items-center gap-4">
      <h1 className="font-display text-lg font-semibold tracking-[-0.01em]">{match?.title ?? "Postbase"}</h1>
      {/* Page controls that belong with the title. */}
      {pathname.startsWith("/analytics") ? (
        <Suspense fallback={null}>
          <RangeTabs />
        </Suspense>
      ) : null}
    </div>
  );
}
