import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

export type NewTarget = { channel_id: string; variant_body?: string | null };
export type NewMedia = { url: string; type: string };

/**
 * Write a post with its targets and media so the publisher never sees it half
 * built. It's written as a draft (the publisher never starts one), and only
 * once the targets and media are in does it take its real status. If a step
 * fails the post is deleted (its targets and media cascade) and the error
 * thrown; at worst an interrupted write leaves a draft, never a scheduled post
 * missing its channels or media (which would "publish" with nothing sent).
 *
 * `post` is the posts row without `status`; `status` is where it ends up.
 */
export async function insertPostWhole(
  db: Db,
  post: Record<string, unknown>,
  status: "draft" | "scheduled",
  targets: NewTarget[],
  media: NewMedia[],
): Promise<{ id: string }> {
  const { data: row, error } = await db
    .from("posts")
    .insert({ ...post, status: "draft" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const id = row.id as string;

  try {
    await writeTargetsAndMedia(db, id, status, targets, media);
    if (status !== "draft") await releaseAs(db, id, status);
  } catch (e) {
    await db.from("posts").delete().eq("id", id);
    throw e;
  }
  return { id };
}

/**
 * Replace a held (draft) post's targets and media, then give it its status.
 * The caller has already held the post (holdPostForEdit) and written its new
 * fields with status still "draft". On failure it stays a draft.
 */
export async function replaceTargetsAndMedia(
  db: Db,
  postId: string,
  status: "draft" | "scheduled",
  targets: NewTarget[],
  media: NewMedia[],
): Promise<void> {
  const { error: tDel } = await db.from("post_targets").delete().eq("post_id", postId);
  if (tDel) throw new Error(tDel.message);
  const { error: mDel } = await db.from("media").delete().eq("post_id", postId);
  if (mDel) throw new Error(mDel.message);
  await writeTargetsAndMedia(db, postId, status, targets, media);
  if (status !== "draft") await releaseAs(db, postId, status);
}

async function writeTargetsAndMedia(
  db: Db,
  postId: string,
  status: string,
  targets: NewTarget[],
  media: NewMedia[],
): Promise<void> {
  if (targets.length > 0) {
    const { error } = await db
      .from("post_targets")
      .insert(targets.map((t) => ({ post_id: postId, channel_id: t.channel_id, variant_body: t.variant_body ?? null, status })));
    if (error) throw new Error(error.message);
  }
  if (media.length > 0) {
    const { error } = await db
      .from("media")
      .insert(media.map((m) => ({ post_id: postId, storage_url: m.url, type: m.type })));
    if (error) throw new Error(error.message);
  }
}

/** The last write: the post leaves draft only if nothing (e.g. a cancel) moved it meanwhile. */
async function releaseAs(db: Db, postId: string, status: string): Promise<void> {
  const { data, error } = await db
    .from("posts")
    .update({ status })
    .eq("id", postId)
    .eq("status", "draft")
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("The post changed while saving. Check the queue and try again.");
}
