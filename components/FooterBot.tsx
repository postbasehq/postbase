"use client";

import { useEffect, useRef, useState } from "react";
import { Postbot } from "@/components/postbots/Postbot";

/** The body only, so its flat top sits on the footer rule. */
const BOX = { w: 278, h: 193 };
/** Where the eyes sit, in the body's units (they're drawn around here). */
const EYES = { x: 89, y: 91 };
/** How far the eyes can move (body units): enough to look, never off the body. */
const MAX = { x: 16, y: 12 };
/** Pointer distance (px) at which the eyes are fully turned. */
const REACH = 320;

/**
 * The footer wordmark's p as a Postbot. On a desktop its eyes follow the
 * cursor; on touch screens (and with reduced motion) it just rests.
 */
export function FooterBot({ color, width }: { color: string; width: string }) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!tracking) return;
    const target = { x: 0, y: 0 };
    const now = { x: 0, y: 0 };
    let frame = 0;

    const draw = () => {
      now.x += (target.x - now.x) * 0.18;
      now.y += (target.y - now.y) * 0.18;
      eyesRef.current?.setAttribute("transform", `translate(${now.x.toFixed(2)} ${now.y.toFixed(2)})`);
      // Ease toward the pointer, then stop until it moves again.
      frame = Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.05 ? requestAnimationFrame(draw) : 0;
    };

    const onMove = (e: PointerEvent) => {
      const box = boxRef.current?.getBoundingClientRect();
      if (!box) return;
      const dx = e.clientX - (box.left + (box.width * EYES.x) / BOX.w);
      const dy = e.clientY - (box.top + (box.height * EYES.y) / BOX.h);
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
      eyesRef.current?.removeAttribute("transform");
    };
  }, [tracking]);

  return (
    <span ref={boxRef} className="block shrink-0" style={{ width, aspectRatio: `${BOX.w} / ${BOX.h}` }}>
      <Postbot
        color={color}
        state={tracking ? "tracking" : "resting"}
        viewBox={`0 0 ${BOX.w} ${BOX.h}`}
        eyesRef={eyesRef}
        className="block size-full"
      />
    </span>
  );
}
