// Marketing-site announcement bar: Postbase is open source. Solid amber (no
// tints) so it reads the same in light and dark, like the old preview banner.
export function OpenSourceBanner() {
  return (
    <a
      href="https://github.com/postbasehq/postbase"
      className="group flex w-full shrink-0 items-center justify-center gap-2 bg-[#e3a72c] px-4 py-2 text-center text-[13px] font-semibold leading-snug text-[#202124]"
    >
      {/* GitHub mark (simple-icons) */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
      <span>
        Postbase is open source.
        <span className="hidden sm:inline"> Self-host it for free, or read the code that posts for you.</span>
      </span>
      <span className="inline-flex items-center gap-1 underline decoration-[#202124]/40 underline-offset-2 group-hover:decoration-[#202124]">
        Star us on GitHub
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </a>
  );
}
