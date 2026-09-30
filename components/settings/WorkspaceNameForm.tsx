"use client";

import { useActionState, useState } from "react";
import { renameWorkspace, type RenameState } from "@/app/(app)/settings-actions";
import { SubmitButton } from "@/components/SubmitButton";

/** The workspace name, editable in place. Save only lights up once it's changed. */
export function WorkspaceNameForm({ name }: { name: string }) {
  const [state, action] = useActionState<RenameState, FormData>(renameWorkspace, {});
  const saved = state.ok ? (state.name ?? name) : name;
  const [value, setValue] = useState(name);
  const changed = value.replace(/\s+/g, " ").trim() !== saved;

  return (
    <form action={action}>
      <label htmlFor="workspace-name" className="text-[13px] font-medium text-muted">
        Workspace name
      </label>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <input
          id="workspace-name"
          name="name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={60}
          required
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-line bg-ground px-3.5 py-2.5 text-[15px] text-ink outline-none focus-visible:border-blue"
        />
        <SubmitButton
          disabled={!changed}
          pendingLabel="Saving…"
          className="rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md disabled:cursor-default disabled:opacity-50 disabled:shadow-none"
        >
          Save
        </SubmitButton>
      </div>
      <p className={`mt-2 text-[12px] ${state.error ? "text-[#d14a3e]" : "text-muted"}`} aria-live="polite">
        {state.error
          ? state.error
          : state.ok && !changed
            ? "Saved. Everyone in the workspace sees the new name."
            : "Shown in the workspace switcher, on invites and when an AI tool asks which workspace to use."}
      </p>
    </form>
  );
}
