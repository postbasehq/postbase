"use client";

import { useRef } from "react";
import { Postbot } from "@/components/postbots/Postbot";
import { useEyeTracking } from "@/components/postbots/useEyeTracking";

/** The body only, so its flat top sits on the footer rule. */
const BOX = { w: 278, h: 193 };
/** Where the eyes sit, as a fraction of the box. */
const EYES = { x: 89 / BOX.w, y: 91 / BOX.h };

/**
 * The footer wordmark's p as a Postbot. On a desktop its eyes follow the
 * cursor; on touch screens (and with reduced motion) it just rests.
 */
export function FooterBot({ color, width }: { color: string; width: string }) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const tracking = useEyeTracking(true, boxRef, eyesRef, EYES);

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
