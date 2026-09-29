/*
 * "postbase" hanging from the footer rule. The p is the red p from the icon;
 * the other letters are Plus Jakarta Sans ExtraBold. Everything is cut flat
 * along the top edge, the way the icon cuts the p through its bowl.
 *
 * Sizes are in em so the whole word scales with the font size, which is set in
 * container units to fill the footer's width. With line-height 1, Jakarta's
 * baseline sits 0.908em down the line box (ascent 1.038, descent 0.222).
 */

const BASELINE = 0.908;
/** How much of the x-height (0.546em) shows below the cut. */
const SHOWN = 0.44;
/** Stem width of the icon p; its bowl is a half-disc of half this width. */
const W = 0.4;

const RED = "#d14a3e";

/** The icon's p: a stem with a rounded foot and a half-disc bowl on the cut line. */
function IconP() {
  const r = W / 2;
  return (
    <svg viewBox={`0 0 ${W * 2} ${W * 1.5}`} style={{ width: `${W * 2}em`, height: `${W * 1.5}em` }} className="shrink-0">
      <path d={`M0,0 H${W} V${W * 1.5 - r} A${r},${r} 0 0 1 0,${W * 1.5 - r} Z`} fill={RED} />
      <path d={`M${W},0 H${W * 2} A${r},${r} 0 0 1 ${W},0 Z`} fill={RED} />
    </svg>
  );
}

function Text({ children }: { children: string }) {
  return (
    <span className="whitespace-pre font-display font-extrabold tracking-[-0.04em] text-ink" style={{ marginTop: `-${BASELINE - SHOWN}em` }}>
      {children}
    </span>
  );
}

export function FooterWordmark() {
  return (
    <div className="@container" aria-hidden>
      <div className="flex items-start gap-[0.04em] overflow-hidden leading-none" style={{ fontSize: "22cqw", height: `${W * 1.5}em` }}>
        <IconP />
        <Text>ostbase</Text>
      </div>
    </div>
  );
}
