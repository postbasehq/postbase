import { createClient } from "@/lib/supabase/server";
import { addChannel } from "../actions";

const PLATFORM_META: Record<string, { label: string; dot: string }> = {
  x: { label: "X", dot: "bg-ink" },
  linkedin: { label: "LinkedIn", dot: "bg-blue" },
  instagram: { label: "Instagram", dot: "bg-terra" },
  youtube: { label: "YouTube", dot: "bg-amber-bright" },
};

// Platforms still connected via a manual stub (real OAuth lands per-platform).
const MANUAL = ["linkedin", "instagram", "youtube"];

const ERRORS: Record<string, string> = {
  x_not_configured: "X isn’t configured on this server yet (missing API keys).",
  oauth_state: "The X connection couldn’t be verified — please try again.",
  x_connect_failed: "Connecting X failed — please try again.",
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

      {connected === "x" ? (
        <div className="mt-4 rounded-xl bg-green/12 px-4 py-3 text-sm text-green">
          X account connected.
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

      {/* manual stub add (other platforms until their OAuth ships) */}
      <form
        action={addChannel}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Platform</span>
          <select
            name="platform"
            defaultValue="linkedin"
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
        LinkedIn and Instagram use manual stubs until their OAuth connections ship.
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
