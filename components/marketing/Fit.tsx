"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lays `children` out at least `minWidth` wide and `height` tall, then scales
 * it down (CSS zoom) to the available width. On wide screens it's simply the
 * container's width at zoom 1; on phones a product shot becomes a miniature
 * that keeps all its content instead of being cropped.
 */
export function Fit({ minWidth, height, children }: { minWidth: number; height: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: minWidth, zoom: 1 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const width = Math.max(w, minWidth);
      setBox({ width, zoom: w / width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minWidth]);

  return (
    <div ref={ref} className="w-full" style={{ height: height * box.zoom }}>
      <div style={{ width: box.width, height, zoom: box.zoom }}>{children}</div>
    </div>
  );
}
