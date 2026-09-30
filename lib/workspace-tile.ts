// Solid brand colours for a workspace's letter tile, picked from its id so a
// workspace keeps the same colour everywhere (sidebar switcher, Settings).
const TILES = [
  { bg: "#2b59d9", fg: "#ffffff" },
  { bg: "#e3a72c", fg: "#202124" },
  { bg: "#d14a3e", fg: "#ffffff" },
];

export function workspaceTile(id: string | null | undefined) {
  // FNV-1a: a plain character sum puts most UUIDs on the same colour.
  let h = 0x811c9dc5;
  for (const c of id ?? "") h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
  return TILES[(h >>> 0) % TILES.length];
}

export function workspaceInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "W";
}
