import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { BRANDS } from "@/components/BrandTile";
import { LOGOS } from "@/components/ClientLogo";

/*
 * Per-page share cards (1200×630) for the SEO pages and blog, in the same
 * style as the homepage card (app/opengraph-image.tsx): the dark page, the
 * Postbase marks flush with the edges, Plus Jakarta Sans, a small label, the
 * page title and optional network or client tiles. Centred, and clear of the
 * bottom band where X lays the page title over the image.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";
export const OG_INK = "#e8eaed";
export const OG_BLUE = "#8ab4f8";
export const OG_GROUND = "#202124";

/** The Postbase mark (the logo's bar and half disc), flat side on a page edge. */
export function OgMark({ color, edge, width, style }: { color: string; edge: "top" | "left" | "right"; width: number; style: React.CSSProperties }) {
  const side = edge !== "top";
  const box = side ? "0 0 227 301" : "0 0 301 227";
  const m = edge === "left" ? "matrix(0 -1 1 0 0 301)" : edge === "right" ? "matrix(0 1 -1 0 227 0)" : undefined;
  const height = Math.round(side ? (width * 301) / 227 : (width * 227) / 301);
  return (
    <svg width={width} height={height} viewBox={box} style={{ position: "absolute", ...style }}>
      {/* An undefined transform makes the renderer drop the shape. */}
      <g {...(m ? { transform: m } : {})}>
        <path d="M0 0H150V152A75 75 0 0 1 0 152Z" fill={color} />
        <path d="M150 0H301A75 75 0 0 1 151 0Z" fill={color} />
      </g>
    </svg>
  );
}

/**
 * The four marks, placed as in the homepage hero. In their own full-size
 * layer: returned as a fragment, the renderer lays them out with the centred
 * column instead of at their absolute positions.
 */
export function OgMarks() {
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: OG_SIZE.width, height: OG_SIZE.height, display: "flex" }}>
      <OgMark color="#d14a3e" edge="top" width={104} style={{ left: 150, top: 0, transform: "scaleX(-1)" }} />
      <OgMark color="#2b59d9" edge="left" width={112} style={{ left: 0, top: 236 }} />
      <OgMark color="#e3a72c" edge="top" width={116} style={{ right: 150, top: 0 }} />
      <OgMark color="#2b59d9" edge="right" width={128} style={{ right: 0, top: 262, transform: "scaleY(-1)" }} />
    </div>
  );
}

/** The logo and Plus Jakarta Sans (600, 700), for ImageResponse. */
export async function ogAssets() {
  const [logo, bold, semibold] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "postbase-icon.png")),
    readFile(path.join(process.cwd(), "assets", "fonts", "PlusJakartaSans-700.woff")),
    readFile(path.join(process.cwd(), "assets", "fonts", "PlusJakartaSans-600.woff")),
  ]);
  return {
    logoSrc: `data:image/png;base64,${logo.toString("base64")}`,
    fonts: [
      { name: "Jakarta", data: bold, weight: 700 as const, style: "normal" as const },
      { name: "Jakarta", data: semibold, weight: 600 as const, style: "normal" as const },
    ],
  };
}

export async function ogImage({
  label,
  title,
  brands = [],
  clients = [],
}: {
  label: string;
  title: string;
  /** BrandTile ids to show as tiles. */
  brands?: string[];
  /** ClientLogo ids to show as tiles. */
  clients?: string[];
}) {
  const { logoSrc, fonts } = await ogAssets();
  const size = title.length > 60 ? 58 : title.length > 40 ? 68 : 78;

  const tiles = [
    ...brands.filter((b) => BRANDS[b]).map((b) => ({ key: b, bg: BRANDS[b].bg, fill: "#fff", path: BRANDS[b].path })),
    ...clients
      .map((c) => ({ c, l: LOGOS[c] }))
      .filter((x) => x.l)
      .map((x) => ({ key: x.c, bg: "#fff", fill: x.l.color, path: x.l.path })),
  ].slice(0, 7);

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
        <OgMarks />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={52} height={52} style={{ borderRadius: 13 }} alt="" />
          <div style={{ fontSize: 34, fontWeight: 700, color: OG_INK, letterSpacing: -1 }}>Postbase</div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 38,
            padding: "8px 18px",
            borderRadius: 999,
            border: `2px solid ${OG_BLUE}`,
            color: OG_BLUE,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            textAlign: "center",
            maxWidth: 860,
            marginTop: 22,
            fontSize: size,
            fontWeight: 700,
            color: OG_INK,
            lineHeight: 1.06,
            letterSpacing: -2.5,
          }}
        >
          {title}
        </div>

        {tiles.length ? (
          <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
            {tiles.map((t) => (
              <div
                key={t.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  ...(t.bg.startsWith("linear-gradient") ? { backgroundImage: t.bg } : { backgroundColor: t.bg }),
                  boxShadow: "0 12px 26px rgba(0,0,0,0.35)",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill={t.fill}>
                  <path d={t.path} />
                </svg>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
