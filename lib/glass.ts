import type { CSSProperties } from "react";

/**
 * The Postbase "brand glass" surface — a frosted, translucent panel with the
 * three brand colours (blue, amber, terracotta) washing across it. Mirrors the
 * composer's BRAND_GLASS_PANEL so glassy surfaces look the same app-wide.
 * Spread `style` and append `className` onto a rounded container.
 */
export const BRAND_GLASS: { className: string; style: CSSProperties } = {
  className:
    "border border-white/15 bg-surface/70 shadow-[0_28px_80px_-24px_rgba(16,24,40,0.55)] backdrop-blur-2xl",
  style: {
    backgroundImage: [
      "radial-gradient(120% 90% at 0% 0%, #2b59d93d, transparent 55%)", // brand blue
      "radial-gradient(110% 80% at 100% 4%, #e3a72c2e, transparent 52%)", // amber
      "radial-gradient(120% 85% at 100% 100%, #d14a3e29, transparent 55%)", // terracotta
    ].join(","),
  },
};
