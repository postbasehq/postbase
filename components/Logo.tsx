import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 font-display text-[19px] font-semibold tracking-[-0.02em] text-ink"
    >
      <span className="size-[30px] shrink-0 overflow-hidden rounded-[24%] shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/postbase-icon.png"
          alt="Postbase logo"
          className="size-full object-cover"
        />
      </span>
      Postbase
    </Link>
  );
}
