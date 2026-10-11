import Stripe from "stripe";
import { hostConfig, splitOn } from "@/lib/hosts";

/**
 * Server-side Stripe client, lazily created so the module can be imported at
 * build time without STRIPE_SECRET_KEY set. Never import into client components.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
    client = new Stripe(key, { apiVersion: "2026-08-26.dahlia", typescript: true });
  }
  return client;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const billingUrls = {
  success: `${APP_URL}/billing?checkout=success`,
  cancel: `${APP_URL}/billing?checkout=cancelled`,
  return: `${APP_URL}/billing`,
};

/** Checkout started from Postbots' plan screen comes back to Postbots. */
export function botsCheckoutUrls(): { success: string; cancel: string } {
  const hosts = hostConfig();
  const base = splitOn(hosts) ? `https://${hosts.bots}/` : `${APP_URL}/bots`;
  return { success: `${base}?checkout=success`, cancel: base };
}

/**
 * Checkout uses Managed Payments (Stripe as merchant of record) unless
 * STRIPE_MANAGED_PAYMENTS=off — an escape hatch if the account loses eligibility.
 */
export function managedPayments(): boolean {
  return process.env.STRIPE_MANAGED_PAYMENTS?.trim().toLowerCase() !== "off";
}
