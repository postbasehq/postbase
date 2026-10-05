"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Last resort: the root layout itself failed, so no app CSS or fonts are
// loaded. Plain inline styles, same message and actions as ErrorView.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f4f5f7", fontFamily: font, color: "#14161a" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#6b7079", margin: 0 }}>Something went wrong</p>
          <h1 style={{ fontSize: 32, lineHeight: 1.15, margin: "16px 0 0" }}>Postbase hit a snag</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4f57", margin: "16px auto 0", maxWidth: "44ch" }}>
            It&apos;s on our side, not yours, and we&apos;ve been told about it. Your posts and scheduled sends aren&apos;t
            affected.
          </p>
          <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{ border: 0, borderRadius: 999, background: "#2b59d9", color: "#fff", padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
            <a href="/" style={{ borderRadius: 999, border: "1px solid #e4e6eb", color: "#14161a", padding: "10px 22px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              Go to the homepage
            </a>
          </div>
          {error.digest ? <p style={{ marginTop: 32, fontSize: 11, color: "#8a8f98", fontFamily: "monospace" }}>Reference: {error.digest}</p> : null}
        </div>
      </body>
    </html>
  );
}
