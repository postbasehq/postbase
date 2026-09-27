import { MarketingTheme, MarketingThemeScript } from "@/components/marketing/MarketingTheme";
import { Analytics } from "@/components/Analytics";

/** Marketing pages share the site background. They open in light mode; the theme toggle can switch them to dark. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ground text-ink">
      <MarketingThemeScript />
      <MarketingTheme />
      <Analytics />
      {children}
    </div>
  );
}
