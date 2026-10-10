/** The public URL of a published post on its network, when it can be built from what we store. */
export function postUrl(platform: string, handle: string | null, id: string | null): string | null {
  if (!id) return null;
  const h = (handle ?? "").replace(/^@/, "");
  switch (platform) {
    case "x":
      return h ? `https://x.com/${h}/status/${id}` : null;
    case "youtube":
      return `https://www.youtube.com/watch?v=${id}`;
    case "bluesky": {
      const rkey = id.split("/").pop();
      return h && rkey ? `https://bsky.app/profile/${h}/post/${rkey}` : null;
    }
    case "mastodon":
      return id.startsWith("http") ? id : null;
    case "linkedin":
      return `https://www.linkedin.com/feed/update/${id}`;
    default:
      return null;
  }
}
