// Example accounts and posts for the marketing demos. The people and brands are
// fictional, and the posts are text-only: no stock photos anywhere.

export type Example = {
  name: string;
  handle: string;
  body: string;
  channels: string[];
};

export const COFFEE: Example = {
  name: "Halden Coffee",
  handle: "haldencoffee",
  body:
    "New on the shelf: Kochere, Ethiopia ☕️\n\nWashed process, light roast. In the cup it's apricot, black tea and a little bergamot.\n\nRoasted Monday, shipped Tuesday. 40 bags this week, and they go fast.",
  channels: ["x", "linkedin", "bluesky"],
};

export const RUNNING: Example = {
  name: "Tom Reyes",
  handle: "tomrunsfar",
  body:
    "Your easy runs are too fast.\n\nThe test: if you can't say a full sentence out loud, slow down.\n\n80% of my weekly miles are at conversation pace. That's what got me under 3 hours in the marathon — not the intervals.",
  channels: ["x", "linkedin", "bluesky", "mastodon"],
};

export const CERAMICS: Example = {
  name: "Maya Lindqvist",
  handle: "mayamakes",
  body:
    "Glaze test #14 came out of the kiln this morning and I'm not okay.\n\nSpeckled oat over a raw stoneware foot, fired to cone 6. Every cup is a little different.\n\nThe shop opens Sunday at 6pm — 24 cups, no restock.",
  channels: ["bluesky", "x", "mastodon"],
};

export const FIELDNOTE: Example = {
  name: "Fieldnote",
  handle: "fieldnoteapp",
  body:
    "Fieldnote 2.4 is out.\n\nOffline mode: write anywhere, and your notes sync the moment you're back online. No spinner, no lost edits.\n\nFree for everyone on Pro.",
  channels: ["x", "linkedin"],
};
