import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { claimDueBots, runSweep } from "@/lib/postbots/sweep";
import { notifyBotFindings } from "@/lib/postbots/notify";
import { claimDueRoutines, runRoutine } from "@/lib/postbots/routines";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Bots swept per run, and how many at once. */
const BATCH = 20;
const PARALLEL = 4;
/** Routines run per run, and how many at once: each is a full bot turn (up to a minute or so). */
const ROUTINE_BATCH = 6;
const ROUTINE_PARALLEL = 3;

/**
 * Cron: runs the Postbots work that's due, the scheduled listen sweeps and the
 * routines, side by side. Vercel Cron calls it every 15 minutes (vercel.json)
 * with CRON_SECRET, like the publisher.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sweeps, routines] = await Promise.all([runSweeps(), runRoutines()]);
  return NextResponse.json({ ok: true, ...sweeps, ...routines });
}

async function runSweeps() {
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
  return { swept: bots.length, posted };
}

async function runRoutines() {
  const due = await claimDueRoutines(ROUTINE_BATCH);
  let ran = 0;
  for (let i = 0; i < due.length; i += ROUTINE_PARALLEL) {
    await Promise.all(
      due.slice(i, i + ROUTINE_PARALLEL).map(async (r) => {
        try {
          if ((await runRoutine(r)).ran) ran++;
        } catch (e) {
          Sentry.captureException(e, { tags: { routine: r.id, bot: r.botId } });
        }
      }),
    );
  }
  return { routinesDue: due.length, routinesRan: ran };
}
