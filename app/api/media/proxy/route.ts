import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Streams a file from our own media storage through our own domain.
 *
 * TikTok's PULL_FROM_URL requires the media URL to sit on a domain we've verified
 * in the TikTok app. Neither the Supabase storage domain nor the R2 public domain
 * is verified, so TikTok fetches media via this route on our own domain instead.
 *
 * Locked to our own storage (the post-media bucket + the media library's R2
 * bucket) to avoid being an open proxy (SSRF).
 */
function allowedPrefixes(): string[] {
  const prefixes = [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/`];
  const r2 = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (r2) prefixes.push(`${r2}/`);
  return prefixes;
}

// TikTok photo posts only accept JPEG and WebP; anything else is converted.
const TIKTOK_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/webp"]);

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src");
  if (!src || !allowedPrefixes().some((p) => src.startsWith(p))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstream = await fetch(src);
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  const type = (upstream.headers.get("Content-Type") ?? "application/octet-stream").split(";")[0].trim();
  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=3600");

  if (type.startsWith("image/") && !TIKTOK_IMAGE_TYPES.has(type)) {
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(Buffer.from(await upstream.arrayBuffer()))
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90 })
      .toBuffer();
    headers.set("Content-Type", "image/jpeg");
    headers.set("Content-Length", String(jpeg.byteLength));
    return new NextResponse(new Uint8Array(jpeg), { status: 200, headers });
  }

  headers.set("Content-Type", type);
  const len = upstream.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);
  return new NextResponse(upstream.body, { status: 200, headers });
}
