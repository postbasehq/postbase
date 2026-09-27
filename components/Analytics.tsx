"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_EVENT, GA_ID, OPEN_SETTINGS_EVENT, getConsent, setConsent, type Consent } from "@/lib/analytics";

/**
 * GA4 plus its consent banner. The gtag script is only rendered once the
 * visitor has accepted; declining (or ignoring the banner) loads nothing.
 * GA4's enhanced measurement records client-side route changes as page views.
 */
export function Analytics() {
  const [consent, setState] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const c = getConsent();
    setState(c);
    setOpen(c === null);
    setReady(true);
    const onChange = (e: Event) => setState((e as CustomEvent<Consent>).detail);
    const onOpen = () => setOpen(true);
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
    };
  }, []);

  function choose(v: Consent) {
    setConsent(v);
    setOpen(false);
    // Withdrawing consent after GA loaded: a reload is the cleanest way to stop it.
    if (v === "denied" && consent === "granted") window.location.reload();
  }

  return (
    <>
      {consent === "granted" ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
          </Script>
        </>
      ) : null}

      {ready && open ? (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie preferences"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[560px] rounded-2xl border border-line bg-surface p-4 shadow-[0_18px_50px_-18px_rgba(16,24,40,0.45)] sm:bottom-5"
        >
          <p className="text-[14px] leading-relaxed text-ink">
            We&apos;d like to use Google Analytics cookies to see which pages people find useful. Nothing is set unless you
            accept. <a href="/privacy#10-cookies" className="font-semibold text-blue-ink underline underline-offset-2">Privacy policy</a>
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => choose("denied")}
              className="rounded-full border border-line px-4 py-2 font-display text-[13px] font-semibold text-ink transition-colors hover:border-ink"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => choose("granted")}
              className="rounded-full bg-blue px-4 py-2 font-display text-[13px] font-semibold text-on-blue shadow-sm"
            >
              Accept
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Footer link that reopens the banner so visitors can change their choice. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))} className={className}>
      Cookie settings
    </button>
  );
}
