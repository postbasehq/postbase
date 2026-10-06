"use client";

import { useActionState, useState } from "react";
import { deleteMyAccount, type DeleteAccountState } from "@/app/(app)/account-actions";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * Settings → Your data: download a copy of everything, or delete the account.
 * Deletion shows exactly what will happen (workspaces deleted vs left) and what
 * blocks it, and needs the email typed out to confirm.
 */
export function AccountData({
  email,
  plan,
}: {
  email: string;
  plan: { purge: { id: string; name: string }[]; leave: { id: string; name: string }[]; blockers: string[] };
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action] = useActionState<DeleteAccountState, FormData>(deleteMyAccount, {});
  const matches = typed.trim().toLowerCase() === email.toLowerCase();
  const blocked = plan.blockers.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-ink">Export your data</div>
          <div className="text-[12px] text-muted">
            A JSON file of your account, posts, channels, media and AI chats. Workspaces you own or run are included in full.
          </div>
        </div>
        <a
          href="/api/account/export"
          className="rounded-full border border-line bg-surface px-4 py-2 font-display text-sm font-semibold text-ink shadow-sm transition-colors hover:border-ink"
        >
          Download
        </a>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14px] font-medium text-ink">Delete your account</div>
            <div className="text-[12px] text-muted">Permanent and immediate. Download your data first if you want a copy.</div>
          </div>
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full border border-[#d14a3e] px-4 py-2 font-display text-sm font-semibold text-[#d14a3e] transition-colors hover:bg-[#d14a3e] hover:text-white"
            >
              Delete account
            </button>
          ) : null}
        </div>

        {open ? (
          <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-ink">
            {blocked ? (
              <>
                <p className="font-semibold">Before you can delete your account:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                  {plan.blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </>
            ) : (
              <form action={action} className="flex flex-col gap-3">
                <p className="font-semibold">This will:</p>
                <ul className="list-disc space-y-1 pl-5 text-muted">
                  {plan.purge.length ? (
                    <li>
                      Delete {plan.purge.length === 1 ? "the workspace" : "these workspaces"} {plan.purge.map((o) => `“${o.name}”`).join(", ")}{" "}
                      with all {plan.purge.length === 1 ? "its" : "their"} posts, scheduled posts, media and connected accounts, and cancel any subscription.
                    </li>
                  ) : null}
                  {plan.leave.length ? (
                    <li>
                      Remove you from {plan.leave.map((o) => `“${o.name}”`).join(", ")}. {plan.leave.length === 1 ? "It carries" : "They carry"} on for the other people in {plan.leave.length === 1 ? "it" : "them"}.
                    </li>
                  ) : null}
                  <li>Revoke Postbase&apos;s access to your social accounts, disconnect your AI apps and delete your API keys.</li>
                  <li>Delete your login. This can&apos;t be undone.</li>
                  {plan.leave.length ? (
                    <li>Posts you wrote in shared workspaces stay with those workspaces, no longer linked to you.</li>
                  ) : null}
                  <li>Posts that have already gone out stay on the networks; delete them there if you want them gone.</li>
                </ul>
                <label className="mt-1 flex flex-col gap-1.5">
                  <span className="text-muted">
                    Type <span className="font-semibold text-ink">{email}</span> to confirm
                  </span>
                  <input
                    name="confirm"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-ink"
                  />
                </label>
                {state.error ? <p className="font-medium text-[#d14a3e]">{state.error}</p> : null}
                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton
                    disabled={!matches}
                    pendingLabel="Deleting…"
                    className="rounded-full bg-[#d14a3e] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                  >
                    Delete my account
                  </SubmitButton>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
