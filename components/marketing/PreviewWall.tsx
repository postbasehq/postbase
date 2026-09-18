"use client";

import { PostPreview } from "@/components/PostPreview";
import { BrandTile, BRANDS } from "@/components/BrandTile";

/**
 * The same source post, rendered through the real PostPreview component for
 * each network — showing how Postbase shapes one idea into each platform's
 * native format. These are the actual preview cards from the app.
 */
const SOURCE =
  "We just shipped scheduled threads ⚡️\n\nWrite once, pick your channels, set a time — Postbase publishes for you.\n\nOpen-source. MCP-native. #buildinpublic";

const CARDS: {
  platform: string;
  handle: string;
  name: string;
  media: { url: string; type: string }[];
  metrics: Record<string, number> | null;
}[] = [
  {
    platform: "x",
    handle: "postbasehq",
    name: "Postbase",
    media: [{ url: "/demo/poster-landscape.svg", type: "image/svg+xml" }],
    metrics: { likes: 428, comments: 37, shares: 61 },
  },
  {
    platform: "linkedin",
    handle: "postbase",
    name: "Postbase",
    media: [{ url: "/demo/poster-landscape.svg", type: "image/svg+xml" }],
    metrics: null,
  },
  {
    platform: "instagram",
    handle: "postbase",
    name: "Postbase",
    media: [{ url: "/demo/poster-landscape.svg", type: "image/svg+xml" }],
    metrics: { likes: 1290 },
  },
  {
    platform: "tiktok",
    handle: "postbase",
    name: "Postbase",
    media: [{ url: "/demo/poster-portrait.svg", type: "image/svg+xml" }],
    metrics: { likes: 5400, comments: 212, shares: 340 },
  },
];

export function PreviewWall() {
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {CARDS.map((c) => (
        <div key={c.platform}>
          <div className="mb-2 flex items-center gap-2">
            <BrandTile platform={c.platform} size={18} radius={5} />
            <span className="text-[13px] font-semibold text-ink">{BRANDS[c.platform]?.label}</span>
          </div>
          <PostPreview
            platform={c.platform}
            handle={c.handle}
            displayName={c.name}
            thread={SOURCE.split(/\n{2,}/)}
            media={c.media}
            metrics={c.metrics}
            publishedAt={new Date().toISOString()}
            verified
          />
        </div>
      ))}
    </div>
  );
}
