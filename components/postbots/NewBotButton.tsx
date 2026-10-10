"use client";

import { useTransition } from "react";
import { createBot } from "@/app/(bots)/bots/actions";

/** Makes a blank bot and opens its chat. `children` is the button's face. */
export function NewBotButton({
  className,
  label,
  children,
  onDone,
}: {
  className?: string;
  label?: string;
  children: React.ReactNode;
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() =>
        start(async () => {
          let res: { error: string } | void;
          try {
            res = await createBot();
          } catch (e) {
            // redirect() to the new bot surfaces as a thrown navigation; let it through.
            if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
            // Otherwise usually a lapsed sign-in: reloading sends them to sign in again.
            window.location.reload();
            return;
          }
          if (res?.error) alert(res.error);
          onDone?.();
        })
      }
      className={`${className ?? ""} disabled:opacity-60`}
    >
      {children}
    </button>
  );
}
