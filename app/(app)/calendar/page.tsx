import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone, formatInTz, localDateKey } from "@/lib/tz";

const DOT: Record<string, string> = {
  draft: "bg-muted",
  scheduled: "bg-blue",
  publishing: "bg-amber-bright",
  published: "bg-green",
  failed: "bg-terra",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type PostRow = { id: string; body: string; scheduled_at: string; status: string };

function monthMeta(param?: string) {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-based
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    year = y;
    month = m - 1;
  }
  const first = new Date(Date.UTC(year, month, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));
  const prev = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadBlanks = (first.getUTCDay() + 6) % 7; // Mon-start
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return {
    year,
    month,
    first,
    startISO: first.toISOString(),
    endISO: next.toISOString(),
    daysInMonth,
    leadBlanks,
    prevParam: fmt(prev),
    nextParam: fmt(next),
    title: first.toLocaleString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const m = monthMeta(monthParam);
  const tz = await getTimeZone();

  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, body, scheduled_at, status")
    // ±1 day buffer so posts near the month edge land on the right local day
    .gte("scheduled_at", new Date(Date.parse(m.startISO) - 86_400_000).toISOString())
    .lt("scheduled_at", new Date(Date.parse(m.endISO) + 86_400_000).toISOString())
    .order("scheduled_at", { ascending: true });

  const byDay = new Map<string, PostRow[]>();
  for (const p of (data ?? []) as PostRow[]) {
    const day = localDateKey(p.scheduled_at, tz); // group by the viewer's local date
    (byDay.get(day) ?? byDay.set(day, []).get(day)!).push(p);
  }

  const cells: (number | null)[] = [
    ...Array(m.leadBlanks).fill(null),
    ...Array.from({ length: m.daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dayKey = (day: number) =>
    `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-[960px]">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">Calendar</h1>
          <p className="mt-1 text-sm text-muted">{m.title}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/calendar?month=${m.prevParam}`}
            className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
          >
            ← Prev
          </Link>
          <Link
            href="/calendar"
            className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
          >
            Today
          </Link>
          <Link
            href={`/calendar?month=${m.nextParam}`}
            className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
          >
            Next →
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 gap-px">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="pb-2 text-center font-display text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-line bg-line">
            {cells.map((day, i) => {
              const posts = day ? (byDay.get(dayKey(day)) ?? []) : [];
              return (
                <div
                  key={i}
                  className={`min-h-[104px] bg-surface p-2 ${day ? "" : "bg-surface-2"}`}
                >
                  {day ? (
                    <>
                      <div className="mb-1.5 text-xs font-semibold text-muted tabular-nums">
                        {day}
                      </div>
                      <div className="flex flex-col gap-1">
                        {posts.map((p) => (
                          <Link
                            key={p.id}
                            href={`/composer/${p.id}`}
                            className="flex items-center gap-1.5 rounded-md bg-surface-2 px-1.5 py-1 text-[11px] hover:bg-blue-soft"
                            title={p.body}
                          >
                            <span className={`size-1.5 shrink-0 rounded-full ${DOT[p.status] ?? "bg-muted"}`} />
                            <span className="tabular-nums text-muted">
                              {formatInTz(p.scheduled_at, tz, { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="truncate">{p.body || "(empty)"}</span>
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">
        Shows posts with a scheduled time (drafts have none). Times shown in {tz}.
      </p>
    </div>
  );
}
