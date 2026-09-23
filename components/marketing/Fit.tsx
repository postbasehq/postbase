"use client";

import { useEffect, useRef, useState } from "react";

type Focus = {
  /** Width the content is laid out at. */
  renderWidth: number;
  /** Width of the window onto it that should fill the container. */
  viewWidth: number;
  /** Top-left of that window, in design px. */
  x?: number;
  y?: number;
  /** Height of the window, in design px. */
  height: number;
};

/**
 * Lays `children` out at least `minWidth` wide and `height` tall, then scales
 * it down (CSS zoom) to the available width. On wide screens it's simply the
 * container's width at zoom 1; on narrow ones a product shot becomes a
 * miniature that keeps all its content. With `mobile`, narrow screens instead
 * get a zoomed-in window onto one part of the shot.
 */
export function Fit({
  minWidth,
  height,
  mobile,
  children,
}: {
  minWidth: number;
  height: number;
  mobile?: Focus;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cw = w ?? minWidth;
  // Phones only; tablets still get the whole shot as a miniature.
  if (mobile && cw < Math.min(minWidth, 640)) {
    const zoom = Math.min(1, cw / mobile.viewWidth);
    return (
      <div ref={ref} className="w-full overflow-hidden rounded-2xl border border-line bg-surface" style={{ height: mobile.height * zoom }}>
        <div style={{ width: mobile.viewWidth, height: mobile.height, zoom, overflow: "hidden" }}>
          <div style={{ width: mobile.renderWidth, height: height, marginLeft: -(mobile.x ?? 0), marginTop: -(mobile.y ?? 0) }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  const width = Math.max(cw, minWidth);
  const zoom = cw / width;
  return (
    <div ref={ref} className="w-full" style={{ height: height * zoom }}>
      <div style={{ width, height, zoom }}>{children}</div>
    </div>
  );
}
