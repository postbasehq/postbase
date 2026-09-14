import { createClient } from "@/lib/supabase/server";
import { getTimeZone, formatInTz, localDateKey, localHM } from "@/lib/tz";
import {
  CalendarView,
  type CalPost,
  type DayCol,
  type MonthCell,
} from "@/components/CalendarView";

type View = "day" | "week" | "month";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (n: number) => String(n).padStart(2, "0");

// --- pure calendar-date helpers over YYYY-MM-DD keys (UTC noon, no DST drift) ---
function dateFromKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
function keyFromDate(dt: Date): string {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
function addDays(k: string, n: number): string {
  const dt = dateFromKey(k);
  dt.setUTCDate(dt.getUTCDate() + n);
  return keyFromDate(dt);
}
function dowMon0(k: string): number {
  return (dateFromKey(k).getUTCDay() + 6) % 7; // 0 = Monday
}
function dayCol(k: string, todayKey: string): DayCol {
  const dt = dateFromKey(k);
  return {
    key: k,
    dow: DOW_SHORT[dowMon0(k)],
    dayNum: dt.getUTCDate(),
    monthShort: MONTHS_SHORT[dt.getUTCMonth()],
    isToday: k === todayKey,
  };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { view: viewParam, date: dateParam } = await searchParams;
  const tz = await getTimeZone();
  const nowISO = new Date().toISOString();
  const todayKey = localDateKey(nowISO, tz);
  const nowHour = localHM(nowISO, tz).hour;

  const view: View =
    viewParam === "day" || viewParam === "month" ? viewParam : "week";
  const anchor = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayKey;

  // Visible day columns + range.
  let days: DayCol[] = [];
  let monthCells: MonthCell[] = [];
  let firstKey: string;
  let lastKey: string;
  let title: string;

  if (view === "month") {
    const dt = dateFromKey(anchor);
    const y = dt.getUTCFullYear();
    const mo = dt.getUTCMonth(); // 0-based
    const firstOfMonth = `${y}-${pad(mo + 1)}-01`;
    const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    const lead = dowMon0(firstOfMonth);
    const cells: MonthCell[] = [];
    for (let i = 0; i < lead; i++) cells.push({ key: null, dayNum: null, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const k = `${y}-${pad(mo + 1)}-${pad(d)}`;
      cells.push({ key: k, dayNum: d, isToday: k === todayKey });
    }
    while (cells.length % 7 !== 0) cells.push({ key: null, dayNum: null, isToday: false });
    monthCells = cells;
    firstKey = firstOfMonth;
    lastKey = `${y}-${pad(mo + 1)}-${pad(daysInMonth)}`;
    title = `${dateFromKey(anchor).toLocaleString("en-GB", { month: "long", timeZone: "UTC" })} ${y}`;
  } else if (view === "day") {
    days = [dayCol(anchor, todayKey)];
    firstKey = anchor;
    lastKey = anchor;
    const dt = dateFromKey(anchor);
    title = dt.toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } else {
    const monday = addDays(anchor, -dowMon0(anchor));
    days = Array.from({ length: 7 }, (_, i) => dayCol(addDays(monday, i), todayKey));
    firstKey = days[0].key;
    lastKey = days[6].key;
    const a = dateFromKey(firstKey);
    const b = dateFromKey(lastKey);
    const sameMonth = a.getUTCMonth() === b.getUTCMonth();
    title = sameMonth
      ? `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]} ${b.getUTCFullYear()}`
      : `${a.getUTCDate()} ${MONTHS_SHORT[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  }

  // Fetch posts in a UTC window padded ±1 day, then bucket by local day.
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, body, scheduled_at, status")
    .not("scheduled_at", "is", null)
    .gte("scheduled_at", `${addDays(firstKey, -1)}T00:00:00Z`)
    .lt("scheduled_at", `${addDays(lastKey, 2)}T00:00:00Z`)
    .order("scheduled_at", { ascending: true });

  const visible = new Set(
    view === "month" ? monthCells.filter((c) => c.key).map((c) => c.key!) : days.map((d) => d.key),
  );

  const posts: CalPost[] = [];
  for (const p of (data ?? []) as { id: string; body: string; scheduled_at: string; status: string }[]) {
    const dayKey = localDateKey(p.scheduled_at, tz);
    if (!visible.has(dayKey)) continue;
    const { hour, minute } = localHM(p.scheduled_at, tz);
    posts.push({
      id: p.id,
      body: p.body,
      status: p.status,
      dayKey,
      hour,
      minute,
      timeLabel: formatInTz(p.scheduled_at, tz, { hour: "2-digit", minute: "2-digit", hour12: false }),
    });
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <CalendarView
        view={view}
        anchor={anchor}
        todayKey={todayKey}
        nowHour={nowHour}
        title={title}
        days={days}
        monthCells={monthCells}
        posts={posts}
      />
    </div>
  );
}
