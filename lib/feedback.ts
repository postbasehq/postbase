import { createAdminClient } from "@/lib/supabase/admin";

export type BoardStatus = "open" | "planned" | "in_progress" | "done" | "declined";

export type BoardItem = {
  id: string;
  title: string;
  body: string;
  status: BoardStatus;
  votes: number;
  voted: boolean;
  createdAt: string;
};

/** Public feature-board ideas with vote counts, ordered by votes (then recency). */
export async function listBoard(userId: string): Promise<BoardItem[]> {
  const db = createAdminClient();
  const { data: items } = await db
    .from("feedback")
    .select("id, title, message, status, created_at")
    .eq("is_public", true)
    .neq("status", "declined")
    .order("created_at", { ascending: false });
  const rows = items ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id as string);
  const { data: votes } = await db
    .from("feedback_votes")
    .select("feedback_id, user_id")
    .in("feedback_id", ids);

  const countByItem = new Map<string, number>();
  const votedByUser = new Set<string>();
  for (const v of votes ?? []) {
    const fid = v.feedback_id as string;
    countByItem.set(fid, (countByItem.get(fid) ?? 0) + 1);
    if (v.user_id === userId) votedByUser.add(fid);
  }

  return rows
    .map((r) => ({
      id: r.id as string,
      title: (r.title as string) || "Untitled idea",
      body: (r.message as string) ?? "",
      status: ((r.status as string) || "open") as BoardStatus,
      votes: countByItem.get(r.id as string) ?? 0,
      voted: votedByUser.has(r.id as string),
      createdAt: r.created_at as string,
    }))
    .sort((a, b) => b.votes - a.votes || (a.createdAt < b.createdAt ? 1 : -1));
}
