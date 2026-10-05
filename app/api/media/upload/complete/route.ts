import { NextResponse } from "next/server";
import { CompleteMultipartUploadCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { storageBlocker } from "@/lib/media-storage";
import {
  r2Client,
  r2Bucket,
  r2PublicUrl,
  R2_ALLOWED_TYPES,
  R2_MAX_BYTES,
} from "@/lib/r2";

export const runtime = "nodejs";

type Part = { PartNumber: number; ETag: string };

/**
 * Finish a multipart upload: stitch the parts in R2, read the object's real
 * size back (the browser's declared size is never trusted), re-check the
 * plan's storage allowance, then record the asset in media_library. Members
 * can't insert library rows themselves (migration 0047), so this is the only
 * writer. An object over the limits is deleted again. Returns the new row.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orgId = await getCurrentOrgId();
  if (!orgId) return NextResponse.json({ error: "no_workspace" }, { status: 400 });

  let body: {
    key?: string;
    uploadId?: string;
    parts?: Part[];
    name?: string;
    type?: string;
    size?: number;
    folderId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const key = String(body.key ?? "");
  const uploadId = String(body.uploadId ?? "");
  const parts = Array.isArray(body.parts) ? body.parts : [];
  const type = String(body.type ?? "");
  const name = String(body.name ?? "file").slice(0, 200);
  const size = Number(body.size ?? 0);

  // The key is minted server-side as `${orgId}/uuid.ext`; reject anything that
  // isn't prefixed with the caller's own org so one org can't complete another's.
  if (!key.startsWith(`${orgId}/`) || !uploadId || parts.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!R2_ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > R2_MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const client = r2Client();
  const Bucket = r2Bucket();
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .slice()
          .sort((a, b) => a.PartNumber - b.PartNumber)
          .map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
      },
    }),
  );

  // Each presigned part URL accepts up to 5 GB, so check what actually landed.
  const head = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
  const actualSize = Number(head.ContentLength ?? 0);
  // The type the object was created with at /create, not what the browser says now.
  const actualType = head.ContentType ?? "";
  const reject = async (status: number, error: string, message: string) => {
    await client.send(new DeleteObjectCommand({ Bucket, Key: key })).catch(() => {});
    return NextResponse.json({ error, message }, { status });
  };
  if (!Number.isFinite(actualSize) || actualSize <= 0 || actualSize > R2_MAX_BYTES) {
    return reject(413, "too_large", "File is over the 1 GB limit.");
  }
  if (!R2_ALLOWED_TYPES.includes(actualType)) {
    return reject(415, "unsupported_type", "Unsupported file type.");
  }
  const blocked = await storageBlocker(orgId, actualSize);
  if (blocked) return reject(403, "blocked", blocked);

  // Uploaded while a folder was open: file it there, if the folder is in this
  // workspace. Anything else just lands in the library unfiled.
  let folderId: string | null = null;
  if (body.folderId) {
    const { data: folder } = await supabase
      .from("media_folders")
      .select("id")
      .eq("id", String(body.folderId))
      .eq("org_id", orgId)
      .maybeSingle();
    folderId = folder?.id ?? null;
  }

  const url = r2PublicUrl(key);
  const { data, error } = await createAdminClient()
    .from("media_library")
    .insert({
      org_id: orgId,
      key,
      url,
      name,
      type: actualType,
      size_bytes: actualSize,
      created_by: user.id,
      folder_id: folderId,
    })
    .select("id, key, url, name, type, size_bytes, created_at, folder_id")
    .single();

  if (error) return reject(500, "save_failed", "Couldn’t save the upload.");

  return NextResponse.json({ item: data });
}
