import { cookies } from "next/headers";
import { after } from "next/server";
import { getCurrentOrgId } from "@/lib/org";
import { refreshXMetrics } from "@/lib/analytics/collect";
import { loadReport } from "@/lib/analytics/report";
import { parseRange } from "@/lib/analytics/ranges";
import { Dashboard, EmptyState } from "@/components/analytics/Dashboard";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: r } = await searchParams;
  const range = parseRange(r);
  const orgId = await getCurrentOrgId();
  const tz = decodeURIComponent((await cookies()).get("pb_tz")?.value ?? "") || "UTC";
  if (!orgId) return null;

  // X stats are read on demand (billed per tweet): refresh any over an hour old,
  // after the page is sent, so the page never waits on X. New numbers show on the
  // next visit.
  after(() => refreshXMetrics(orgId).catch(() => 0));
  const report = await loadReport(orgId, range, tz);
  const empty = report.totalPublished === 0;

  return (
    <div className="pb-16">
      <div className="relative">
        <div className={empty ? "pointer-events-none select-none opacity-40 blur-[1px]" : ""} aria-hidden={empty}>
          <Dashboard report={report} tz={tz} />
        </div>
        {empty ? <EmptyState /> : null}
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Totals, changes and rates are calculated by Postbase from each network&apos;s own counts; they aren&apos;t figures
        published by the networks themselves. Bluesky, Mastodon and LinkedIn don&apos;t report views, so rates only
        cover networks that do.
      </p>
    </div>
  );
}
