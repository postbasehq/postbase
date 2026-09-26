/**
 * Platforms whose publishing is built but can't be connected yet (waiting on
 * the platform's app review). Shown as "Coming soon" in Channels + onboarding;
 * already-connected accounts keep working. Delete the entry once approved.
 */
export const COMING_SOON: Record<string, string> = {
  instagram: "Coming soon — waiting on Meta’s app review.",
};
