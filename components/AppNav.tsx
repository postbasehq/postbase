"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Composer", href: "/composer" },
  { label: "Channels", href: "/channels" },
  { label: "Calendar", href: "/calendar" },
  { label: "Analytics", href: "/analytics" },
  { label: "MCP & API", href: "/api-keys" },
  { label: "Team", href: "/team" },
  { label: "Billing", href: "/billing" },
  { label: "Settings", href: "/settings" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-3">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
              active
                ? "bg-blue-soft text-blue-ink"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
