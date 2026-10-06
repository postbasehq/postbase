"use client";

import { useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { AgentShot, shot } from "@/components/marketing/CreatorGrid";
import { McpShot } from "@/components/marketing/DevGrid";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { useLoop } from "@/components/marketing/Mocks";
import { FactUI } from "@/components/marketing/seo/FactUI";
import type { Demo } from "@/lib/changelog";

/*
 * A slice of the real product for a changelog entry, the same screens the rest
 * of the marketing site uses. TwoFactorShot mirrors Settings → Security
 * (components/settings/TwoFactor.tsx).
 */

const CODE = "482913";

/** Settings → Security, with the code being typed into the backup device step. */
function TwoFactorShot() {
  const [typed, setTyped] = useState(CODE);
  const [ref, motion] = useLoop<HTMLDivElement>(async (step) => {
    setTyped("");
    await step(700);
    for (let i = 1; i <= CODE.length; i++) {
      setTyped(CODE.slice(0, i));
      await step(180);
    }
    await step(2600);
  });
  const code = motion ? typed : CODE;
  return (
    <div ref={ref} className={`${shot} w-[460px] p-5`}>
      <div className="text-[13px] font-medium text-muted">Security</div>
      <div className="mt-3 flex items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 text-[14px] font-medium text-ink">
            Two-factor sign-in
            <span className="rounded-full bg-[#2b59d9] px-2 py-0.5 text-[11px] font-semibold text-white">On</span>
          </div>
          <div className="mt-0.5 text-[12px] leading-snug text-muted">
            After Google, GitHub or your email link, Postbase asks for a code from your authenticator app.
          </div>
        </div>
      </div>
      <div className="mt-3 text-[13px] text-muted">Your devices</div>
      {[
        { name: "iPhone", added: "Added 6 Oct 2026" },
        { name: "1Password", added: "Adding a backup device" },
      ].map((d, i) => (
        <div key={d.name} className={`py-3 ${i === 0 ? "border-b border-line" : ""}`}>
          <div className="text-[14px] font-medium text-ink">{d.name}</div>
          <div className="text-[12px] text-muted">{d.added}</div>
        </div>
      ))}
      <div className="rounded-2xl border border-line bg-surface-2 p-4 text-[13px] text-ink">
        <span className="font-semibold">2.</span> Enter the 6-digit code it shows
        <div className="mt-2 flex items-center gap-2">
          <span className="w-36 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[16px] tracking-[0.25em] text-ink">
            {code || <span className="text-muted">123456</span>}
          </span>
          <span className="rounded-full bg-[#2b59d9] px-4 py-2 text-[13px] font-semibold text-white">Turn on</span>
        </div>
      </div>
    </div>
  );
}

/** The YouTube section of the composer: title, thumbnail and per-video visibility. */
function YouTubeShot() {
  return (
    <div className={`${shot} w-[420px] p-5`}>
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <BrandTile platform="youtube" size={20} radius={5} />
        YouTube
      </div>
      <div className="mt-3 text-[11px] font-semibold text-muted">Title</div>
      <div className="mt-1 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink">How we brew the Kochere at home</div>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-14 w-24 items-center justify-center rounded-lg bg-[#e3a72c] text-[10px] font-semibold text-[#14161a]">Thumbnail</span>
        <span className="text-[12px] text-muted">Custom thumbnail · made for kids: No</span>
      </div>
      <div className="mt-4">
        <FactUI ui={{ kind: "visibility" }} network="youtube" />
      </div>
    </div>
  );
}

export function ChangelogDemo({ demo }: { demo: Demo }) {
  switch (demo) {
    case "agent":
      return <AgentShot />;
    case "mcp":
      return <McpShot />;
    case "youtube":
      return <YouTubeShot />;
    case "twofa":
      return <TwoFactorShot />;
    case "calendar":
      return (
        <div className="h-[440px] w-[760px] overflow-hidden rounded-2xl shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]">
          <CalendarDemo productShot sidebar={false} fromHour={11} />
        </div>
      );
  }
}
