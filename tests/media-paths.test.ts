import { describe, expect, it } from "vitest";
import { ownStoragePath } from "@/lib/media-paths";

const MINE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VICTIM = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const base = "https://abc.supabase.co/storage/v1/object/public/post-media";

describe("only a workspace's own media can be deleted", () => {
  it.each(["uploads", "agent", "ai"])("allows its own %s files", (folder) => {
    expect(ownStoragePath(`${base}/${folder}/${MINE}/1f2e.jpg`, MINE)).toBe(`${folder}/${MINE}/1f2e.jpg`);
  });
  it.each([
    ["another workspace's file", `${base}/uploads/${VICTIM}/1f2e.mp4`],
    ["dot-segment escape", `${base}/uploads/${MINE}/../${VICTIM}/1f2e.mp4`],
    ["encoded slash", `${base}/uploads/${MINE}%2F..%2F${VICTIM}/x.mp4`],
    ["encoded dots", `${base}/uploads/${MINE}/%2e%2e`],
    ["nested path", `${base}/uploads/${MINE}/sub/x.mp4`],
    ["other folder", `${base}/avatars/${MINE}/x.png`],
    ["not post-media at all", `https://evil.test/uploads/${MINE}/x.png`],
    ["not a URL", "uploads/" + MINE + "/x.png"],
  ])("refuses %s", (_, url) => {
    expect(ownStoragePath(url, MINE)).toBeNull();
  });
});
