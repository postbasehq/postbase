/*
 * The agent's conversation history, built from our database — never taken
 * from the browser, which could send anything (huge text to run up the model
 * bill, or invented assistant turns). Bounded so one message costs cents.
 */

export type HistoryTurn = { role: "user" | "assistant"; content: string };
export type StoredMessage = { role: string; content: string; images: string[] | null };

/** How many of the latest stored messages to load. */
export const HISTORY_TURNS = 20;
const MAX_HISTORY_CHARS = 30_000;

/**
 * Turn stored messages (newest first, as loaded) into the model's history:
 * oldest first, within the character budget, opening with a user turn.
 */
export function buildHistory(newestFirst: StoredMessage[]): HistoryTurn[] {
  const turns: HistoryTurn[] = [];
  let chars = 0;
  for (const m of newestFirst) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    // Tool results aren't kept between turns, so tell the model which images
    // earlier replies generated; otherwise it can't attach them later.
    const images = m.images ?? [];
    const content = images.length ? `${m.content}\n\n[Images generated in this message: ${images.join(" ")}]` : m.content;
    if (chars + content.length > MAX_HISTORY_CHARS) break;
    chars += content.length;
    turns.unshift({ role: m.role, content });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}
