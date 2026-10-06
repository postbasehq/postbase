"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { UserOrg } from "@/lib/org";
import { SubmitButton } from "@/components/SubmitButton";
import { useRouter } from "next/navigation";
import { workspaceInitial, workspaceTile } from "@/lib/workspace-tile";
import { createWorkspace } from "@/app/(app)/workspace-actions";

const ROLE: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };

/** Workspaces used vs the plan's allowance, and whether this person can add one. */
export type WorkspaceAllowance = {
  used: number;
  limit: number;
  planName: string | null;
  nextPlan: { name: string; limit: number } | null;
  /** Owner or admin of the workspace that pays for the plan. */
  canManage: boolean;
  billingName: string;
  /** The plan is active (trial counts). */
  active: boolean;
};

function Tile({ org, size = 32 }: { org: UserOrg; size?: number }) {
  const t = workspaceTile(org.id);
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[9px] font-display font-semibold"
      style={{ width: size, height: size, background: t.bg, color: t.fg, fontSize: size * 0.45 }}
    >
      {workspaceInitial(org.name)}
    </span>
  );
}

/**
 * The active workspace, and a menu to switch, create one, or see which plan
 * adds more. Always shown, so a solo user can discover workspaces too. The menu
 * floats over the sidebar rather than pushing the nav down.
 */
export function OrgSwitcher({
  orgs,
  activeId,
  action,
  workspaces,
}: {
  orgs: UserOrg[];
  activeId: string | null;
  action: (formData: FormData) => Promise<void>;
  workspaces?: WorkspaceAllowance | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = orgs.find((o) => o.id === activeId) ?? orgs[0];
  if (!active) return null;

  return (
    <div ref={ref} className="relative px-3 pb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl border bg-surface px-2.5 py-2 text-left transition-colors ${
          open ? "border-muted" : "border-line hover:border-muted"
        }`}
      >
        <Tile org={active} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-ink">{active.name}</span>
          <span className="block text-[12px] text-muted">{ROLE[active.role] ?? active.role}</span>
        </span>
        {/* up/down chevron */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden>
          <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
        </svg>
      </button>

      {/* The menu: at least the switcher's width, never narrower than 260px so rows stay on one line (it may overhang the sidebar, like any popover). */}
      {open ? (
        <div role="menu" className="absolute left-3 top-full z-50 mt-1.5 w-[max(calc(100%_-_1.5rem),260px)] rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
          <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted">Workspaces</div>
          {orgs.map((o) => {
            const current = o.id === active.id;
            return (
              <form key={o.id} action={action} onSubmit={() => setOpen(false)}>
                <input type="hidden" name="org_id" value={o.id} />
                <SubmitButton
                  disabled={current}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors disabled:cursor-default ${
                    current ? "bg-surface-2" : "hover:bg-surface-2"
                  }`}
                >
                  <Tile org={o} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">{o.name}</span>
                    <span className="block text-[12px] text-muted">{ROLE[o.role] ?? o.role}</span>
                  </span>
                  {current ? (
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-label="Current workspace" className="shrink-0">
                      <circle cx="9" cy="9" r="9" fill="#2b59d9" />
                      <path d="m5.2 9.3 2.5 2.5 5-5.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </SubmitButton>
              </form>
            );
          })}
          {workspaces ? <CreateWorkspace allowance={workspaces} onDone={() => setOpen(false)} /> : null}
          <div className="mt-1.5 border-t border-line pt-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
              Workspace settings
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The bottom of the switcher menu: add a workspace if the plan has room, or
 * say which plan does. The upsell lives here so people find it where they'd
 * look for it.
 */
function CreateWorkspace({ allowance: a, onDone }: { allowance: WorkspaceAllowance; onDone: () => void }) {
  const router = useRouter();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const room = a.active && a.used < a.limit;

  const plus = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );

  // Room on the plan, but only the billing workspace's owners/admins can use it.
  if (room && !a.canManage) {
    return (
      <p className="mt-1.5 border-t border-line px-2.5 pb-1 pt-2.5 text-[12px] leading-snug text-muted">
        Ask an owner of {a.billingName} to add workspaces ({a.used} of {a.limit} used).
      </p>
    );
  }

  if (!room) {
    const upgrade = a.active ? a.nextPlan : { name: "a plan", limit: 0 };
    return (
      <div className="mt-1.5 border-t border-line px-1 pt-1.5">
        <div className="rounded-xl bg-surface-2 p-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            {plus}
            Create a workspace
          </div>
          <p className="mt-1 text-[12px] leading-snug text-muted">
            {!a.active
              ? "Start a plan to add workspaces for clients or brands."
              : upgrade
                ? a.limit === 1
                  ? `Separate workspaces for clients or brands start on ${upgrade.name} (${upgrade.limit} workspaces, one bill).`
                  : `You're using all ${a.limit} workspaces on ${a.planName}. ${upgrade.name} includes ${upgrade.limit}.`
                : `You're using all ${a.limit} workspaces on your plan.`}
          </p>
          {upgrade && a.canManage ? (
            <Link
              href="/billing"
              onClick={onDone}
              className="mt-2.5 inline-flex rounded-full bg-[#2b59d9] px-3.5 py-1.5 font-display text-[12px] font-semibold text-white shadow-sm"
            >
              {a.active ? `See ${upgrade.name}` : "Choose a plan"}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await createWorkspace(name);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNaming(false);
    setName("");
    onDone();
    router.push("/channels");
    router.refresh();
  }

  return (
    <div className="mt-1.5 border-t border-line pt-1.5">
      {naming ? (
        <div className="px-1 pb-1">
          <input
            autoFocus
            value={name}
            maxLength={60}
            disabled={busy}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
              if (e.key === "Escape") setNaming(false);
            }}
            placeholder="Client or brand name"
            className="w-full rounded-xl border border-blue bg-ground px-3 py-2 text-[14px] outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] text-muted">
              {a.used} of {a.limit} used · shares {a.billingName}&apos;s plan
            </span>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !name.trim()}
              className="rounded-full bg-[#2b59d9] px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
          {error ? <p className="mt-1.5 px-1 text-[12px] text-[#d14a3e]">{error}</p> : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-blue-ink transition-colors hover:bg-surface-2"
        >
          {plus}
          <span className="whitespace-nowrap">Create workspace</span>
          <span className="ml-auto shrink-0 whitespace-nowrap pl-2 text-[11px] font-medium tabular-nums text-muted">
            {a.used} of {a.limit}
          </span>
        </button>
      )}
    </div>
  );
}
