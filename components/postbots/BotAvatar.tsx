"use client";

import { useRef } from "react";
import { Postbot, type PostbotState } from "@/components/postbots/Postbot";
import { useEyeTracking } from "@/components/postbots/useEyeTracking";
import { BOT_COLORS, type BotColor } from "@/lib/postbots/types";

/** Cropped close to the body, with headroom for the bob. */
const VIEW = { x: -14, y: -24, w: 306, h: 240 };
/** Where the eyes sit, as a fraction of the avatar. */
const EYES = { x: (89 - VIEW.x) / VIEW.w, y: (91 - VIEW.y) / VIEW.h };

/**
 * A bot's face: the animated Postbot in the bot's solid brand colour.
 * `state` sets what it's doing (resting, thinking, working). `follow` makes
 * its eyes follow the cursor while it rests. `dot` adds a small status dot
 * (green = running on a schedule, amber = paused).
 */
export function BotAvatar({
  color,
  size = 40,
  state = "resting",
  follow = false,
  dot,
}: {
  color: BotColor;
  size?: number;
  state?: PostbotState;
  follow?: boolean;
  dot?: "green" | "amber" | null;
}) {
  const fill = BOT_COLORS[color] ?? BOT_COLORS.blue;
  const boxRef = useRef<HTMLSpanElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const tracking = useEyeTracking(follow && state === "resting", boxRef, eyesRef, EYES);
  return (
    <span ref={boxRef} className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      <Postbot
        color={fill}
        state={tracking ? "tracking" : state}
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        eyesRef={eyesRef}
        className="block size-full"
      />
      {dot ? (
        <span
          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-ground"
          style={{ background: dot === "amber" ? "#e3a72c" : "#188038" }}
        />
      ) : null}
    </span>
  );
}
