"use client";

import { PostPreview } from "@/components/PostPreview";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { RUNNING } from "@/components/marketing/examples";

/** One post, rendered by the app's real preview component for each network. */
export function PreviewWall() {
  const thread = RUNNING.body.split(/\n{2,}/);
  return (
    <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {RUNNING.channels.map((p) => (
        <div key={p}>
          <div className="mb-2.5 flex items-center gap-2">
            <BrandTile platform={p} size={18} radius={9} />
            <span className="text-[13px] font-semibold text-ink">{BRANDS[p]?.label}</span>
          </div>
          <PostPreview
            platform={p}
            handle={RUNNING.handle}
            displayName={RUNNING.name}
            thread={thread}
            media={[]}
            metrics={null}
            publishedAt={null}
          />
        </div>
      ))}
    </div>
  );
}
