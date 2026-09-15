import { NextResponse } from "next/server";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { r2Client, r2Bucket } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * Cancel an in-flight multipart upload (user cancelled, or a part failed past
 * retry) so R2 doesn't keep the orphaned parts around.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orgId = await getCurrentOrgId();
  if (!orgId) return NextResponse.json({ error: "no_workspace" }, { status: 400 });

  let body: { key?: string; uploadId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const key = String(body.key ?? "");
  const uploadId = String(body.uploadId ?? "");
  if (!key.startsWith(`${orgId}/`) || !uploadId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    await r2Client().send(
      new AbortMultipartUploadCommand({ Bucket: r2Bucket(), Key: key, UploadId: uploadId }),
    );
  } catch {
    // Best-effort cleanup; R2 also expires incomplete multipart uploads on its own.
  }

  return NextResponse.json({ ok: true });
}
