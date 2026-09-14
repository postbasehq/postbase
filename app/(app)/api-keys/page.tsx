import { createClient } from "@/lib/supabase/server";
import { ApiKeysClient } from "@/components/ApiKeysClient";

export default async function ApiKeysPage() {
  const supabase = await createClient();
  // Never select hashed_key.
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, label, created_at, last_used_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-[720px]">
      <p className="text-sm text-muted">
        Generate an API key, then add the Postbase MCP server to your AI tool so an agent
        can schedule and publish for you.
      </p>

      <div className="mt-6">
        <ApiKeysClient keys={keys ?? []} />
      </div>

      {/* MCP setup */}
      <h2 className="mt-9 font-display text-lg font-semibold">Add to Claude / Cursor</h2>
      <p className="mt-1 text-sm text-muted">
        Paste this into your MCP client config, using the key you generated above.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#1b1e26] p-5 font-mono text-[13px] leading-7 text-[#e6e8ef] shadow-sm">
{`{
  "mcpServers": {
    "postbase": {
      "command": "npx",
      "args": ["@postbasehq/mcp"],
      "env": { "POSTBASE_API_KEY": "pb_live_…" }
    }
  }
}`}
      </pre>
      <p className="mt-3 text-sm text-muted">
        Then ask your agent: <em>“Schedule this thread for 9am to X and LinkedIn.”</em> Tools:{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">list_channels</code>,{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">create_post</code>,{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">list_scheduled</code>,{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">cancel_post</code>.
      </p>
    </div>
  );
}
