import { Inngest } from "inngest";

/**
 * Inngest client — the scheduling engine that runs posts at their scheduled time.
 * Local dev runs with INNGEST_DEV=1 (set in the `dev` script); production uses
 * INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY (Inngest Cloud).
 */
export const inngest = new Inngest({ id: "postbase" });

export type PostScheduledEvent = {
  name: "post/scheduled";
  data: { postId: string; scheduledAt: string | null };
};
export type PostCancelledEvent = {
  name: "post/cancelled";
  data: { postId: string };
};
