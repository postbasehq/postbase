export const metadata = {
  title: "Data deletion",
};

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">Data deletion</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        When you remove Postbase from your Facebook or Instagram account, we automatically
        delete the connected channel and its stored access tokens from Postbase.
      </p>

      {code ? (
        <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <div className="text-muted">Your deletion request was received.</div>
          <div className="mt-1">
            Confirmation code: <span className="font-mono font-semibold">{code}</span>
          </div>
        </div>
      ) : null}

      <p className="mt-5 text-sm leading-relaxed text-muted">
        To request deletion manually, disconnect the account in{" "}
        <span className="font-medium text-ink">Channels</span>, or email{" "}
        <a href="mailto:team@postbase.so" className="font-medium text-blue-ink underline">
          team@postbase.so
        </a>{" "}
        and we&rsquo;ll remove your data within 30 days.
      </p>
    </main>
  );
}
