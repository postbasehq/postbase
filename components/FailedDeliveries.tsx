import { SubmitButton } from "@/components/SubmitButton";
import { explainPostError } from "@/lib/post-errors";

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

// Platforms that reconnect through an OAuth redirect (Bluesky and Mastodon use a form).
const OAUTH_PLATFORMS = new Set(["x", "instagram", "facebook", "linkedin", "tiktok", "youtube"]);

type FailedTarget = {
  id: string;
  error: string | null;
  channels: { platform: string } | null;
};
/** A failed delivery with an automatic retry pending; nextLabel null = due now. */
type RetryingTarget = FailedTarget & { nextLabel: string | null };

const AMBER = "#e3a72c";

/**
 * A post's failed deliveries, collapsed to one summary line: what went wrong in
 * plain words, and the fix (Reconnect for lost access, Retry for the rest).
 * Deliveries still retrying on their own show why, and when the next try is.
 */
export function FailedDeliveries({
  failed,
  retrying = [],
  retry,
}: {
  failed: FailedTarget[];
  retrying?: RetryingTarget[];
  retry: (formData: FormData) => Promise<void>;
}) {
  if (failed.length === 0 && retrying.length === 0) return null;
  const all: (FailedTarget & { nextLabel?: string | null; pending?: boolean })[] = [
    ...failed,
    ...retrying.map((t) => ({ ...t, pending: true })),
  ];
  const headColor = failed.length > 0 ? "#d14a3e" : AMBER;
  return (
    <details className="group border-t border-line/60">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-xs [&::-webkit-details-marker]:hidden">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 transition-transform group-open:rotate-90"
          style={{ color: headColor }}
          aria-hidden
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
        <span className="shrink-0 font-semibold" style={{ color: headColor }}>
          {failed.length > 0
            ? `${failed.length} ${failed.length === 1 ? "channel" : "channels"} failed`
            : "Retrying automatically"}
        </span>
        <span className="min-w-0 flex-1 truncate text-muted">
          {all.map((t) => PLATFORM_LABEL[t.channels?.platform ?? ""] ?? t.channels?.platform).join(", ")}
        </span>
        <span className="shrink-0 font-semibold text-muted group-open:hidden">Show details</span>
        <span className="hidden shrink-0 font-semibold text-muted group-open:inline">Hide</span>
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-2.5 pl-9">
        {all.map((t) => {
          const platform = t.channels?.platform ?? "";
          const why = t.pending && !t.error ? { text: "Trying again now.", fix: "retry" as const } : explainPostError(t.error, platform);
          return (
            <div key={t.id} className="flex items-start gap-2 text-xs leading-snug">
              <span className="shrink-0 font-semibold" style={{ color: t.pending ? AMBER : "#d14a3e" }}>
                {PLATFORM_LABEL[platform] ?? platform}
              </span>
              <span className="min-w-0 flex-1 text-ink" title={t.error ?? undefined}>
                {why.text}
                {t.pending && t.error ? (
                  <span className="text-muted">
                    {" "}
                    {t.nextLabel ? `Next try at ${t.nextLabel}.` : "Next try within a minute."}
                  </span>
                ) : null}
              </span>
              {why.fix === "reconnect" ? (
                <a
                  href={OAUTH_PLATFORMS.has(platform) ? `/api/connect/${platform}` : "/channels"}
                  className="shrink-0 font-semibold text-blue-ink transition-colors hover:text-ink"
                >
                  Reconnect
                </a>
              ) : null}
              <form action={retry} className="shrink-0">
                <input type="hidden" name="target_id" value={t.id} />
                <SubmitButton className="text-xs font-semibold text-blue-ink transition-colors hover:text-ink disabled:opacity-50">
                  {t.pending ? "Retry now" : "Retry"}
                </SubmitButton>
              </form>
            </div>
          );
        })}
      </div>
    </details>
  );
}
