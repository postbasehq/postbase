"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { DevShot } from "@/components/marketing/DevShot";
import { PostbotsShot } from "@/components/marketing/PostbotsShot";
import { Postbot } from "@/components/postbots/Postbot";
import { CLIENTS } from "@/lib/seo/clients";
import { PRODUCTS, type ProductId } from "@/lib/seo/products";

const CLAUDE = CLIENTS.find((c) => c.slug === "claude");

/*
 * The "Products" dropdown: every Postbase product on the left, and a live
 * preview of the one you're hovering on the right (the same animated product
 * shots the site uses, scaled down). Previews only mount while the menu is
 * open, so they cost nothing until someone looks.
 */

/** Each product's mark in the list. */
function ProductIcon({ id }: { id: ProductId }) {
  if (id === "postbots") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2">
        <Postbot color="#2b59d9" viewBox="-14 -24 306 240" className="size-7" />
      </span>
    );
  }
  const paths: Record<Exclude<ProductId, "postbots">, React.ReactNode> = {
    scheduler: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="3" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
    mcp: (
      <>
        <path d="M8 12h8M12 8v8" />
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      </>
    ),
    api: <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />,
  };
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-ink">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {paths[id]}
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
        {id === "mcp" ? <DevShot client={CLAUDE} /> : null}
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
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Products</p>
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

      <div className="border-l border-line pl-6">
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
