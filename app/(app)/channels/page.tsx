import { createClient } from "@/lib/supabase/server";
import { disconnectChannel } from "../actions";
import { ChannelsBoard } from "@/components/ChannelsBoard";

const CONNECTED_LABEL: Record<string, string> = {
  x: "X account connected.",
  instagram: "Instagram account connected.",
  linkedin: "LinkedIn account connected.",
  tiktok: "TikTok account connected.",
  youtube: "YouTube channel connected.",
  facebook: "Facebook Page connected.",
  bluesky: "Bluesky account connected.",
  mastodon: "Mastodon account connected.",
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
  yt_not_configured: "YouTube isn’t configured on this server yet (missing Google app keys).",
  yt_connect_failed: "Connecting YouTube failed — please try again.",
  fb_not_configured: "Facebook isn’t configured on this server yet (missing Meta app keys).",
  fb_connect_failed: "Connecting Facebook failed — please try again.",
  fb_no_page: "No Facebook Page found on your account. Create a Page, then reconnect.",
  mt_no_instance: "Enter your Mastodon server address to connect.",
  mt_bad_instance: "That doesn’t look like a valid Mastodon server address.",
  mt_connect_failed: "Connecting Mastodon failed — check the server address and try again.",
  save_failed: "Couldn’t save the channel — please try again.",
  no_workspace: "No workspace found for your account.",
  channel_limit: "You’ve reached your plan’s channel limit. Upgrade in Billing to connect more.",
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
    .select("id, platform, handle, status, display_name, avatar_url, verified")
    .order("created_at", { ascending: true });

  // Group connected accounts by platform for the board.
  const accountsByPlatform: Record<
    string,
    {
      id: string;
      handle: string | null;
      status: string;
      displayName: string | null;
      avatarUrl: string | null;
      verified: boolean;
    }[]
  > = {};
  for (const c of channels ?? []) {
    (accountsByPlatform[c.platform] ??= []).push({
      id: c.id,
      handle: c.handle,
      status: c.status,
      displayName: c.display_name ?? null,
      avatarUrl: c.avatar_url ?? null,
      verified: Boolean(c.verified),
    });
  }
  const connectedCount = channels?.length ?? 0;

  return (
    <div>
      <header className="flex items-end justify-between gap-4 pb-5 [border-bottom:0.5px_solid_var(--line)]">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">
            Publishing channels
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Connect the accounts you want to publish to. Postbase drafts, schedules, and
            tracks every post from one place.
          </p>
        </div>
        {connectedCount > 0 ? (
          <div className="hidden shrink-0 text-right sm:block">
            <div className="font-display text-2xl font-semibold leading-none tabular-nums">
              {connectedCount}
            </div>
            <div className="mt-1 text-xs text-muted">connected</div>
          </div>
        ) : null}
      </header>

      {connected && CONNECTED_LABEL[connected] ? (
        <div className="mt-5 rounded-xl bg-green/12 px-4 py-3 text-sm text-green">
          {CONNECTED_LABEL[connected]}
        </div>
      ) : null}
      {error ? (
        <div className="mt-5 rounded-xl bg-terra/12 px-4 py-3 text-sm text-terra">
          {ERRORS[error] ?? "Something went wrong."}
        </div>
      ) : null}

      {/* Facebook Page publishing is built (adapter, OAuth routes, collector) but
          parked: pages_manage_posts requires Meta Advanced Access, gated behind
          Business Verification + App Review. Add it back to PLATFORMS in
          ChannelsBoard once the app clears App Review. */}

      <div className="mt-6 pb-10">
        <ChannelsBoard
          accountsByPlatform={accountsByPlatform}
          disconnectAction={disconnectChannel}
        />
      </div>
    </div>
  );
}
