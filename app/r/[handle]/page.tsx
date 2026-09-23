import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedPage } from "@/lib/reach/queries";
import { ReachChat } from "./ReachChat";

/**
 * Public Postbase Reach follower page: /r/<handle>. Anonymous, no app shell.
 * The creator's header + a conversational agent over their content corpus.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const page = await getPublishedPage(handle);
  if (!page) return { title: "Not found" };
  const name = page.display_name || page.handle;
  return {
    title: `${name} · Postbase`,
    description: page.bio ?? `Ask ${name} anything.`,
  };
}

export default async function ReachPublicPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const page = await getPublishedPage(handle);
  if (!page) notFound();

  const name = page.display_name || page.handle;
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-lg flex-col px-4 py-6">
      <header className="flex items-center gap-3 pb-4">
        {page.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.avatar_url}
            alt={name}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue text-lg font-semibold text-white">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold tracking-[-0.01em] text-ink">
            {name}
          </h1>
          {page.bio ? <p className="truncate text-sm text-muted">{page.bio}</p> : null}
        </div>
      </header>

      <ReachChat handle={page.handle} />

      <footer className="pt-3 text-center">
        <a
          href="https://www.postbase.so"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted transition hover:text-ink"
        >
          Powered by Postbase
        </a>
      </footer>
    </div>
  );
}
