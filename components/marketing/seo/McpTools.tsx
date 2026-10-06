import { MCP_TOOLS } from "@/lib/seo/mcp";
import { card } from "@/components/marketing/ui";

/** The MCP server's four tools: name, read/write, what it does and its arguments. */
export function McpTools() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {MCP_TOOLS.map((t) => (
        <div key={t.name} className={`${card} p-6`}>
          <div className="flex items-center justify-between gap-3">
            <code className="font-mono text-[16px] font-semibold text-ink">{t.name}</code>
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                t.kind === "read" ? "border border-line text-muted" : "bg-blue text-on-blue"
              }`}
            >
              {t.kind === "read" ? "Read only" : "Writes"}
            </span>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ink">{t.summary}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">{t.args}</p>
        </div>
      ))}
    </div>
  );
}
