"use client";

import { useEffect, useState } from "react";

const format = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n));

/** GitHub mark linking to the org, with the total star count once it loads. */
export function GitHubButton() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/github/stars")
      .then((r) => r.json())
      .then((d: { stars: number | null }) => {
        if (alive && typeof d.stars === "number") setStars(d.stars);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <a
      href="https://github.com/postbasehq"
      aria-label={stars != null ? `Postbase on GitHub, ${stars} stars` : "Postbase on GitHub"}
      title="Star Postbase on GitHub"
      className="flex h-9 items-center gap-1.5 rounded-full px-2 text-muted transition hover:bg-surface-2 hover:text-ink"
    >
      {/* GitHub mark (simple-icons) */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
      {stars != null ? (
        <span className="flex items-center gap-1 text-[13px] font-semibold tabular-nums">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#e3a72c" aria-hidden>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {format(stars)}
        </span>
      ) : null}
    </a>
  );
}
