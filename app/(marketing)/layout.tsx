/** Marketing pages share the site background; they follow the light/dark theme like the app. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-ground text-ink">{children}</div>;
}
