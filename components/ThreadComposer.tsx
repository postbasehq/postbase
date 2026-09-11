"use client";

import { useState } from "react";

const MAX_TWEETS = 25;
const CHAR_LIMIT = 280;

/**
 * Compose one tweet or a thread. Submits a JSON `thread` field (array of tweets);
 * the first is the post body, the rest are the thread tail.
 */
export function ThreadComposer({ initial }: { initial?: string[] }) {
  const [tweets, setTweets] = useState<string[]>(initial && initial.length ? initial : [""]);

  const update = (i: number, v: string) =>
    setTweets((t) => t.map((x, idx) => (idx === i ? v : x)));
  const add = () => setTweets((t) => (t.length < MAX_TWEETS ? [...t, ""] : t));
  const remove = (i: number) =>
    setTweets((t) => (t.length > 1 ? t.filter((_, idx) => idx !== i) : t));

  const hidden = JSON.stringify(tweets.map((t) => t.trim()).filter(Boolean));
  const isThread = tweets.length > 1;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[13px] font-medium text-muted">
        {isThread ? "Thread" : "Post"}
      </span>

      {tweets.map((t, i) => (
        <div key={i}>
          {isThread ? (
            <div className="mb-1 text-xs font-medium text-muted">
              {i === 0 ? "Tweet 1" : `Tweet ${i + 1}`}
            </div>
          ) : null}
          <textarea
            value={t}
            onChange={(e) => update(i, e.target.value)}
            rows={i === 0 ? 4 : 3}
            required={i === 0}
            placeholder={i === 0 ? "What are you posting?" : `Continue the thread…`}
            className="w-full resize-y rounded-xl border border-line bg-ground px-3.5 py-3 text-sm leading-relaxed outline-none focus-visible:border-blue"
          />
          <div className="mt-1 flex items-center gap-3 text-xs">
            <span className={t.length > CHAR_LIMIT ? "text-terra" : "text-muted"}>
              {t.length}/{CHAR_LIMIT}
            </span>
            {tweets.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted hover:text-terra"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={add}
          disabled={tweets.length >= MAX_TWEETS}
          className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-blue-ink hover:bg-surface-2 disabled:opacity-50"
        >
          + Add tweet
        </button>
        {isThread ? (
          <span className="text-xs text-muted">
            Posts as a thread on X. Other channels post the first tweet only.
          </span>
        ) : null}
      </div>

      <input type="hidden" name="thread" value={hidden} />
    </div>
  );
}
