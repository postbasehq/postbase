/** Marketing pages are light-only, whatever the visitor's system theme. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="light-only min-h-dvh bg-ground text-ink">{children}</div>;
}
