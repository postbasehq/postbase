import { NextResponse } from "next/server";
import { CreateMultipartUploadCommand, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import {
  r2Client,
  r2Bucket,
  extForType,
  R2_ALLOWED_TYPES,
  R2_MAX_BYTES,
  R2_PART_SIZE,
  R2_PRESIGN_TTL,
} from "@/lib/r2";

export const runtime = "nodejs";

/**
 * Begin a presigned S3 multipart upload to R2. Returns the object key, an
 * uploadId, the part size, and one presigned PUT URL per part. The browser
 * uploads each chunk directly to R2, then calls /complete.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orgId = await getCurrentOrgId();
  if (!orgId) return NextResponse.json({ error: "no_workspace" }, { status: 400 });

  let body: { name?: string; type?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const type = String(body.type ?? "");
  const size = Number(body.size ?? 0);

  if (!R2_ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > R2_MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const key = `${orgId}/${crypto.randomUUID()}.${extForType(type)}`;
  const client = r2Client();
  const Bucket = r2Bucket();

  const created = await client.send(
    new CreateMultipartUploadCommand({ Bucket, Key: key, ContentType: type }),
  );
  const uploadId = created.UploadId;
  if (!uploadId) {
    return NextResponse.json({ error: "create_failed" }, { status: 502 });
  }

  const partCount = Math.max(1, Math.ceil(size / R2_PART_SIZE));
  const urls = await Promise.all(
    Array.from({ length: partCount }, (_, i) =>
      getSignedUrl(
        client,
        new UploadPartCommand({
          Bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: i + 1,
        }),
        { expiresIn: R2_PRESIGN_TTL },
      ),
    ),
  );

  return NextResponse.json({ key, uploadId, partSize: R2_PART_SIZE, urls });
}
