/**
 * The Postbase AI mark — a "twin spark": a four-point sparkle with a small
 * companion. Monochrome (inherits `currentColor`, no background), so it drops
 * into the nav, message avatars, empty states and favicons and picks up the
 * surrounding text/brand colour. Pass `animated` for the twinkle used in the
 * agent's thinking state; it's static everywhere else.
 */
export function AgentSparkIcon({
  size = 16,
  animated = false,
  className,
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <g transform="translate(9,13)">
        <path
          className={animated ? "agent-spark-main" : undefined}
          d="M0,-8.5 C0.94,-3.32 3.32,-0.94 8.5,0 C3.32,0.94 0.94,3.32 0,8.5 C-0.94,3.32 -3.32,0.94 -8.5,0 C-3.32,-0.94 -0.94,-3.32 0,-8.5 Z"
        />
      </g>
      <g transform="translate(18,7)">
        <path
          className={animated ? "agent-spark-dot" : undefined}
          d="M0,-4 C0.44,-1.56 1.56,-0.44 4,0 C1.56,0.44 0.44,1.56 0,4 C-0.44,1.56 -1.56,0.44 -4,0 C-1.56,-0.44 -0.44,-1.56 0,-4 Z"
        />
      </g>
    </svg>
  );
}
