import { createClient } from "@/lib/supabase/server";
import { DeveloperClient } from "@/components/DeveloperClient";

export default async function DevelopersPage() {
  const supabase = await createClient();
  // Never select hashed_key.
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, label, key_hint, created_at, last_used_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <p className="max-w-2xl text-sm text-muted">
        Use your API key to automate Postbase — hook up an AI agent over MCP, script it from the
        CLI, or call the REST API directly.
      </p>

      <div className="mt-6">
        <DeveloperClient keys={keys ?? []} brandfetchId={process.env.BRANDFETCH_API_KEY} />
      </div>
    </div>
  );
}
