import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { BRANDS } from "@/components/BrandTile";
import { LOGOS } from "@/components/ClientLogo";

/*
 * Per-page share cards (1200×630) for the SEO pages and blog, in the same
 * style as the homepage card (app/opengraph-image.tsx): brand blue, the logo's
 * amber and red shapes, the Postbase mark, a small label, the page title and
 * optional network tiles.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

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
  const [logo, bold, semibold] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "postbase-icon.png")),
    readFile(path.join(process.cwd(), "assets", "fonts", "PlusJakartaSans-700.woff")),
    readFile(path.join(process.cwd(), "assets", "fonts", "PlusJakartaSans-600.woff")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const size = title.length > 60 ? 64 : title.length > 40 ? 76 : 88;

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
          justifyContent: "space-between",
          padding: "64px 80px",
          background: "#2b59d9",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Jakarta",
        }}
      >
        <div style={{ position: "absolute", right: -140, top: -160, width: 440, height: 440, borderRadius: 9999, background: "#e3a72c" }} />
        <div
          style={{
            position: "absolute",
            left: -110,
            bottom: -190,
            width: 500,
            height: 300,
            borderRadius: 90,
            background: "#d14a3e",
            transform: "rotate(-14deg)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", padding: 6, borderRadius: 20, background: "white" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={56} height={56} style={{ borderRadius: 14 }} alt="" />
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "white", letterSpacing: -1 }}>Postbase</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 18px",
              borderRadius: 999,
              background: "white",
              color: "#2b59d9",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
          <div style={{ marginTop: 26, fontSize: size, fontWeight: 700, color: "white", lineHeight: 1.05, letterSpacing: -2.5 }}>{title}</div>
        </div>

        <div style={{ display: "flex", gap: 14, minHeight: 72 }}>
          {tiles.map((t) => (
            <div
              key={t.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 18,
                ...(t.bg.startsWith("linear-gradient") ? { backgroundImage: t.bg } : { backgroundColor: t.bg }),
                boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill={t.fill}>
                <path d={t.path} />
              </svg>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Jakarta", data: bold, weight: 700, style: "normal" },
        { name: "Jakarta", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
