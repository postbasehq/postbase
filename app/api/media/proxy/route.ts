import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { MAX_IMAGE_BYTES } from "@/lib/platforms/fetch-media";
import { ownStorageUrl } from "@/lib/media-urls";

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
// TikTok photo posts only accept JPEG and WebP; anything else is converted.
const TIKTOK_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/webp"]);

export async function GET(request: Request) {
  const src = ownStorageUrl(new URL(request.url).searchParams.get("src"));
  if (!src) return new NextResponse("Not found", { status: 404 });

  // Generous: TikTok fetches each post's media once or twice. Bounds anyone
  // using it to burn bandwidth or image conversions. Fails open (TikTok's
  // fetch must not fail because of a limiter outage).
  if (!(await rateLimit(`media-proxy:${clientKey(request)}`, 60, 120, { failOpen: true }))) {
    return new NextResponse("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
  }

  const upstream = await fetch(src, { redirect: "error", signal: AbortSignal.timeout(120_000) }).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  const type = (upstream.headers.get("Content-Type") ?? "application/octet-stream").split(";")[0].trim();
  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=3600");

  if (type.startsWith("image/") && !TIKTOK_IMAGE_TYPES.has(type)) {
    // Converting is done in memory: bound it (declared size, then while reading).
    if (Number(upstream.headers.get("Content-Length") ?? 0) > MAX_IMAGE_BYTES) {
      return new NextResponse("Too large", { status: 413 });
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of upstream.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.byteLength;
      if (size > MAX_IMAGE_BYTES) return new NextResponse("Too large", { status: 413 });
      chunks.push(chunk);
    }
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(Buffer.concat(chunks), { limitInputPixels: 100_000_000 })
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
