// Pre-launch notice shown across the marketing site and the app.
// Solid amber (no tints) so it reads the same in light and dark.
export function PreviewBanner() {
  return (
    <div
      role="status"
      className="w-full shrink-0 bg-[#e3a72c] px-4 py-2 text-center text-[13px] font-semibold leading-snug text-[#202124]"
    >
      Heads up: Postbase is still in development and isn&apos;t live yet — things may change or break.
    </div>
  );
}
