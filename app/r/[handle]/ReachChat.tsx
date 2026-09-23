"use client";

import { useEffect, useRef, useState } from "react";

type Cited = { title: string | null; url: string; thumbnail: string | null };
type Cta = { label: string; url: string; kind: string };
type Turn = {
  role: "user" | "assistant";
  text: string;
  cited?: Cited[];
  cta?: Cta | null;
};

const SUGGESTIONS = [
  "Where should I start?",
  "Do you have anything for beginners?",
  "Can I work with you?",
];

export function ReachChat({
  handle,
  suggestions,
}: {
  handle: string;
  suggestions?: string[];
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string>("");
  const conversationId = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Per-browser session id (best-effort; fine to be anonymous).
    try {
      const k = "reach_sid";
      let sid = localStorage.getItem(k);
      if (!sid) {
        sid = crypto.randomUUID();
        localStorage.setItem(k, sid);
      }
      sessionId.current = sid;
    } catch {
      sessionId.current = Math.random().toString(36).slice(2);
    }
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/reach/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle,
          question: q,
          sessionId: sessionId.current,
          conversationId: conversationId.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      conversationId.current = data.conversationId ?? conversationId.current;
      setTurns((t) => [
        ...t,
        { role: "assistant", text: data.answer, cited: data.cited, cta: data.cta },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: "assistant", text: "Something went wrong — try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const chips = suggestions?.length ? suggestions : SUGGESTIONS;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scroller} className="flex-1 overflow-y-auto px-1 py-4">
        {turns.length === 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {chips.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:border-blue hover:text-blue"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {turns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    t.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-blue px-4 py-2.5 text-sm text-white"
                      : "max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-sm text-ink"
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{t.text}</p>
                  {t.cited && t.cited.length > 0 ? (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {t.cited.map((c, j) => (
                        <a
                          key={j}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-xs font-medium text-ink transition hover:border-blue"
                        >
                          <span className="truncate">{c.title || c.url}</span>
                          <span className="ml-auto shrink-0 text-muted">↗</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {t.cta ? (
                    <a
                      href={t.cta.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-surface transition hover:brightness-110"
                    >
                      {t.cta.label} →
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-sm text-muted">
                  Thinking…
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 border-t border-line pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          maxLength={500}
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-full bg-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
