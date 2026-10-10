import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { claimDueBots, runSweep } from "@/lib/postbots/sweep";
import { notifyBotFindings } from "@/lib/postbots/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Bots swept per run, and how many at once. */
const BATCH = 20;
const PARALLEL = 4;

/**
 * Cron: runs the scheduled sweeps of Listen Postbots that are due. Vercel Cron
 * calls it every 15 minutes (vercel.json) with CRON_SECRET, like the publisher.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bots = await claimDueBots(BATCH);
  let posted = 0;
  for (let i = 0; i < bots.length; i += PARALLEL) {
    await Promise.all(
      bots.slice(i, i + PARALLEL).map(async (bot) => {
        try {
          const out = await runSweep(bot, { first: false });
          if (out.ok && out.posted) {
            posted++;
            await notifyBotFindings(bot, out.summary, out.findings);
          }
        } catch (e) {
          Sentry.captureException(e, { tags: { bot: bot.id } });
        }
      }),
    );
  }
  return NextResponse.json({ ok: true, swept: bots.length, posted });
}
