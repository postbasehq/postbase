"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Composer", href: "/composer" },
  { label: "Channels", href: "/channels" },
  { label: "Calendar", href: "/dashboard", soon: true },
  { label: "MCP & API", href: "/dashboard", soon: true },
  { label: "Settings", href: "/dashboard", soon: true },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-3">
      {NAV.map((item) => {
        const active = !item.soon && pathname === item.href;
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
            {item.soon ? (
              <span className="rounded-full border border-line px-1.5 text-[10px] text-muted">
                soon
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
