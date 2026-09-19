"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId } from "@/lib/org";

/**
 * Uploads an image the user attached in the agent chat to the post-media bucket
 * (the same public bucket AI-generated images use), so it can be shown, sent to
 * the model for vision, and attached to a proposed post. Session-scoped.
 */
const MAX_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadAgentImage(
  formData: FormData,
): Promise<{ ok: true; url: string; type: string } | { ok: false; error: string }> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return { ok: false, error: "No workspace found." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file." };
  const ext = EXT[file.type];
  if (!ext) return { ok: false, error: "Only JPG, PNG, WebP or GIF images." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Image is too large (max 10MB)." };

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `agent/${orgId}/${crypto.randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("post-media")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: "Couldn't save the image." };

  const url = admin.storage.from("post-media").getPublicUrl(path).data.publicUrl;
  return { ok: true, url, type: file.type };
}
