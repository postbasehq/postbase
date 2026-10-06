"use client";

import { useActionState, useState } from "react";
import {
  deleteCurrentWorkspace,
  leaveCurrentWorkspace,
  type WorkspaceRemovalState,
} from "@/app/(app)/workspace-actions";
import { SubmitButton } from "@/components/SubmitButton";
import type { WorkspaceRemoval as Plan } from "@/lib/account/workspace";

/**
 * Settings → Workspace: leave it, or (owners) delete it. Each says what will
 * happen or why it can't yet; deleting needs the workspace name typed out.
 */
export function WorkspaceRemoval({ plan }: { plan: Plan }) {
  const [mode, setMode] = useState<"none" | "leave" | "delete">("none");
  const [typed, setTyped] = useState("");
  const [leaveState, leave] = useActionState<WorkspaceRemovalState, FormData>(leaveCurrentWorkspace, {});
  const [deleteState, del] = useActionState<WorkspaceRemovalState, FormData>(deleteCurrentWorkspace, {});
  const isOwner = plan.role === "owner";

  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setMode(mode === "leave" ? "none" : "leave")}
          className="rounded-full border border-line px-4 py-2 font-display text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          Leave workspace
        </button>
        {isOwner ? (
          <button
            type="button"
            onClick={() => setMode(mode === "delete" ? "none" : "delete")}
            className="rounded-full border border-[#d14a3e] px-4 py-2 font-display text-sm font-semibold text-[#d14a3e] transition-colors hover:bg-[#d14a3e] hover:text-white"
          >
            Delete workspace
          </button>
        ) : null}
      </div>

      {mode === "leave" ? (
        <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-ink">
          {plan.leaveBlocker ? (
            <p>{plan.leaveBlocker}</p>
          ) : (
            <form action={leave} className="flex flex-col gap-3">
              <p>
                You&apos;ll lose access to “{plan.name}”. Its posts and channels stay for the{" "}
                {plan.others === 1 ? "other person" : `${plan.others} other people`} in it, and your AI apps and API keys for
                it are disconnected. Someone there can invite you back.
              </p>
              {leaveState.error ? <p className="font-medium text-[#d14a3e]">{leaveState.error}</p> : null}
              <div>
                <SubmitButton pendingLabel="Leaving…" className="rounded-full bg-ink px-5 py-2.5 font-display text-sm font-semibold text-surface disabled:opacity-50">
                  Leave “{plan.name}”
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {mode === "delete" ? (
        <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-ink">
          {plan.deleteBlocker ? (
            <p>{plan.deleteBlocker}</p>
          ) : (
            <form action={del} className="flex flex-col gap-3">
              <p className="font-semibold">Deleting “{plan.name}” will permanently:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted">
                <li>Delete its posts, scheduled posts, drafts, media and AI chats.</li>
                <li>Disconnect its channels and revoke Postbase&apos;s access to them.</li>
                {plan.paid ? <li>Cancel its subscription now.</li> : null}
                {plan.others ? (
                  <li>
                    Remove {plan.others === 1 ? "the other person" : `the ${plan.others} other people`} in it.
                  </li>
                ) : null}
                <li>Posts that have already gone out stay on the networks.</li>
              </ul>
              <label className="flex flex-col gap-1.5">
                <span className="text-muted">
                  Type <span className="font-semibold text-ink">{plan.name}</span> to confirm
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
              {deleteState.error ? <p className="font-medium text-[#d14a3e]">{deleteState.error}</p> : null}
              <div>
                <SubmitButton
                  disabled={typed.trim() !== plan.name.trim()}
                  pendingLabel="Deleting…"
                  className="rounded-full bg-[#d14a3e] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  Delete workspace
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
