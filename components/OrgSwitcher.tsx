import type { UserOrg } from "@/lib/org";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * Active-workspace indicator + switcher. Renders a plain label when the user is
 * in one org, or a <details> dropdown (no client JS) to switch when in several.
 */
export function OrgSwitcher({
  orgs,
  activeId,
  action,
}: {
  orgs: UserOrg[];
  activeId: string | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const active = orgs.find((o) => o.id === activeId) ?? orgs[0];
  if (!active) return null;

  const label = (
    <>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Workspace</div>
      <div className="truncate text-sm font-semibold">{active.name}</div>
    </>
  );

  // Solo users only ever have their one personal workspace — the label is just
  // noise for them. Show the switcher only once they belong to more than one.
  if (orgs.length <= 1) return null;

  return (
    <details className="border-b border-line">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3">
        <div className="min-w-0">{label}</div>
        <span className="ml-auto text-xs text-muted">▾</span>
      </summary>
      <div className="flex flex-col gap-0.5 px-2 pb-2">
        {orgs.map((o) => (
          <form key={o.id} action={action}>
            <input type="hidden" name="org_id" value={o.id} />
            <SubmitButton
              className={`flex w-full items-center gap-1.5 truncate rounded-lg px-3 py-1.5 text-left text-sm disabled:opacity-60 ${
                o.id === active.id
                  ? "bg-blue-soft text-blue-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span className="truncate">{o.name}</span>
              <span className="ml-auto text-[11px] text-muted">{o.role}</span>
            </SubmitButton>
          </form>
        ))}
      </div>
    </details>
  );
}
