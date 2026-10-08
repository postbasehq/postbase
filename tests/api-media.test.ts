import { afterEach, describe, expect, it } from "vitest";
import { installFakeNet, json, type FakeRequest } from "./helpers/fake-net";
import { createPost } from "@/lib/api-core";

let net: ReturnType<typeof installFakeNet> | undefined;
afterEach(() => net?.restore());

const at = () => new Date(Date.now() + 3_600_000).toISOString();
const VIDEO = { id: "m1", url: "https://media.test/o/clip.mp4", type: "video/mp4" };
const IMAGE = { id: "m2", url: "https://media.test/o/pic.png", type: "image/png" };

/** A workspace with the given channels and media library, accepting writes. */
function workspace(channels: { id: string; platform: string }[], library = [VIDEO, IMAGE]) {
  return (r: FakeRequest) => {
    if (r.url.host !== "db.test") return undefined;
    if (r.table === "channels") return json(channels);
    if (r.table === "media_library") return json(library.filter((m) => r.query.includes(m.id)));
    if (r.method === "POST" && r.table === "posts") return json({ id: "p1" });
    if (r.method === "PATCH" && r.table === "posts") return json([{ id: "p1" }]);
    return json([]);
  };
}
const postRow = () => net!.log.find((r) => r.method === "POST" && r.table === "posts")?.body as Record<string, unknown>;
const mediaRows = () => net!.log.find((r) => r.method === "POST" && r.table === "media")?.body;

describe("API posts with media", () => {
  it("attaches library files in the caller's order and schedules a YouTube video", async () => {
    net = installFakeNet(workspace([{ id: "yt", platform: "youtube" }]));
    const post = await createPost("o", {
      body: "Launch video",
      channelIds: ["yt"],
      scheduledAt: at(),
      mediaIds: ["m1"],
      youtube: { title: "Launch", privacy: "unlisted", madeForKids: false },
    });
    expect(post).toMatchObject({ id: "p1", status: "scheduled", media: 1 });
    expect(mediaRows()).toEqual([{ post_id: "p1", storage_url: VIDEO.url, type: "video/mp4" }]);
    expect(postRow()).toMatchObject({ youtube_privacy: "unlisted", youtube_options: { title: "Launch", madeForKids: false } });
  });

  it("refuses media ids from outside the workspace's library, before writing", async () => {
    net = installFakeNet(workspace([{ id: "x", platform: "x" }]));
    await expect(createPost("o", { body: "hi", channelIds: ["x"], scheduledAt: at(), mediaIds: ["someone-elses"] })).rejects.toThrow(/media_ids/);
    expect(net.writes()).toEqual([]);
  });

  it("still requires a video for YouTube", async () => {
    net = installFakeNet(workspace([{ id: "yt", platform: "youtube" }]));
    await expect(
      createPost("o", { body: "hi", channelIds: ["yt"], scheduledAt: at(), mediaIds: ["m2"], youtube: { madeForKids: false } }),
    ).rejects.toThrow(/Needs a video/);
  });

  it("requires the made-for-kids declaration to schedule to YouTube", async () => {
    net = installFakeNet(workspace([{ id: "yt", platform: "youtube" }]));
    await expect(createPost("o", { body: "hi", channelIds: ["yt"], scheduledAt: at(), mediaIds: ["m1"] })).rejects.toThrow(/made for kids/);
    expect(net.writes()).toEqual([]);
  });

  it("never schedules TikTok (its guidelines need the creator in the composer), but saves a draft", async () => {
    net = installFakeNet(workspace([{ id: "tt", platform: "tiktok" }]));
    await expect(createPost("o", { body: "hi", channelIds: ["tt"], scheduledAt: at(), mediaIds: ["m1"] })).rejects.toThrow(/TikTok/);
    expect(net.writes()).toEqual([]);
    await expect(createPost("o", { body: "hi", channelIds: ["tt"], scheduledAt: null, mediaIds: ["m1"] })).resolves.toMatchObject({ status: "draft", media: 1 });
  });

  it("allows a media-only post where the network takes one", async () => {
    net = installFakeNet(workspace([{ id: "x", platform: "x" }]));
    await expect(createPost("o", { channelIds: ["x"], scheduledAt: at(), mediaIds: ["m2"] })).resolves.toMatchObject({ status: "scheduled" });
  });
});
