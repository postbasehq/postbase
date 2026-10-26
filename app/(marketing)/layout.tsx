import { Analytics } from "@/components/Analytics";

/** Marketing pages share the site background. Light by default (see ThemeScript); the theme toggle can switch them to dark. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ground text-ink">
      <Analytics />
      {children}
    </div>
  );
}
