import { Postbot, type PostbotState } from "@/components/postbots/Postbot";
import { BOT_COLORS, type BotColor } from "@/lib/postbots/types";

/**
 * A bot's face: the animated Postbot in the bot's solid brand colour.
 * `state` sets what it's doing (resting, thinking, working). `dot` adds a
 * small status dot (green = running on a schedule, amber = paused).
 */
export function BotAvatar({
  color,
  size = 40,
  state = "resting",
  dot,
}: {
  color: BotColor;
  size?: number;
  state?: PostbotState;
  dot?: "green" | "amber" | null;
}) {
  const fill = BOT_COLORS[color] ?? BOT_COLORS.blue;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      {/* Cropped close to the body, with headroom for the bob. */}
      <Postbot color={fill} state={state} viewBox="-14 -24 306 240" className="block size-full" />
      {dot ? (
        <span
          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-ground"
          style={{ background: dot === "amber" ? "#e3a72c" : "#188038" }}
        />
      ) : null}
    </span>
  );
}
