import { NextResponse } from "next/server";

/**
 * Streams a file from our public media bucket through our own domain.
 *
 * TikTok's PULL_FROM_URL requires the media URL to sit on a domain we've verified
 * in the TikTok app. The Supabase storage domain can't be verified, so TikTok
 * fetches media via this route on our own (verifiable) domain instead.
 *
 * Locked to our own public bucket to avoid being an open proxy (SSRF).
 */
function allowedPrefix(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/`;
}

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src");
  if (!src || !src.startsWith(allowedPrefix())) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstream = await fetch(src);
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/octet-stream");
  const len = upstream.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);
  headers.set("Cache-Control", "public, max-age=3600");

  return new NextResponse(upstream.body, { status: 200, headers });
}
