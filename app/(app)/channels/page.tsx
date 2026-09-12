import { createClient } from "@/lib/supabase/server";
import { addChannel } from "../actions";

const PLATFORM_META: Record<string, { label: string; dot: string }> = {
  x: { label: "X", dot: "bg-ink" },
  linkedin: { label: "LinkedIn", dot: "bg-blue" },
  instagram: { label: "Instagram", dot: "bg-terra" },
  tiktok: { label: "TikTok", dot: "bg-ink" },
  youtube: { label: "YouTube", dot: "bg-amber-bright" },
};

// Platforms still connected via a manual stub (real OAuth lands per-platform).
const MANUAL = ["youtube"];

const CONNECTED_LABEL: Record<string, string> = {
  x: "X account connected.",
  instagram: "Instagram account connected.",
  linkedin: "LinkedIn account connected.",
  tiktok: "TikTok account connected.",
};

const ERRORS: Record<string, string> = {
  x_not_configured: "X isn’t configured on this server yet (missing API keys).",
  ig_not_configured: "Instagram isn’t configured on this server yet (missing Meta app keys).",
  li_not_configured: "LinkedIn isn’t configured on this server yet (missing LinkedIn app keys).",
  oauth_state: "The connection couldn’t be verified — please try again.",
  x_connect_failed: "Connecting X failed — please try again.",
  ig_connect_failed:
    "Connecting Instagram failed. Make sure the account is a Business/Creator account linked to a Facebook Page.",
  li_connect_failed: "Connecting LinkedIn failed — please try again.",
  tt_not_configured: "TikTok isn’t configured on this server yet (missing TikTok app keys).",
  tt_connect_failed: "Connecting TikTok failed — please try again.",
  save_failed: "Couldn’t save the channel — please try again.",
  no_workspace: "No workspace found for your account.",
};

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle, status")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">Channels</h1>
      <p className="mt-1 text-sm text-muted">
        Connect the accounts you want to publish to.
      </p>

      {connected && CONNECTED_LABEL[connected] ? (
        <div className="mt-4 rounded-xl bg-green/12 px-4 py-3 text-sm text-green">
          {CONNECTED_LABEL[connected]}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-xl bg-terra/12 px-4 py-3 text-sm text-terra">
          {ERRORS[error] ?? "Something went wrong."}
        </div>
      ) : null}

      {/* connect X (real OAuth) */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <span className="size-2.5 rounded-full bg-ink" />
        <div>
          <div className="text-sm font-semibold">X</div>
          <div className="text-xs text-muted">Connect via OAuth to publish to your account.</div>
        </div>
        <a
          href="/api/connect/x"
          className="ml-auto rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
        >
          Connect X
        </a>
      </div>

      {/* connect Instagram (real OAuth via Facebook Login) */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <span className="size-2.5 rounded-full bg-terra" />
        <div>
          <div className="text-sm font-semibold">Instagram</div>
          <div className="text-xs text-muted">
            Connect a Business/Creator account linked to a Facebook Page.
          </div>
        </div>
        <a
          href="/api/connect/instagram"
          className="ml-auto rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
        >
          Connect Instagram
        </a>
      </div>

      {/* connect LinkedIn (real OAuth) */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <span className="size-2.5 rounded-full bg-blue" />
        <div>
          <div className="text-sm font-semibold">LinkedIn</div>
          <div className="text-xs text-muted">Publish posts to your LinkedIn profile.</div>
        </div>
        <a
          href="/api/connect/linkedin"
          className="ml-auto rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
        >
          Connect LinkedIn
        </a>
      </div>

      {/* connect TikTok (real OAuth) */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <span className="size-2.5 rounded-full bg-ink" />
        <div>
          <div className="text-sm font-semibold">TikTok</div>
          <div className="text-xs text-muted">Post videos or photo carousels (no text-only posts).</div>
        </div>
        <a
          href="/api/connect/tiktok"
          className="ml-auto rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
        >
          Connect TikTok
        </a>
      </div>

      {/* manual stub add (other platforms until their OAuth ships) */}
      <form
        action={addChannel}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Platform</span>
          <select
            name="platform"
            defaultValue="youtube"
            className="rounded-xl border border-line bg-ground px-3 py-2.5 text-sm outline-none focus-visible:border-blue"
          >
            {MANUAL.map((value) => (
              <option key={value} value={value}>
                {PLATFORM_META[value].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Handle</span>
          <input
            name="handle"
            placeholder="@yourhandle"
            className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
          />
        </label>
        <button
          type="submit"
          className="rounded-full border border-line px-5 py-2.5 font-display text-sm font-semibold text-blue-ink hover:bg-surface-2"
        >
          Add stub
        </button>
      </form>
      <p className="mt-1.5 text-xs text-muted">
        YouTube uses a manual stub until its OAuth connection ships.
      </p>

      {/* list */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {!channels || channels.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">No channels yet.</p>
        ) : (
          channels.map((c, i) => {
            const meta = PLATFORM_META[c.platform] ?? { label: c.platform, dot: "bg-muted" };
            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  i < channels.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className={`size-2.5 rounded-full ${meta.dot}`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{meta.label}</div>
                  <div className="truncate text-xs text-muted">{c.handle ?? "—"}</div>
                </div>
                <span className="ml-auto rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted">
                  {c.status === "active" ? "Connected" : c.status === "stub" ? "Stub" : c.status}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
