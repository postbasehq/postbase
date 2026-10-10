import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // run on everything except Next internals and static asset files
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt)$).*)",
    // The API routes that run on the browser session (not API keys, webhooks or
    // cron), so the two-factor step-up covers them too.
    "/api/(account|agent|auth|bots|connect|media|tiktok)/:path*",
  ],
};
