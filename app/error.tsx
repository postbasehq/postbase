"use client";

import { ErrorView } from "@/components/ErrorView";

// Error boundary for everything under the root layout (marketing, login, etc.).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} />;
}
