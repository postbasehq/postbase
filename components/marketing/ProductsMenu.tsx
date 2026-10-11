"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { DevShot } from "@/components/marketing/DevShot";
import { PostbotsShot } from "@/components/marketing/PostbotsShot";
import { ClientLogo } from "@/components/ClientLogo";
import { McpInActionDemo } from "@/components/marketing/seo/McpDemo";
import { MCP_SCENES } from "@/lib/seo/mcp-scenes";
import { PRODUCTS, type ProductId } from "@/lib/seo/products";

/*
 * The "Products" dropdown: every Postbase product on the left, and a live
 * preview of the one you're hovering on the right (the same animated product
 * shots the site uses, scaled down). Previews only mount while the menu is
 * open, so they cost nothing until someone looks.
 */

// The AI tools the MCP server works with, cycled in its icon.
const MCP_CLIENTS = ["claude", "chatgpt", "cursor", "gemini", "vscode", "windsurf"];

/** The MCP server's mark: the logos of the AI tools it works with, cross-fading in turn. */
function McpIcon() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % MCP_CLIENTS.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    // White tiles, so the black logos (ChatGPT, Cursor) still show in dark mode.
    <span className="relative size-9 shrink-0">
      {MCP_CLIENTS.map((c, n) => (
        <span
          key={c}
          className={`absolute inset-0 transition-[opacity,transform] duration-500 [&>span]:!rounded-[10px] ${
            n === i ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
        >
          <ClientLogo id={c} size={36} />
        </span>
      ))}
    </span>
  );
}

/** Each product's mark in the list. */
function ProductIcon({ id }: { id: ProductId }) {
  if (id === "mcp") return <McpIcon />;
  if (id === "scheduler") {
    return (
      <span className="size-9 shrink-0 overflow-hidden rounded-[10px] shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/postbase-icon.png" alt="" className="size-full object-cover" />
      </span>
    );
  }
  if (id === "postbots") {
    return (
      // Just the Postbot's eyes, white on a brand-blue tile.
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] shadow-sm" style={{ background: "#2b59d9" }}>
        <svg viewBox="36 36 88 88" className="size-7" fill="#fff" aria-hidden>
          <rect x="51" y="57" width="26" height="46" rx="13" transform="rotate(-28 64 80)" />
          <rect x="92" y="45.5" width="19" height="37" rx="9.5" transform="rotate(-28 101.5 64)" />
        </svg>
      </span>
    );
  }
  // REST API: curly braces, white on the brand red, so it sits with the other solid tiles.
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] shadow-sm" style={{ background: "#d14a3e" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M8 4H7a2 2 0 0 0-2 2v3.5A2.5 2.5 0 0 1 2.5 12 2.5 2.5 0 0 1 5 14.5V18a2 2 0 0 0 2 2h1M16 4h1a2 2 0 0 1 2 2v3.5a2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0-2.5 2.5V18a2 2 0 0 1-2 2h-1" />
      </svg>
    </span>
  );
}

/** The live preview for a product, drawn at full size and scaled to fit. */
function Preview({ id }: { id: ProductId }) {
  const W = 960;
  const H = 600;
  const scale = 480 / W;
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-line bg-ground" style={{ width: W * scale, height: H * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
        {id === "scheduler" ? <CalendarDemo productShot /> : null}
        {id === "postbots" ? <PostbotsShot /> : null}
        {/* Claude scheduling over MCP, and the post landing on the calendar. */}
        {id === "mcp" ? (
          // Laid out at the frame's shape (928×568 inside the padding) but wider,
          // so the calendar gets all seven days, then scaled down to fill it.
          <div className="h-full p-4">
            <McpInActionDemo scene={MCP_SCENES.hub} minWidth={1180} height={722} claudeWidth={400} />
          </div>
        ) : null}
        {id === "api" ? <DevShot /> : null}
      </div>
    </div>
  );
}

export function ProductsPanel() {
  const [active, setActive] = useState<ProductId>("scheduler");
  // Only mount the (animated) preview while the panel is open.
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = PRODUCTS.find((p) => p.id === active)!;

  // The menu opens with CSS when its nav item is hovered or focused; follow the
  // same item here so the preview is ready as soon as the panel shows.
  useEffect(() => {
    const item = rootRef.current?.closest(".group");
    if (!item) return;
    const show = () => setOpen(true);
    const hide = () => {
      if (!item.matches(":hover") && !item.contains(document.activeElement)) setOpen(false);
    };
    const blur = () => setTimeout(hide, 0);
    item.addEventListener("mouseenter", show);
    item.addEventListener("mouseleave", hide);
    item.addEventListener("focusin", show);
    item.addEventListener("focusout", blur);
    return () => {
      item.removeEventListener("mouseenter", show);
      item.removeEventListener("mouseleave", hide);
      item.removeEventListener("focusin", show);
      item.removeEventListener("focusout", blur);
    };
  }, []);

  return (
    <div ref={rootRef} className="flex gap-6 whitespace-normal p-3">
      <div className="w-[290px] shrink-0">
        <p className="px-3 pb-2 pt-1 text-[13px] font-semibold text-muted">Products</p>
        <ul className="flex flex-col gap-0.5">
          {PRODUCTS.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                onMouseEnter={() => setActive(p.id)}
                onFocus={() => setActive(p.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${active === p.id ? "bg-surface-2" : "hover:bg-surface-2"}`}
              >
                <ProductIcon id={p.id} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                    {p.name}
                    {p.isNew ? (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-white" style={{ background: "#2b59d9" }}>
                        New
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[13px] text-muted">{p.line}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Link href={current.href} className="block" tabIndex={-1} aria-label={current.name}>
          {open ? (
            <Preview key={current.id} id={current.id} />
          ) : (
            <div className="rounded-[16px] border border-line bg-ground" style={{ width: 480, height: 300 }} />
          )}
        </Link>
      </div>
    </div>
  );
}
