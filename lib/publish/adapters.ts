/**
 * Platform publishing adapters — common interface so adding a platform is additive
 * (docs/TECH_STACK.md §4). Each real adapter posts via that platform's API using the
 * channel's stored (decrypted) OAuth tokens.
 *
 * These are STUBS for now: they simulate a successful publish so the whole
 * scheduling lifecycle works end-to-end before platform API access is granted.
 * Swap `simulate` for the real API call per platform (X first, once the paid tier
 * app is approved).
 */

export type PublishInput = {
  platform: string;
  body: string;
  handle: string | null;
  encryptedTokens: string | null;
};

export type PublishResult =
  | { ok: true; platformPostId: string }
  | { ok: false; error: string };

function simulate(platform: string): PublishResult {
  return {
    ok: true,
    platformPostId: `${platform}_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

export async function publish(input: PublishInput): Promise<PublishResult> {
  if (!input.body.trim()) {
    return { ok: false, error: "Post body is empty." };
  }

  switch (input.platform) {
    case "x":
      // TODO: real X API v2 (paid tier) — POST /2/tweets with the channel's OAuth2 token.
      return simulate("x");
    case "linkedin":
      // TODO: real LinkedIn UGC/Posts API with w_member_social.
      return simulate("linkedin");
    case "instagram":
      // TODO: real Instagram Graph API (business/creator accounts).
      return simulate("instagram");
    case "youtube":
      return simulate("youtube");
    default:
      return { ok: false, error: `Unsupported platform: ${input.platform}` };
  }
}
