import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { storageBlocker } from "@/lib/media-storage";
import { downloadPublic } from "@/lib/safe-fetch";
import { extForType, r2Bucket, r2Client, r2PublicUrl, R2_ALLOWED_TYPES } from "@/lib/r2";

/*
 * Add a file to a workspace's media library from a public URL (the API's
 * media_urls and POST /v1/media), so agents can attach files without an
 * upload step. Same rules as a browser upload: allowed types only, the plan's
 * storage allowance, and a key under the workspace's own prefix.
 */

/** Largest file the API will fetch from a URL (bigger videos: upload in Postbase). */
export const URL_IMPORT_MAX_BYTES = 200 * 1024 * 1024;
/** Most URLs one request may import. */
export const MAX_MEDIA_URLS = 10;

const EXT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

/** The file's type: the server's Content-Type, or the extension when that's generic. */
export function mediaTypeFor(contentType: string, url: string): string | null {
  if (R2_ALLOWED_TYPES.includes(contentType)) return contentType;
  if (contentType && contentType !== "application/octet-stream" && contentType !== "binary/octet-stream") return null;
  const ext = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPES[ext] ?? null;
}

function nameFrom(url: string): string {
  const last = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
  return (last || "file").slice(0, 200);
}

export type ImportedMedia = { id: string; name: string; type: string; size_bytes: number; url: string; created_at: string };

export async function importMediaFromUrl(orgId: string, rawUrl: string, name?: string): Promise<ImportedMedia> {
  const file = await downloadPublic(rawUrl, { maxBytes: URL_IMPORT_MAX_BYTES });
  const type = mediaTypeFor(file.type, file.finalUrl);
  if (!type) throw new Error(`${rawUrl} isn't a supported file. Use JPG, PNG, WebP, GIF, MP4, MOV or WebM.`);
  if (file.bytes.length === 0) throw new Error(`${rawUrl} returned an empty file.`);
  const blocked = await storageBlocker(orgId, file.bytes.length);
  if (blocked) throw new Error(blocked);

  const key = `${orgId}/${randomUUID()}.${extForType(type)}`;
  await r2Client().send(new PutObjectCommand({ Bucket: r2Bucket(), Key: key, Body: file.bytes, ContentType: type }));

  const { data, error } = await createAdminClient()
    .from("media_library")
    .insert({
      org_id: orgId,
      key,
      url: r2PublicUrl(key),
      name: (name?.trim() || nameFrom(file.finalUrl)).slice(0, 200),
      type,
      size_bytes: file.bytes.length,
    })
    .select("id, name, type, size_bytes, url, created_at")
    .single();
  if (error || !data) {
    await r2Client().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key })).catch(() => {});
    throw new Error("Couldn't save the file to the media library.");
  }
  return data as ImportedMedia;
}
