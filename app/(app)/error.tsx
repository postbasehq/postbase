"use client";

import { ErrorView } from "@/components/ErrorView";

// Inside the dashboard: the sidebar stays, only the page area shows the error.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} home="/calendar" homeLabel="Back to the calendar" />;
}
