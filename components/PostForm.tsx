import Link from "next/link";
import { ScheduleField } from "./ScheduleField";
import { ThreadComposer } from "./ThreadComposer";

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube",
};

type Channel = { id: string; platform: string; handle: string | null };

type PostFormProps = {
  channels: Channel[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initial?: {
    id: string;
    thread: string[];
    scheduledAt: string | null;
    channelIds: string[];
  };
};

export function PostForm({ channels, action, submitLabel, initial }: PostFormProps) {
  const hasChannels = channels.length > 0;
  const selected = new Set(initial?.channelIds ?? []);

  return (
    <form
      action={action}
      className="mt-6 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-sm"
    >
      {initial ? <input type="hidden" name="post_id" value={initial.id} /> : null}

      <ThreadComposer initial={initial?.thread} />

      <fieldset className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted">Channels</span>
        {hasChannels ? (
          <div className="flex flex-wrap gap-2">
            {channels.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-ground px-3.5 py-2 text-sm has-[:checked]:border-blue has-[:checked]:bg-blue-soft has-[:checked]:text-blue-ink"
              >
                <input
                  type="checkbox"
                  name="channels"
                  value={c.id}
                  defaultChecked={selected.has(c.id)}
                  className="accent-blue"
                />
                <span className="font-medium">{PLATFORM_LABEL[c.platform] ?? c.platform}</span>
                {c.handle ? <span className="text-muted">{c.handle}</span> : null}
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-sm text-muted">
            No channels yet.{" "}
            <Link href="/channels" className="font-medium text-blue-ink underline">
              Add one first
            </Link>
            .
          </p>
        )}
      </fieldset>

      <ScheduleField defaultUtc={initial?.scheduledAt ?? null} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-blue px-6 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
        >
          {submitLabel}
        </button>
        <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
