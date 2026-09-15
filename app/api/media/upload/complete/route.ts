import { NextResponse } from "next/server";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
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
 * Finish a multipart upload: stitch the parts in R2, then record the asset in
 * media_library (RLS scopes it to the caller's org). Returns the new row.
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

  await r2Client().send(
    new CompleteMultipartUploadCommand({
      Bucket: r2Bucket(),
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

  const url = r2PublicUrl(key);
  const { data, error } = await supabase
    .from("media_library")
    .insert({
      org_id: orgId,
      key,
      url,
      name,
      type,
      size_bytes: size,
      created_by: user.id,
    })
    .select("id, key, url, name, type, size_bytes, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
