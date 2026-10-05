"use server";

import { getCurrentOrgId } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET, mediaPath, uploadBlocker } from "@/lib/media-storage";

const THUMB_MAX_BYTES = 2 * 1024 * 1024;

/**
 * A one-time signed URL to upload one file to post-media, after the checks in
 * lib/media-storage (plan, type, size, storage allowance). The browser then
 * uploads with uploadToSignedUrl; it can't write anywhere else in the bucket.
 */
export async function createMediaUpload(input: {
  type: string;
  size: number;
  purpose?: "post" | "thumbnail";
}): Promise<{ ok: true; path: string; token: string; publicUrl: string } | { ok: false; error: string }> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return { ok: false, error: "No workspace found." };
  const type = String(input.type ?? "");
  const size = Number(input.size);
  const thumb = input.purpose === "thumbnail";
  if (thumb && type !== "image/jpeg" && type !== "image/png") return { ok: false, error: "Use a JPG or PNG image." };

  const blocked = await uploadBlocker(orgId, type, size, thumb ? THUMB_MAX_BYTES : undefined);
  if (blocked) return { ok: false, error: blocked };

  const admin = createAdminClient();
  const path = mediaPath("uploads", orgId, type);
  const { data, error } = await admin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Couldn't start the upload. Please try again." };
  return { ok: true, path: data.path, token: data.token, publicUrl: admin.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl };
}
