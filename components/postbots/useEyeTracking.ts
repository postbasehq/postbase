"use client";

import { useEffect, useState } from "react";

/** How far the eyes can move (body units): enough to look, never off the body. */
const MAX = { x: 16, y: 12 };
/** Pointer distance (px) at which the eyes are fully turned. */
const REACH = 320;

/**
 * Makes a Postbot's eyes follow the cursor. `eyes` is where the eyes sit as a
 * fraction of the box. Only on a desktop pointer without reduced motion;
 * returns whether it's on, so the bot can use its "tracking" state.
 */
export function useEyeTracking(
  enabled: boolean,
  boxRef: React.RefObject<HTMLElement | null>,
  eyesRef: React.RefObject<SVGGElement | null>,
  eyes: { x: number; y: number },
): boolean {
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    if (!enabled) return setTracking(false);
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setTracking(fine.matches && !still.matches);
    update();
    fine.addEventListener("change", update);
    still.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      still.removeEventListener("change", update);
    };
  }, [enabled]);

  useEffect(() => {
    if (!tracking) return;
    const target = { x: 0, y: 0 };
    const now = { x: 0, y: 0 };
    let frame = 0;
    const node = eyesRef.current;

    const draw = () => {
      now.x += (target.x - now.x) * 0.18;
      now.y += (target.y - now.y) * 0.18;
      node?.setAttribute("transform", `translate(${now.x.toFixed(2)} ${now.y.toFixed(2)})`);
      // Ease toward the pointer, then stop until it moves again.
      frame = Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.05 ? requestAnimationFrame(draw) : 0;
    };

    const onMove = (e: PointerEvent) => {
      const box = boxRef.current?.getBoundingClientRect();
      if (!box) return;
      const dx = e.clientX - (box.left + box.width * eyes.x);
      const dy = e.clientY - (box.top + box.height * eyes.y);
      const dist = Math.hypot(dx, dy) || 1;
      const pull = Math.min(1, dist / REACH);
      target.x = (dx / dist) * pull * MAX.x;
      target.y = (dy / dist) * pull * MAX.y;
      if (!frame) frame = requestAnimationFrame(draw);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      node?.removeAttribute("transform");
    };
  }, [tracking, boxRef, eyesRef, eyes.x, eyes.y]);

  return tracking;
}
