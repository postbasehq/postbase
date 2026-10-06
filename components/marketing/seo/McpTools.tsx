import { MCP_TOOLS, MCP_URL } from "@/lib/seo/mcp";

/*
 * Cards for the MCP pages, in the pricing PlanCard's two-zone style: an inset
 * panel (name and a solid label), then the detail.
 */

function TwoZone({ head, label, labelClass, children }: { head: React.ReactNode; label: string; labelClass: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-[22px] border border-line bg-surface p-2 shadow-sm">
      <div className="rounded-2xl border border-line bg-surface-2 p-5">
        <div className="flex items-center justify-between gap-3">
          {head}
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${labelClass}`}>{label}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">{children}</div>
    </div>
  );
}

/** The server's four tools: name, read or write, what it does and its arguments. */
export function McpTools() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {MCP_TOOLS.map((t) => (
        <TwoZone
          key={t.name}
          head={<code className="font-mono text-[17px] font-semibold text-ink">{t.name}</code>}
          label={t.kind === "read" ? "Read only" : "Writes"}
          labelClass={t.kind === "read" ? "border border-line bg-surface text-ink" : "bg-[#2b59d9] text-white"}
        >
          <p className="text-[15px] leading-relaxed text-ink">{t.summary}</p>
          <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{t.args}</p>
        </TwoZone>
      ))}
    </div>
  );
}

/** Hosted with OAuth, or local with an API key. */
export function McpConnect() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <TwoZone
        head={<h3 className="font-display text-[20px] font-semibold text-ink">Hosted</h3>}
        label="Recommended"
        labelClass="bg-[#2b59d9] text-white"
      >
        <p className="text-[15px] leading-relaxed text-ink">
          Paste the server URL into Claude, ChatGPT, Cursor or any client that supports remote servers, then sign in with Postbase. No key to copy or store.
        </p>
        <p className="mt-4 w-fit rounded-xl border border-line bg-surface-2 px-3.5 py-2 font-mono text-[14px] text-ink">{MCP_URL}</p>
      </TwoZone>
      <TwoZone
        head={<h3 className="font-display text-[20px] font-semibold text-ink">Local</h3>}
        label="API key"
        labelClass="bg-[#e3a72c] text-[#14161a]"
      >
        <p className="text-[15px] leading-relaxed text-ink">
          For clients that only run local servers: create a key on the AI &amp; API page and run the open-source package with npx. Same four tools.
        </p>
        <p className="mt-4 w-fit rounded-xl border border-line bg-surface-2 px-3.5 py-2 font-mono text-[14px] text-ink">npx @postbasehq/mcp</p>
      </TwoZone>
    </div>
  );
}
