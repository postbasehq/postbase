"use client";

import { SubmitButton } from "@/components/SubmitButton";

/**
 * Delete a post (any state) — matches Postiz. Confirms first; for already-
 * published posts it makes clear the delete only removes it from Postbase, not
 * from the social channel. Wraps the server `deletePost` action.
 */
export function DeletePostButton({
  action,
  postId,
  published,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  postId: string;
  published?: boolean;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const msg = published
          ? "Delete this post? This removes it from Postbase only — it will NOT be removed from the channel it was published to."
          : "Delete this post? This can’t be undone.";
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="post_id" value={postId} />
      <SubmitButton
        className={
          className ??
          "flex size-8 items-center justify-center rounded-lg bg-[#d14a3e] text-white transition hover:brightness-95 disabled:opacity-50"
        }
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
        <span className="sr-only">Delete post</span>
      </SubmitButton>
    </form>
  );
}
