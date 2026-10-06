import { createAdminClient } from "@/lib/supabase/admin";
import { listConnectedApps } from "@/lib/oauth";

/*
 * Data export (Settings → Export my data), for the right to data portability.
 * One JSON document of what Postbase holds for this person:
 *  - their account;
 *  - for workspaces they own or administer: the workspace's content (posts and
 *    their delivery results, channels, media, AI chats, API key labels);
 *  - for workspaces where they're a member: the posts and chats they wrote.
 * Never included: other people's personal data (team members appear as roles
 * and counts only), access tokens, API key hashes or secrets.
 */

const POST_COLUMNS =
  "id, body, thread_tail, status, scheduled_at, repeat_every, timezone, created_at, updated_at, author_id, " +
  "post_targets(status, error, platform_post_id, metrics, channels(platform, handle)), media(storage_url, type)";

export async function buildExport(user: { id: string; email?: string | null; created_at?: string; user_metadata?: Record<string, unknown> }) {
  const db = createAdminClient();
  const { data: memberships } = await db
    .from("org_members")
    .select("role, org_id, orgs(id, name, created_at, plan, subscription_status)")
    .eq("user_id", user.id);

  const workspaces = [];
  for (const m of memberships ?? []) {
    const org = m.orgs as unknown as { id: string; name: string; created_at: string; plan: string; subscription_status: string | null } | null;
    if (!org) continue;
    const manager = m.role === "owner" || m.role === "admin";

    const postsQ = db.from("posts").select(POST_COLUMNS).eq("org_id", org.id).order("created_at", { ascending: true }).limit(10_000);
    const chatsQ = db
      .from("agent_conversations")
      .select("id, title, created_at, author_id, agent_chat_messages(role, content, created_at)")
      .eq("org_id", org.id)
      .order("created_at", { ascending: true })
      .limit(2_000);
    const [posts, chats, channels, library, keys, team] = await Promise.all([
      manager ? postsQ : postsQ.eq("author_id", user.id),
      manager ? chatsQ : chatsQ.eq("author_id", user.id),
      manager
        ? db.from("channels").select("platform, handle, display_name, status, created_at").eq("org_id", org.id)
        : Promise.resolve({ data: null }),
      manager
        ? db.from("media_library").select("name, url, type, size_bytes, created_at").eq("org_id", org.id).limit(10_000)
        : Promise.resolve({ data: null }),
      // Labels and hints only; the key itself is never stored.
      db.from("api_keys").select("label, key_hint, created_at, last_used_at").eq("org_id", org.id).eq("created_by", user.id),
      db.from("org_members").select("role").eq("org_id", org.id),
    ]);

    workspaces.push({
      id: org.id,
      name: org.name,
      your_role: m.role,
      created_at: org.created_at,
      ...(manager ? { plan: org.plan, subscription_status: org.subscription_status } : {}),
      team: (team.data ?? []).reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.role]: (acc[t.role] ?? 0) + 1 }), {}),
      scope: manager ? "everything in this workspace" : "posts and chats you wrote",
      channels: channels.data ?? undefined,
      posts: (posts.data ?? []).map((p) => {
        const { author_id, ...rest } = p as unknown as Record<string, unknown>;
        return { ...rest, written_by_you: author_id === user.id };
      }),
      media_library: library.data ?? undefined,
      ai_agent_chats: (chats.data ?? []).map((c) => {
        const { author_id, ...rest } = c as unknown as Record<string, unknown>;
        return { ...rest, started_by_you: author_id === user.id };
      }),
      your_api_keys: keys.data ?? [],
    });
  }

  const meta = user.user_metadata ?? {};
  return {
    exported_at: new Date().toISOString(),
    format: "Postbase data export, version 1",
    account: {
      id: user.id,
      email: user.email ?? null,
      name: (meta.full_name as string) || (meta.name as string) || null,
      created_at: user.created_at ?? null,
    },
    connected_apps: (await listConnectedApps(user.id)).map((a) => ({
      app: a.appName,
      workspace: a.orgName,
      connected_at: a.createdAt,
      last_used_at: a.lastUsedAt,
    })),
    workspaces,
  };
}
