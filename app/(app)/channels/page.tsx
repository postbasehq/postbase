import { createClient } from "@/lib/supabase/server";
import { scopeOrgId } from "@/lib/org";
import { cookies } from "next/headers";
import { cancelMetaPick, connectMetaAccounts, disconnectChannel } from "../actions";
import { MetaAccountPicker } from "@/components/MetaAccountPicker";
import { listMetaOptions, openPick, PICK_COOKIE, type MetaOption, type MetaPlatform } from "@/lib/meta-connect";
import { ChannelsBoard } from "@/components/ChannelsBoard";
import { channelHealth, reconnectReason, type ChannelHealth } from "@/lib/channel-health";

const BRAND_LABEL: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

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
  yt_denied: "YouTube access wasn’t granted. Approve the permissions on Google’s screen to connect.",
  yt_no_channel:
    "That Google account has no YouTube channel. Create one at youtube.com (or pick the Brand Account that owns it), then reconnect.",
  yt_quota: "YouTube’s daily API limit has been reached. Please try again after midnight Pacific time.",
  yt_scopes: "Postbase needs both YouTube permissions. Reconnect and leave every box ticked on Google’s screen.",
  fb_not_configured: "Facebook isn’t configured on this server yet (missing Meta app keys).",
  fb_connect_failed: "Connecting Facebook failed — please try again.",
  fb_no_page: "No Facebook Page found on your account. Create a Page, then reconnect.",
  ig_no_account:
    "No Instagram Business or Creator account is linked to your Facebook Pages. Switch the Instagram account to Business or Creator and link it to a Page, then reconnect.",
  pick_expired: "That took a little long, so for your security the sign-in expired. Please connect again.",
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
  searchParams: Promise<{ connected?: string; error?: string; pick?: string }>;
}) {
  const { connected, pick, ...rest } = await searchParams;
  let error = rest.error;
  const supabase = await createClient();
  const orgId = await scopeOrgId();

  // Back from Facebook with several accounts to choose from.
  let picker: { platform: MetaPlatform; options: MetaOption[] } | null = null;
  if (pick === "instagram" || pick === "facebook") {
    const parked = openPick((await cookies()).get(PICK_COOKIE)?.value, orgId);
    if (!parked || parked.platform !== pick) error ??= "pick_expired";
    else {
      try {
        picker = { platform: pick, options: await listMetaOptions(supabase, orgId, pick, parked.userToken) };
      } catch {
        error ??= pick === "instagram" ? "ig_connect_failed" : "fb_connect_failed";
      }
    }
  }
  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle, status, status_error, reconnect_by, display_name, avatar_url, verified")
    .eq("org_id", orgId)
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
      health: ChannelHealth;
      reason: string | null;
      reconnectBy: string | null;
      waiting: number;
    }[]
  > = {};

  // Scheduled posts held up by each broken channel, so the prompt can say so.
  const broken = (channels ?? []).filter((c) => channelHealth(c) !== "ok").map((c) => c.id);
  const waiting: Record<string, number> = {};
  if (broken.length > 0) {
    const { data: pending } = await supabase
      .from("post_targets")
      .select("channel_id")
      .in("channel_id", broken)
      .in("status", ["scheduled", "failed"]);
    for (const t of pending ?? []) waiting[t.channel_id] = (waiting[t.channel_id] ?? 0) + 1;
  }
  for (const c of channels ?? []) {
    (accountsByPlatform[c.platform] ??= []).push({
      id: c.id,
      handle: c.handle,
      status: c.status,
      displayName: c.display_name ?? null,
      avatarUrl: c.avatar_url ?? null,
      verified: Boolean(c.verified),
      health: channelHealth(c),
      reason: channelHealth(c) === "reconnect" ? reconnectReason(c.status_error ?? (c.reconnect_by ? "60 days" : null), BRAND_LABEL[c.platform] ?? c.platform) : null,
      reconnectBy: c.reconnect_by ?? null,
      waiting: waiting[c.id] ?? 0,
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
        <div className="mt-5 rounded-xl border border-[#d14a3e] bg-surface-2 px-4 py-3 text-sm text-[#d14a3e]">
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
        {picker ? (
          <MetaAccountPicker
            platform={picker.platform}
            options={picker.options}
            connectAction={connectMetaAccounts}
            cancelAction={cancelMetaPick}
          />
        ) : null}
      </div>
    </div>
  );
}
