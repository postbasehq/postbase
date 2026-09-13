import Link from "next/link";
import { ScheduleField } from "./ScheduleField";
import { ThreadComposer } from "./ThreadComposer";
import { ChannelSelect } from "./ChannelSelect";
import { MediaUpload } from "./MediaUpload";

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
    variants: Record<string, string>;
    media: { url: string; type: string }[];
    tiktokPrivacy?: string;
  };
};

export function PostForm({ channels, action, submitLabel, initial }: PostFormProps) {
  return (
    <form
      action={action}
      className="mt-6 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-sm"
    >
      {initial ? <input type="hidden" name="post_id" value={initial.id} /> : null}

      <ThreadComposer initial={initial?.thread} />

      <MediaUpload initial={initial?.media} />

      <ChannelSelect
        channels={channels}
        initialSelected={initial?.channelIds}
        initialVariants={initial?.variants}
        initialTiktokPrivacy={initial?.tiktokPrivacy}
      />

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
