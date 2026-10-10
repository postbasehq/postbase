import { FooterBot } from "@/components/FooterBot";

/*
 * "postbase" hanging from the footer rule. The p is the red Postbot (the
 * icon's p with eyes); the other letters are Plus Jakarta Sans ExtraBold. Everything is cut flat
 * along the top edge, the way the icon cuts the p through its bowl.
 *
 * Sizes are in em so the whole word scales with the font size, which is set in
 * container units to fill the footer's width. With line-height 1, Jakarta's
 * baseline sits 0.908em down the line box (ascent 1.038, descent 0.222).
 */

const BASELINE = 0.908;
/** How much of the x-height (0.546em) shows below the cut. */
const SHOWN = 0.44;
/** Stem width of the icon p; the Postbot p is twice this wide. */
const W = 0.4;

const RED = "#d14a3e";

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
        {/* The p is a Postbot: its eyes follow the cursor on desktop. */}
        <FooterBot color={RED} width={`${W * 2}em`} />
        <Text>ostbase</Text>
      </div>
    </div>
  );
}
