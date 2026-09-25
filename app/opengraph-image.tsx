import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// The share card for links to Postbase (X, LinkedIn, Slack, iMessage…).
export const alt = "Postbase: the open-source social media scheduler for creators and AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(path.join(process.cwd(), "public", "postbase-icon.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const networks = ["X", "LinkedIn", "Instagram", "TikTok", "YouTube", "Bluesky", "Mastodon"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#2b59d9",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        {/* logo-colour shapes */}
        <div style={{ position: "absolute", right: -120, top: -140, width: 460, height: 460, borderRadius: 9999, background: "#e3a72c" }} />
        <div
          style={{
            position: "absolute",
            left: -90,
            bottom: -170,
            width: 520,
            height: 320,
            borderRadius: 90,
            background: "#d14a3e",
            transform: "rotate(-14deg)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={72} height={72} style={{ borderRadius: 18 }} alt="" />
          <div style={{ fontSize: 44, fontWeight: 700, color: "white", letterSpacing: -1 }}>Postbase</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, fontWeight: 700, color: "white", lineHeight: 1.02, letterSpacing: -3 }}>Write it once.</div>
          <div style={{ fontSize: 88, fontWeight: 700, color: "white", lineHeight: 1.02, letterSpacing: -3 }}>Post it everywhere.</div>
          <div style={{ marginTop: 28, fontSize: 32, color: "rgba(255,255,255,0.88)", maxWidth: 880, lineHeight: 1.3 }}>
            The open-source social media scheduler for creators and AI agents.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {networks.map((n) => (
            <div
              key={n}
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: 999,
                background: "white",
                color: "#202124",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
