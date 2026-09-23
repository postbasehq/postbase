"use client";

import { useState } from "react";
import { AppShell } from "@/components/marketing/AppShell";
import { BrandTile } from "@/components/BrandTile";
import { PostPreview } from "@/components/PostPreview";
import { CERAMICS, COFFEE, FIELDNOTE, RUNNING, type Example } from "@/components/marketing/examples";

const DAYS = [
  { dow: "Mon", d: 21 },
  { dow: "Tue", d: 22 },
  { dow: "Wed", d: 23, today: true },
  { dow: "Thu", d: 24 },
  { dow: "Fri", d: 25 },
  { dow: "Sat", d: 26 },
  { dow: "Sun", d: 27 },
];
const ROWS = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM"];

type Status = "published" | "scheduled" | "draft";
type Ev = {
  id: string;
  day: number;
  row: number;
  time: string;
  status: Status;
  /** First channel is the one previewed. */
  chans: string[];
  title: string;
  post: Example;
  /** Scheduled by an agent over MCP (shown in the developers view). */
  agent?: boolean;
};

const EVENTS: Ev[] = [
  {
    id: "fieldnote",
    day: 0,
    row: 0,
    time: "9:00",
    status: "published",
    chans: ["x", "linkedin"],
    title: "Fieldnote 2.4",
    post: FIELDNOTE,
    agent: true,
  },
  { id: "easy", day: 1, row: 1, time: "10:30", status: "published", chans: ["x", "linkedin", "bluesky"], title: "Easy runs are too fast", post: RUNNING },
  { id: "kochere", day: 2, row: 2, time: "12:00", status: "scheduled", chans: ["instagram", "x", "linkedin"], title: "Kochere, Ethiopia", post: COFFEE },
  {
    id: "brew",
    day: 3,
    row: 3,
    time: "2:15",
    status: "scheduled",
    chans: ["x", "linkedin"],
    title: "Pour-over in 60s",
    post: {
      ...COFFEE,
      image: undefined,
      body: "How we brew the Kochere at home: V60, 15g coffee, 250g water at 94°C, 2:45 total.\n\nSwirl, don't stir.",
    },
    agent: true,
  },
  {
    id: "long",
    day: 5,
    row: 0,
    time: "7:45",
    status: "draft",
    chans: ["x"],
    title: "Long run check-in",
    post: { ...RUNNING, body: "18 miles this morning, all of it at conversation pace. Legs feel fine. Taper starts Monday." },
  },
  { id: "shop", day: 6, row: 5, time: "6:00", status: "scheduled", chans: ["bluesky", "x", "mastodon"], title: "Shop opens: 24 cups", post: CERAMICS, agent: true },
];

const DOT: Record<Status, string> = {
  published: "bg-green",
  scheduled: "bg-blue",
  draft: "bg-muted",
};

export function CalendarDemo({ showAgent = false }: { showAgent?: boolean }) {
  const [openId, setOpenId] = useState("easy");
  const open = EVENTS.find((e) => e.id === openId)!;

  return (
    <AppShell active="/calendar" title="Calendar" sidebar={false}>
      <div className="flex h-full">
        <div className="flex min-w-0 flex-1 flex-col p-4">
          {/* toolbar */}
          <div className="mb-3 flex items-center gap-3">
            <span className="font-display text-[15px] font-semibold text-ink">September 21 – 27</span>
            <span className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink">Today</span>
            <div className="ml-auto hidden items-center gap-4 text-[11.5px] text-muted sm:flex">
              {(["published", "scheduled", "draft"] as Status[]).map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 capitalize">
                  <span className={`size-1.5 rounded-full ${DOT[s]}`} />
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* week grid */}
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line">
            <div className="grid min-w-[620px]" style={{ gridTemplateColumns: "52px repeat(7,minmax(0,1fr))" }}>
              <div className="border-b border-r border-line" />
              {DAYS.map((d) => (
                <div key={d.dow} className="border-b border-r border-line py-2 text-center last:border-r-0">
                  <div className="text-[10.5px] font-medium uppercase tracking-wide text-muted">{d.dow}</div>
                  <div
                    className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full font-display text-[13px] font-semibold tabular-nums ${
                      d.today ? "bg-blue text-on-blue" : "text-ink"
                    }`}
                  >
                    {d.d}
                  </div>
                </div>
              ))}

              {ROWS.map((label, r) => (
                <Row key={label} label={label} row={r} openId={openId} onOpen={setOpenId} showAgent={showAgent} />
              ))}
            </div>
          </div>
        </div>

        {/* selected post */}
        <aside className="hidden w-[330px] shrink-0 flex-col border-l border-line/70 lg:flex">
          <div className="flex items-center gap-2 border-b border-line/70 px-4 py-3">
            <span className={`size-1.5 rounded-full ${DOT[open.status]}`} />
            <span className="text-[12.5px] font-semibold capitalize text-ink">{open.status}</span>
            <span className="text-[12.5px] text-muted">
              · {DAYS[open.day].dow} {open.time}
            </span>
            {showAgent && open.agent ? (
              <span className="ml-auto rounded-full border border-line px-2 py-0.5 font-mono text-[10.5px] text-muted">
                via MCP
              </span>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div key={open.id} className="swap-in">
              <PostPreview
                platform={open.chans[0]}
                handle={open.post.handle}
                displayName={open.post.name}
                thread={open.post.body.split(/\n{2,}/)}
                media={open.post.image ? [{ url: open.post.image, type: "image/jpeg" }] : []}
                metrics={null}
                publishedAt={null}
              />
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  row,
  openId,
  onOpen,
  showAgent,
}: {
  label: string;
  row: number;
  openId: string;
  onOpen: (id: string) => void;
  showAgent: boolean;
}) {
  return (
    <>
      <div className="border-b border-r border-line px-2 pt-1.5 text-right text-[10.5px] tabular-nums text-muted">
        {label}
      </div>
      {DAYS.map((_, day) => {
        const ev = EVENTS.find((e) => e.day === day && e.row === row);
        return (
          <div key={day} className="min-h-[64px] border-b border-r border-line p-1 last:border-r-0">
            {ev ? (
              <button
                type="button"
                onClick={() => onOpen(ev.id)}
                className={`flex w-full flex-col gap-1 overflow-hidden rounded-lg border bg-surface px-1.5 py-1.5 text-left shadow-sm transition-[border-color,box-shadow] hover:shadow-md ${
                  ev.id === openId ? "border-blue ring-1 ring-blue" : "border-line"
                } ${ev.status === "draft" ? "border-dashed" : ""}`}
              >
                <div className="flex items-center gap-1 px-0.5">
                  <span className={`size-1.5 shrink-0 rounded-full ${DOT[ev.status]}`} />
                  <span className="truncate text-[10.5px] font-medium text-ink">{ev.title}</span>
                </div>
                <div className="flex items-center gap-1 px-0.5">
                  <span className="flex -space-x-1">
                    {ev.chans.map((c) => (
                      <span key={c} className="rounded-full ring-1 ring-surface">
                        <BrandTile platform={c} size={13} radius={7} />
                      </span>
                    ))}
                  </span>
                  {showAgent && ev.agent ? (
                    <span className="ml-auto font-mono text-[9px] text-muted">MCP</span>
                  ) : (
                    <span className="ml-auto text-[9.5px] tabular-nums text-muted">{ev.time}</span>
                  )}
                </div>
              </button>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
