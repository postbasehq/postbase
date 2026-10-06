import { BrandTile, BRANDS } from "@/components/BrandTile";
import type { FactUi } from "@/lib/seo/networks";

/*
 * Small slices of the real Postbase UI for the "What Postbase does on {network}"
 * fact cards: the composer's counter, thread and media tray, the channel row,
 * the YouTube visibility picker and TikTok toggles. Static, theme-aware, and
 * drawn with the app's own tokens and brand colours.
 */

const BLUE = "#2b59d9";
const AMBER = "#e3a72c";
const RED = "#d14a3e";

/** A composer-style white surface. */
function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface shadow-sm ${className}`}>{children}</div>;
}

/** Grey text lines standing in for post copy inside the composer. */
function Lines({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {widths.map((w, i) => (
        <span key={i} className="h-2 rounded-full bg-line" style={{ width: w }} />
      ))}
    </div>
  );
}

function Avatar({ network }: { network: string }) {
  return (
    <span className="relative shrink-0">
      <span className="block size-7 rounded-full bg-[#2b59d9]" />
      <span className="absolute -bottom-1 -right-1">
        <BrandTile platform={network} size={14} radius={4} />
      </span>
    </span>
  );
}

function ImageThumb({ tone }: { tone: string }) {
  return (
    <span className="relative flex aspect-square items-end overflow-hidden rounded-lg" style={{ background: tone }}>
      {/* a simple landscape glyph, like an image placeholder in the media tray */}
      <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto size-1/2 text-white/90" fill="currentColor" aria-hidden>
        <path d="M4 18l5-6 3.5 4 2.5-3 5 5H4Zm12-10a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
      </svg>
    </span>
  );
}

function Play() {
  return (
    <span className="absolute inset-0 m-auto flex size-8 items-center justify-center rounded-full bg-white shadow">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#14161a" aria-hidden>
        <path d="M7 4v16l13-8z" />
      </svg>
    </span>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span className={`relative h-4 w-7 rounded-full ${on ? "bg-[#2b59d9]" : "bg-line"}`}>
      <span className={`absolute top-0.5 size-3 rounded-full bg-white shadow ${on ? "left-3.5" : "left-0.5"}`} />
    </span>
  );
}

const TONES = [BLUE, AMBER, RED, "#6364FF"];

export function FactUI({ ui, network }: { ui?: FactUi; network: string }) {
  if (!ui) return null;
  switch (ui.kind) {
    case "count": {
      const pct = Math.min(100, Math.round((ui.used / ui.limit) * 100));
      return (
        <Surface className="w-full p-3.5">
          <div className="flex items-center gap-2">
            <Avatar network={network} />
            <span className="text-[11px] font-semibold text-muted">{ui.what ?? "Post"}</span>
          </div>
          <div className="mt-3">
            <Lines widths={["100%", "92%", "64%"]} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-[#2b59d9]" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-ink">
              {ui.used.toLocaleString("en-US")} / {ui.limit.toLocaleString("en-US")}
            </span>
          </div>
        </Surface>
      );
    }
    case "thread":
      return (
        <div className="flex w-full flex-col gap-2">
          {Array.from({ length: ui.parts }, (_, i) => (
            <div key={i} className="relative">
              {i < ui.parts - 1 ? <span className="absolute left-[25px] top-10 h-4 w-0.5 bg-line" aria-hidden /> : null}
              <Surface className="flex items-center gap-2.5 px-3 py-2.5">
                <Avatar network={network} />
                <div className="flex-1">
                  <Lines widths={i === 0 ? ["90%", "60%"] : ["75%"]} />
                </div>
                <span className="text-[10px] font-semibold tabular-nums text-muted">{i + 1}</span>
              </Surface>
            </div>
          ))}
        </div>
      );
    case "firstComment":
      return (
        <div className="flex w-full flex-col gap-2">
          <Surface className="flex items-start gap-2.5 p-3">
            <Avatar network={network} />
            <div className="flex-1">
              <Lines widths={["95%", "80%", "50%"]} />
            </div>
          </Surface>
          <Surface className="ml-6 flex items-center gap-2 p-2.5">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Comment</span>
            <span className="min-w-0 truncate rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-[#2b59d9]">
              postbase.so
            </span>
          </Surface>
        </div>
      );
    case "images": {
      const shown = Math.min(ui.count, 4);
      const extra = ui.count - shown;
      return (
        <Surface className="w-full p-3">
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: shown }, (_, i) => (
              <span key={i} className="relative">
                <ImageThumb tone={TONES[i % TONES.length]} />
                {extra > 0 && i === shown - 1 ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#14161a] text-[12px] font-semibold text-white">
                    +{extra}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-ink">{ui.count} images</span>
            <span className="text-muted">Media</span>
          </div>
        </Surface>
      );
    }
    case "media":
      return (
        <Surface className="w-full p-3">
          <div className="grid grid-cols-2 gap-1.5">
            <ImageThumb tone={AMBER} />
            <span className="relative aspect-square overflow-hidden rounded-lg bg-[#14161a]">
              <Play />
              <span className="absolute bottom-1.5 right-1.5 rounded bg-white/90 px-1 text-[9px] font-semibold text-[#14161a]">
                0:24
              </span>
            </span>
          </div>
        </Surface>
      );
    case "video":
      return (
        <div className="flex w-full items-end gap-2">
          <span className="relative aspect-video flex-[2] overflow-hidden rounded-xl bg-[#14161a] shadow-sm">
            <Play />
            <span className="absolute bottom-1.5 right-1.5 rounded bg-white/90 px-1 text-[9px] font-semibold text-[#14161a]">
              8:12
            </span>
          </span>
          <span className="relative aspect-[9/16] flex-1 overflow-hidden rounded-xl bg-[#d14a3e] shadow-sm">
            <Play />
            <span className="absolute left-1.5 top-1.5 rounded bg-white px-1 text-[9px] font-semibold text-[#14161a]">
              Shorts
            </span>
          </span>
        </div>
      );
    case "account":
      return (
        <Surface className="flex w-full items-center gap-3 p-3">
          <BrandTile platform={network} size={32} radius={8} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink">{network === "mastodon" ? "@you" : "Your profile"}</div>
            <div className="text-[11px] text-muted">{BRANDS[network]?.label}</div>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-ink">
            <span className="size-1.5 rounded-full bg-[#22a06b]" />
            Connected
          </span>
        </Surface>
      );
    case "networks":
      return (
        <Surface className="w-full p-3">
          <div className="text-[11px] font-semibold text-muted">Post to</div>
          <div className="mt-2 flex gap-2">
            {["x", "linkedin", "bluesky", "mastodon"].map((n) => (
              <span key={n} className="relative rounded-[10px] ring-2 ring-[#2b59d9] ring-offset-2 ring-offset-surface">
                <BrandTile platform={n} size={30} radius={8} />
              </span>
            ))}
          </div>
        </Surface>
      );
    case "visibility":
      return (
        <div className="grid w-full grid-cols-3 gap-1.5">
          {[
            { label: "Public", bg: BLUE, fg: "#fff", on: true },
            { label: "Unlisted", bg: AMBER, fg: "#14161a", on: false },
            { label: "Private", bg: RED, fg: "#fff", on: false },
          ].map((o) => (
            <span
              key={o.label}
              className={`rounded-lg px-2 py-3 text-center text-[11px] font-semibold ${o.on ? "ring-2 ring-ink ring-offset-2 ring-offset-surface-2" : ""}`}
              style={{ background: o.bg, color: o.fg }}
            >
              {o.label}
            </span>
          ))}
        </div>
      );
    case "toggles":
      return (
        <Surface className="flex w-full flex-col divide-y divide-line">
          {ui.items.map((t, i) => (
            <div key={t} className="flex items-center justify-between px-3 py-2.5">
              <span className="text-[12px] font-medium text-ink">{t}</span>
              <Switch on={i !== ui.items.length - 1} />
            </div>
          ))}
        </Surface>
      );
    case "server":
      return (
        <Surface className="w-full p-3">
          <div className="text-[11px] font-semibold text-muted">Your instance</div>
          <div className="mt-2 flex gap-2">
            <span className="flex-1 truncate rounded-lg border border-line px-2.5 py-2 text-[12px] text-ink">fosstodon.org</span>
            <span className="rounded-lg bg-[#6364FF] px-3 py-2 text-[12px] font-semibold text-white">Sign in</span>
          </div>
        </Surface>
      );
    case "text":
      // A post whose last line is links or hashtags: blue and underlined when the network makes them clickable.
      return (
        <Surface className="w-full p-3.5">
          <div className="flex items-center gap-2">
            <Avatar network={network} />
            <Lines widths={["70%"]} />
          </div>
          <div className="mt-3">
            <Lines widths={["100%", "84%"]} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-2 text-[12px] font-medium">
            {ui.words.map((w) => (
              <span key={w} className={ui.linked ? "text-[#2b59d9] underline underline-offset-2" : "text-ink"}>
                {w}
              </span>
            ))}
          </div>
        </Surface>
      );
    case "schedule":
      return (
        <Surface className="flex w-full flex-col gap-2 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-[12px] text-ink">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            Tue 9:00
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-[12px] font-semibold">
            <span className="rounded-lg border border-line px-2 py-2 text-ink">Save draft</span>
            <span className="rounded-lg bg-[#2b59d9] px-2 py-2 text-white">Schedule</span>
          </div>
        </Surface>
      );
    case "password":
      return (
        <Surface className="w-full p-3">
          <div className="text-[11px] font-semibold text-muted">App password</div>
          <div className="mt-2 flex gap-2">
            <span className="flex-1 truncate rounded-lg border border-line px-2.5 py-2 font-mono text-[12px] tracking-[0.12em] text-ink">
              ••••-••••-••••
            </span>
            <span className="rounded-lg bg-[#0085FF] px-3 py-2 text-[12px] font-semibold text-white">Connect</span>
          </div>
        </Surface>
      );
  }
}
