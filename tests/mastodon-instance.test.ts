import { describe, expect, it, vi } from "vitest";

const resolves: Record<string, string[]> = {
  "mastodon.social": ["151.101.1.1"],
  "evil.nip.io": ["169.254.169.254"],
  "mixed.example": ["151.101.1.1", "10.0.0.5"],
  "v6.example": ["fd00::1"],
  "mapped.example": ["::ffff:127.0.0.1"],
};
vi.mock("node:dns/promises", () => ({
  lookup: async (host: string) => {
    const a = resolves[host];
    if (!a) throw new Error("ENOTFOUND");
    return a.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
  },
}));

import { isPublicInstance } from "@/lib/platforms/mastodon";

describe("a Mastodon server address must be public before our servers call it", () => {
  it("accepts a real public server", async () => {
    expect(await isPublicInstance("mastodon.social")).toBe(true);
    expect(await isPublicInstance("https://mastodon.social/")).toBe(true);
  });
  it("refuses anything that points inside the network", async () => {
    for (const bad of [
      "http://mastodon.social",
      "https://mastodon.social:8443",
      "https://user@mastodon.social",
      "metadata.google.internal",
      "localhost",
      "10.0.0.1",
      "evil.nip.io",
      "mixed.example",
      "v6.example",
      "mapped.example",
      "unknown.example",
    ]) {
      expect(await isPublicInstance(bad)).toBe(false);
    }
  });
});
