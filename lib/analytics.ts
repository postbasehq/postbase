"use client";

/*
 * Google Analytics 4, consent-first ("basic" consent mode): gtag.js is only
 * loaded after the visitor accepts analytics cookies, so nothing is sent or
 * stored before that (UK PECR / GDPR). Used on the marketing site and login
 * page only, never inside the app.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-278EDQB1XD";

const KEY = "pb-analytics-consent";
export const CONSENT_EVENT = "pb:consent";
export const OPEN_SETTINGS_EVENT = "pb:cookie-settings";

export type Consent = "granted" | "denied";

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: Consent) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: v }));
}

type Gtag = (...args: unknown[]) => void;

/** Send a GA4 event if analytics is loaded (i.e. the visitor consented). */
export function track(event: string, params?: Record<string, unknown>) {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === "function") gtag("event", event, params ?? {});
}
