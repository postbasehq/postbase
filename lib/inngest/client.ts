import { Inngest } from "inngest";

/**
 * Inngest client — the scheduling engine that runs posts at their scheduled time.
 * See docs/TECH_STACK.md §5.
 */
export const inngest = new Inngest({ id: "postbase" });

// Event payloads
export type PostScheduledEvent = {
  name: "post/scheduled";
  data: { postId: string; scheduledAt: string | null };
};
export type PostCancelledEvent = {
  name: "post/cancelled";
  data: { postId: string };
};
