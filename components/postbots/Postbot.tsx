import { useId } from "react";

export type PostbotState = "resting" | "thinking" | "working";

/**
 * Postbot: the Postbase P brought to life (assets/postbots). The body is the
 * P in `color`; the eyes are cut out of it with a mask, so whatever is behind
 * shows through. `state` sets the animation (styles: .pbot in globals.css):
 *   resting   slow glances and blinks; waves on hover
 *   thinking  face lifts, the far eye squints
 *   working   eyes narrow and scan side to side
 * `viewBox` defaults to the full stage, with room for the bob and the wave.
 */
export function Postbot({
  color,
  state = "resting",
  viewBox = "-45 -35 390 270",
  className,
  style,
  title,
}: {
  color: string;
  state?: PostbotState;
  viewBox?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
  return (
    <svg viewBox={viewBox} className={className} style={style} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g className="pbot" data-state={state} style={{ color }}>
        <g className="pbot-body">
          <defs>
            <mask id={`pbot-eyes-${id}`} className="pbot-eye-mask" maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
              <rect className="pbot-mask-base" x={x} y={y} width={w} height={h} />
              <g transform="translate(8 16)">
                <g className="pbot-face">
                  <g className="pbot-eyes">
                    <g className="pbot-eye-angle">
                      <rect className="pbot-eye" x="51" y="57" width="26" height="46" rx="13" />
                    </g>
                    <g className="pbot-eye-angle">
                      <rect className="pbot-eye pbot-eye-far" x="92" y="45.5" width="19" height="37" rx="9.5" />
                    </g>
                  </g>
                </g>
              </g>
            </mask>
          </defs>
          <g mask={`url(#pbot-eyes-${id})`}>
            <path fill="currentColor" d="M10 0H270Q278 0 278 8C274 58 249 88 214 88C180 88 150 64 150 32V118A75 75 0 0 1 0 118V10Q0 0 10 0Z" />
          </g>
        </g>
      </g>
    </svg>
  );
}
