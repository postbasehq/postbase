import { ImageResponse } from "next/og";
import { BRANDS } from "@/components/BrandTile";
import { OG_GROUND, OgMarks, ogAssets } from "@/lib/og";

// The share card for links to Postbase (X, LinkedIn, Slack, iMessage…), in the
// homepage hero's style: the dark page, the Postbase marks flush with the
// edges (as in components/marketing/Decor), Plus Jakarta Sans, the headline
// with "everywhere" underlined, and the networks as their logo tiles.
// Everything sits in the centre and clear of the bottom band, where X lays
// the page title over the image.
export const alt = "Postbase: the open-source social media scheduler for creators and AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#e8eaed";
const BLUE = "#8ab4f8"; // the dark theme's link blue, as the hero's "everywhere"
// The image renderer doesn't apply the font's kerning, which pulls "e." together
// on the site; nudge each full stop in by hand.
const STOP: React.CSSProperties = { marginLeft: -12 };

export default async function OpengraphImage() {
  const { logoSrc, fonts } = await ogAssets();
  const networks = ["x", "linkedin", "instagram", "tiktok", "youtube", "bluesky", "mastodon"].filter((n) => BRANDS[n]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 66,
          background: OG_GROUND,
          position: "relative",
          overflow: "hidden",
          fontFamily: "Jakarta",
        }}
      >
        {/* Postbase marks flush with the edges, as in the homepage hero */}
        <OgMarks />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={56} height={56} style={{ borderRadius: 14 }} alt="" />
          <div style={{ fontSize: 38, fontWeight: 700, color: INK, letterSpacing: -1 }}>Postbase</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, color: INK, lineHeight: 1.04, letterSpacing: -3.4 }}>
            Write it once
            <span style={STOP}>.</span>
          </div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, color: INK, lineHeight: 1.04, letterSpacing: -3.4 }}>
            Post it&nbsp;
            <div style={{ display: "flex", flexDirection: "column", position: "relative", color: BLUE }}>
              everywhere
              <svg width="420" height="22" viewBox="0 0 300 16" preserveAspectRatio="none" style={{ position: "absolute", left: 8, bottom: -10 }}>
                <path d="M3 11C60 5 150 2 297 8" fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>
            <span style={STOP}>.</span>
          </div>
          <div style={{ marginTop: 26, fontSize: 28, fontWeight: 600, color: "#9aa0a6", letterSpacing: -0.3 }}>
            The open-source social media scheduler for creators and AI agents
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
          {networks.map((n) => {
            const b = BRANDS[n];
            return (
              <div
                key={n}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  ...(b.bg.startsWith("linear-gradient") ? { backgroundImage: b.bg } : { backgroundColor: b.bg }),
                  boxShadow: "0 12px 26px rgba(0,0,0,0.35)",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
                  <path d={b.path} />
                </svg>
              </div>
            );
          })}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
