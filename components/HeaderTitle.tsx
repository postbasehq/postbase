"use client";

import { usePathname } from "next/navigation";

// Map the current route to its page title, shown in the app header.
const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/calendar", title: "Calendar" },
  { prefix: "/queue", title: "Queue" },
  { prefix: "/composer/", title: "Edit post" },
  { prefix: "/composer", title: "New post" },
  { prefix: "/drafts", title: "Drafts" },
  { prefix: "/channels", title: "Channels" },
  { prefix: "/media", title: "Media" },
  { prefix: "/analytics", title: "Analytics" },
  { prefix: "/api-keys", title: "Developers" },
  { prefix: "/team", title: "Team" },
  { prefix: "/billing", title: "Billing" },
  { prefix: "/settings", title: "Settings" },
  { prefix: "/feedback", title: "Feedback" },
];

export function HeaderTitle() {
  const pathname = usePathname() ?? "";
  const match = TITLES.find((t) => pathname === t.prefix || pathname.startsWith(t.prefix));
  return (
    <h1 className="font-display text-lg font-semibold tracking-[-0.01em]">
      {match?.title ?? "Postbase"}
    </h1>
  );
}
