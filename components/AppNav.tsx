"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

type Item = { label: string; href: string; icon: ComponentType; external?: boolean };
type Section = { label: string | null; items: Item[] };

const SECTIONS: Section[] = [
  {
    label: null,
    items: [
      { label: "Calendar", href: "/calendar", icon: CalendarIcon },
      { label: "Queue", href: "/queue", icon: QueueIcon },
      { label: "Composer", href: "/composer", icon: ComposerIcon },
      { label: "Drafts", href: "/drafts", icon: DraftsIcon },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Channels", href: "/channels", icon: ChannelsIcon },
      { label: "Media", href: "/media", icon: MediaIcon },
      { label: "Analytics", href: "/analytics", icon: AnalyticsIcon },
    ],
  },
  {
    label: "Developer",
    items: [
      { label: "MCP & API", href: "/api-keys", icon: ApiIcon },
      {
        label: "Docs",
        href: "https://github.com/postbasehq/postbase",
        icon: DocsIcon,
        external: true,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Team", href: "/team", icon: TeamIcon },
      { label: "Billing", href: "/billing", icon: BillingIcon },
      { label: "Settings", href: "/settings", icon: SettingsIcon },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Postbase on X", href: "https://x.com/postbasehq", icon: XIcon, external: true },
      // TODO: wire Feedback (swap href for a form/route, or convert to a modal trigger).
      { label: "Feedback", href: "#", icon: FeedbackIcon },
    ],
  },
];

export function AppNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {SECTIONS.map((section, i) => (
        <div key={section.label ?? `section-${i}`} className="flex flex-col gap-0.5">
          {section.label ? (
            <div className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted/70">
              {section.label}
            </div>
          ) : null}
          {section.items.map((item) => {
            const Icon = item.icon;
            const inner = (
              <>
                <span className="flex size-4 shrink-0 items-center justify-center">
                  <Icon />
                </span>
                {item.label}
                {item.external ? (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-auto shrink-0 opacity-60"
                    aria-hidden
                  >
                    <path d="M7 17 17 7M8 7h9v9" />
                  </svg>
                ) : null}
              </>
            );
            const cls =
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${cls} text-muted hover:bg-surface-2 hover:text-ink`}
                >
                  {inner}
                </a>
              );
            }
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${cls} ${
                  active
                    ? "bg-blue-soft text-blue-ink"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ── Icons (Lucide-style, 16px, inherit currentColor) ────────────────────────
const svg = "shrink-0";
function base(children: React.ReactNode) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={svg}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function CalendarIcon() {
  return base(
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>,
  );
}
function QueueIcon() {
  return base(
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>,
  );
}
function ComposerIcon() {
  return base(
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>,
  );
}
function ChannelsIcon() {
  return base(
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </>,
  );
}
function MediaIcon() {
  return base(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-4.5-4.5L5 21" />
    </>,
  );
}
function AnalyticsIcon() {
  return base(
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 4-6" />
    </>,
  );
}
function ApiIcon() {
  return base(
    <>
      <path d="m8 9-3 3 3 3M16 9l3 3-3 3M13 7l-2 10" />
    </>,
  );
}
function TeamIcon() {
  return base(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>,
  );
}
function BillingIcon() {
  return base(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>,
  );
}
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={svg} aria-hidden>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}
function FeedbackIcon() {
  return base(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />);
}
function DraftsIcon() {
  return base(
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>,
  );
}
function DocsIcon() {
  return base(
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </>,
  );
}
function SettingsIcon() {
  return base(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>,
  );
}
