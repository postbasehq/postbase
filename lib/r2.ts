import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 (S3-compatible) client + config for the media library.
 *
 * Files are uploaded from the browser via presigned S3 multipart uploads
 * (chunked + retryable), so large videos up to 1 GB survive flaky connections.
 * R2 has zero egress fees, which matters when social platforms repeatedly fetch
 * large video URLs.
 *
 * Required env (add to .env.local — see .env.example):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
 * The R2 bucket also needs a CORS rule allowing PUT from the app origin and
 * exposing the ETag header (see .env.example for the JSON).
 */

const REQUIRED = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

export const R2_MAX_BYTES = 1024 * 1024 * 1024; // 1 GB hard cap
export const R2_PART_SIZE = 16 * 1024 * 1024; // 16 MB multipart chunks (>5 MB min)
export const R2_PRESIGN_TTL = 3 * 60 * 60; // 3 h — enough to push 1 GB on a slow line

export const R2_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export function r2Config() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`R2 not configured — missing env: ${missing.join(", ")}`);
  }
  return {
    accountId: process.env.R2_ACCOUNT_ID as string,
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    bucket: process.env.R2_BUCKET as string,
    publicUrl: (process.env.R2_PUBLIC_URL as string).replace(/\/+$/, ""),
  };
}

let client: S3Client | null = null;

export function r2Client(): S3Client {
  if (client) return client;
  const c = r2Config();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${c.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
  return client;
}

export function r2Bucket(): string {
  return r2Config().bucket;
}

export function r2PublicUrl(key: string): string {
  return `${r2Config().publicUrl}/${encodeURI(key)}`;
}

/** A safe file extension from a MIME type, for the object key. */
export function extForType(type: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return map[type] ?? "bin";
}
